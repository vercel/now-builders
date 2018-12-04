#!/usr/bin/env bash

node_version="$1"
directory="$2"

if [ -z "$node_version" ] || [ -z "$directory" ]; then
  echo >&2 "Error: Missing arguments"
  echo >&2 "Usage: download-nodejs.sh version directory"
  exit 1
fi

set -euo pipefail

url="https://nodejs.org/dist/v$node_version/node-v$node_version-linux-x64.tar.xz"

set +e
status_code="$(curl $url -sX HEAD -w "%{http_code}")"
set -e

if [ "$status_code" != "200" ]; then
  echo >&2 "Error: couldn't download Node.js $node_version"
  echo >&2 "       URL \"$url\" returned HTTP \"$status_code\""
  exit 1
fi

sanitized_node_version="$(echo "$node_version" | tr . -)"
tmp_dir="$(mktemp -d)"
tarball_path="$tmp_dir/$sanitized_node_version.tar.xz"

curl -o "$tarball_path" "$url"

mkdir -p "$directory"
tar -xf "$tarball_path" -C "$directory" 

cd "$directory"

mv node*/bin .
mv node*/lib .
rm -rf node*
