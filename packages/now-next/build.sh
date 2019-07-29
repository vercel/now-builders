#!/bin/bash
set -euo pipefail

bridge_defs="$(dirname $(pwd))/now-node-bridge/src/bridge.ts"

cp -v "$bridge_defs" src/now__bridge.ts

tsc
