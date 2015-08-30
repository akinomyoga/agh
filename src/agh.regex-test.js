var agh,dbg,printh;
agh.scripts.wait(["agh.regex.js"],function(){
  function _assert(tag,cond,message){
    if(!cond)dbg.print("assertion failed:"+tag+": "+(message||"no message"));
  }

  printh("load");

  _assert(1.0,true);

  printh("done");
});
