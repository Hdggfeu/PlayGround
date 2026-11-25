#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_DIR="${PROJECT_DIR:-$script_dir}"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
export PORT

run() { /usr/bin/time -p "$@"; }

run test -d public
if [[ -f package.json ]]; then
  if [[ -f package-lock.json ]]; then
    run npm ci
  else
    run npm install
  fi
  if node -e "process.exit(require('./package.json').scripts?.build ? 0 : 1)"; then
    run npm run build
  fi
else
  run mkdir -p dist
  run cp -R public/. dist/
fi

run test -f dist/index.html
run mkdir -p /home/runner/work/_temp/omgithub-web
PROJECT_DIR="$PROJECT_DIR" BUILT_DIR="$PROJECT_DIR/dist" run python3 -c 'import json, os; path="/home/runner/work/_temp/omgithub-web/deployment-output.json"; data={"project":os.environ["PROJECT_DIR"],"directory":os.environ["BUILT_DIR"]}; open(path,"w").write(json.dumps(data)+"\\n")'
run python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$PROJECT_DIR/dist"
