# Bibliophagist Library Typesense image — self-hosted search index, no persistent disk.
#
# Why this exists: The free hosting tier (Northflank) has no persistent volume here,
# so a plain `typesense/typesense` container loses its whole index on every
# spin-down/restart. Instead of paying for a disk, we treat Sanity as the
# real source of truth and rebuild the index from scratch every time this
# container boots (see docker-entrypoint.sh). That means every cold start
# is a little slower (has to re-fetch + re-index all books first), but
# nothing is ever actually lost — Sanity always has the real data.
#
# Build context for this Dockerfile should be the REPO ROOT (not this
# folder), since it needs scripts/typesense/ from the main app. On Northflank:
#   - Build context: / (repo root)
#   - Dockerfile Path: typesense/Dockerfile

FROM typesense/typesense:29.0

# The base image is Ubuntu 22.04 with just the typesense-server binary at
# /opt/typesense-server (no package manager conveniences pre-installed) —
# so we install Node.js ourselves to run the sync script.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY scripts/typesense/package.json ./scripts/typesense/package.json
RUN cd scripts/typesense && npm install --omit=dev

COPY scripts/typesense ./scripts/typesense
COPY typesense/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Ephemeral — NOT a mounted volume. Wiped on every restart, which is the
# whole point: the entrypoint script rebuilds it from Sanity every boot.
ENV TYPESENSE_DATA_DIR=/data
ENV TYPESENSE_INTERNAL_PORT=8108

EXPOSE 8108
STOPSIGNAL SIGINT

ENTRYPOINT ["/docker-entrypoint.sh"]
