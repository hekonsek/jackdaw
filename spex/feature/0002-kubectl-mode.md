# Kubectl mode

Many of the Jackdaw commands offers `--kubectl` option. If given command supports this option and it is enabled, given command will be executed in pod deployed into a current Kubernetes context.

For example `jackdaw topic list` command can be executed as `jackdaw topic list --kubectl` . In such case jackdaw container will be deployed as pod into a current current Kubernetes context, `jackdaw topic list` command will be executed within that pod and list of topics will be printed back to caller.

## Kubernetes namespace

Kubernetes namespace can be overriden by `JACKDAW_K8S_NAMESPACE` environment variable. For example:

```bash
JACKDAW_K8S_NAMESPACE=kafka jackdaw topic list --kubectl
```