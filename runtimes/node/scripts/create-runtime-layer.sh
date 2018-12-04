#!/usr/bin/env bash

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo >&2 "\"AWS_ACCESS_KEY_ID\" and \"AWS_SECRET_ACCESS_KEY\" env vars are required"
  exit 1
fi

set -euo pipefail

__DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

layers_json_path="$__DIRNAME/../runtime-layers.json"

version="$(cat "$__DIRNAME/../package.json" | jq -r .version | tr . -)"

node "$__DIRNAME/../../scripts/create-layer.js" \
  --aws-access-key-id "$AWS_ACCESS_KEY_ID" \
  --aws-secret-access-key "$AWS_SECRET_ACCESS_KEY" \
  --name "node-runtime-$version" \
  --dir-path "$__DIRNAME/../dist" \
  --layers-json-path "$layers_json_path" \
  --key-for-layers-json "$version" 
