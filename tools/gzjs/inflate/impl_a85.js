/*?lwiki
 * :@fn decode85_s2a(str)
 *  :@param str : String
 *   85種類の文字で符号化されたデータを指定します。
 *  :@return : Array
 *   復号したバイナリ列を配列として返します。
 *
 *  独自の85文字符号化
 *  -\x28-\x7D から \x5C (\\) を除いた 85 種類の文字を用いる。
 *  -c = \x28-\x7C (但し \x5C 以外) の文字は i85=c-\x28 に対応する。
 *  -c = \x7D の文字は i85 = \x5C - \x28 = 52 に対応する。
 *  -文字から数字への変換は次で OK: i85=c-'\x28';if(i85==85)i85=52;
 */
//%x (
function decode85_s2a(str){
  for(
    var out=[],i=0,j,v,c;
    i<str.length;
    out.push(v&0xFF),v/=256,i++
  )
    if(i%5==0)
      for(v=0,j=i+++5;j>=i;v+=(c=0|str.charCodeAt(--j)-40)==85?52:c)
        v*=85;
  return out;
};
//%).r|\<out\>|o|.r|0xFF|255|.r|\<str\>|s|
//-----------------------------------------------------------------------------
//%if DEBUG

// decode85, string(a85) to string(byte)
var decode85_s2s=function(str){
  var a=decode85_s2a(str);
  var out=[];
  for(var i=0;i<a.length;i++)
    out.push(String.fromCharCode(a[i]));
  return out.join("");
}

// encode85, string(byte) to string(a85)
var encode85_s2s=function(txt){
  function put(){
    out.push(String.fromCharCode((c=0|40+v%85)==92?125:c));
    v/=85;
  }
  for(
    var out=[],i=0,j,v,c;
    i<txt.length;
    put(),i++
  )
    if(i%4==0){
      for(var v=0,j=i+3;j>=i;v+=0|txt.charCodeAt(j),j--)
        v*=256;
      put();
    }
  return out.join("");
};

function test(str){
  var a85=encode85_s2s(str);
  var dec=decode85_s2s(a85);
  var msg=[];
  msg.push(
    str.length," bytes -> ",a85.length," bytes -> ",dec.length," bytes ",
    " sz:",a85.length==(str.length+(str.length+3)/4|0)?"OK":"NG",
    " dec:",str==dec?"OK":"NG"
  );
  console.log(msg.join(""));
}

test("");
test("1");
test("23");
test("456");
test("7890");
test("hello");
test("this is a test");
test(document.documentElement.innerHTML);

//%end
//-----------------------------------------------------------------------------
