#!/usr/bin/env bash
# Fails when a source file exceeds the line limit, unless listed in .file-size-allowlist.
# The allowlist may only shrink: listed files that are now compliant are reported so they can be removed.
# Usage: check-file-size.sh [limit] [paths...]   e.g. check-file-size.sh 300 app/src src
set -euo pipefail

limit="${1:-300}"; shift || true
roots=("${@:-.}")
allowlist=".file-size-allowlist"
exts='kt|kts|rs|py|ts|tsx|js|jsx'
# Only git-tracked files are scanned, so submodules and ignored build output are skipped.
exclude='(^|/)(generated|migrations|third_party|3rd_party|vendor)/'

declare -A allowed=()
if [[ -f "$allowlist" ]]; then
  while IFS= read -r line; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    allowed["$line"]=1
  done < "$allowlist"
fi

status=0
while IFS= read -r file; do
  lines=$(wc -l < "$file")
  rel="${file#./}"
  if (( lines > limit )); then
    if [[ -n "${allowed[$rel]:-}" ]]; then
      continue
    fi
    echo "::error file=$rel::$rel has $lines lines (limit $limit)"
    status=1
  elif [[ -n "${allowed[$rel]:-}" ]]; then
    echo "::warning file=$rel::$rel is now $lines lines; remove it from $allowlist"
    status=1
  fi
done < <(git ls-files -- "${roots[@]}" | grep -E "\.(${exts})$" | grep -Ev "$exclude" || true)

exit $status
