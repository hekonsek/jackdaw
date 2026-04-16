export interface ClusterDiscoveryEnvironment {
  [key: string]: string | undefined;
}

export interface ClusterDiscoveryInput {
  environment: ClusterDiscoveryEnvironment;
}

export type ClusterDiscoveryResult =
  | {
      detected: false;
    }
  | {
      detected: true;
      bootstrapConnectionUrl: string;
      bootstrapHost: string;
      bootstrapPort: string;
      bootstrapHostEnvironmentVariable: string;
      bootstrapPortEnvironmentVariable?: string;
    };

interface BootstrapPort {
  port: string;
  environmentVariable?: string;
}

export class ClusterDiscoveryService {
  discover(input: ClusterDiscoveryInput): ClusterDiscoveryResult {
    const bootstrapHost = this.findBootstrapHost(input.environment);

    if (!bootstrapHost) {
      return {
        detected: false,
      };
    }

    const bootstrapPort = this.findBootstrapPort(
      input.environment,
      bootstrapHost.baseEnvironmentVariableName,
    );

    return {
      detected: true,
      bootstrapConnectionUrl: `${bootstrapHost.host}:${bootstrapPort.port}`,
      bootstrapHost: bootstrapHost.host,
      bootstrapPort: bootstrapPort.port,
      bootstrapHostEnvironmentVariable: bootstrapHost.environmentVariable,
      bootstrapPortEnvironmentVariable: bootstrapPort.environmentVariable,
    };
  }

  private findBootstrapHost(environment: ClusterDiscoveryEnvironment):
    | {
        host: string;
        environmentVariable: string;
        baseEnvironmentVariableName: string;
      }
    | undefined {
    const hostEnvironmentVariable = Object.keys(environment)
      .filter((environmentVariable) =>
        environmentVariable.endsWith("_KAFKA_BOOTSTRAP_SERVICE_HOST"),
      )
      .filter((environmentVariable) =>
        this.hasValue(environment[environmentVariable]),
      )
      .sort()[0];

    if (!hostEnvironmentVariable) {
      return undefined;
    }

    return {
      host: environment[hostEnvironmentVariable]!.trim(),
      environmentVariable: hostEnvironmentVariable,
      baseEnvironmentVariableName: hostEnvironmentVariable.replace(
        /_SERVICE_HOST$/,
        "",
      ),
    };
  }

  private findBootstrapPort(
    environment: ClusterDiscoveryEnvironment,
    baseEnvironmentVariableName: string,
  ): BootstrapPort {
    const portEnvironmentVariables = [
      `${baseEnvironmentVariableName}_SERVICE_PORT_TCP_CLIENTS`,
      `${baseEnvironmentVariableName}_SERVICE_PORT_CLIENTS`,
      `${baseEnvironmentVariableName}_PORT_9092_TCP_PORT`,
      `${baseEnvironmentVariableName}_PORT_9092_TCP`,
      `${baseEnvironmentVariableName}_SERVICE_PORT`,
      `${baseEnvironmentVariableName}_PORT`,
    ];

    for (const portEnvironmentVariable of portEnvironmentVariables) {
      const port = this.parsePort(environment[portEnvironmentVariable]);

      if (port) {
        return {
          port,
          environmentVariable: portEnvironmentVariable,
        };
      }
    }

    return {
      port: "9092",
    };
  }

  private parsePort(value: string | undefined): string | undefined {
    if (!this.hasValue(value)) {
      return undefined;
    }

    const trimmedValue = value.trim();

    if (/^\d+$/.test(trimmedValue)) {
      return trimmedValue;
    }

    try {
      const url = new URL(trimmedValue);

      if (url.port) {
        return url.port;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  private hasValue(value: string | undefined): value is string {
    return value !== undefined && value.trim().length > 0;
  }
}
