#!/usr/bin/env bash

node_version="$1"

if [ -z "$node_version" ]; then
  echo >&2 "Error: Missing Node version"
  echo >&2 "Usage: create-binary-layer.sh node_version"
  exit 1
fi

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo >&2 "\"AWS_ACCESS_KEY_ID\" and \"AWS_SECRET_ACCESS_KEY\" env vars are required"
  exit 1
fi

set -euo pipefail

__DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

directory="$(mktemp -d)"
"$__DIRNAME/download-nodejs.sh" "$node_version" "$directory"

layers_json_path="$__DIRNAME/../binary-layers.json"
sanitized_node_version="$(echo "$node_version" | tr . -)"

node "$__DIRNAME/../../scripts/create-layer.js" \
  --aws-access-key-id "$AWS_ACCESS_KEY_ID" \
  --aws-secret-access-key "$AWS_SECRET_ACCESS_KEY" \
  --name "node-$sanitized_node_version" \
  --dir-path "$directory" \
  --layers-json-path "$layers_json_path" \
  --key-for-layers-json "$node_version"
