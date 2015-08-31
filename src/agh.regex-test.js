var agh,dbg,printh;
agh.scripts.wait(["agh.regex.js"],function(){
  function _assert(tag,cond,message){
    if(!cond)dbg.print("assertion failed:"+tag+": "+(message||"no message"));
  }
  function _assert_equals(tag,a,b){
    _assert(tag,a==b,"lhs="+a+" rhs="+b);
  }

  printh("load");

  // move lastIndex
  var handler_cc2C=function(m,ctx){
    ctx.lastIndex++;
    return m[0].toUpperCase();
  };
  _assert_equals(1.00,agh.RegExp.indexibleReplace("abcde",/\w/g,handler_cc2C),"ACE");
  _assert_equals(1.01,agh.RegExp.indexibleReplace("abcde",/\w/,handler_cc2C),"Acde");
  _assert_equals(1.02,agh.RegExp.indexibleReplace("abcde",/\w/,handler_cc2C,1),"aBde");

  // move index
  var handler_c2cC=function(m,ctx){
    ctx.index++;
    return m[0].toUpperCase();
  };
  _assert_equals(1.11,agh.RegExp.indexibleReplace("abcde",/\w/g,handler_c2cC),"aAbBcCdDeE");
  _assert_equals(1.12,agh.RegExp.indexibleReplace("abcde",/\w/g,handler_c2cC,1,3),"abBcCde");
  _assert_equals(1.13,agh.RegExp.indexibleReplace("ab-de",/\w/g,handler_c2cC,1,3),"abB-de");
  _assert_equals(1.14,agh.RegExp.indexibleReplace("abcde",/\w/,handler_c2cC),"aAbcde");
  _assert_equals(1.15,agh.RegExp.indexibleReplace("abcde",/\w/,handler_c2cC,1),"abBcde");

  // return undefined
  var handler_undefined=function(){
    return void 0;
  };
  _assert_equals(1.21,agh.RegExp.indexibleReplace("abcde",/\w/g,handler_undefined),"abcde");

  printh("done");
});
