#!/bin/bash
# Integration test: preview + dev server
# Usage: bash tests/serve_test.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$ROOT/packages/cli/mod.ts"
SHOWCASE="$ROOT/examples/showcase"
DENO_BIN="${DENO:-$(command -v deno || echo /Users/jel1yspot/.deno/bin/deno)}"
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

cleanup() {
  kill_port 9200
  kill_port 9201
  kill_port 9300
  kill_port 9301
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

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null || true
  fi
}

wait_for() {
  local port=$1 retries=${2:-20}
  for i in $(seq 1 $retries); do
    if curl -sf "http://localhost:$port/" > /dev/null 2>&1; then return 0; fi
    sleep 0.5
  done
  return 1
}

get_hash() {
  grep -oE '"[a-f0-9]{8}"' "$1" 2>/dev/null | head -1 | tr -d '"' || true
}

get_rspack_hash() {
  {
    grep -oE '"id"[[:space:]]*:[[:space:]]*"[a-f0-9]{8}"' "$1" 2>/dev/null
    grep -oE '"[a-f0-9]{8}"[[:space:]]*:' "$1" 2>/dev/null
  } | head -1 | grep -oE '[a-f0-9]{8}' || true
}

get_asset_path() {
  local html=$1 ext=$2
  echo "$html" | grep -oE "(src|href)=\"/assets/[^\"]+\\.$ext\"" | head -1 | cut -d'"' -f2
}

# ── Test: preview ────────────────────────────────────────

echo "=== Preview test ==="
cleanup

cat > "$SHOWCASE/ultimate.config.ts" << 'CONF'
import { defineConfig } from "@ultimate-js/core";
import type { UltimateConfig } from "@ultimate-js/core";
const config: UltimateConfig = defineConfig({
  server: { port: 9200, endpoint: "/preview/rpc" },
  dev: { port: 9200, apiPort: 9201 },
});
export default config;
CONF

"$DENO_BIN" run -A "$CLI" build "$SHOWCASE" --bundler rspack --parser babel --rpc-endpoint /preview/rpc > /dev/null 2>&1
"$DENO_BIN" run -A "$CLI" preview "$SHOWCASE" --bundler rspack --parser babel --port 9200 --api-port 9201 --rpc-endpoint /preview/rpc > /dev/null 2>&1 &
SERVER_PID=$!

if wait_for 9200; then
  # HTML
  HTML=$(curl -s http://localhost:9200/)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/)
  [ "$STATUS" = "200" ] && pass "preview HTML 200" || fail "preview HTML got $STATUS"

  # JS
  JS_PATH=$(get_asset_path "$HTML" "js")
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9200$JS_PATH")
  [ "$STATUS" = "200" ] && pass "preview JS 200" || fail "preview JS got $STATUS"

  # CSS
  CSS_PATH=$(get_asset_path "$HTML" "css")
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9200$CSS_PATH")
  [ "$STATUS" = "200" ] && pass "preview CSS 200" || fail "preview CSS got $STATUS"

  # RPC
  HASH=$(get_rspack_hash "$SHOWCASE/dist/server/main.ts")
  if [ -n "$HASH" ]; then
    BODY=$(curl -s -X POST "http://localhost:9200/preview/rpc/$HASH" \
      -H "Content-Type: application/json" \
      -d '{"type":"RemoteFunctionCalling","version":1,"args":[]}')
    echo "$BODY" | grep -q '"ok":true' && pass "preview RPC static port" || fail "preview RPC static: $BODY"

    BODY=$(curl -s -X POST "http://localhost:9201/preview/rpc/$HASH" \
      -H "Content-Type: application/json" \
      -d '{"type":"RemoteFunctionCalling","version":1,"args":[]}')
    echo "$BODY" | grep -q '"ok":true' && pass "preview RPC api port" || fail "preview RPC api: $BODY"
  else
    fail "preview RPC function id missing"
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

"$DENO_BIN" run -A "$CLI" dev "$SHOWCASE" > /dev/null 2>&1 &
DEV_PID=$!

if wait_for 9300 30; then
  # HTML
  HTML=$(curl -s http://localhost:9300/)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9300/)
  [ "$STATUS" = "200" ] && pass "dev HTML 200" || fail "dev HTML got $STATUS"

  # JS
  JS_PATH=$(get_asset_path "$HTML" "js")
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9300$JS_PATH")
  [ "$STATUS" = "200" ] && pass "dev JS 200" || fail "dev JS got $STATUS"

  # CSS
  CSS_PATH=$(get_asset_path "$HTML" "css")
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9300$CSS_PATH")
  [ "$STATUS" = "200" ] && pass "dev CSS 200" || fail "dev CSS got $STATUS"

  # RPC on static port
  if [ -f "$SHOWCASE/.ultimate/generated/server-manifest.ts" ]; then
    HASH=$(get_hash "$SHOWCASE/.ultimate/generated/server-manifest.ts")
  else
    HASH=$(get_rspack_hash "$SHOWCASE/.ultimate/rspack/server-function-ids.json")
  fi
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
  else
    fail "dev RPC function id missing"
  fi
else
  fail "dev server did not start"
fi

kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null || true

# ── Summary ──────────────────────────────────────────────

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
