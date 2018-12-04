#!/usr/bin/env bash

rm -rf dist/index.js
rm -rf dist/bootstrap
ncc build runtime.js -o dist
cd dist
echo '#!/usr/bin/env /opt/bin/node' >> bootstrap
cat index.js >> bootstrap
rm index.js
chmod +x bootstrap
