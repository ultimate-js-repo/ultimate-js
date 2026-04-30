#!/bin/bash
# Integration test: preview + dev server
# Usage: bash tests/serve_test.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$ROOT/packages/cli/mod.ts"
SHOWCASE="$ROOT/examples/showcase"
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

cleanup() {
  fuser -k 9200/tcp 2>/dev/null || true
  fuser -k 9300/tcp 2>/dev/null || true
  fuser -k 9301/tcp 2>/dev/null || true
  rm -rf "$SHOWCASE/.ultimate" "$SHOWCASE/dist"
  cat > "$SHOWCASE/ultimate.config.ts" << 'EOF'
import { defineConfig } from "@ultimate-js/core";

export default defineConfig({
  server: {
    port: 8000,
    endpoint: "/_ultimate/rpc",
  },
  dev: {
    port: 8000,
    apiPort: 8001,
  },
});
EOF
}
trap cleanup EXIT

wait_for() {
  local port=$1 retries=${2:-20}
  for i in $(seq 1 $retries); do
    if curl -sf "http://localhost:$port/" > /dev/null 2>&1; then return 0; fi
    sleep 0.5
  done
  return 1
}

get_hash() {
  grep -oP '"[a-f0-9]{8}"' "$1" | head -1 | tr -d '"'
}

# ── Test: preview ────────────────────────────────────────

echo "=== Preview test ==="
cleanup

cat > "$SHOWCASE/ultimate.config.ts" << 'CONF'
import { defineConfig } from "@ultimate-js/core";
import type { UltimateConfig } from "@ultimate-js/core";
const config: UltimateConfig = defineConfig({
  server: { port: 9200, endpoint: "/_ultimate/rpc" },
  dev: { port: 9200, apiPort: 9201 },
});
export default config;
CONF

deno run -A "$CLI" build "$SHOWCASE" > /dev/null 2>&1
deno run -A "$CLI" preview "$SHOWCASE" > /dev/null 2>&1 &
SERVER_PID=$!

if wait_for 9200; then
  # HTML
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/)
  [ "$STATUS" = "200" ] && pass "preview HTML 200" || fail "preview HTML got $STATUS"

  # JS
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/assets/client.js)
  [ "$STATUS" = "200" ] && pass "preview JS 200" || fail "preview JS got $STATUS"

  # RPC
  HASH=$(get_hash "$SHOWCASE/dist/server/.ultimate/generated/server-manifest.ts")
  if [ -n "$HASH" ]; then
    BODY=$(curl -s -X POST "http://localhost:9200/_ultimate/rpc/$HASH" \
      -H "Content-Type: application/json" \
      -d '{"type":"RemoteFunctionCalling","version":1,"args":[]}')
    echo "$BODY" | grep -q '"ok":true' && pass "preview RPC ok" || fail "preview RPC: $BODY"
  fi
else
  fail "preview server did not start"
fi

kill $SERVER_PID 2>/dev/null; wait $SERVER_PID 2>/dev/null || true

# ── Test: dev ────────────────────────────────────────────

echo "=== Dev test ==="
cleanup

cat > "$SHOWCASE/ultimate.config.ts" << 'CONF'
import { defineConfig } from "@ultimate-js/core";
import type { UltimateConfig } from "@ultimate-js/core";
const config: UltimateConfig = defineConfig({
  server: { port: 9300, endpoint: "/_ultimate/rpc" },
  dev: { port: 9300, apiPort: 9301 },
});
export default config;
CONF

deno run -A "$CLI" dev "$SHOWCASE" > /dev/null 2>&1 &
DEV_PID=$!

if wait_for 9300 30; then
  # HTML
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9300/)
  [ "$STATUS" = "200" ] && pass "dev HTML 200" || fail "dev HTML got $STATUS"

  # JS
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9300/assets/client.js)
  [ "$STATUS" = "200" ] && pass "dev JS 200" || fail "dev JS got $STATUS"

  # RPC on static port
  HASH=$(get_hash "$SHOWCASE/.ultimate/generated/server-manifest.ts")
  if [ -n "$HASH" ]; then
    BODY=$(curl -s -X POST "http://localhost:9300/_ultimate/rpc/$HASH" \
      -H "Content-Type: application/json" \
      -d '{"type":"RemoteFunctionCalling","version":1,"args":[]}')
    echo "$BODY" | grep -q '"ok":true' && pass "dev RPC static port" || fail "dev RPC static: $BODY"

    # RPC on API port
    BODY=$(curl -s -X POST "http://localhost:9301/_ultimate/rpc/$HASH" \
      -H "Content-Type: application/json" \
      -d '{"type":"RemoteFunctionCalling","version":1,"args":[]}')
    echo "$BODY" | grep -q '"ok":true' && pass "dev RPC api port" || fail "dev RPC api: $BODY"
  fi
else
  fail "dev server did not start"
fi

kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null || true

# ── Summary ──────────────────────────────────────────────

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
