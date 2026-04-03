#!/usr/bin/env node

import { Command } from "commander";
import packageJson from "../../../../package.json";
import { VersionService } from "../../../services/version/version.service";

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

program.parse();
