#!/usr/bin/env bash

__DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

versions="$(curl -s http://nodejs.org/dist/ | egrep 'v8|v9|v10|v11' |grep -v latest| awk -F '"' '{print $2}' | tr -d / | tr -d v)"

cd "$__DIRNAME/.."

for version in $versions; do 
  echo "Creating layer for $version"
  yarn run create-binary-layer $version
done
