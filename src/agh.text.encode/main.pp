//                                             -*- mode:js;coding:utf-8-dos -*-
//*****************************************************************************
//
//    Ageha 3.1 - agh.text.encode
//
//*****************************************************************************
//
// Author: Koichi Murase <myoga.murase@gmail.com>
// Require: agh.js
//
// ChangeLog
//   2013-07-30, KM, Created
//
//=============================================================================
/// <reference path="agh.js"/>
agh.scripts.register("agh.text.encode.js",["agh.js"],function(){

#%include gencat.js

  var StringBuffer=function(){
    this.buff=[];
    this.nerr=0;
  };
  agh.memcpy(StringBuffer.prototype,{
    push:function(c){
      if(c===null){
        this.nerr++;
        this.buff.push('?');
      }else
        this.buff.push(String.fromCharCode(c));
    },
    toString:function(){
      return this.buff.join('');
    }
  });

  var CheckedStringBuffer=function(){
    this.buff=[];
    this.nerr=0;
    this.nwarn=0;
  };
  agh.memcpy(CheckedStringBuffer.prototype,{
    push:function(c){
      if(c===null){
        this.nerr++;
        this.buff.push('?');
      }else{
        if(c===0||GetUnicodeGeneralCategory(c)=="Cn")
          this.nwarn++;
        this.buff.push(String.fromCharCode(c));
      }
    },
    toString:function(){
      return this.buff.join('');
    }
  });

  function CreateSource(text){
    if(text instanceof String||text!=null&&typeof text=="string"){
      var ret=[];
      var len=text.length;
      for(var i=0;i<len;i++)
        ret[i]=text.charCodeAt(i);
      return ret;
    }else
      return text;
  }

  var Encoder={};
  var Decoder={};
  var EncodingNameMap={
    // jis aliases
    "jis":"jis",
    "iso-2022-jp":"jis","csiso2022jp":"jis",
    "iso-2022-jp-1":"jis",
    "iso-2022-jp-2":"jis","csiso2022jp2":"jis",
    "iso-2022-jp-2004":"jis","iso-2022-jp-3":"jis",

    // ujis aliases
    "ujis":"ujis",
    "euc-jp":"ujis","eucjp":"ujis","extended_unix_code_packed_format_for_japanese":"ujis","cseucpkdfmtjapanese":"ujis",
    "euc-jis-2004":"ujis",
    "euc-jisx0213":"ujis",

    // sjis aliases
    "sjis":"sjis","ms_kanji":"sjis","shift-jis":"sjis","shift_jis":"sjis","csshiftjis":"sjis",
    "cp932":"sjis",
    "shift_jis-2004":"sjis","shift_jisx0213":"sjis",

    // utf encodings
    "utf8":"utf8","utf-8":"utf8",
    "utf16le":"utf16le","utf-16le":"utf16le",
    "utf16be":"utf16be","utf-16be":"utf16be","utf-16":"utf16be",
    "utf32le":"utf32le","utf-32le":"utf32le",
    "utf32be":"utf32be","utf-32be":"utf32be","utf-32":"utf32be"
  };
  function ResolveEncodingName(name){
    if(name==null)return null;

    var lower=name.toString().toLowerCase();
    if(lower in EncodingNameMap)
      return EncodingNameMap[lower];

    return name;
  }

  var autoDetectEncodingList=["utf8","sjis","ujis","utf16be","utf16le","jis"];
  function autoDetectCheckBom(src){
    if(src.length>=4){
      var cc=src[0]<<24|src[1]<<16|src[2]<<8|src[3];
      if(cc==0x0000FEFF)
        return "utf32be";
      else if(cc==0xFFFE0000)
        return "utf32le";
    }
    if(src.length>=3){
      if((src[0]<<16|src[1]<<8|src[2])==0xEFBBBF)
        return "utf8";
    }
    if(src.length>=2){
      var cc=src[0]<<8|src[1];
      if(cc==0xFEFF)
        return "utf16be";
      else if(cc==0xFFFE)
        return "utf16le";
    }
    return null;
  }
  function autoDetectTryDecode(src){
    var iN=autoDetectEncodingList.length;
    var ctx={};
    for(var i=0;i<iN;i++){
      var D=Decoder[autoDetectEncodingList[i]];
      ctx[autoDetectEncodingList[i]]={
        decoder:new D,
        buff:new CheckedStringBuffer,
        enabled:true
      };
    }

    // 少しずつデコード (エラーを出した符号化方式から先に脱落)
    var NERRTOL=1;     // NERRTOL 回を越えてエラーが発生した場合、その符号化方式は棄却
    var BLOCKSIZE=256; // 復号のブロックの単位
    var srcBegin=0;
    while(srcBegin<src.length){
      var srcEnd=srcBegin+BLOCKSIZE;
      if(srcEnd>src.length)srcEnd=src.length;
      for(var i=0;i<iN;i++){
        var c=ctx[autoDetectEncodingList[i]];
        if(!c.enabled)continue;
        c.decoder.decode(c.buff,src,srcBegin,srcEnd);
        if(c.buff.nerr>NERRTOL)c.enabled=false;
      }
      srcBegin=srcEnd;
    }

    for(var i=0;i<iN;i++){
      var c=ctx[autoDetectEncodingList[i]];
      if(!c.enabled)continue;
      c.decoder.terminate(c.buff);
    }

    return ctx;
  }

  var Decode=function(text,encoding){
    if(encoding!=null){
      encoding=ResolveEncodingName(encoding);

      if(encoding in Decoder){
        var D=Decoder[encoding];
        if(D instanceof Function){
          var src=CreateSource(text);
          var dst=new StringBuffer;

          var decoder=new D;
          decoder.decode(dst,src,0,src.length);
          decoder.terminate(dst);

          return dst.toString();
        }
      }

      // unknown encoding
      log("unknown encodings");
      return null;
    }else{
      // auto detect encodings
      var src=CreateSource(text);

      var enc=autoDetectCheckBom(src);
      if(enc!=null)
        return Decode(src,enc);

      var iN=autoDetectEncodingList.length;
      var ctx=autoDetectTryDecode(src);

      // JIS 制御系列が使用された場合は JIS 優先
      if(ctx.jis.buff.nerr==0&&ctx.jis.decoder.nshift>=1)
        return ctx.jis.buff.toString();

      // エラーの最小の物を選択
      var emin_count=0;
      var emin_nerr=9999;
      var emin_key=null;
      for(var i=0;i<iN;i++){
        var c=ctx[autoDetectEncodingList[i]];
        if(!c.enabled)continue;
        if(c.buff.nerr<emin_nerr){
          emin_count=1;
          emin_nerr=c.buff.nerr;
          emin_key=autoDetectEncodingList[i];
        }else if(c.buff.nerr==emin_nerr)
          emin_count++;
      }

      if(emin_count>1){
        // エラー数が最小の物が複数ある場合は、
        // 警告数が最小の物を選んで返す。

        var wmin_nwarn=9999;
        var wmin_key=null;
        for(var i=0;i<iN;i++){
          var k=autoDetectEncodingList[i];
          var c=ctx[k];
          if(!c.enabled)continue;
          if(c.buff.nerr!=emin_nerr)continue;

          if(c.buff.nwarn<wmin_nwarn){
            wmin_nwarn=c.buff.nwarn;
            wmin_key=k;
          }
        }
        if(wmin_key!=null)
          return ctx[wmin_key].buff.toString();
      }else{
        if(emin_key!=null)
          return ctx[emin_key].buff.toString();
      }

      return Decode(src,"utf16be");
    }
  };

  var methods={
    nocode:function(dst){
      dst.push(0x3F); // '?'
    }
  };

#%include enc_jis.js
#%include enc_uni.js
//#%include test.js

  agh.Text.Decode=Decode;
});
