#!/usr/bin/env node

import { Command } from "commander";
import packageJson from "../../../../package.json";
import { ClusterDiscoveryService } from "../../../services/cluster-discovery/cluster-discovery.service";
import { VersionService } from "../../../services/version/version.service";

const clusterDiscoveryService = new ClusterDiscoveryService();
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

program.parse();
