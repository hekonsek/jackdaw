import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import {
  ClusterDiscoveryEnvironment,
  ClusterDiscoveryService,
} from "../cluster-discovery/cluster-discovery.service";

const execFileAsync = promisify(execFile);

export interface TopicListInput {
  environment: ClusterDiscoveryEnvironment;
  bootstrapUrl?: string;
  scramUsername?: string;
  scramPassword?: string;
}

interface CommandConfig {
  path: string;
  directory: string;
}

interface TopicDescription {
  name: string;
  partitionCount: string;
  replicationFactor: string;
}

export type TopicListResult =
  | {
      listed: false;
      reason: "cluster-not-detected";
    }
  | {
      listed: true;
      bootstrapUrl: string;
      stdout: string;
      stderr: string;
    };

export class TopicListInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TopicListInputError";
  }
}

export class TopicListService {
  constructor(
    private readonly clusterDiscoveryService = new ClusterDiscoveryService(),
  ) {}

  async list(input: TopicListInput): Promise<TopicListResult> {
    this.validateScramCredentials(input);

    const bootstrapUrl = this.resolveBootstrapUrl(input);

    if (!bootstrapUrl) {
      return {
        listed: false,
        reason: "cluster-not-detected",
      };
    }

    const commandConfig = await this.createCommandConfig(input);

    try {
      const args = ["--bootstrap-server", bootstrapUrl, "--describe"];

      if (commandConfig) {
        args.push("--command-config", commandConfig.path);
      }

      const { stdout, stderr } = await execFileAsync("kafka-topics.sh", args, {
        env: input.environment,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        listed: true,
        bootstrapUrl,
        stdout: this.formatTopicDescriptions(
          this.parseTopicDescriptions(stdout),
        ),
        stderr,
      };
    } finally {
      if (commandConfig) {
        await rm(commandConfig.path, { force: true });
        await rm(commandConfig.directory, { force: true, recursive: true });
      }
    }
  }

  private resolveBootstrapUrl(input: TopicListInput): string | undefined {
    if (this.hasValue(input.bootstrapUrl)) {
      return input.bootstrapUrl.trim();
    }

    const discoveryResult = this.clusterDiscoveryService.discover({
      environment: input.environment,
    });

    if (!discoveryResult.detected) {
      return undefined;
    }

    return discoveryResult.bootstrapConnectionUrl;
  }

  private validateScramCredentials(input: TopicListInput): void {
    const hasUsername = this.hasValue(input.scramUsername);
    const hasPassword = this.hasValue(input.scramPassword);

    if (hasUsername !== hasPassword) {
      throw new TopicListInputError(
        "Both --scram-username and --scram-password must be provided together.",
      );
    }
  }

  private async createCommandConfig(
    input: TopicListInput,
  ): Promise<CommandConfig | undefined> {
    if (
      !this.hasValue(input.scramUsername) ||
      !this.hasValue(input.scramPassword)
    ) {
      return undefined;
    }

    const directory = await mkdtemp(join(tmpdir(), "jackdaw-topic-list-"));
    const commandConfigPath = join(directory, "command-config.properties");
    const commandConfig = [
      "security.protocol=SASL_PLAINTEXT",
      "sasl.mechanism=SCRAM-SHA-512",
      `sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required username="${this.escapeJaasValue(
        input.scramUsername,
      )}" password="${this.escapeJaasValue(input.scramPassword)}";`,
      "",
    ].join("\n");

    await writeFile(commandConfigPath, commandConfig, { mode: 0o600 });

    return {
      path: commandConfigPath,
      directory,
    };
  }

  private escapeJaasValue(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  private parseTopicDescriptions(stdout: string): TopicDescription[] {
    return stdout
      .split(/\r?\n/)
      .map((line) => this.parseTopicDescription(line))
      .filter((topic): topic is TopicDescription => topic !== undefined)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private parseTopicDescription(line: string): TopicDescription | undefined {
    const name = this.extractKafkaDescriptionValue(line, "Topic");
    const partitionCount = this.extractKafkaDescriptionValue(
      line,
      "PartitionCount",
    );
    const replicationFactor = this.extractKafkaDescriptionValue(
      line,
      "ReplicationFactor",
    );

    if (!name || !partitionCount || !replicationFactor) {
      return undefined;
    }

    return {
      name,
      partitionCount,
      replicationFactor,
    };
  }

  private extractKafkaDescriptionValue(
    line: string,
    key: string,
  ): string | undefined {
    const field = line
      .split("\t")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${key}:`));

    if (!field) {
      return undefined;
    }

    const value = field.slice(key.length + 1).trim();

    return value.length > 0 ? value : undefined;
  }

  private formatTopicDescriptions(topics: TopicDescription[]): string {
    const rows = [
      ["TOPIC", "PARTITION COUNT", "REPLICATION FACTOR"],
      ...topics.map((topic) => [
        topic.name,
        topic.partitionCount,
        topic.replicationFactor,
      ]),
    ];
    const columnWidths = rows[0].map((_, columnIndex) =>
      Math.max(...rows.map((row) => row[columnIndex].length)),
    );

    return `${rows
      .map((row) =>
        row
          .map((cell, columnIndex) => cell.padEnd(columnWidths[columnIndex]))
          .join("  ")
          .trimEnd(),
      )
      .join("\n")}\n`;
  }

  private hasValue(value: string | undefined): value is string {
    return value !== undefined && value.trim().length > 0;
  }
}
