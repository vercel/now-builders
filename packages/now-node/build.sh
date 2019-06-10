#!/bin/bash
set -euo pipefail

# build ts files
tsc

# bundle helpers.ts with ncc
rm dist/helpers.js
ncc build src/helpers.ts -o dist/helpers
mv dist/helpers/index.js dist/helpers.js
rm -rf dist/helpers

# todo: improve
# copy type file for ts test
cp dist/types.d.ts test/fixtures/15-helpers/ts/types.d.ts
