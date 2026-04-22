#!/usr/bin/env node

import { Command } from "commander";
import packageJson from "../../../../package.json";
import { ClusterDiscoveryService } from "../../../services/cluster-discovery/cluster-discovery.service";
import { KubectlSessionService } from "../../../services/kubectl-session/kubectl-session.service";
import {
  TopicListInputError,
  TopicListService,
} from "../../../services/topic-list/topic-list.service";
import { VersionService } from "../../../services/version/version.service";

const clusterDiscoveryService = new ClusterDiscoveryService();
const kubectlSessionService = new KubectlSessionService(packageJson.version);
const topicListService = new TopicListService(clusterDiscoveryService);
const versionService = new VersionService(packageJson.version);

const program = new Command()
  .name("jackdaw")
  .description("Toolkit for inspecting Kafka clusters");

program
  .command("version")
  .description("Display the current project version")
  .action(() => {
    console.log(versionService.getVersion());
  });

const clusterCommand = program
  .command("cluster")
  .description("Inspect Kafka cluster connectivity");

clusterCommand
  .command("discover")
  .description("Display connectivity information for the current cluster")
  .action(() => {
    const result = clusterDiscoveryService.discover({
      environment: process.env,
    });

    if (!result.detected) {
      console.log(
        "Cluster cannot be detected. Strimzi internal bootstrap service endpoint (*-kafka-bootstrap) is not available in environment variables.",
      );
      return;
    }

    console.log(`Bootstrap connection URL: ${result.bootstrapConnectionUrl}`);
  });

const topicCommand = program
  .command("topic")
  .description("Inspect Kafka topics");

topicCommand
  .command("list")
  .description("List topics in the current Kafka cluster")
  .option("--bootstrap-url <url>", "Kafka bootstrap connection URL")
  .option("--scram-username <username>", "SCRAM username")
  .option("--scram-password <password>", "SCRAM password")
  .option("--kubectl", "Execute command in kubectl mode")
  .action(async (options: {
    bootstrapUrl?: string;
    scramUsername?: string;
    scramPassword?: string;
    kubectl?: boolean;
  }) => {
    try {
      if (options.kubectl === true) {
        const exitCode = await kubectlSessionService.run({
          environment: process.env,
          command: buildTopicListKubectlCommand(options),
        });

        process.exitCode = exitCode ?? 1;
        return;
      }

      const result = await topicListService.list({
        environment: process.env,
        bootstrapUrl: options.bootstrapUrl,
        scramUsername: options.scramUsername,
        scramPassword: options.scramPassword,
      });

      if (!result.listed) {
        console.error(
          "Cluster cannot be detected. Provide --bootstrap-url or make the Strimzi internal bootstrap service endpoint (*-kafka-bootstrap) available in environment variables.",
        );
        process.exitCode = 1;
        return;
      }

      process.stdout.write(result.stdout);

      if (result.stderr.length > 0) {
        process.stderr.write(result.stderr);
      }
    } catch (error) {
      if (error instanceof TopicListInputError) {
        console.error(error.message);
      } else if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(String(error));
      }

      process.exitCode = 1;
    }
  });

program.parse();

function buildTopicListKubectlCommand(options: {
  bootstrapUrl?: string;
  scramUsername?: string;
  scramPassword?: string;
}): [string, ...string[]] {
  const command: [string, ...string[]] = ["jackdaw", "topic", "list"];

  if (hasValue(options.bootstrapUrl)) {
    command.push("--bootstrap-url", options.bootstrapUrl.trim());
  }

  if (hasValue(options.scramUsername)) {
    command.push("--scram-username", options.scramUsername);
  }

  if (hasValue(options.scramPassword)) {
    command.push("--scram-password", options.scramPassword);
  }

  return command;
}

function hasValue(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}
