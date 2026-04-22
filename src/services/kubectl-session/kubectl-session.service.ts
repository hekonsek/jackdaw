import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SESSION_POD_NAME = "jackdaw-session";
const SESSION_IMAGE_REPOSITORY = "ghcr.io/hekonsek/jackdaw";

export interface KubectlSessionEnvironment {
  [key: string]: string | undefined;
}

export interface KubectlSessionInput {
  environment: KubectlSessionEnvironment;
  command: [string, ...string[]];
}

interface KubernetesContainer {
  name?: string;
  image?: string;
  imagePullPolicy?: string;
  command?: string[];
  args?: string[];
  stdin?: boolean;
  tty?: boolean;
  resources?: {
    requests?: {
      memory?: string;
    };
    limits?: {
      memory?: string;
    };
  };
}

interface KubernetesPod {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    labels?: Record<string, string>;
  };
  spec?: {
    containers?: KubernetesContainer[];
    restartPolicy?: string;
  };
}

export class KubectlSessionService {
  constructor(private readonly projectVersion = "latest") {}

  async run(input: KubectlSessionInput): Promise<number | null> {
    const kubectlBin = this.firstValue(input.environment.KUBECTL) ?? "kubectl";
    const useTty = process.stdin.isTTY === true && process.stdout.isTTY === true;
    const currentContext = await this.execKubectl(
      kubectlBin,
      ["config", "current-context"],
      input.environment,
    );
    const currentNamespace = await this.resolveNamespace(
      kubectlBin,
      input.environment,
    );
    const contextArgs = [
      "--context",
      currentContext,
      "--namespace",
      currentNamespace,
    ];
    const image = this.sessionImage();
    const overrides = this.buildOverrides(input.command, image, useTty);
    const runArgs = [
      "run",
      SESSION_POD_NAME,
      ...contextArgs,
      `--image=${image}`,
      "--restart=Never",
      `--overrides=${overrides}`,
      "--rm",
      "--attach=true",
    ];

    if (useTty) {
      runArgs.push("-it");
    } else {
      runArgs.push("-i");
    }

    return new Promise((resolve, reject) => {
      const child = spawn(kubectlBin, runArgs, {
        env: input.environment,
        stdio: "inherit",
      });

      child.on("error", reject);
      child.on("close", resolve);
    });
  }

  private buildOverrides(
    command: [string, ...string[]],
    image: string,
    useTty: boolean,
  ): string {
    const pod: KubernetesPod = {
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: SESSION_POD_NAME,
        labels: {
          "app.kubernetes.io/name": "jackdaw",
          "app.kubernetes.io/component": "session",
        },
      },
      spec: {
        restartPolicy: "Never",
        containers: [
          {
            name: "jackdaw",
            image,
            imagePullPolicy: "IfNotPresent",
            command: [command[0]],
            args: command.slice(1),
            stdin: true,
            tty: useTty,
            resources: {
              requests: {
                memory: "1Gi",
              },
              limits: {
                memory: "1Gi",
              },
            },
          },
        ],
      },
    };

    return JSON.stringify(pod);
  }

  private async resolveNamespace(
    kubectlBin: string,
    environment: KubectlSessionEnvironment,
  ): Promise<string> {
    const namespace = this.firstValue(environment.JACKDAW_K8S_NAMESPACE);

    if (namespace) {
      return namespace;
    }

    const currentNamespace = await this.execKubectl(
      kubectlBin,
      ["config", "view", "--minify", "--output", "jsonpath={..namespace}"],
      environment,
    );

    return this.firstValue(currentNamespace) ?? "default";
  }

  private async execKubectl(
    kubectlBin: string,
    args: string[],
    environment: KubectlSessionEnvironment,
  ): Promise<string> {
    const { stdout } = await execFileAsync(kubectlBin, args, {
      env: environment,
      maxBuffer: 10 * 1024 * 1024,
    });

    return stdout.trim();
  }

  private sessionImage(): string {
    return `${SESSION_IMAGE_REPOSITORY}:${this.projectVersion}`;
  }

  private firstValue(value: string | undefined): string | undefined {
    if (value === undefined || value.trim().length === 0) {
      return undefined;
    }

    return value.trim();
  }
}
