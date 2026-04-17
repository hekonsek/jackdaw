# topic list

This command lists topics in the cluster.

## Topics provider

Under the hood `kafka-topics.sh` script is executed.

## Connectivity logic

If bootstrap URL is not provided via `--bootstrap-url`, this command uses `cluster discovery` logic to attempt to find it.

If `--scram-username` and `--scram-password` are provided then command genarates command config file and injects these values into it. Then `kafka-topics.sh` uses that file for authentication.