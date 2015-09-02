
agh.scripts.wait(["agh.text.encode.js"],function(){
  function get_binary(url){
    var xmlhttp=new agh.XMLHttpRequest();
    xmlhttp.open("GET",url,false);
    //XHR binary charset opt by Marcus Granado 2006 [http://mgran.blogspot.com]
    if(xmlhttp.overrideMimeType)
      xmlhttp.overrideMimeType('text/plain; charset=x-user-defined');
    xmlhttp.send();
    if(xmlhttp.status!=200)
      return null;

    var data=xmlhttp.responseText;
    var len=data.length;
    var ret=[];
    for(var i=0;i<len;i++)
      ret[i]=data.charCodeAt(i)&0xFF;
    return ret;
  }

  var h=get_binary("http://localhost/test/agh/agh.text.encode/jis.txt");
  log("ISO-2022-JP: "+agh.Text.Decode(h,"jis")+" ["+h+"]");
  log("自動判定: "+agh.Text.Decode(h));

  var h=get_binary("http://localhost/test/agh/agh.text.encode/sjis.txt");
  log("Shift_JIS: "+agh.Text.Decode(h,"sjis")+" ["+h+"]");
  log("自動判定: "+agh.Text.Decode(h));

  var h=get_binary("http://localhost/test/agh/agh.text.encode/ujis.txt");
  log("EUC-JP: "+agh.Text.Decode(h,"ujis")+" ["+h+"]");
  log("自動判定: "+agh.Text.Decode(h));

  var h=get_binary("http://localhost/test/agh/agh.text.encode/utf8.txt");
  log("UTF-8: "+agh.Text.Decode(h,"utf8")+" ["+h+"]");
  log("自動判定: "+agh.Text.Decode(h));

  var h=get_binary("http://localhost/test/agh/agh.text.encode/utf16le.txt");
  log("UTF-16LE: "+agh.Text.Decode(h,"utf16le")+" ["+h+"]");
  log("自動判定: "+agh.Text.Decode(h));

  var h=get_binary("http://localhost/test/agh/agh.text.encode/utf16be.txt");
  log("UTF-16BE: "+agh.Text.Decode(h,"utf16be")+" ["+h+"]");
  log("自動判定: "+agh.Text.Decode(h));

  var h=get_binary("http://localhost/test/agh/agh.text.encode/utf32le.txt");
  log("UTF-32LE: "+agh.Text.Decode(h,"utf32le")+" ["+h+"]");
  log("自動判定: "+agh.Text.Decode(h));

  var h=get_binary("http://localhost/test/agh/agh.text.encode/utf32be.txt");
  log("UTF-32BE: "+agh.Text.Decode(h,"utf32be")+" ["+h+"]");
  log("自動判定: "+agh.Text.Decode(h));

  var h=get_binary("http://localhost/test/agh/agh.text.encode/aghtex-utf.txt");
  log("自動判定 (aghtex-utf): "+agh.Text.Decode(h));
});
