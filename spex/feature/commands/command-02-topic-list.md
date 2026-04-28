# topic list

This command lists topics in the cluster.

## Topics provider

Under the hood `kafka-topics.sh` script is executed.

## Data presented

Topic list displays list of topics with the following data:
- topic name
- Partition count
- Replication factor

## Connectivity logic

If bootstrap URL is not provided via `--bootstrap-url`, this command uses `cluster discovery` logic to attempt to find it.

If `--scram-username` and `--scram-password` are provided then command genarates command config file and injects these values into it. Then `kafka-topics.sh` uses that file for authentication.

## Other options

`--kubectl` : Executes command in [kubectl mode](../0002-kubectl-mode.md).