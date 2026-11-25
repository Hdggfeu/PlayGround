#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_DIR="$(cd "${PROJECT_DIR:-$script_dir}" && pwd -P)"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
export PORT

run() { /usr/bin/time -p "$@"; }

run test -d "$PROJECT_DIR/public"
if [[ -f "$PROJECT_DIR/package.json" ]]; then
  if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then
    run npm ci
  else
    run npm install
  fi
  if run node -e "process.exit(require('./package.json').scripts?.build ? 0 : 1)"; then
    run npm run build
  else
    run mkdir -p "$PROJECT_DIR/dist"
    run cp -R "$PROJECT_DIR/public/." "$PROJECT_DIR/dist/"
  fi
else
  run mkdir -p "$PROJECT_DIR/dist"
  run cp -R "$PROJECT_DIR/public/." "$PROJECT_DIR/dist/"
fi

run test -f "$PROJECT_DIR/dist/index.html"
web_dir="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
run mkdir -p "$web_dir"
PROJECT_DIR="$PROJECT_DIR" BUILT_DIR="$PROJECT_DIR/dist" DEPLOYMENT_FILE="$web_dir/deployment-output.json" \
  run python3 -c 'import json, os; data={"project":os.environ["PROJECT_DIR"],"directory":os.environ["BUILT_DIR"]}; open(os.environ["DEPLOYMENT_FILE"],"w").write(json.dumps(data)+"\n")'
run python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$PROJECT_DIR/dist"
