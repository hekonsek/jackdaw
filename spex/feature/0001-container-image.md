# Container image

This project comes with container image deployed into GitHub registry. Image contains both Kafka distribution and this CLI project itself. You can use that image to deploy it into Kubernetes container running your Kafka cluster. 

After exec-ing into this pod you can run both Kafka tooling from Kafka distribution or invoke this CLI tool named `jawdaw`.

## Release process

This project comes with release.yml/Release GitHub Action which is trigerred manually and:
- bumps minor node project version
- pushes version changes and tags into Git
- builds container images and pushes it into GitHub registry with appriopriate version tag
- project supports both x86 and ARM64 container images