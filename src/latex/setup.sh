#!/bin/bash

addsetting () {
	local target=$1
	local key=$2
	local file=$3
	
	[ -e $target ] && [ 0 -ne "$(grep $key $target |wc -l)" ] && return 0
	echo "# $key" >> $target
	cat  $file    >> $target
	return 0
}

# firefox で CSS Web Font をローカルから使用できるようにする為。 #
addsetting .htacess CrossSiteWebFontSetting_ForLocalUse <<EOF
<Files ~ "\.ttf$">
Header append Access-Control "allow <*>"
Header append Access-Control-Allow-Origin "*"
</Files>
EOF
