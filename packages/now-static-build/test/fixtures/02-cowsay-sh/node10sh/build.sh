NODEVERSION=$(node --version)
NPMVERSION=$(npm --version)

mkdir public
echo "node:$NODEVERSION:RANDOMNESS_PLACEHOLDER" >> public/index.txt
echo "npm:$NPMVERSION:RANDOMNESS_PLACEHOLDER" >> public/index.txt

