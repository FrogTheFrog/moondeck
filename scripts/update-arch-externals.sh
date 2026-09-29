#!/bin/sh
# Regenerates defaults/python/externals-<arch> from defaults/python/requirements-<arch>.txt.
# Run on any machine with pip after bumping versions in requirements.txt.
set -eu

cd "$(dirname "$0")/../defaults/python"

for req in requirements-*.txt; do
    arch="${req#requirements-}"
    arch="${arch%.txt}"
    rm -rf "externals-$arch"
    pip install -r "$req" -t "externals-$arch" --no-deps --only-binary=:all: --platform "manylinux2014_$arch"
done
