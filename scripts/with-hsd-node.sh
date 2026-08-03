#!/bin/sh
set -eu

HSD_PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
HSD_NODE_HOME="$HSD_PROJECT_ROOT/.tools/node-v22.19.0-darwin-x64"
HSD_COREPACK_HOME="$HSD_PROJECT_ROOT/.tools/corepack"

if [ ! -x "$HSD_NODE_HOME/bin/node" ]; then
  echo "HSD Node 22.19.0 is not installed." >&2
  echo "Run: sh scripts/install-hsd-node.sh" >&2
  exit 1
fi

PATH="$HSD_NODE_HOME/bin:$PATH"
COREPACK_HOME="$HSD_COREPACK_HOME"

export PATH
export COREPACK_HOME

exec "$@"
