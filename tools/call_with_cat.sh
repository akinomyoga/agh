#!/bin/sh

selfname="${0##*/}"
target="${selfname%.sh}"

dir="${0%/*}"
if test "$dir" = "$0"; then
  echo 'error: ctxc not found' > /dev/stderr
  exit 1
fi

#echo "$dir/$target.exe" "$@"
"$dir/$target.exe" "$@" | cat
