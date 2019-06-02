#!/bin/bash
exec 1> /dev/null
yum install -y -q tar git xz gcc openssl-devel
curl -s -o ./nim.tar.xz https://nim-lang.org/download/nim-0.19.6.tar.xz
tar -xf ./nim.tar.xz

cd ./nim-0.19.6
. ./build.sh
./bin/nim c koch
./koch tools

export PATH="$(realpath ./bin):$PATH"

cd ../app
nimble install -y

cd ..
mkdir bin
cp app/server bin/handler

rm ./nim.tar.xz
rm -r ./nim-0.19.6
