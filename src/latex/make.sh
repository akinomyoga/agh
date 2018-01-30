#!/bin/bash

function addsetting {
  local target=$1
  local key=$2
  local file=$3

  if [[ -e $target ]] && grep -Fq "$key" "$target"; then
    # 登録済み
    return
  fi

  {
    echo "# $key"
    cat  "${@:3:1}"
  } >> "$target"
  return 0
}

function dispatch:htaccess {
  # firefox で CSS Web Font をローカルから使用できるようにする為。
  addsetting .htacess CrossSiteWebFontSetting_ForLocalUse htaccess
}

function dispatch:help {
  echo "usage: $0 subcmd args..."
}

if ((!$#)); then
  dispatch:help >&2
elif declare -f "dispatch:$1" &>/dev/null; then
  dispatch:"$@"
else
  echo "subcommand $1 not found" >&2
fi
