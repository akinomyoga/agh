#%# -*- mode:js -*-
#%m inflate_and_eval
##%if !inflate
###%[rex_squote="'(\\\\.|[^'\\\\])*'"]
###%[rex_dquote="\"(\\\\.|[^\"\\\\])*\""]
###%[rex_string="("+rex_squote+"|"+rex_dquote+")"]
###%[rex_xrep="\\.replace\\(([^\'\"()]|\\([^\'\"()]*\\))+\\)"]
###%[rex_xjoin="\\[("+rex_string+"|[[:space:],])*\\]\\.join\\((''|\"\")\\)"]
###%[rex_inflate="eval\\((s|"+rex_xjoin+"|"+rex_string+")"+rex_xrep+"\\)"]
###%[frame=(""+frame).replace(rex_inflate,"eval(&([\nREPLACE_TO_SOURCE\n].join(\"\")))")]
##%else
###%[frame=(""+frame).replace("\n?\\}\\)\\(\\)[;[:space:]]*$","eval(inflate([\nREPLACE_TO_SOURCE\n].join('')));&")]
##%end
##%x frame
#%end
