#!/bin/sh
set -eu

HSD_PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
HSD_TOOLS_DIR="$HSD_PROJECT_ROOT/.tools"
HSD_DOWNLOAD_DIR="$HSD_TOOLS_DIR/downloads"
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

HSD_NODE_NAME="node-v${HSD_NODE_VERSION}-${HSD_PLATFORM}"
HSD_NODE_ARCHIVE="${HSD_NODE_NAME}.tar.gz"
HSD_NODE_HOME="$HSD_TOOLS_DIR/$HSD_NODE_NAME"
HSD_NODE_URL="https://nodejs.org/dist/v${HSD_NODE_VERSION}/${HSD_NODE_ARCHIVE}"
HSD_SHASUMS_URL="https://nodejs.org/dist/v${HSD_NODE_VERSION}/SHASUMS256.txt"

if [ -x "$HSD_NODE_HOME/bin/node" ]; then
  HSD_INSTALLED_VERSION=$("$HSD_NODE_HOME/bin/node" --version)
  if [ "$HSD_INSTALLED_VERSION" = "v${HSD_NODE_VERSION}" ]; then
    echo "HSD Node ${HSD_INSTALLED_VERSION} is already installed."
    exit 0
  fi

  echo "Existing HSD Node runtime has unexpected version: ${HSD_INSTALLED_VERSION}" >&2
  exit 1
fi

if [ -e "$HSD_NODE_HOME" ]; then
  echo "Incomplete HSD Node directory already exists: ${HSD_NODE_HOME}" >&2
  echo "Do not overwrite it automatically. Stop and inspect it." >&2
  exit 1
fi

mkdir -p "$HSD_DOWNLOAD_DIR"

curl --fail --location --proto '=https' --tlsv1.2 \
  --output "$HSD_DOWNLOAD_DIR/$HSD_NODE_ARCHIVE" \
  "$HSD_NODE_URL"

curl --fail --location --proto '=https' --tlsv1.2 \
  --output "$HSD_DOWNLOAD_DIR/SHASUMS256.txt" \
  "$HSD_SHASUMS_URL"

HSD_EXPECTED_HASH=$(awk -v archive="$HSD_NODE_ARCHIVE" \
  '$2 == archive { print $1 }' \
  "$HSD_DOWNLOAD_DIR/SHASUMS256.txt")

if [ -z "$HSD_EXPECTED_HASH" ]; then
  echo "Node archive checksum was not found in SHASUMS256.txt." >&2
  exit 1
fi

if command -v shasum >/dev/null 2>&1; then
  HSD_ACTUAL_HASH=$(shasum -a 256 "$HSD_DOWNLOAD_DIR/$HSD_NODE_ARCHIVE" | awk '{ print $1 }')
else
  HSD_ACTUAL_HASH=$(sha256sum "$HSD_DOWNLOAD_DIR/$HSD_NODE_ARCHIVE" | awk '{ print $1 }')
fi

if [ "$HSD_EXPECTED_HASH" != "$HSD_ACTUAL_HASH" ]; then
  echo "Node archive checksum mismatch." >&2
  echo "Expected: $HSD_EXPECTED_HASH" >&2
  echo "Actual:   $HSD_ACTUAL_HASH" >&2
  exit 1
fi

tar -xzf "$HSD_DOWNLOAD_DIR/$HSD_NODE_ARCHIVE" -C "$HSD_TOOLS_DIR"

HSD_INSTALLED_VERSION=$("$HSD_NODE_HOME/bin/node" --version)

if [ "$HSD_INSTALLED_VERSION" != "v${HSD_NODE_VERSION}" ]; then
  echo "Installed Node version is incorrect: ${HSD_INSTALLED_VERSION}" >&2
  exit 1
fi

echo "Installed HSD Node ${HSD_INSTALLED_VERSION} at ${HSD_NODE_HOME}"
