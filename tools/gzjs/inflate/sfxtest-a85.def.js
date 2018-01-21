#%m inflate_and_eval
##%if !inflate
###%m frame frame.r/eval\((s\.replace\(|[\'\[])/var inflate=&/
##%end
##%m tail
var data=[
#%#include deflate+base85.dat
#%include out/data-gz85.dat
].join("");
var raw;
eval(raw=inflate(data));
console.log(data.length+" -> "+raw.length+" "+agh(raw.slice(-10),"JSON"));
##%end
##%[frame=(frame+"").replace("\\}\\)\\(\\);[[:space:]]*$","")+tail+"})();"]
##%x frame
#%end
