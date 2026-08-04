#!/bin/sh
set -eu

HSD_PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
HSD_NODE_VERSION="22.19.0"
HSD_SYSTEM=$(uname -s)
HSD_MACHINE=$(uname -m)

case "$HSD_SYSTEM:$HSD_MACHINE" in
  Darwin:x86_64) HSD_PLATFORM="darwin-x64" ;;
  Darwin:arm64) HSD_PLATFORM="darwin-arm64" ;;
  Linux:x86_64) HSD_PLATFORM="linux-x64" ;;
  Linux:aarch64|Linux:arm64) HSD_PLATFORM="linux-arm64" ;;
  *)
    echo "Unsupported platform: ${HSD_SYSTEM} ${HSD_MACHINE}. On Windows, use nvs and Node ${HSD_NODE_VERSION}." >&2
    exit 1
    ;;
esac

HSD_NODE_HOME="$HSD_PROJECT_ROOT/.tools/node-v${HSD_NODE_VERSION}-${HSD_PLATFORM}"
HSD_COREPACK_HOME="$HSD_PROJECT_ROOT/.tools/corepack"

if [ ! -x "$HSD_NODE_HOME/bin/node" ]; then
  echo "HSD Node ${HSD_NODE_VERSION} is not installed for ${HSD_PLATFORM}." >&2
  echo "Run: sh scripts/install-hsd-node.sh" >&2
  exit 1
fi

PATH="$HSD_NODE_HOME/bin:$PATH"
COREPACK_HOME="$HSD_COREPACK_HOME"

export PATH
export COREPACK_HOME

exec "$@"
