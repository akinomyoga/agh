//%x (
function utf8to16_a2s(arr){
  var i=0,c=0,s,out=[];
  function next(){
    s=arr[i++];
    c=c<<6|127&s;
  }
  function o(){out.push(String.fromCharCode(c));c=0;}
  
  // 0******* s=[0-3]
  // 10****** s=[4-5] 不正コードだけど下位 7 bit を出力してしまう
  // 110***** 10****** s=6
  // 111***** 10****** 10****** s=7
  for(;i<arr.length;
    o(s>5&&(c&=31,s-6&&next(),next()))
  )next(),s>>=5;

  return out.join("");
};
//%).r|\<out\>|b|.r|0xFF|255|.r|\<arr\>|a|
//%(
//-----------------------------------------------------------------------------
// older versions
//-----------------------------------------------------------------------------

// from mwg.utf.js
// version 2
var utf8to16_v2=function(str){
  var out=[];
  function o(s){out.push(String.fromCharCode(s));}
  
  var i=0;
  function next(){return str.charCodeAt(i++);}
  
  var len=str.length;
  while(i<len){
    var c=next();
    var s=c>>4;
    if(s<8)o(c);
    else if(s==12||s==13)o((c&31)<<6|next()&63);
    else if(s==14)o((c&15)<<12|(next()&63)<<6|next()&63);
  }

  return out.join("");
};
  
// version 3
var utf8to16_v3=function(str){
  var i=0;
  var c=0;
  var s;
  var out=[];
  function next(){
    s=str.charCodeAt(i++);
    c=c<<6|127&s;
  }
  function o(){out.push(String.fromCharCode(c));c=0;}
  
  var len=str.length;
  while(i<len){
    next();
    s>>=5;
    // 0******* s=[0-3]
    // 10****** s=[4-5] 不正だけど下位 7 bit を出力してしまう
    // 110***** 10****** s=6
    // 111***** 10****** 10****** s=7
    o(s<6||(c&=31,s==6||next(),next()));
  }

  return out.join("");
};
//-----------------------------------------------------------------------------
//%)
