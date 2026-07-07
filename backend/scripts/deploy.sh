#!/usr/bin/env bash

set -euo pipefail

PM2_APP_NAME="${PM2_APP_NAME:-shopsphere-api}"
APP_DIR="${APP_DIR:-/opt/apps/shopsphere_api}"
CONFIG_DIR="${CONFIG_DIR:-/opt/configs/shopsphere_api}"
JAR_SOURCE="${JAR_SOURCE:-target/ecom-app-0.0.1-SNAPSHOT.jar}"
JAR_TARGET="${JAR_TARGET:-$APP_DIR/shopsphere-api.jar}"
ENV_FILE="${ENV_FILE:-$CONFIG_DIR/.env}"

load_env_file() {
  local env_file="$1"
  local line key value

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue

    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"

      if [[ "$value" =~ ^\"(.*)\"$ ]]; then
        value="${BASH_REMATCH[1]}"
      elif [[ "$value" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi

      export "$key=$value"
    fi
  done < "$env_file"
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

if [[ ! -f "$JAR_SOURCE" ]]; then
  echo "Build artifact not found: $JAR_SOURCE"
  exit 1
fi

mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/logs"

cp "$JAR_SOURCE" "$JAR_TARGET"

load_env_file "$ENV_FILE"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is required on the self-hosted runner."
  exit 1
fi

PM2_CMD=(
  pm2
  start
  "$JAR_TARGET"
  --name "$PM2_APP_NAME"
  --cwd "$APP_DIR"
  --interpreter java
  --interpreter-args "-jar"
  --time
  --update-env
)

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  "${PM2_CMD[@]}"
fi

pm2 save
