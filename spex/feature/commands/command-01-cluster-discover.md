# cluster discover

`cluster discover` command attempts to return connectivity information related to the current cluster.

## Discovery logic

Jackdaw checks Strimzi internal bootstrap service endpoint (`*-kafka-bootstrap`) is accessible via environment variable. If not, the command says that cluster cannot be detected. If bootstrap endpoint environment variable is present, then bootstrap connection URL is displayed. 