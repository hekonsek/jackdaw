FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY src ./src

RUN npm ci
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ARG KAFKA_VERSION=4.1.0
ARG SCALA_VERSION=2.13
ARG KAFKA_DOWNLOAD_URL=https://archive.apache.org/dist/kafka/${KAFKA_VERSION}/kafka_${SCALA_VERSION}-${KAFKA_VERSION}.tgz

ENV JACKDAW_HOME=/opt/jackdaw
ENV KAFKA_HOME=/opt/kafka
ENV PATH=/opt/kafka/bin:/usr/local/bin:${PATH}

RUN DEBIAN_FRONTEND=noninteractive apt-get update \
  && apt-get install --yes --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    openjdk-17-jre-headless \
    tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR ${JACKDAW_HOME}

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN curl --fail --show-error --location "${KAFKA_DOWNLOAD_URL}" --output /tmp/kafka.tgz \
  && tar -xzf /tmp/kafka.tgz -C /opt \
  && mv /opt/kafka_${SCALA_VERSION}-${KAFKA_VERSION} ${KAFKA_HOME} \
  && rm /tmp/kafka.tgz \
  && chmod +x /usr/local/bin/docker-entrypoint.sh \
  && printf '%s\n' '#!/usr/bin/env bash' 'set -euo pipefail' 'exec node /opt/jackdaw/dist/adapters/in/cli/cli.js "$@"' > /usr/local/bin/jackdaw \
  && chmod +x /usr/local/bin/jackdaw \
  && ln -s /usr/local/bin/jackdaw /usr/local/bin/jawdaw

ENTRYPOINT ["tini", "--", "docker-entrypoint.sh"]
CMD []
