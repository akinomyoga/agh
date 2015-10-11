#%m frame
#%include out/.frame-a85-v2gen2.js
#%end
#%m frame frame.r|^﻿||
#%m frame frame.R|\r?(\n)|$1|
#%#m frame frame.r|^﻿?\(function\([[:alnum:]_,[:space:]]*\)\{\n||
#%#m frame frame.r|\n\}\)\(\);[[:space:]]*$||
#%#m frame frame.r#\n?eval\(s\.replace\(.*$##
#%[inflate=0]
#%x inflate_and_eval
