# jackdaw: Toolkit for inspecting Kafka clusters

Jackdaw is a toolkit that makes it easier to inspect Kafka clusters.

## Development

Install dependencies:

```bash
npm install
```

Run the CLI in development mode:

```bash
npm run dev -- version
```

Build the project:

```bash
npm run build
```

## Container Image

The repository includes a `Dockerfile` that bundles:

- the built `jackdaw` CLI
- an Apache Kafka distribution

By default the image uses Kafka `4.1.0` with Scala `2.13`, and both values can be overridden with Docker build args.

Build the image locally:

```bash
docker build -t jackdaw:local .
```

Run the CLI from the image:

```bash
docker run --rm jackdaw:local jackdaw version
```

Start the image in idle mode for later `docker exec` or `kubectl exec` use:

```bash
docker run -d --name jackdaw-tools jackdaw:local
```

The image also exposes `jawdaw` as an alias because the feature specification refers to that command name.

## Release

The repository includes a manual GitHub Actions workflow at `.github/workflows/release.yml`.

When triggered, it:

- bumps the project minor version in `package.json`
- updates `package-lock.json`
- commits and tags the release in Git
- builds and pushes `linux/amd64` and `linux/arm64` images to GHCR

Published image tags:

- `ghcr.io/<owner>/<repo>:<version>`
