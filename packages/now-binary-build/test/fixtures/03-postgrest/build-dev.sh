#!/bin/bash
yum install -y perl make automake gcc gmp-devel libffi zlib xz tar gzip git gnupg postgresql-devel
curl -sSL https://get.haskellstack.org/ | sh
git clone https://github.com/PostgREST/postgrest.git
cd postgrest
mkdir bin
stack build --install-ghc --copy-bins --local-bin-path ./bin
