//                                                     -*- coding:utf-8-dos -*-
//*****************************************************************************
//
//    Ageha 3.1 - agh.text
//
//*****************************************************************************
//
// Author: Koichi Murase <myoga.murase@gmail.com>
// Require: agh.js
// ChangeLog
//   mwg-3.0 (2.0 からの変更点)
//   + mwg.dynamic_cast[RegExp](*) -> agh(*,RegExp,flag)
//     + agh.regex.js に移動
//     + 二要素配列からの変換
//       以前: 第一要素…正規表現, 第二要素…フラグ
//       今後: 他の配列と同じ扱い。即ち、"第一要素|第二要素" と解釈される
//     + 既定のフラグは "g" に変更
//     + 拡張フラグ
//       r: 引数を正規表現と解釈 (既定では単純な文字列と解釈)
//       b: 単語 \b(?:...)\b
//   + mwg.Text.Regex
//     + agh.regex.js に移動
//
//=============================================================================
/// <reference path="agh.js"/>
agh.scripts.register("agh.text.js",["agh.js"],function(){
//*****************************************************************************
//	prototype.format()
//-----------------------------------------------------------------------------
var __lbrace="<agh::left-brace>";
var __rbrace="<agh::right-brace>";
var rex_lbra=agh.Text.Escape(__lbrace,"regexp");
var rex_rbra=agh.Text.Escape(__rbrace,"regexp");
var reg_format_bra=new RegExp("("+__lbrace+")|("+__rbrace+")","g");

String.prototype.format=function(table){
  /// <summary name="String.prototype.format">
  /// 文字列を整形します。
  /// </summary>
  /// <param name="arg" vararg="true">
  /// 文字列に挿入する値を指定します。
  /// </param>
  var args=arguments;
  return this
    .replace(/(\{\{|\}\})|\{([^\}]+)\}/g,function($0,$1,$2){
      if($1&&$1!='')
        return $1=='{{'?'{':'}';

      // 引数を : で区切る
      var a=$2.replace(/\\.|\:/g,function($0){
        return $0==':'?'<agh::split>':$0.substr(1);
      }).split('<agh::split>');

      // obj の取得
      var key=a[0];
      var num=parseInt(key);
      var obj=num.toString()==key?args[num]:table[key];
      if(obj==null)obj="null";

      // 変換
      for(var i=1;i<a.length;i++){
        if(agh.is(obj,String)){
          a[i].replace(/(\b[\w0-9_]+\b)(?:\(([^\(\)]*)\))?/,function($0,$1,$2){
            if(!$2)$2="";
            try{
              switch($1){
                case "escape":obj=agh.Text.Escape(obj,$2);break;
                case "unescape":obj=agh.Text.Unescape(obj,$2);break;
                case "upper":obj=obj.toUpperCase();break;
                case "lower":obj=obj.toLowerCase();break;
                //case "trim":case "trim_l":case "trim_r":case "reverse":
                default:
                  obj=obj[$1].apply(obj,$2.split(","));
                  break;
              }
            }catch(e){}
            return "";
          });
        }else
          obj=agh(obj,String,a[i]);
        if(obj==null)obj="null";
      }
      return obj.toString();
    });
};
Number.prototype.format=function(arg1){
  if(agh.is(arg1,String)){
    if(arg1.substr(0,1)=="%")return num_sprintf(
      this.valueOf(),
      arg1,
      agh(arguments,Array).slice(1)
    );
    arg1=parseInt(arg1);
    if(arg1<2)arg1=10;
  }else if(agh.is(arg1,Array)){
    return arg1[parseInt(this)];
  }
  return this.toString(arg1);
};
Boolean.prototype.format=function(arg1,arg2){
  if(arg2!=null)return this?arg1:arg2;
  if(agh.is(arg1,String)){
    if(arg1.substr(0,1)=="?"){
      arg1=arg1.substr(1).split(",");
    }
  }
  if(agh.is(arg1,Array)){
    return this?(arg1[0]||"").toString():(arg1[1]||"").toString();
  }
  return this.toString(arg1);
}
RegExp.prototype.format=function(arg1){
  if(arg1=="src")return this.source;
  return this.toString();
};
Date.prototype.format=(function(){
  /// <summary name="Date.prototype.format">
  /// Date インスタンスの文字列への整形を行います。
  /// </summary>
  /// <param name="f">
  /// 書式を指定します。詳細は後述する物を参照して下さい。
  /// </param>
  /// <remarks>
  /// <p>書式の指定の仕方は以下の様になります。</p>
  /// <![CDATA[
  ///   param f	: '%' <locale>? <flag>? <width>? <type>
  ///   <locale>	: '[' ( "en" | "eng" | "ja" ) ']'
  ///   <flag>	: [-+ 0]+
  ///   <width>	: [1-9][0-9]*
  ///   <type>	: 'u'? [fsmhHdDMytTgG\:\/] | "om" | "oh"
  /// ]]>
  /// <p>&lt;type&gt; のそれぞれの指定の意味を挙げます。</p>
  ///	  u		: (接頭辞) UTC 時間を使用する事を指定します。
  ///   o		: (接頭辞) TimezoneOffset を使用する事を指定します。 m 亦は h のみで有効です。
  ///   f		: 秒の小数部
  ///   s		: 秒
  ///   m		: 分
  ///   h		: 時 (12 時間制)
  ///   H		: 時 (24 時間制)
  ///   d		: 日付
  ///   D		: 曜日 (既定では英字三字。locale が eng の時英名で、ja の時和名一文字。)
  ///   M		: 月 (既定で整数値。locale が en の時英名三文字で、eng の時英名、ja の時和名。)
  ///   y		: 年 (四桁の西暦年)
  ///   t		: 午前午後 (既定で "a" / "p"。locale が ja の時 "午前" / "午後"。)
  ///   T		: 午前午後 (既定で "A" / "P"。locale が ja の時 "午前" / "午後"。)
  ///	  g		: 紀元前後 ("b.c." / "a.d.")
  ///	  G		: 紀元前後 ("B.C." / "A.D.")
  ///	  :		: 時刻区切り (":")
  ///	  /		: 日付区切り ("/")
  /// </remarks>
  var DATE_TMPL={
    shortDate:"%M/%d/%4y",
    longDate:"%[eng]D, %[eng]M %2d, %4y",
    shortTime:"%h:%2m %T.M.",
    longTime:"%h:%2m:%2s %T.M.",
    fullDateTime:"%[eng]D, %[eng]M %2d, %4y %h:%2m:%2s %T.M.",
    sortableDateTime:"%4y-%2M-%2dT%2H:%2m:%2s",
    universalSortableDateTime:"%4y-%2M-%2d %2H:%2m:%2s",
    monthDay:"%[eng]M %2d",
    yearMonth:"%[eng]M, %4y",
    日本語日付:"西暦 %4y 年 %M 月 %2d 日 (%[ja]D)",
    日本語時刻:"%[ja]t %h 時 %2m 分 %2s 秒",
    日本語日時:"西暦 %4y 年 %M 月 %2d 日 (%[ja]D) %[ja]t %h 時 %2m 分 %2s 秒",
    // 参照: http://www.kawa.net/works/js/jkl/date-w3cdtf.html
    w3cdtf:"%4y-%2M-%2dT%2h:%2m:%2s%+3oh:%2om",
    // 参照: http://0-oo.net/sbox/javascript/date
    rfc2822:"%D, %2d %[en]M %4y %2H:%2m:%2s%+3oh%2om",

    GMTString:"%uD, %2ud %[en]uM %4uy %2uH:%2um:%2us GMT",
    UTCString:"%uD, %2ud %[en]uM %4uy %2uH:%2um:%2us UTC",
    LocaleString:"%4y年%M月%2d日 %H:%m:%s",
    String:"%D %[en]M %2d %4y %2H:%2m:%2s GMT%+3oh%2om"
  };
  agh.memcpy(DATE_TMPL,DATE_TMPL,{
    // 参照: datejs ?
    "rfc1123":"GMTString",
    // 参照: http://0-oo.net/sbox/javascript/date
    "iso8601":"w3cdtf"
  });
  var LOCALE={
    "":{
      day:"Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(','),
      am:"a",pm:"p"
    },
    "en":{
      day:"Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(','),
      month:",Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(','),
      am:"a",pm:"p"
    },
    "eng":{
      day:"Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(','),
      month:",January,February,March,April,May,June,July,August,September,October,November,December".split(','),
      am:"a",pm:"p"
    },
    "ja":{
      day:agh("日月火水木金土",Array),
      month:",睦月,如月,弥生,卯月,皐月,水無月,文月,葉月,長月,神無月,霜月,師走".split(','),
      am:"午前",pm:"午後"
    }
  };
  var METHOD_NAME={
    msec:	"getMilliseconds",
    sec:	"getSeconds",
    min:	"getMinutes",
    h:		"getHours",
    date:	"getDate",
    day:	"getDay",
    mon:	"getMonth",
    year:	"getFullYear"
  };
  var METHOD_NAME_UTC={
    msec:	"getUTCMilliseconds",
    sec:	"getUTCSeconds",
    min:	"getUTCMinutes",
    h:		"getUTCHours",
    date:	"getUTCDate",
    day:	"getUTCDay",
    mon:	"getUTCMonth",
    year:	"getUTCFullYear"
  };
  return function(f){
    var _this=this;
    if(!f)return this.toString();

    //if(f=="w3cdtf"){
    //	var tzos=this.getTimezoneOffset();
    //	return "{0:%4y-%2M-%2dT%2h\\:%2m\\:%2s}{1:%+03d}:{2:%02d}".format(this,tzos/60,tzos%60);
    //}
    if(f in DATE_TMPL)f=DATE_TMPL[f];
    return f.replace(/\%(?:\[([^\[\]]+)\])?([ \+\-]*[0-9])?(oh|om|u?[\w\:\/])/g,function($0,$L,$F,$T){
      // Argument Modification
      $L=($L||"").toLowerCase();$F=$F||"";

      // Local / UTC
      var METHOD;
      if($T.substr(0,1)=="u"){
        METHOD=METHOD_NAME_UTC;
        $T=$T.substr(1);
      }else{
        METHOD=METHOD_NAME;
      }

      // Formatting
      var $Fd="%0"+$F+"d";
      switch($T){
        case "f":return (_this[METHOD.msec]()/1000).format("%."+($F||1)+"f").substr(2);
        case "s":return _this[METHOD.sec]().format($Fd);
        case "m":return _this[METHOD.min]().format($Fd);
        case "h":return (_this[METHOD.h]()%12).format($Fd); // 12時
        case "H":return _this[METHOD.h]().format($Fd); // 24時
        case "d":return _this[METHOD.date]().format($Fd);
        case "D":return _this[METHOD.day]().format(LOCALE[$L].day);
        case "M":return (_this[METHOD.mon]()+1).format(LOCALE[$L].month||$Fd);
        case "y":
          var ret=_this[METHOD.year]().toString();
          var len=parseInt($F);
          var pad=len-ret.length;
          return pad<0?ret.last(len)
            :pad>0?($F.substr(0,1)==" "?" ":"0").repeat(pad)+ret:
            ret;
        case "t":return _this[METHOD.h]()<12?LOCALE[$L].am:LOCALE[$L].pm;
        case "T":return (_this[METHOD.h]()<12?LOCALE[$L].am:LOCALE[$L].pm).toUpperCase();
        case "g":return _this[METHOD.year]()<0?"b.c.":"a.d.";
        case "G":return _this[METHOD.year]()<0?"B.C.":"A.D.";
        case ":":return ":";
        case "/":return "/";
        case "oh":return (_this.getTimezoneOffset()/60).format($Fd);
        case "om":
          var tz=_this.getTimezoneOffset();
          if(tz<0)tz=-tz;
          return (tz%60).format($Fd);
        default:return $0;
      }
    });
  };
})();
//--------------------------------------------------------------------
//		class StringReader : 文字列読み取り
//--------------------------------------------------------------------
agh.StringReader=function StringReader(text){
  this.text=text;
  this.index=-1;
  this.current=null;
};
agh.memcpy(agh.StringReader.prototype,{
  next:function(){
    this.index++;
    this.current=this.index<this.text.length?this.text.substr(this.index,1):null;
    return this.current;
  },
  toString:function(){
    return "[object agh.StringReader]";
  }
});
//--------------------------------------------------------------------
//		数値用 sprintf (internal)
//--------------------------------------------------------------------
/// <summary name="num_sprintf">
/// 数値用の sprintf を実行します。
/// </summary>
/// <param name="num">数値を指定します。</param>
/// <param name="format">数値の書式を指定します。'%' で始まる必要があります。</param>
/// <param name="args">変換の際の引数を指定します。</param>
var num_sprintf=(function(){
  // 参考:
  // http://www.mm2d.net/c/c-01.shtml
  // http://ja.wikipedia.org/wiki/Printf
  // http://wisdom.sakura.ne.jp/programming/c/c57.html
  // vc8 の挙動
  //--------------------------------------------
  // 書式			: '%' <flag> <width> <precision>? <mod>? <trans>
  // <flag>		: /[\-\+ 0\#]/
  // <width>		: <数値> | '*'
  // <precision>	: '.' ( <数値> ｜'*' )? /* 未対応: gG の場合の有効桁数 */
  // <mod>		: /[hlLjzt]|hh|ll/
  // <trans>		: /[odixXufeEgGaA]/ /* 非対応: cspn% */
  //--------------------------------------------
  //		reading format string
  //--------------------------------------------
  function read_letter(reader,chset){
    if(chset.indexOf(reader.current)<0)return "";
    var ret=reader.current;
    reader.next();
    return ret;
  }
  function read_width(reader){
    if(reader.current=="*"){
      reader.next();
      return "*";
    }

    var ret="";
    while("0123456789".indexOf(reader.current)>=0){
      ret+=reader.current;
      reader.next();
    }
    return ret;
  }
  function read_prec(reader){
    if(reader.current!=".")return "";
    reader.next();
    return read_width(reader)||"0";
  }
  //--------------------------------------------
  //		transformation
  //--------------------------------------------
  // e 形式 /\d*\.\d*[eE][+-]?\d+/ への変換
  var reg_zero_leading=/^0(?:\.(0*)([0-9]*))?$/;
  var reg_fraction=/^([1-9])([0-9]*)(?:\.([0-9]+))?$/;
  function trans_eform(ret){
    if(ret.indexOf("e")<0)switch(true){
      case reg_zero_leading.test(ret):
        ret=ret.replace(reg_zero_leading,function($0,$Z,$R){
          if($R=="")return "0e0";
          return $R.insert(1,".")+"e-"+($Z.length+1);
        });
        break;
      case reg_fraction.test(ret):
        ret=ret.replace(reg_fraction,function($0,$H,$R,$F){if(!$F)$F="";
          return $H+"."+$R+$F+"e+"+$R.length;
        });
        break;
      default:
        throw "Unexpected number format!";
    }
    ret=ret.replace(/[eE]([+-])?([0-9][0-9]?)$/,function($0,$S,$E){
      if($E.length==1)$E="0"+$E;
      return "e"+($S||"+")+$E;
    });
    return ret;
  }
  // 通常の小数形式 /\d*\.\d*/ への変換
  var reg_eform=/^([0-9]*)(?:\.([0-9]*))?e([+-]?[0-9]+)$/;
  function trans_fform(ret){
    if(ret.indexOf("e")<0)return ret;
    return ret.replace(reg_eform,function($0,$R,$F,$E){if(!$F)$F="";
      var e=parseInt($E);
      if(e==0)return $R+"."+$F;
      if(e<0){
        $R="0"["*"](-e-$R.length)+$R;
        $R=$R.insert(e,".");
      }else if(e>0){
        $F+="0".repeat(e-$F.length);
        $F=$F.insert(e,".");
      }
      return $R+$F;
    });
  }
  //--------------------------------------------
  //		precision
  //--------------------------------------------
  function precision_f(str,prec,force_dot){
    return str.replace(/([0-9]*)(?:\.([0-9]*))?/,function($0,$R,$F){if(!$F)$F="";
      if($F.length<prec){
        $F+="0".repeat(prec-$F.length);
      }else if($F.length>prec){
        // ■ TODO: 切り捨ての際に四捨五入を実行
        $F=$F.substr(0,prec);
      }
      if(force_dot||$F!="")$F="."+$F;
      return $R+$F;
    });
  }
  function precision_d(str,prec){
    return "0".repeat(prec-str.length)+str.length;
  }
  function precision_p(str,prec,force_dot){
    return str.replace(/([0-9a-fA-F]*)(?:\.([0-9a-fA-F]*))?/,function($0,$R,$F){if(!$F)$F="";
      if($F.length<prec){
        $F+="0".repeat(prec-$F.length);
      }else if($F.length>prec){
        // ■ TODO: 切り捨ての際に四捨五入を実行
        $F=$F.substr(0,prec);
      }
      if(force_dot||$F!="")$F="."+$F;
      return $R+$F;
    });
  }
  //--------------------------------------------
  //		main procedure
  //--------------------------------------------
  function ret_proc(num,format,args){
    var reader=new agh.StringReader(format);
    if(reader.next()!="%")throw "Format-string has unknown format.";
    reader.next();

    // 読み取り
    //--------------------
    var iarg=0;
    var f={pad:"",sgn:"","#":false};
    floop:while(true){
      switch(reader.current){
        case "-":case "0":f.pad=reader.current;break;
        case " ":case "+":f.sgn=reader.current;break;
        case "#":f["#"]=true;break;
        default:break floop;
      }
      reader.next();
    }

    var w=read_width(reader);
    if(w=="*")w=args[iarg++];
    w=parseInt(w);
    if(isNaN(w))w=0;

    var p=read_prec(reader);
    if(p=="*")p=args[iarg++];

    var m=read_letter(reader,"hlLjzt");
    if((m=="h"||m=="l")&&reader.current==m){
      m+=m;
      reader.next();
    }

    var t=read_letter(reader,"odixXufeEgGaAc");

    // 変換
    //--------------------
    var sgn="";
    var ret;
    // ret の符号部分を sgn に移します。
    var split_sgn=function(){
      var i=0;
      while(" +-".indexOf(ret.substr(i,1))>=0)i++;

      sgn=ret.substr(0,i)||f.sgn;
      ret=ret.substr(i);
    };
    switch(t){
      case "o":
        ret=parseInt(num).toString(8);
        split_sgn();
        if(f["#"])ret="0"+ret;
        if(p)ret=precision_d(ret,parseInt(p));
        break;
      case "u":
        if(num<0){
          if(Number.INT_MIN<=num)num+=Number.UINT_MAX+1;
        }
      case "d":case "i":
        ret=parseInt(num).toString();
        split_sgn();
        if(p)ret=precision_d(ret,parseInt(p));
        break;
      case "x":case "X":
        ret=parseInt(num).toString(16);
        split_sgn();
        if(p)ret=precision_d(ret,parseInt(p));
        if(f["#"])sgn+="0x";
        if(t=="X")ret=ret.toUpperCase();
        break;
      case "f":
        ret=num.toString();
        split_sgn();
        ret=trans_fform(ret);
        ret=precision_f(ret,parseInt(p||"6"),f["#"]);
        break;
      case "e":case "E":
        ret=num.toString();
        split_sgn();
        ret=trans_eform(ret);
        ret=precision_f(ret,parseInt(p||"6"),f["#"]);
        if(t==="E")ret=ret.replace("e","E");
        break;
      case "g":case "G":
        if(p=="")p="6"; // ■ p は有効数字
        ret=num.toString();
        split_sgn();
        if(t==="G")ret=ret.replace("e","E");
        break;
      case "a":case "A":
        if(num<0){
          sgn="-0x";
          num=-num;
        }else{
          sgn=f.sgn+"0x";
        }
        var pc=0;
        if(num!=0){
          while(num<1){num*=2;pc--;}
          while(num>=2){num/=2;pc++;}
        }
        ret=num.toString(16)+"p"+pc.format("%+04d");
        ret=precision_p(ret,parseInt(p||"6"),f["#"]);
        if(t=="A")ret=ret.toUpperCase();
        break;
      case "c":
        ret=agh.Text.ResolveUnicode(num);
        break;
      default:
        throw "Undefined transform character specification: '"+t+"'";
    }

    // 位置合わせ
    //--------------------
    if(f.pad=="0"){
      ret="0".repeat(w-ret.length-sgn.length)+ret;
    }
    ret=sgn+ret;
    if(f.pad==""){
      ret=" ".repeat(w-ret.length)+ret;
    }else{
      ret+=" ".repeat(w-ret.length);
    }

    return ret;
  }

  return ret_proc;
})();
//--------------------------------------------------------------------
});
//--------------------------------------------------------------------
