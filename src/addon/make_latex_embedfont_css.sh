#!/bin/bash

src="$1"
dir="${2%/}/"

SQ="'"

cat $src|awk '
  function print_woff_base64(file){
    printf("data:application/x-font-woff;base64,");
    cmd="base64 " file
    while((cmd|getline _line) >0)
      printf("%s",_line);
    close(cmd);

    #file="'$dir'" caps[1] "64";
    #while((getline _line < file) >0)
    #  printf("%s",_line);
    #close(file);
  }

  /^\s*src:url\('$SQ'[a-zA-Z_0-9]+\.woff'$SQ'\)\s*format\("woff"\)\s*;\s*$/{
    if(match($0,/([a-zA-Z_0-9]+\.woff)/,caps)>0){
      printf("  src:url('$SQ'");
      print_woff_base64("'$dir'" caps[1]);
      printf("'$SQ') format(\"woff\");\n");

      next;
    }
  }
  {print;}
'
