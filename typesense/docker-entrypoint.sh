#!/bin/sh
set -e

echo "Starting Typesense (data dir: $TYPESENSE_DATA_DIR, ephemeral — not a persistent volume)..."
mkdir -p "$TYPESENSE_DATA_DIR"

/opt/typesense-server \
  --data-dir "$TYPESENSE_DATA_DIR" \
  --api-key="$TYPESENSE_API_KEY" \
  --listen-port "$TYPESENSE_INTERNAL_PORT" &
TYPESENSE_PID=$!

# Wait for Typesense to accept connections before we try to index into it.
echo "Waiting for Typesense to become healthy..."
until curl -sf "http://localhost:${TYPESENSE_INTERNAL_PORT}/health" > /dev/null 2>&1; do
  sleep 1
done
echo "Typesense is up."

# Rebuild the index from Sanity. This is what replaces persistent disk —
# every boot starts from an empty index and repopulates it from the real
# source of truth. If this fails, we deliberately do NOT exit: Typesense
# stays up and serves whatever it has (empty, on a first boot) rather than
# crash-looping the whole service over a transient Sanity/network hiccup.
echo "Running full sync from Sanity..."
if node /app/scripts/typesense/sync-typesense-container.mjs; then
  echo "Sync complete — index is populated."
else
  echo "WARNING: sync failed. Typesense is running but the index may be empty or stale."
  echo "It will retry on the next restart, or you can trigger scripts/sync-typesense.mjs manually."
fi

# Hand off to Typesense as the foreground process so Northflank's process
# supervision (restarts, signal handling) targets the right PID.
wait "$TYPESENSE_PID"
