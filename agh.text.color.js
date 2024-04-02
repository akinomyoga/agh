//                                          -*- mode: js; coding: utf-8-dos -*-
//*****************************************************************************
//
//    Ageha 3.0 - agh.text.color
//
//*****************************************************************************
//
// Author: Koichi Murase <myoga.murase@gmail.com>
// Require: agh.js, agh.text.js, agh.regex.js
// ToDo: VBScript XML Perl CSS jss dtd TeX
//
//=============================================================================
/// <reference path="agh.js"/>
/// <reference path="agh.text.js"/>
/// <reference path="agh.regex.js"/>
agh.scripts.register("agh.text.color.js",[
  "agh.js", "agh.text.js", "agh.regex.js", "agh.text.color.css"
], function(){

var agh=this;
var ns=agh.Text;
var _h=agh.Text.Escape.html;
var _cls=agh.String.tagClass;
var nsColor=function agh_text_color(str,type,option){
  if(type in nsColor)return nsColor[type](str,option);

  // fallback1
  type=(type||"").toString().toLowerCase();
  if(type in nsColor)return nsColor[type](str,option);

  // fallback2
  return _h(str);
};
ns.Color=nsColor;

function registerSyntaxHighlighter(name,func){
  if(name instanceof Array){
    for(var i=0,iN=name.length;i<iN;i++)
      registerSyntaxHighlighter(name[i],func);
  }else{
    nsColor[name]=func;
    nsColor[name.toLowerCase()]=func;
  }
}

if(agh.browser.vFx||agh.browser.isWk){
  agh.registerAgehaCast("HTML",function(obj){
    if(agh.is(obj,Function)){
      return nsColor(obj.toString().replace(/\\u([0-9a-fA-F]{4,4})/g,function($0,$1){
        return agh.Text.Escape(agh.Text.ResolveUnicode($1),"double-quoted");
      }),"js");
    }
    return void 0;
  });
}else{
  agh.registerAgehaCast("HTML",function(obj){
    if(agh.is(obj,Function)){
      return nsColor(obj.toString(),"js");
    }
    return void 0;
  });
}
//*****************************************************************************
//    色付けに使える関数・クラス
//*****************************************************************************
function Refuge(mrx){
  this.buff=[];

  if(mrx!=null){
    this.mrx=mrx;
    this.reg_key=mrx.reg_key;
  }
}
agh.memcpy(Refuge.prototype,{
  index:0,
  enq:function(value){this.buff.push(value);},
  deq:function(){return this.buff[this.index++];},
  bank:function(str){
    // this.mrx instanceof agh.Text.MultiRegex
    return this.mrx.replace(str,this);
  },
  draw:function(str){
    var self=this;
    return str.replace(this.reg_key,function(){return self.deq();});
  }
});
//--------------------------------------------------------------------
function ColorBuffer(mrxs){
  this.buff=[];
  for(var i=0;i<mrxs.length;i++)
    this.buff.push(new Refuge(mrxs[i]));
  this.length=this.buff.length;
}
agh.memcpy(ColorBuffer.prototype,{
  bank:function(str){
    for(var i=0;i<this.length;i++)
      str=this.buff[i].bank(str);
    return str;
  },
  draw:function(str){
    for(var i=this.length-1;i>=0;i--)
      str=this.buff[i].draw(str);
    return str;
  }
});
//--------------------------------------------------------------------
function ColorSyntax(languageId){
  /*?lwiki
   * @param languageId 言語IDを直接指定する。
   *   省略すると一意な言語IDが生成される。
   *
   * **言語IDについて
   *
   * 言語IDは置換中の文字列に対して非終端文字として使用される。
   * 複数の言語を多層的に適用する場合には、このIDは言語毎に一意である必要がある。
   *
   * 一方で他の言語と一緒に使う可能性のない言語 (例えば部分置換などに使用する文法)や、
   * 一緒に使う言語の集合が限定されている場合には、手動で言語IDを指定する事ができる。
   * 手動で割り当てた場合には全体の一意な言語ID決定に対する影響はない。
   * (つまり、全体の言語IDと重複する可能性もある。)
   *
   * ところで、この仕組み自体に対する疑問も残る。
   * -例えば、同じ言語に対する変換を多層的に適用した場合に結果が滅茶苦茶になる。
   * -そもそも多層的に使用する言語・変換の種類はそんなに多くない。
   *  現在のところ確認できるのは stage_escapehtml のみの様な気がする。
   *  (当初は diff や iline もこれで処理する事が想定していたが、
   *  何らかの理由で取りやめになったのだったと思う。)
   *
   * **複数のステージに分けて処理する理由?
   *
   * そもそもの問題として何故複数のステージに分けて処理するのかも謎である。
   * 正規表現の処理速度以外に利点は無いような気がする。
   * (ルールが増えてくると一致したキャプチャグループを特定するのに時間が掛かる。)
   *
   * 多くのステージはそのまま結合する事ができてしまうのではないか?
   *
   * ただ、注意しなければならないのは前のステージで return hoge+key+fuga;
   * 等とした時に hoge/fuga の部分が後段のステージの変換対象になる可能性があるという事。
   * 特に、JavaScript の正規表現には (?<!) や (?<=) 等の戻り読み判定が使えないのでこれは有用である。
   *
   * もう一つの多段ステージの有用な使い方は、
   * 前段で後段の変換にとって紛らわしい変換を処理してしまうという事である。
   * 例えば css では {content:"hello{{{{}}}}";} の {～} を含む部分を処理する場合に
   * 引用符の中身にある {{{{}}}} をスキップする様にしたい。
   * 初段で {content:N;} に変換してしまえばこれは簡単である。
   * 初段で処理しない場合には {～} を直接正規表現でキャプチャするのではなく、
   * まず /{/ に一致させた後で、
   * -手動で正しい /}/ までを検出するか、
   * -mode=INSIDE_BRACE などと切替を行って動作を変更するか
   * しなければならない。二つ目の方法を選択する場合には実際にはステージ自体をすりかえる方向になるだろう。
   * 結局の所、複数のステージを用意する事になるがこの様な変換方法の方が自然な気がする。
   *
   * 現状の実装でこの様な物が使われている可能性のある言語: ruby css
   *
   * **言語IDの代替手段?
   *
   * そもそも言語IDを導入したのは diff, iline, escape_html 等の変換と別の言語の変換を組み合わせる為であった。
   * しかし現状では escape_html 以外は他の言語と組み合わせるという事はしていない。
   * (あらゆる言語の組合せについて一々新しくひとまとまりの「変換」を定義するのは非効率だからである。
   * 代わりに diff+escape_html、iline+escape_html, js+escape_html 等の様な変換を単に直列にしている。)
   *
   * しかしこの方法(言語IDを用いる方法)にも限度や危険性がある。
   * - 言語IDに用いている文字が変換対象の言語の解釈を変更させてしまう。
   *   例えば Fortran の様に列が意味を持つ言語の場合に escape_html の言語ID が文頭に入っていると問題になる。
   * - 言語IDが変換対象の言語によって分断して解釈された場合に、escape された内容がずれて大変な事になる。
   * - (escape_html に頼って組み合わせている場合、) diff の特殊な文字などが、変換対象の言語の解釈を変更する。
   *   或いは、その diff の特殊文字が変換対象の言語の一部と見做されてしまう。
   * - sed では変換対象の言語を記述する部分に \\ 等の escape が必要になる。
   *   つまり、container 言語側の escape が中身の言語の記述を変化させる場合がある。
   *   この様な場合に正確な対処が出来ない。
   * - shell スクリプトで `echo \`echo hello\`` 等となっている物を正しく色付けする為には、
   *   中身を unescape して echo `echo hello` とした後に色付けをして、
   *   再び escape を実行するという様な非自明な操作が必要となる。
   *
   * 例えば以下の様な対処方法はできないだろうか?
   * 1 container 言語の色付けを行うと同時に、中身の言語に対応する文字列を生成する
   * 2 中身の言語に対応する文字列を色付けする
   * 3 色付けされた中身の言語を解釈して、container の該当部分に配分する
   *
   * ここで問題になるのは、3 で色付けされた中身の言語をどの様に分割するかという事である。
   * つまり、色付けされる前のどの部分が、色付けされた後のどの部分に対応するのかという情報をどう得るのか、という事である。
   * a replace を弄って、変換後の index と変換前の index の対応表を同時に出力する様にする
   *   しかし、これだと replace の中で更に単語を分割して色付けする場合に対応できない。
   *   分割して色付けする場合にはそれに対応する様に手動で index の対応を登録しなければならず、面倒だし確実でない。
   *   少しでも不完全だと変換結果の内容に影響を及ぼすので難しい。
   * b 「表示される文字数は変わらない」という制約を仮定して、実際に文字を数える事によって分割を行う。
   *   タグの入れ子関係なども考慮に入れて分割を実行する様にできる。
   *   例えば html_slice/html_split 等という関数を作る。
   *
   */

  if(agh.is(languageId,Number))
    this.ilang=ColorSyntax.lang_id=languageId;
  else
    this.ilang=ColorSyntax.lang_id++;

  this.istage=0;
  this.stages=[];
  this.stage=null;
}
agh.memcpy(ColorSyntax,{
  lang_id:0,
  // 数値を非文字のシーケンスで表現します。
  NumberToCode:(function(){
    var d2c={};
    var d2ct={};
    for(var i=0;i<16;i++){
      var d=i.toString(16);
      d2c[d]=String.fromCharCode(0xFFE0+i);
      d2ct[d]=String.fromCharCode(0xFFD0+i);
    }

    return function(num){
      var ret="";
      var str=num.toString(16);
      var iM=str.length-1;
      for(var i=0;i<iM;i++)
        ret+=d2c[str.substr(i,1)];
      ret+=d2ct[str.substr(iM,1)];
      return ret;
    };
  })()
});
agh.memcpy(ColorSyntax.prototype,{
  enclosingClassName:null,
  add_stage:function(flags){
    var key="\uFFFF"+ColorSyntax.NumberToCode(this.ilang)+ColorSyntax.NumberToCode(this.istage++);
    var reg_key=new RegExp(key,"g");
    this.stage=new agh.Text.MultiRegex(flags);
    this.stage.key=key;
    this.stage.reg_key=reg_key;
    this.stages.push(this.stage);
    return key;
  },
  add_rule:function(reg,fun){
    if(agh.is(reg,String)){
      reg=new RegExp(reg); // source と解釈
    }

    if(agh.is(fun,Function)){
      this.stage.register(reg,fun);
    }else{
      var cls=fun.cls; // class 名
      var key=this.stage.key;
      var mod=!!fun.escht?_h: fun.mod;
      this.add_rule(
        reg,!!mod?function($G){
          this.enq(_cls(mod($G[0]),cls));
          return key;
        }:function($G){
          this.enq(_cls($G[0],cls));
          return key;
        }
      );
    }
  },
  create_fun:function(){
    var self=this;
    var mrxs=this.stages;
    return function(str,options){
      var escht=agh.is(options,String)&&!!options.match(/\/html\b/);
      var buff=new ColorBuffer(escht?[stage_escapehtml].concat(mrxs):mrxs);
      str=buff.bank(str);
      str=_h(str); // 茲で "{ /* 複数行に亙る */ }" に対する対応を取るのも良い。
      str=buff.draw(str);
      if(self.enclosingClassName)
        str='<span class="'+self.enclosingClassName+'">'+str+'</span>';
      return str;
    };
  },
  register:function(name){
    registerSyntaxHighlighter(name,this.create_fun());
  }
});
//--------------------------------------------------------------------
var stage_escapehtml=(function(){
  var reg_escht=new RegExp(agh.Text.Regex.ht_tag.source+"|\<\!--.*?--\>","g");
  var reg_htntt=agh.Text.Regex.ht_entt_ref;

  var lang=new ColorSyntax();
  var key=lang.add_stage();
  lang.add_rule(reg_escht,function($){
    if(/^<br\s*\/?>$/i.test($[0]))return "\n";
    this.enq($[0]); // その儘待避
    return key;
  });
  lang.add_rule(reg_htntt,function($){
    return agh.Text.Unescape($[0],"html");
  });

  return lang.stage;
})();
//-----------------------------------------------------------------------------
//  他から利用する為に
//-----------------------------------------------------------------------------
ns.CreateHtmlRefuge=function CreateHtmlRefuge(){
  return new Refuge(stage_escapehtml);
};
var Reg={};
(function(){
  // comment "// ..." and "/* ... */"
  Reg.comment_cpp=/\/\/[^\n\r]*(?=$|[\r\n])|\/\*[\s\S]*?\*\//g;

})();
//*****************************************************************************
//    Diff (Universal)
//*****************************************************************************
(function(){
  var lang=new ColorSyntax();

  var classAdded   ='agh-syntax-line-filled agh-text-diff-added';
  var classDeleted ='agh-syntax-line-filled agh-text-diff-deleted';
  var classChanged ='agh-syntax-line-filled agh-text-diff-changed';
  var classLocation='agh-syntax-line-filled agh-text-diff-location';
  var classComment ='agh-text-diff-comment';
  var cdict={
    '#':classComment,
    '@':classLocation, // -u
    '0':classLocation, // default
    '1':classLocation, // default
    '2':classLocation, // default
    '3':classLocation, // default
    '4':classLocation, // default
    '5':classLocation, // default
    '6':classLocation, // default
    '7':classLocation, // default
    '8':classLocation, // default
    '9':classLocation, // default
    '*':[
      [/^\*\*\* [0-9].* \*\*\*\*$/,classDeleted], // -c
      classLocation // -c
    ],
    '-':[
      [/^\-\-\- [0-9].* \-\-\-\-$/,classAdded], // -c
      [/^\-\-\- /,classLocation], // -c
      [/^\-\-\-$/,null], // default (separator)
      classDeleted // -u -c
    ],
    '<':classDeleted, // default
    '+':[
      [/^\+\+\+ /,classLocation], // -u
      classAdded   // -u -c
    ],
    '>':classAdded,   // default
    '!':classChanged  // -c
  };

  var k=lang.add_stage("g");
  lang.add_rule(/([^\r\n]+)(\r?\n|\r|$)/g,function($){
    var cls=cdict[$[0].substr(0,1)];
    if(cls instanceof Array){
      var list=cls;cls=null;
      for(var i=0,iN=list.length;i<iN;i++){
        if(list[i] instanceof Array){
          if(!list[i][0].test($[0]))continue;
          cls=list[i][1];
          break;
        }else if(agh.is(list[i],String)){
          cls=list[i];
          break;
        }
      }
    }

    if(!cls)return $[0];

    var htContent=_cls(_h($[1]),cls);
    if(agh.browser.vCr)
      this.enq(_cls(htContent,'agh-syntax-cr39workaround'));
    else
      this.enq(htContent);
    return k+$[2];
  });

  lang.register("diff");
})();
//*****************************************************************************
//    Line
//*****************************************************************************
(function(){
  // /^/gm で実行すると \r\n が分裂するので真面目に書く。
  var lang=new ColorSyntax();
  var k=lang.add_stage("g");
  lang.add_rule(/^|\r?\n|\r/g,function(G){
    if(!this.iline){this.iline=1;}else this.iline++;
    this.enq('<span class="agh-syntax-line-index" title="'+this.iline.format("%4d")+'"></span>');
    return G[0]+k;
  });
  lang.register(".iline");
})();
//******************************************************************************
//    JavaScript
//******************************************************************************
//  agh.Text.Color.js(source);
//    source  :<string> javascript のソース
//    result  :<string> クラス分けされた HTML
//  変更 2009/07/30
(function(){
  var reg_comment=Reg.comment_cpp;
  var reg_quoted =/"(?:[^\\\"]|\\.)*"|'(?:[^\\\']|\\.)*'/g;
  var rex_head   =/(?:^|[\;\{\}\=\+\?\:\,\(]|\btypeof|\bcase|\bdo|\breturn)\s*/.source;
  var rex_body   =/\/(?![\*])(?:[^\\\n\r\/\[]|\\.|\[(?:[^\\\]\n\r]|\\.)+\])+\/[migy]{0,4}/.source;
  var reg_regex  =RegExp("({0})({1})".format(rex_head,rex_body),"g");
  var reg_id     =/(?:\$|\b[A-Za-z_])[\w\$]*/g;
  var reg_num    =/0[xX][\dA-Fa-f]+|(?:\d*\.)?\d+(?:[eE][\+\-]?\d+)?/g;
  var wds_keyword=[
    "abstract","break","byte","case","catch","class","const","continue",
    "default","do","else","extends","false","final","finally","for",
    "goto","if","implements","import","in","instanceof","interface",
    "native","new","null","package","private","protected","public","return","static",
    "super","switch","synchronized","this","throw","throws","transient","true","try",
    "while","with","function",
    "typeof","undefined",
    "int","long","boolean","short","double","float","char","var","void"
  ];

  var lang=new ColorSyntax();

  var k1=lang.add_stage("g"); // 置換後の値
  lang.add_rule(reg_comment,{cls:"agh-text-js-comment",escht:true});
  lang.add_rule(reg_quoted,{cls:"agh-text-js-string",escht:true});
  lang.add_rule(reg_regex,function($){
    this.enq(_cls(_h($[2]),"agh-text-js-regexp"));
    return $[1]+k1;
  });

  var k2=lang.add_stage("g");
  lang.add_rule(new RegExp("\\b(?:"+wds_keyword.join('|')+")\\b",'g'),{cls:"agh-text-js-reserved"});
  lang.add_rule(reg_id,{cls:"agh-text-js-identifier"});
  lang.add_rule(reg_num,{cls:"agh-text-js-numeric"});

  lang.register(["js","JavaScript","JScript","ECMAScript"]);
})();
//******************************************************************************
//    Ruby
//******************************************************************************
//    source  :<string> Ruby のソース
//    result  :<string> クラス分けされた HTML
// 変更: 2009/07/30
// TODO: Ruby は色々複雑なので、これは完全ではない
(function(){
  //----------------------------------------------------------------
  //  replace 中に lastIndex を変更できる様な仕組みを作ったので、
  //  其れを使って再度実装する事にする。
  //----------------------------------------------------------------
  //    定義
  //----------------------------------------------------------------
  var reg_ident=/(?:\$|\@{1,2}|\b[A-Z_a-z])\w*\b/g;
  var reg_emdoc=/^\=begin\b[\s\S]*?^\=end\b[^\n\r]*$/gm;
  var reg_comment=/\#[^\n\r]*?$/gm;
  // ※ ? 記法より後である必要

  var rex_expr="\\#(?=[\\@\\$]){0:src}".format(reg_ident);
  //----------------------------------------------------------------
  // 文字列・正規表現リテラル
  var rex_dq_cont="(?:{0:src}|{1}|\\#(?!\\{))*".format(/[^"\#\\]|\\./,rex_expr);

  var rex_dq='"'+rex_dq_cont+'"';                      //
  var rex_dq_expropen='"'+rex_dq_cont+"\\#\\{";              //
  var rex_dq_exprnext='\\}'+rex_dq_cont+'\\#\\{';
  var rex_dq_exprclos='\\}'+rex_dq_cont+'"';
  var reg_dq_exprnext=new RegExp(rex_dq_exprnext,"g");          //
  var reg_dq_exprclos=new RegExp(rex_dq_exprclos,"g");          //

  var rex_bq=rex_dq.replace(/"/g,'`');                  //
  var rex_bq_expropen=rex_dq_expropen.replace(/"/g,'`');          //
  var reg_bq_exprnext=new RegExp(rex_dq_exprnext.replace(/"/g,'`'),"g");  //
  var reg_bq_exprclos=new RegExp(rex_dq_exprclos.replace(/"/g,'`'),"g");  //


  var rex_sl_exprnext=rex_dq_exprnext.replace(/"/g,'\\/');
  var rex_sl_exprclos=rex_dq_exprclos.replace(/"/g,'\\/')+"[ioxmnesu]{0,5}";
  var reg_sl=new RegExp(rex_dq.replace(/"/g,'\\/')+"[ioxmnesu]{0,5}");  //
  var reg_sl_expropen=new RegExp(rex_dq_expropen.replace(/"/g,'\\/'));  //
  var reg_sl_exprnext=new RegExp(rex_sl_exprnext,"g");          //
  var reg_sl_exprclos=new RegExp(rex_sl_exprclos,"g");          //

  var rex_sq=/'(?:[^\\']|\\.)*'/.source;                  //
  //----------------------------------------------------------------
  //  % 記法
  var rex_pc_noxp=/\%[sqw]([^\w\(\[\{\<])(?:(?!\1).)*\1/.source;
  //----------------------------------------------------------------
  //  Here Document
  var rex_here_start=/\<\<(\-?)(["`']?)({0:src})\2/.source.format(reg_ident);
  var rex_spaces=/(?:(?![\r\n])\s)*/.source;
  var rex_here_cont="(?:{0:src}|{1}|\\#(?!\\{))*?".format(/[^\#\\]|\\./,rex_expr);
  var rex_here_expropen=rex_here_cont+"\\#\\{";
  var rex_here_exprnext='\\}'+rex_here_cont+'\\#\\{';
  var rex_here_exprclos='\\}'+rex_here_cont;//+rex_term      //
  var rex_here_expr=rex_here_cont;//+rex_term            //
  var reg_here_expropen=new RegExp(rex_here_expropen,"g");    //
  var reg_here_exprnext=new RegExp(rex_here_exprnext,"g");    //
  //----------------------------------------------------------------
  var wds_reserved=[
    "BEGIN","class","ensure","nil","self","when","END","def","false","not"
    ,"super","while","alias","defined?","for","or","then","yield","and","do"
    ,"if","redo","true","begin","else","in","rescue","undef","break","elsif"
    ,"module","retry","unless","case","end","next","return","until",

    "__FILE__","__LINE__"
  ];
  //----------------------------------------------------------------
  //  数値リテラル
  var rex_num_ast=/(?:@{0,2}|@(?:@|_(?!_))*@)/.source.replace(/[{}]/g,"$&$&").replace(/@/g,"{0}");
  var rex_num_pls=/(?:@{1,2}|@(?:@|_(?!_))*@)/.source.replace(/[{}]/g,"$&$&").replace(/@/g,"{0}");
  var rex_num_float="{0:format(\\d)}(?:\\.{0:format(\\d)})?(?:[eE][\\+\\-]?{0:format(\\d)})?".format(rex_num_pls);
  var rex_num_0d="0d{0:format(\\d)}".format(rex_num_pls);
  var rex_num_0x="0d{0:format([\\dA-Fa-f])}".format(rex_num_pls);
  var rex_num_0o="0d{0:format([0-7])}".format(rex_num_pls);
  var rex_num_0b="0d{0:format([01])}".format(rex_num_pls);
  var rex_num_ch=/\?(?:(?:\\C\-)?(?:\\M\-)?[^\s\\]|\\[^\sMC])/.source;
  var rex_num=[rex_num_float,rex_num_0d,rex_num_0x,rex_num_0o,rex_num_0b,rex_num_ch].join("|");
  //================================================================
  //    子変換
  //================================================================
  // for color string
  var ch_rex_expr="(\\\\.)|\\#([\\@\\$]{0:src})".format(reg_ident);
  var ch_reg_expr=new RegExp(ch_rex_expr,"g");
  var color_expr=function(str){
    var buff=[];
    return _h(str).replace(ch_reg_expr,function($0,$1,$2){
      return !!$1?$0: "#"+_cls($2,"agh-text-rb-identifier");
    });
  };
  //================================================================
  //    補助
  //================================================================
  function Data(){
    this.top={key:"}",brace:0};
    this.stack=[this.top];
    this.itop=0;

    this.qhere=[];
  }
  agh.memcpy(Data.prototype,{
    // 式展開
    //------------------------------------------------------------
    push_expr:function(key,value){
      this.stack.push({key:key,brace:0,value:value});
      this.top=this.stack[++this.itop];
    },
    pop_expr:function(key){
      this.stack.pop();
      this.top=this.stack[--this.itop];
    },
    enter_brace:function(){
      this.top.brace++;
    },
    exit_brace:function(){
      this.top.brace--;
    },
    // } が登場した時に、それがどの種類の } か取得
    possible_endtype:function(){
      if(this.top.brace>0)return "}";
      return this.top.key;
    },
    // Here Doc
    //------------------------------------------------------------
    set_here:function(space,type,name){
      this.qhere.push({
        space:space,
        type:type,
        name:name
      });
    },
    get_here:function(){
      if(this.qhere.length==0)return null;
      return this.qhere.shift();
    }
  });
  var get_data=function(buff){
    if(!buff.ruby_data)buff.ruby_data=new Data();
    return buff.ruby_data;
  };
  //----------------------------------------------------------------
  var match_from=function(reg,_){
    reg.lastIndex=_.index;
    var r=reg.exec(_.input);
    if(!r)return null;
    var index=reg.lastIndex-r[0].length;
    if(index!=_.index)return null;
    return r;
  };
  //================================================================
  //    登録
  //================================================================
  var lang=new ColorSyntax();
  //================================================================
  var k1=lang.add_stage("gm");
  lang.stage.set_replace("indexable");
  lang.add_rule(/\?\#/g,function($){return $;}); // skip
  lang.add_rule(reg_comment,{cls:"agh-text-ruby-comment",mod:_h});
  lang.add_rule(reg_emdoc,{cls:"agh-text-ruby-embeddeddoc",mod:_h});
  //----------------------------------------------------------------
  // 文字列・正規表現リテラル
  lang.add_rule(rex_sq,{cls:"agh-text-ruby-string",mod:_h});
  lang.add_rule(rex_dq+"|"+rex_bq,{cls:"agh-text-ruby-string",mod:color_expr});
  lang.add_rule(rex_dq_expropen+"|"+rex_bq_expropen,function($){
    get_data(this).push_expr($[0].substr(0,1));
    this.enq(_cls(color_expr($[0]),"agh-text-ruby-string"));
    return k1;
  });
  lang.add_rule(reg_sl,{cls:"agh-text-ruby-regexp",mod:color_expr});
  lang.add_rule(reg_sl_expropen,function($){
    get_data(this).push_expr('/');
    this.enq(_cls(color_expr($[0]),"agh-text-ruby-regexp"));
    return k1;
  });
  //----------------------------------------------------------------
  // Here Document 設定
  lang.add_rule(rex_here_start,function($){
    get_data(this).set_here(!!$[1],$[2],$[3]);
    this.enq(_cls(_h($[0]),"agh-text-ruby-string"));
    return k1;
  });
  lang.add_rule(/\r\n?|\n/,function($,_){
    var d=get_data(this);
    var here=d.get_here();
    if(here==null)return $[0];

    var rex_term=here.name.replace(/\$/,"\\$");
    if(here.space)rex_term=rex_spaces+rex_term+rex_spaces;
    rex_term="^"+rex_term+"$";

    var r;          // heredoc 検索結果格納先
    _.index=_.lastIndex;  // heredoc 検索開始位置
    switch(here.type){
      case "":case '"':case '`':
      // 式展開が有効な場合
        var reg=new RegExp(rex_here_expr+rex_term,"gm");
        if((r=match_from(reg,_))){
          this.enq(_cls(color_expr(r[0]),"agh-text-ruby-string"));
          _.lastIndex=_.index+r[0].length;
          return $[0]+k1;
        }else if((r=match_from(reg_here_expropen,_))){
          d.push_expr('<',rex_term);
          this.enq(_cls(color_expr(r[0]),"agh-text-ruby-string"));
          _.lastIndex=_.index+r[0].length;
          return $[0]+k1;
        }
        break;
      case "'":
      // 式展開が無効な場合
        var reg=new RegExp("[\\s\\S]*?"+rex_term,"gm");
        if((r=match_from(reg,_))){
          this.enq(_cls(_h(r[0]),"agh-text-ruby-string"));
          _.lastIndex=_.index+r[0].length;
          return $[0]+k1;
        }
        break;
    }

    return $[0];
  });
  //----------------------------------------------------------------
  // {} と式展開の管理
  lang.add_rule(/\}/,function($,_){
    var d=get_data(this);
    var cls,reg_clos,reg_next;
    switch(d.possible_endtype()){
      case "}":
        d.exit_brace();
        return "}";
      case '"':
        cls="agh-text-ruby-string";
        reg_clos=reg_dq_exprclos;
        reg_next=reg_dq_exprnext;
        break;
      case '`':
        cls="agh-text-ruby-string";
        reg_clos=reg_bq_exprclos;
        reg_next=reg_bq_exprnext;
        break;
      case '/':
        cls="agh-text-ruby-regexp";
        reg_clos=reg_sl_exprclos;
        reg_next=reg_sl_exprnext;
        break;
      case '<':
        cls="agh-text-ruby-string";
        reg_clos=new RegExp(rex_here_exprclos+d.top.value,"gm");
        reg_next=reg_here_exprnext;
        break;
      default:
        return $[0];
    }

    // 式展開の終了／継続の一致
    var r;
    if((r=match_from(reg_clos,_))){
      d.pop_expr();
      this.enq(_cls(color_expr(r[0]),cls));
      _.lastIndex=_.index+r[0].length;
      return k1;
    }else if((r=match_from(reg_next,_))){
      this.enq(_cls(color_expr(r[0]),cls));
      _.lastIndex=_.index+r[0].length;
      return k1;
    }
    return $[0];
  });
  lang.add_rule(/\{/,function(){
    get_data(this).enter_brace();
    return "{";
  });
  //----------------------------------------------------------------
  //lang.stage.instantiate();
  //alert(lang.stage.m_reg);
  //================================================================
  var k2=lang.add_stage("g");
  lang.add_rule("(^|[^\\$\\@])\\b("+wds_reserved.join('|')+")\\b",function($){
    this.enq(_cls($[2],"agh-text-ruby-reserved"));
    return $[1]+k2;
  });
  lang.add_rule(reg_ident,{cls:"agh-text-ruby-identifier"});
  lang.add_rule(rex_num,{cls:"agh-text-ruby-numeric"});
  //================================================================

  lang.register(["rb","ruby"]);
})();
//******************************************************************************
//    HTML(source);
//******************************************************************************
//    source  :<string> HTML のソース
//    result  :<string> クラス分けされた HTML
// 変更: 2009/07/30
// 変更: 2011/05/29 css
(function(){
  //----------------------------------------------------------------
  //    定義
  //----------------------------------------------------------------
  // タグ正規表現
  var rex_tag_content=/(?:[^\>"']|"(?:[^\\"]|\\.)*"|'(?:[^\\']|\\.)*')/.source;
  var rex_tag="(\\<\\/?)({0}\\b(?:\\s"+rex_tag_content+"*?)?)(\\/?\\s*\\>)"; // 3
  var reg_tag=new RegExp(rex_tag.format("[A-Za-z_][^\\s\\>\"']*"),"g");

  // 特別要素正規表現
  var rex_any=/[\s\S]*?/.source;
  var rex_stag="(\\<)({0}\\b(?:\\s"+rex_tag_content+"*)?)(\\/?\\s*\\>)"; // 3
  var rex_etag="(\\<\\/)({0}\\b(?:\\s"+rex_tag_content+"*)?)(\\>)"; // 3
  var reg_script=new RegExp("{0:format(script)}({1}){2:format(script)}".format(rex_stag,rex_any,rex_etag),"gi");
  var reg_style=new RegExp("{0:format(style)}({1}){2:format(style)}".format(rex_stag,rex_any,rex_etag),"gi");

  // その他特別
  var reg_comment=/\<\!(\-\-[\s\S]*?\-\-)\>/g;
  var reg_doctype=/\<\!DOCTYPE[^>\[]*\>|\<\!DOCTYPE\s+[\w\-\_]+\s*\[[^\]]*][^\>]*\>/g;
  var reg_xmldecl=/\<\?xml(?:[^\?]|\?[^\>])*\?\>/g;

  // 未実装■
  //----------------------
  //var reg_aspcode=/\<\%(?:[^\?]|\?[^\>])*\%\>/g;
  //var reg_cdata=;

  //----------------------------------------------------------------
  //    タグの色付け
  //----------------------------------------------------------------
  var reg_tag_name=/^[a-zA-Z][\w]*(?:\:\w*)?/;
  var reg_tag_attr=/([^\u2400])([a-zA-Z\-\_][\w\-]*(?:\:\w*)?)(?:(\s*=\s*)([^;`@%&~\^\$\:\s'"][^\s]*|"(?:[^\\"]|\\.)*"|'(?:[^\\']|\\.)*'))?/g;
  var rep_tag_attr="$1"
    +_cls("$2","agh-text-html-attrName")
    +_cls("$3","agh-text-html-attrEq")
    +_cls("$4","agh-text-html-attrVal");
  var reg_tag_endslash=/\/\s*$/;
  var color_tag=function(strS,strC,strE){
    // タグ名取得
    var strN="";
    strC=strC.replace(reg_tag_name,function($0){strN=$0;return "";});
    strC=strC.replace(reg_tag_attr,function($0,$1,$2,$3,$4){
      return rep_tag_attr
        .replace("$1",_h($1))
        .replace("$2",_h($2))
        .replace("$3",_h($3))
        .replace("$4",_h($4));
    });
    strS=_cls(_h(strS),"agh-text-html-tagParen");
    strE=_cls(_h(strE),"agh-text-html-tagParen");
    strN=_cls(strN,"agh-text-html-tagName");
    return _cls(strS+strN+strC+strE,"agh-text-html-tag");
  };
  //----------------------------------------------------------------
  //    コメントの色付け
  //----------------------------------------------------------------
  var reg_com_start=_cls("&lt;!","agh-text-html-tagParen");
  var reg_com_end=_cls("&gt;","agh-text-html-tagParen");
  var color_comment=function(str){
    var r=reg_com_start+_h(str)+reg_com_end;
    return _cls(r,"agh-text-html-comment");
  };
  //----------------------------------------------------------------
  //    登録
  //----------------------------------------------------------------
  var lang=new ColorSyntax();

  var k1=lang.add_stage("g");
  lang.add_rule(reg_script,function($){
    // ■ スクリプトの種類: type="text/hoge" language="hoge" より判定
    this.enq(color_tag($[1],$[2],$[3])+nsColor($[4],"js")+color_tag($[5],$[6],$[7]));
    return k1;
  });
  lang.add_rule(reg_style,function($){
    // ■ スタイルの種類: type="text/hoge" language="hoge" より判定
    this.enq(color_tag($[1],$[2],$[3])+nsColor($[4],"css")+color_tag($[5],$[6],$[7]));
    return k1;
  });
  lang.add_rule(reg_comment,function($){
    this.enq(color_comment($[1]));
    return k1;
  });
  lang.add_rule(reg_tag,function($){
    this.enq(color_tag($[1],$[2],$[3]));
    return k1;
  });
  //lang.add_rule(reg_xmldecl,???);
  //lang.add_rule(reg_doctype,???);
  // ■ entity reference

  lang.register(["htm","html"]);
})();
//******************************************************************************
//    XML;
//******************************************************************************
//    source  :<string> XML のソース
//    result  :<string> クラス分けされた HTML
// 作成: 2011/11/06 html より分岐
(function(){
  //----------------------------------------------------------------
  //    定義
  //----------------------------------------------------------------
  // タグ正規表現
  var rex_tag_content=/(?:[^\>"']|"(?:[^\\"]|\\.)*"|'(?:[^\\']|\\.)*')/.source;
  var rex_tag="(\\<\\/?)({0}\\b(?:\\s"+rex_tag_content+"*?)?)(\\/?\\s*\\>)"; // 3
  var reg_tag=new RegExp(rex_tag.format("[A-Za-z_][^\\s\\>\"']*"),"g");

  // 特別要素正規表現
  var rex_any=/[\s\S]*?/.source;
  var rex_stag="(\\<)({0}\\b(?:\\s"+rex_tag_content+"*)?)(\\/?\\s*\\>)"; // 3
  var rex_etag="(\\<\\/)({0}\\b(?:\\s"+rex_tag_content+"*)?)(\\>)"; // 3
/*
  var reg_script=new RegExp("{0:format(script)}({1}){2:format(script)}".format(rex_stag,rex_any,rex_etag),"gi");
  var reg_style=new RegExp("{0:format(style)}({1}){2:format(style)}".format(rex_stag,rex_any,rex_etag),"gi");
*/

  // その他特別
  var reg_comment=/\<\!(\-\-[\s\S]*?\-\-)\>/g;

  // 未実装■
  //----------------------
  //var reg_aspcode=/\<\%(?:[^\?]|\?[^\>])*\%\>/g;
  //var reg_cdata=;

  //----------------------------------------------------------------
  //    タグの色付け
  //----------------------------------------------------------------
  var reg_tag_name=/^[a-zA-Z][\w]*(?:\:\w*)?/;
  var reg_tag_attr=/([^\u2400])([a-zA-Z\-\_][\w\-]*(?:\:\w*)?)(?:(\s*=\s*)([^;`@%&~\^\$\:\s'"][^\s]*|"(?:[^\\"]|\\.)*"|'(?:[^\\']|\\.)*'))?/g;
  var rep_tag_attr="$1"
    +_cls("$2","agh-text-html-attrName")
    +_cls("$3","agh-text-html-attrEq")
    +_cls("$4","agh-text-html-attrVal");
  var reg_tag_endslash=/\/\s*$/;
  var color_tag=function(strS,strC,strE){
    // タグ名取得
    var strN="";
    strC=strC.replace(reg_tag_name,function($0){strN=$0;return "";});
    strC=strC.replace(reg_tag_attr,function($0,$1,$2,$3,$4){
      return rep_tag_attr
        .replace("$1",_h($1))
        .replace("$2",_h($2))
        .replace("$3",_h($3))
        .replace("$4",_h($4));
    });
    strS=_cls(_h(strS),"agh-text-html-tagParen");
    strE=_cls(_h(strE),"agh-text-html-tagParen");
    strN=_cls(strN,"agh-text-html-tagName");
    return _cls(strS+strN+strC+strE,"agh-text-html-tag");
  };
  //----------------------------------------------------------------
  //    コメントの色付け
  //----------------------------------------------------------------
  var reg_com_start=_cls("&lt;!","agh-text-html-tagParen");
  var reg_com_end=_cls("&gt;","agh-text-html-tagParen");
  var color_comment=function(str){
    var r=reg_com_start+_h(str)+reg_com_end;
    return _cls(r,"agh-text-html-comment");
  };
  //----------------------------------------------------------------
  //    登録
  //----------------------------------------------------------------
  var lang=new ColorSyntax();

  var k1=lang.add_stage("g");
/*
  lang.add_rule(reg_script,function($){
    // ■ スクリプトの種類: type="text/hoge" language="hoge" より判定
    this.enq(color_tag($[1],$[2],$[3])+nsColor($[4],"js")+color_tag($[5],$[6],$[7]));
    return k1;
  });
  lang.add_rule(reg_style,function($){
    // ■ スタイルの種類: type="text/hoge" language="hoge" より判定
    this.enq(color_tag($[1],$[2],$[3])+nsColor($[4],"css")+color_tag($[5],$[6],$[7]));
    return k1;
  });
*/
  lang.add_rule(reg_comment,function($){
    this.enq(color_comment($[1]));
    return k1;
  });
  lang.add_rule(reg_tag,function($){
    this.enq(color_tag($[1],$[2],$[3]));
    return k1;
  });

  // DTD declaration
  //var reg_doctype=/\<\!DOCTYPE[^>\[]*\>|\<\!DOCTYPE\s+[\w\-\_]+\s*\[[^\]]*][^\>]*\>/g;
  var reg_doctype=/(\<\!)(\s*DOCTYPE\b)([^\[\]]*?|\s+[\w\-\_]+\s*\[[\s\S]*?\])(\>)/g;
  lang.add_rule(reg_doctype,function($){
    var buff=[];
    buff.push('<span class="agh-text-html-tagParen">',_h($[1]),'</span>');
    buff.push('<span class="agh-text-html-tagName">',_h($[2]),'</span>');
    buff.push(_h($[3])); // ■より詳細な着色?
    buff.push('<span class="agh-text-html-tagParen">',_h($[4]),'</span>');
    this.enq(buff.join(""));
    return k1;
  });

  // Xml declaration
  var reg_xmldecl=/(\<\?)(xml(?:[^\?]|\?[^\>])*)(\?\>)/g;
  lang.add_rule(reg_xmldecl,function($){
    this.enq(color_tag($[1],$[2],$[3]));
    return k1;
  });

  // Sections
  var reg_section_cdata=/(\<!\[\s*)(R?CDATA|INCLUDE|IGNORE|%[\d\w_]+;)(\s*\[)([\s\S]+?)(\]\]\>)/g;
  lang.add_rule(reg_section_cdata,function($){
    var buff=[];
    buff.push('<span class="agh-text-html-tagParen">',_h($[1]),'</span>');
    buff.push('<span class="agh-text-html-tagName">',_h($[2]),'</span>');
    buff.push('<span class="agh-text-html-tagParen">',_h($[3]),'</span>');

    if($[2]==="CDATA")
      buff.push(_h($[4]));
    else if($[2]==="RCDATA")
      buff.push(_h($[4]));
    else if($[2]==="IGNORE")
      buff.push('<span class="agh-text-html-comment">',_h($[4]),'</span>');
    else{
      // ■DTD として再帰的に彩色
      // ■<![[]]> の入れ子に対応する
      buff.push(_h($[4]));
    }

    buff.push('<span class="agh-text-html-tagParen">',_h($[5]),'</span>');
    this.enq(buff.join(""));
    return k1;
  });

  // var lang_rcdata=new ColorSyntax;
  // lang_rcdata;

  // Entity
  lang.add_rule(/&(?:[\w_]+|#\d+|#x[0-9a-zA-Z]+);/,function($){
    this.enq('<span class="agh-text-html-entity">'+_h($[0])+'</span>');
    return k1;
  });

  //lang.add_rule(reg_xmldecl,???);
  //lang.add_rule(reg_doctype,???);

  lang.register(["xml"]);
})();
//******************************************************************************
//    CSS (Cascading Style Sheet)
//******************************************************************************
//    source  :<string> HTML のソース
//    result  :<string> クラス分けされた HTML
// 追加: 2011/05/29
// TODO: css
(function(){
  //----------------------------------------------------------------
  //    Variables for Initialization
  //----------------------------------------------------------------
  var reg_quoted  =/\@"(?:[^\\\"]|\\.|\"\")*"|"(?:[^\\\"\n\r\f]|\\.)*"|'(?:[^\\\'\n\r\f]|\\.)*'/g;
  var reg_comment =/\/\*(?:[^\*]|\*[^\/])*\*\//g;

  var reg_rules   =/\{[^\{\}]*\}/g;
  var reg_name    =/([a-zA-Z0-9_\-]|\\.)+/g;
  //----------------------------------------------------------------
  //    Rules
  //----------------------------------------------------------------
  var frule=(function(){
    var color_names=[
      "aliceblue","antiquewhite","aqua","aquamarine","azure","beige","bisque","black",
      "blanchedalmond","blue","blueviolet","brown","burlywood","cadetblue","chartreuse",
      "chocolate","coral","cornflowerblue","cornsilk","crimson","cyan","darkblue","darkcyan",
      "darkgoldenrod","darkgray","darkgreen","darkkhaki","darkmagenta","darkolivegreen",
      "darkorange","darkorchid","darkred","darksalmon","darkseagreen","darkslateblue",
      "darkslategray","darkturquoise","darkviolet","deeppink","deepskyblue","dimgray",
      "dodgerblue","firebrick","floralwhite","forestgreen","fuchsia","gainsboro","ghostwhite",
      "gold","goldenrod","gray","green","greenyellow","honeydew","hotpink","indianred",
      "indigo","ivory","khaki","lavender","lavenderblush","lawngreen","lemonchiffon",
      "lightblue","lightcoral","lightcyan","lightgoldenrodyellow","lightgreen","lightgrey",
      "lightpink","lightsalmon","lightseagreen","lightskyblue","lightslategray","lightsteelblue",
      "lightyellow","lime","limegreen","linen","magenta","maroon","mediumauqamarine",
      "mediumblue","mediumorchid","mediumpurple","mediumseagreen","mediumslateblue","mediumspringgreen",
      "mediumturquoise","mediumvioletred","midnightblue","mintcream","mistyrose","moccasin",
      "navajowhite","navy","oldlace","olive","olivedrab","orange","orangered","orchid",
      "palegoldenrod","palegreen","paleturquoise","palevioletred","papayawhip","peachpuff",
      "peru","pink","plum","powderblue","purple","red","rosybrown","royalblue","saddlebrown",
      "salmon","sandybrown","seagreen","seashell","sienna","silver","skyblue","slateblue",
      "slategray","snow","springgreen","steelblue","tan","teal","thistle","tomato","turquoise",
      "violet","wheat","white","whitesmoke","yellow","yellowgreen",

      "activeborder","activecaption","appworkspace","background","buttonface","buttonhighlight",
      "buttonshadow","buttontext","captiontext","graytext","highlight","highlighttext",
      "inactiveborder","inactivecaption","inactivecaptiontext","infobackground","infotext",
      "menu","menutext","scrollbar","threeddarkshadow","threedface","threedhighlight",
      "threedLightshadow","threedshadow","window","windowframe","windowtext",

      "transparent"
    ];

    var lrule=new ColorSyntax();
    var r1=lrule.add_stage("gmi");
    lrule.add_rule(/([a-zA-Z0-9_\-]+)(?=\s*\:)/g,{cls:"agh-text-css-property"});
    lrule.add_rule(/\!important\b/g,{cls:"agh-text-css-important"});
    lrule.add_rule(new RegExp("\\b(?:"+color_names.join("|")+")\\b|\#[a-f0-9]{3,6}\\b|\\b(?:rgb|hsl)a?\\([-+.\\d\\s,%]+\\)","ig"),function($){
      this.enq('<span class="agh-text-css-colorbox" style="background-color:'+$[0]+';"></span>');
      return r1+$[0];
    });

    //var css_functions=[
    //  "rgb","rgba","hsl","hsla","url","rect",
    //  "local","format","attr","counters?","expression"
    //];
    lrule.add_rule(/\b[a-zA-Z0-9\-]+(?=\()/g,{cls:"agh-text-css-function"});

    return lrule.create_fun();
  })();

  //----------------------------------------------------------------
  //    登録
  //----------------------------------------------------------------
  var lang=new ColorSyntax();

  var k1=lang.add_stage("gm");
  lang.add_rule(reg_quoted,{cls:"agh-text-css-string",escht:true});
  lang.add_rule(/\@[a-zA-Z0-9\-]+/g,{cls:"agh-text-css-atrule"});
  lang.add_rule(reg_comment,{cls:"agh-text-css-comment",escht:true});

  var k2=lang.add_stage("gm");
  lang.add_rule(reg_rules,function($){
    this.enq(frule($[0]));
    return k2;
  });
  lang.add_rule(reg_name,{cls:"agh-text-css-name",escht:true});

  lang.register(["css","stylesheet"]);
})();
//******************************************************************************
//  Microsoft Visual C++ 8.0
//******************************************************************************
//  agh.Text.Color.Cpp(source);
//    source  :<string> vc++ のソース
//    result  :<string> クラス分けされた HTML
//  追加 2008/03/31
//  変更 2008/06/25
//  変更 2009/07/30
nsColor.cpp=function(str,option){
  // read option
  var is_ht=option&&option.toString().match(/\/html\b/i);
  var esc=is_ht?EscHtml:EscCtrl;

  var procs=nsColor.cpp.procs;
  str=esc.Read(str);
  agh.Array.each(procs,function(proc){str=proc.read(str);});
  str=_h(str);
  agh.Array.each(procs,function(proc){str=proc.write(str);});
  str=esc.Write(str);
  return str;
};
(function(){
  //----------------------------------------------------------------
  //  定義
  //----------------------------------------------------------------
  var reg_quoted  =/L?(?:"(?:[^\\\"]|\\[\s\S])*"|'(?:[^\\\']|\\[\s\S])*')/g;
  var reg_comment =Reg.comment_cpp;

  var reg_number  =/(?:\d+\.\d*|\.?\d+)(?:[eE][\+\-]?\d+)?|0x[\dA-Fa-f]+/g;
  var reg_numsuf  =/[fF]|[uU]?[iI]64|[uU][lL]?[lL]?|[lL][lL]?[uU]?/g;
  // [\+\-]? ←之を先頭に入れると二項演算の +- も取り込んでしまう。
  var reg_num     =new RegExp("(?:{0:src})(?:{1:src})?\\b".format(reg_number,reg_numsuf),'g');

  var wds_preproc =[
    /* Preprocessor Directives (行頭検査・複合検索も行う様にする) */
    "define\\b","undef\\b","if\\b","ifn?def\\b","elif\\b","else\\b","endif\\b","include\\b(?:\\s*\\<[^<>\n]+\\>)?",
    "pragma\\s+(?:unmanaged|managed|push_macro|pop_macro|comment|once|STDC)\\b"
  ];
  var wds_keyword =[
    "or","and","not","not_eq","bitand","and_eq","bitor","or_eq","xor","xor_eq","compl",
    "static_cast","reinterpret_cast","const_cast","dynamic_cast",
    "nullptr","true","false","new","delete","typeid","sizeof",

    "if","else","for","do","while",
    "switch","case","default",
    "continue","break","goto","return",
    "try","catch","throw",

    "typedef","extern","static","register","auto","inline",
    "const","volatile","__restrict","mutable",
    "using","namespace",

    "template","typename","struct","class","enum","union",
    "private","protected","public","friend","virtual","operator","explicit","this",

    /* C++/CLI: composite keywords */
    "ref struct","ref class","enum class","enum struct","value struct","value class","interface class","interface struct",

    "property","initonly","literal",
    "abstract","sealed","__declspec",
    "__forceinline","__inline",
    "_?_fastcall","_?_cdecl","_?_stdcall","_?_?pascal",
    "__unaligned","__w64",//"far","near",

    "delegate","__interface","event","__event","safecast",

    "for each",
    "finally","__try","__except","__finally",
    "in","generic","__if_exists","__if_not_exists",

    "gcnew","__super","__uuidof","__alignof","__asm","__assume",

    "__leave","__noop","__raise","friend_as","__identifier","__based",
    "__single_inheritance","__multiple_inheritance","__virtual_inheritance",

    /* event handling */
    //"__unhook","__hook",

    /* __declspec */
    //"property","uuid","naked","thread","noinline","noreturn",
    //"nothrow","novtable","selectany","deprecated","dllexport","dllimport",

    /* Managed C++ */
    // "__pin","__value","__property","__nogc","__sealed","__try_cast",
    // "__abstract","__box","__delegate","__gc",

    /* Reserved identifiers */
    "_[A-Z]\\w*",

    /* C++0x */
    "decltype","constexpr","static_assert","alignof","thread_local",

    /* C++ Concept */
    "concept(?:_map)?","requires?"

    /* 他 */
  ];
  var wds_keytype =[
    "int","signed","unsigned","long","short",
    "float","double",
    "void","bool","char","wchar_t",
    /* C++0x */
    "char16_t","char32_t",
    /* VC */
    "__wchar_t",
    "__int8","__int16","__int32","__int64","__int128",
    "__m64","__m128","__m128d","__m128i",
    /* C++/CLI */
    "array","interior_ptr","pin_ptr"
  ];
  //----------------------------------------------------------------
  //  登録
  //----------------------------------------------------------------
  var lang=new ColorSyntax();

  var k1=lang.add_stage("g");
  lang.add_rule(reg_quoted,{cls:"agh-text-cpp-string",escht:true});
  lang.add_rule(reg_comment,{cls:"agh-text-cpp-comment",escht:true});

  var k2=lang.add_stage("gm");
  lang.add_rule(new RegExp("^(\\s*)\\#(\\s*(?:"+wds_preproc.join("|")+"))","gm"),function($){
    // Preprocessor Directive
    var m;
    if((m=$[2].match(/^include(\s*)(\<[^<>\n]+\>)$/))){
      //console.log("m[1]="+m[1]+", m[2]="+m[2]);
      this.enq(
        _cls('#include',"agh-text-cpp-preproc")+m[1]
        +_cls(_h(m[2],"html"),"agh-text-cpp-string")
      );
    }else
      this.enq(_cls(_h('#'+$[2]),"agh-text-cpp-preproc"));
    return $[1]+k2;
  });
  lang.add_rule(/(\b_?_asm\s*)(?:(?:\{([^\{\}]*)\})|([^\r\n]+?)(?=\b_?_asm\b|[\r\n\}]|$))/g,function($){
    // Inline Assembler Code
    if(!!$[2]){
      this.enq(nsColor($[2],"x86"));
      return $[1]+"{"+k2+"}";
    }else{
      this.enq(nsColor($[3],"x86"));
      return $[1]+k2;
    }
  });

  var k3=lang.add_stage("g");
  lang.add_rule(new RegExp("\\b(?:"+wds_keytype.join("|")+")\\b","g"),{cls:"agh-text-cpp-restypes"});
  lang.add_rule(new RegExp("\\b(?:"+wds_keyword.join("|")+")\\b","g"),{cls:"agh-text-cpp-reserved"});
  lang.add_rule(/\b[A-Z_a-z\$][\w\$]*\b/g,{cls:"agh-text-cpp-identifier"});
  lang.add_rule(reg_num,{cls:"agh-text-cpp-numeric"});

  lang.register(["cpp","c++","cxx","hpp","h++","hxx","c","h","inl","vc","vc++"]);
})();
//******************************************************************************
//    x86 系 アセンブリ
//******************************************************************************
//  agh.Text.Color.X86(source);
//    source  :<string> x86 アセンブリ言語のソース
//    result  :<string> クラス分けされた HTML
//  追加 2008/03/31
//  変更 2009/07/30
(function(){
  //----------------------------------------------------------------
  //  定義
  //----------------------------------------------------------------
  var reg_comment=/\;[^\n\r]*(?=$|\n|\r)/g;
  var reg_quoted=/L?"(?:[^\\"]|\\.)*"|L?'(?:[^\\']|\\.)*'/g;
  var reg_numeric=/\b(?:[\dA-F]+H|\d+)\b/ig;
  var reg_ident=/\b[A-Z_a-z\$][\w\$]*\b/g;
  var wds_reserved=[
    "byte","(?:xmm|[dq])?word","ptr","offset"
  ];
  var wds_register=[
    "[acdb][hl]",
    "[re]?[acdb]x",
    "[re]?(?:si|di|sp|bp)",
    "[cdefgs]s",
    "[re]?fl(?:ags)?",
    "[re]?ip",
    "r(?:[89]|1[012345])",
    "xmm[01234567]"
  ];
  var wds_mnemonic=[
    // 509 個

    /* メモリ移動 */
    "MOV(?:[DQ]|NTQ|S[SXBWD]?|ZX|(?:[AUHL]|HL|LH|MSK|NT)PS)?",
    "MOV(?:MSKPD|[AUHL]PD|SD|DQ[AU])",
    "SHUFP[SD]","UNPCK[HL]P[SD]",

    /* 基本演算 */
    "(?:ADD|MUL|DIV|SUB)(?:[SP][SD])?","(?:MAX|MIN|SQRT)[PS][SD]",
    "(?:AND|OR|XOR)(?:P[SD])?","ANDN?P[SD]",

    /* 比較演算 */
    "CMP(?:[PS]S|XCHG(?:8B)?|S[BWD])?",
    "CMPN?(?:EQ|[LG][TE])[SP]D","CMP(?:UN)?ORD[SP]D","U?COMIS[SD]",

    /* 変換 */
    "CVT(?:PI2PS|PS2PI|SI2SS|SS2SI)",
    "CVT(?:PD2P[SI]|P[SI]2PD|SD2S[SI]|S[SI]2SD|DQ2P[SD]|P[SD]2DQ)",
    "CVTT(?:S[SD]2SI|P[SD]2PI|P[SD]2DQ)",

    /* SSE2 Integer Intrinsic は未だ */

    /* Pentium II */
    // http://developer.intel.com/design/pentiumii/manuals/243191.htm
    "AA[ADMS]","ADC","ARPL","BOUND","BS[FR]",
    "BSWAP","BT[CRS]?","CALL","CBW","CDQ","CLC","CLD","CLI","CLTS","CMC",
    "CMOVN?(?:[ABGL]E?|[CE])",
    "CPUID",
    "CWD|CDQ","CWDE","DA[AS]","DEC","EMMS","ENTER",
    "F2XM1","FABS","FADDP?|FIADD","FBLD","FBSTP","FCHS","FN?CLEX",
    "FCMOVN?(?:B|E|BE|U)","FCOMP?P?","FU?COMIP?","FCOS","FDECSTP",
    "FDIVP?|FIDIV","FDIVRP?|FIDIVR","FFREE","FICOMP?","FILD","FINCSTP",
    "FN?INIT","FISTP?","FLD(?:1|L2T|L2E|PI|LG2|LN2|Z|CW|ENV)?",
    "FMULP?|FIMUL","FNOP","FP(?:ATAN|REM|REM1|TAN)","FRNDINT","FRSTOR",
    "FN?SAVE","FSCALE","FSIN","FSINCOS","FSQRT","FSTP?",
    "FN?ST(?:CW|ENV|SW)","FSUBR?P?|FISUBR?","FTST","FUCOMP?P?","FWAIT",
    "FX(?:AM|CH|RSTOR|SAVE|TRACT)","FYL2X(?:P1)?","HLT","IDIV","IMUL",
    "IN","INC","INS[BWD]?","INTO?","INV(?:D|LPG)","IRETD?",
    "JN?(?:[ABGL]E?|[CEOPSZ])","JP[EO]","JE?CXZ","JMP","LAHF","LAR",
    "LDMXCSR","L[DEFGS]DS","LEA","LEAVE","L[GIL]DT","LMSW","LOCK",
    "LODS[BWD]?","LOOP(?:N?[EZ])?","LSL","LTR","MASKMOVQ",
    "NEG","NOP","NOT","OUT","OUTS[BWD]?",
    "PACK(?:SSWB|SSDW|USWB)","PADD(?:[BWD]|U?S[BW])","PANDN?","PAVG[BW]",
    "PCMP(?:EQ|GT)[BWD]","PEXTRW","PINSRW","PMADDWD","PMAX(?:SW|UB)",
    "PMIN(?:SW|UB)","PMOVMSKB","PMUL(?:HU|H|L)W","POP(?:[AF]D?)?","POR",
    "PREFETCH","PSADBW","PSHUFW","PSLL[WDQ]","PSRA[WD]","PSUB[BWD]",
    "PSUBU?S[BW]","PUNPCK[HL](?:BW|WD|DQ)","PUSH(?:[AF]D?)?","PXOR",
    "R[CO][LR]","RCP[PS]S","RD(?:MSR|PMC|TSC)","REP(?:N?[EZ])?","RET",
    "RSM","RSQRT[PS]S","SAHF","SA[LR]","SBB","SCAS[BWD]?",
    "SETN?(?:[ABGL]E?|[CEOPSZ])","SETP[EO]","S[GIL]DT","SH[LR]D?",
    "SFENCE","SMSW","ST[CDI]","STMXCSR","STOS",
    "STR","SYS(?:ENTER|EXIT)","TEST","UD2",
    "VER[RW]","F?WAIT","WBINVD","WRMSR","XADD","XCHG",
    "XLATB?",

    /* ? */
    //"OpdSz",
    "ESC","RETF"
  ];
  //----------------------------------------------------------------
  //  登録
  //----------------------------------------------------------------
  var lang=new ColorSyntax();

  var k1=lang.add_stage("ig");
  lang.add_rule(reg_comment,{cls:"agh-text-x86-comment",escht:true});
  lang.add_rule(reg_quoted,{cls:"agh-text-x86-string",escht:true});
  lang.add_rule(new RegExp("\\b(?:"+wds_reserved.join("|")+")\\b","ig"),{cls:"agh-text-x86-keyword"});
  lang.add_rule(new RegExp("\\b(?:"+wds_mnemonic.join("|")+")\\b","ig"),{cls:"agh-text-x86-mnemonic"});
  lang.add_rule(new RegExp("\\b(?:"+wds_register.join("|")+")\\b","ig"),{cls:"agh-text-x86-register"});
  lang.add_rule(reg_ident,{cls:"agh-text-x86-identifier"});
  lang.add_rule(reg_numeric,{cls:"agh-text-x86-numeric"});

  lang.register(["x86","masm","asm","inc"]);
})();
//******************************************************************************
//    Microsoft Visual C#
//******************************************************************************
//  agh.Text.Color.X86(source);
//    source  :<string> x86 アセンブリ言語のソース
//    result  :<string> クラス分けされた HTML
//  追加 2009/02/10
//　TODO: /// コメント /** コメント
(function(){
  //----------------------------------------------------------------
  //    Variables for Initialization
  //----------------------------------------------------------------
  var reg_quoted  =/\@"(?:[^\\\"]|\\.|\"\")*"|"(?:[^\\\"\n\r\f]|\\.)*"|'(?:[^\\\'\n\r\f]|\\.)*'/g;
  var reg_comment  =/\/\/[^\n\r]*(?=$|\n|\r)|\/\*(?:[^\*]|\*[^\/])*\*\//g;

  // [\+\-]? ←之を先頭に入れると二項演算の +- も取り込んでしまう。
  var reg_number  =/(?:\d+\.\d*|\.?\d+)(?:[eE][\+\-]?\d+)?|0x[\dA-Fa-f]+/g;
  var reg_numsuf  =/[dDmMfFlL]|[uU][lL]?|[lL][uU]?/g;
  var reg_numeric  =new RegExp("(?:{0:src})(?:{1:src})?\\b".format(reg_number,reg_numsuf),'g');

  var wds_preproc  =[
    /* Preprocessor Directives (行頭検査・複合検索も行う様にする) */
    "define","undef","if","else","elif","endif",
    "warning","error","line","region","endregion",
    "pragma","pragma\\s(?:checksum|warning)"
  ];
  var wds_keyword  =[
    "do","while","for","foreach","in","continue","break",
    "if","else","switch","case","default","try","catch","finally",
    "using","lock","unsafe","checked","unchecked","fixed",
    "return","goto","throw","yield",

    "public","protected","internal","private",
    "extern","static","const","stackalloc",
    "sealed","partial","abstract","override","virtual",
    "readonly","params","out","ref","volatile",
    "where","base","this",

    "set","get","add","remove","value",
    "event","operator","implicit","explicit",

    "typeof","as","is","sizeof","new",
    "null","true","false",

    "namespace","global",
    "class","struct","delegate","interface","enum",
    "__reftype","__refvalue","__makeref","__arglist"
  ];
  var wds_keytype  =[
    "sbyte","byte","short","ushort","int","uint","long","ulong",
    "char","bool","float","double","void","string",
    "object","decimal"
  ];
  //----------------------------------------------------------------
  //    登録
  //----------------------------------------------------------------
  var lang=new ColorSyntax();

  var k1=lang.add_stage("gm");
  lang.add_rule(reg_quoted,{cls:"agh-text-cs-string",escht:true});
  lang.add_rule(reg_comment,{cls:"agh-text-cs-comment",escht:true});
  lang.add_rule(new RegExp("^(\\s*)\\#(\\s*(?:"+wds_preproc.join("|")+"))\\b","gm"),{cls:"agh-text-cs-preproc"});

  var k2=lang.add_stage("g");
  lang.add_rule(new RegExp("\\b(?:"+wds_keyword.join("|")+")\\b","g"),{cls:"agh-text-cs-reserved"});
  lang.add_rule(new RegExp("\\b(?:"+wds_keytype.join("|")+")\\b","g"),{cls:"agh-text-cs-restypes"});
  lang.add_rule(/\b[A-Z_a-z\$][\w\$]*\b/g,{cls:"agh-text-cs-identifier"});
  lang.add_rule(reg_numeric,{cls:"agh-text-cs-numeric"});

  lang.register(["c#","cs","csharp"]);
})();
//******************************************************************************
//    Common/Microsoft Intermediate Language
//******************************************************************************
//  agh.Text.Color(source,"il");
//    source  :<string> x86 アセンブリ言語のソース
//    result  :<string> クラス分けされた HTML
//　参考 ECMA 335
//  追加 2009/08/01
(function(){
  // 数値リテラル、文字列、コメント
  //----------------------------------------------------------------
  //    Variables for Initialization
  //----------------------------------------------------------------
  var reg_quoted  =/L?(?:"(?:[^\\\"]|\\.)*"|'(?:[^\\\']|\\.)*')/g;
  var reg_comment  =/\/\/[^\n\r]*(?=$|\n|\r)|\/\*(?:[^\*]|\*[^\/])*\*\//g;
  var reg_number  =/(?:\d+\.\d*|\.?\d+)(?:[eE][\+\-]?\d+)?|0x[\dA-Fa-f]+/g;
  var reg_numsuf  =/[fF]|[uU]?[iI]64|[uU][lL]?[lL]?|[lL][lL]?[uU]?/g;
  var reg_numeric  =new RegExp("(?:{0:src})(?:{1:src})?\\b".format(reg_number,reg_numsuf),'g');

  var reg_ident0=/\[([^\[\]]+)\]/g;
  var reg_ident=/\b[A-Z_a-z\$][\w\$]*\b/g;
  var rex_declaration=[
    "\\.(?:addon|assembly|cctor|class|corflags|ctor|custom|data|emitbyte|entrypoint|event|export|field|file|",
    "file\\s+alignment|filter|fire|get|hash(?:\\s+algorithm)?|imagebase|language|line|locale|locals|",
    "maxstack|method|module(?:\\s+extern)?|mresource|namespace|other|override|pack|param|permission|",
    "permissionset|property|publickey|publickeytoken|removeon|set|size|subsystem|try|ver|vtable|vtentry|",
    "vtfixup|zeroinit)\\b|\\b(?:at|catch|extends|fault|field|finally|handler|implements|method|to)\\b"
  ].join("");

  var rex_instruction=[
    // -- prefix --
    "\\b(?:constrained|no|readonly|tail|unaligned|volatile)\\.|",
    "\\b(?:",

    // -- base instructions --
    "add(?:\\.ovf(?:\\.un)?)?|and|arglist|beq(?:\\.s)?|bge(?:\\.un)?(?:\\.s)?|bgt(?:\\.un)?(?:\\.s)?|",
    "ble(?:\\.un)?(?:\\.s)?|blt(?:\\.un)?(?:\\.s)?|bne\\.un(?:\\.s)?|br(?:\\.s)?|break|brfalse(?:\\.s)?|",
    "brtrue(?:\\.s)?|brinst(?:\\.s)?|call|calli|ceq|cgt(?:\\.un)?|ckfinite|clt(?:\\.un)?|conv\\.(?:[iu][1248]?|",
    "r[48]|r\\.un)|conv\\.ovf\\.[iu][1248]?(?:\\.un)?|cpblk|div(?:\\.un)?|dup|endfilter|endfault|endfinally|",
    "initblk|jmp|ldarg(?:\\.[s0123])?|ldarga(?:\\.s)?|ldc\\.(?:i4(?:\\.(?:[012345678s]|[mM]1))?|i8|r[48])|",
    "ldftn|ldinf\\.(?:[iu][1248]|r[48]|i|ref)|ldloc(?:\\.[0123s])?|ldloca(?:\\.s)?|ldnull|leave(?:\\.s)?|",
    "localloc|mul(?:\\.ovf(?:\\.un)?)?|neg|nop|not|or|pop|rem(?:\\.un)?|ret|shl|shr(?:\\.un)?|starg(?:\\.s)?|",
    "stind\\.(?:i[1248]?|r[48]|ref)|stloc(?:\\.[0123s])?|sub(?:\\.ovf(?:\\.un)?)?|switch|xor|",

    // -- object model instructions --
    "box|callvirt|castclass|cpobj|initobj|isinst|idelem(?:\\.(?:[iu][1248]|r[48]|i|ref))?|ldelema|ldfld|",
    "ldflda|ldlen|ldobj|ldsfld|ldsflda|ldstr|ldtoken|ldvirtftn|mkrefany|newarr|newobj|refanytype|refanyval|",
    "rethrow|sizeof|stelem(?:\\.(?:i[1248]?|r[48]|ref))?|stfld|stobj|stsfld|throw|unbox(?:\\.any)?",

    ")\\b"
  ].join("");

  var rex_keytype=[
    "ansi\\s+bstr|as\\s+any|blob(?:_object)?|bool|bstr|bytearray|byvalstr|carray|cf|char|class|clsid|",
    "currency|custom|date|decimal|error|filetime|fixed\\s+(?:array|sysstring)|float32|float64|hresult|",
    "idispatch|int(?:8|16|32|64)?|interface|iunknown|lpstruct|lp[tw]?str|modopt|modreq|",
    "native\\s+(?:float|int|unsigned\\s+int|struct)|null|nullref|object|objectref|record|safearray|",
    "storage|stored_object|stream|streamed_object|string|struct|syschar|tbstr|typedref|",
    "unsigned\\s+int(?:8|16|32|64)?|userdefined|value\\s+class|valuetype|variant|variant\\s+bool|vector|",
    "void|false|true|value|pinned"
  ].join("");

  var rex_keyword=[
    "abstract|ansi|assembly|assert|auto|autochar|beforefieldinit|callmostderived|cdecl|cil|default|",
    "demand|deny|enum|explicit|famandassembly|family|famorassem|fastcall|final|forwardref|fromunmanaged|",
    "hidebysig|import|in|inheritcheck|initonly|instance|interface|internalcall|lasterr|linkcheck|literal|",
    "managed|marshal|native|nested\\s+assembly|nested\\s+famandassem|nested\\s+family|nested\\s+famorassem|",
    "nested\\s+private|nested\\s+public|newslot|noinlining|nomangle|noncasdemand|noncasinheritance|noncaslinkdemand|",
    "notserialized|opt|optil|out|permitonly|pinvokeimpl|prejitdeny|prejitgrant|preservesig|private|",
    "privatescope|public|reqmin|reqopt|reqrefuse|reqsecobj|request|rtspecialname|runtime|sealed|sequential|",
    "serializable|specialname|static|stdcall|synchronized|thiscall|tls|unicode|unmanaged|unmanagedexp|",
    "vararg|virtual|winapi"
  ].join("");
  //----------------------------------------------------------------
  //    登録
  //----------------------------------------------------------------
  var lang=new ColorSyntax();

  var k1=lang.add_stage("g");
  lang.add_rule(reg_quoted,{cls:"agh-text-il-string",escht:true});
  lang.add_rule(reg_comment,{cls:"agh-text-il-comment",escht:true});
  lang.add_rule(reg_ident0,function($){
    this.enq("["+_cls(_h($[1]),"agh-text-il-identifier")+"]");
    return k1;
  });
  lang.add_rule(new RegExp(rex_declaration,"g"),{cls:"agh-text-il-decl"});
  lang.add_rule(new RegExp(rex_instruction,"g"),{cls:"agh-text-il-instruc"});
  lang.add_rule(new RegExp("\\b(?:"+rex_keytype+")\\b","g"),{cls:"agh-text-il-keytype"});
  lang.add_rule(new RegExp("\\b(?:"+rex_keyword+")\\b","g"),{cls:"agh-text-il-keyword"});
  lang.add_rule(reg_ident,{cls:"agh-text-il-identifier"});
  lang.add_rule(reg_numeric,{cls:"agh-text-il-numeric"});

  lang.register(["il","cil","msil"]);
})();
//******************************************************************************
//    Emacs Lisp
//******************************************************************************
//  agh.Text.Color.el(source);
//    source  :<string> emacs lisp
//    result  :<string> クラス分けされた HTML
//
//  2013/01/16, keyword=dotimes 追加
//  2011/07/10, Emacs Lisp 作成
(function(){
  var reg_comment =/\;[^\n\r]*(?=$|\n|\r)/g;
  var reg_quoted  =/"(?:[^\\\"]|\\.)*"/g;
  var reg_num     =/(?:\d*\.)?\d+(?![\w_\:\$\=\+\-\*\/\%\<\>\?\.\!\&\~\^\@]|$)/g;
  var reg_name    =/[a-zA-Z\d\&\:][\w_\:\$\=\+\-\*\/\%\<\>\?\.\!\&\~\^\@]*/g;
  var wds_keyword  =[
    "catch","cond","condition-case",
    "if","let[f\\*]?","prog[12n]?",
    "save-current-buffer","save-excursion","save-restriction","save-window-excursion",
    "track-mouse","unwind-protect","with-output-to-temp-buffer",
    "while","dotimes",

    "when","unless","throw","lambda",
    "require","provide",

    "defalias","defconst","defmacro","defun","defvar","defcustom","defadvice",

    "error","warn","signal"

    // function and interactive quote
    // setq setq-default
  ];

  var lang=new ColorSyntax();

  var k1=lang.add_stage("g"); // 置換後の値
  lang.add_rule(reg_comment,{cls:"agh-text-el-comment",escht:true});
  lang.add_rule(reg_quoted,{cls:"agh-text-el-string",escht:true});

  var k2=lang.add_stage("g");
  lang.add_rule(new RegExp("\\b(?:"+wds_keyword.join('|')+")\\b",'g'),{cls:"agh-text-el-keyword"});
  lang.add_rule(reg_num,{cls:"agh-text-el-numeric"});
  lang.add_rule(reg_name,function($){
    var value=$[0];
    this.enq(_cls(_h(value),
      value.substr(0,1)==':'?"agh-text-el-token":
      value.substr(0,1)=='&'?"agh-text-el-attr":
      "agh-text-el-identifier"
    ));
    return k2;
  });

  lang.register(["el"]);
})();
//******************************************************************************
//  PHP
//******************************************************************************
//! @fn agh.Text.Color.php(source);
//! @param source <string> Emacs Lisp のソースコードを指定します。
//! @return       <string> タグ付けされた HTML を返します。
//
//  2015-01-15 作成
(function(){
  var lang=new ColorSyntax();
  var k1=lang.add_stage("gi"); // keywords are non case-sensitive
  lang.stage.set_replace("indexable");
  lang.enclosingClassName="agh-syntax-lang-php";

  // comments and strings
  var reg_comment=/(?:\/\/|#)[^\n\r]*(?=$|[\r\n])|\/\*[\s\S]*?\*\//g;
  lang.add_rule(reg_comment,{cls:"agh-syntax-comment",escht:true});

  function color_identifiers(text){
    return _h(text).replace(/([a-zA-Z_][\w_]*)/,'<span class="agh-syntax-identifier">$1</span>');
  }
  function colorStringLiterals(text,isLiteral,escape){
    // ■式展開のより厳密なルール: PHP Strings のページに書かれている。
    return text.replace(/([\<\>&\r\n])|(\\(?:[\\nrtvef\$'"]|[0-7]{1,3}|x[\dA-Fa-f]{1,2}))|(\$[a-zA-Z_][\w_]*)\b|\{(\$[a-zA-Z_](?:[\w_\[\]]|->)*)\}/g,function($0,$1,$2,$3,$4){
      if($1)
        return _h($1);

      if($2){
        if(escape==='"'&&$2!=="\\'"||escape==="'"&&($2==='\\\\'||$2==="\\'"))
          return '<span class="agh-syntax-escape">'+$2+'</span>';
        else
          return _h($2);
      }

      if($3){
        if(isLiteral)
          return _h($3);
        else
          return '<span class="agh-syntax-identifier">'+$3+'</span>';
      }

      if(isLiteral)
        return _h($4);
      else
        return '{<span class="agh-syntax-expression">'+color_identifiers($4)+'</span>}';
    });
  }
  var reg_string =/'(?:[^\\\']|\\.)*'|"(?:[^\\\"]|\\.)*"/g;
  lang.add_rule(reg_string,function($G,$I){
    var quoteChar=$G[0].slice(0,1);
    var content=colorStringLiterals($G[0],quoteChar=="'",quoteChar);
    this.enq('<span class="agh-syntax-string">'+content+'</span>');
    return k1;
  });

  // Here Document, Now Document
  var reg_heredoc_introducer=/\<\<\<([a-zA-Z_][\w_]*|'[a-zA-Z_][\w_]*')\s*(?=$|[\r\n])/g;
  lang.add_rule(reg_heredoc_introducer,function($G,$I){
    var isNowdoc=$G[1].slice(0,1)=="'";
    var name=isNowdoc?$G[1].slice(1,-1):$G[1];

    // 終端の検索
    var reg=new RegExp("[\r\n]"+name+";(?=$|[\\r\\n])","g");
    reg.lastIndex=$I.lastIndex;
    var m=reg.exec($I.input);
    if(!m){
      this.enq('<span class="agh-syntax-error" title="unterminated heredoc string">'+_h($G[0])+'</span>');
      return k1;
    }

    var p0=$I.index;
    var p1=$I.lastIndex;
    var p2=reg.lastIndex-m[0].length;
    var p3=reg.lastIndex;
    $I.lastIndex=reg.lastIndex;
    var content=$I.input.slice($I.index,$I.lastIndex);
    content=colorStringLiterals(content,isNowdoc,null);

    this.enq('<span class="agh-syntax-string">'+content+'</span>');
    return k1;
  });

  // keywords
  var wds_keyword=[
    "__halt_compiler","abstract","and","array","as","break","case","catch",
    "class","clone","const","continue","declare","default","die","do","echo",
    "else","elseif","empty","enddeclare","endfor","endforeach","endif",
    "endswitch","endwhile","eval","exit","extends","final","for","foreach",
    "function","global","if","implements","include","include_once",
    "instanceof","interface","isset","list","new","or","print","private",
    "protected","public","require","require_once","return","static","switch",
    "throw","try","unset","use","var","while","xor",

    // PHP 5.3 以降
    "namespace","goto",
    // PHP 5.4 以降
    "trait","callable","insteadof",
    // PHP 5.5 以降
    "yield","finally"
  ];
  var reg_keyword=new RegExp("\\b(?:"+wds_keyword.join('|')+")\\b",'g');
  lang.add_rule(reg_keyword,{cls:"agh-syntax-keyword"});

  // others
  var reg_identifier=/[\$a-zA-Z_][\w_]*\b/g;
  lang.add_rule(reg_identifier,{cls:"agh-syntax-identifier"});
  var reg_num=/0[0-7]+\b|0[xX][\da-fA-F]+|0[bB][01]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
  lang.add_rule(reg_num,{cls:"agh-syntax-numeric"});

  lang.register(["php"]);
})();
//=============================================================================

(function(){
  // MultiRegex の更に進化した version
  // 途中で regex の種類を変更する事ができる。

  ns.RegexConverterRule=function(reg,handler){
    if(reg instanceof RegExp){
      this.reg=reg;
      this.rex=reg.source;
    }else if(reg instanceof Object&&'regex' in reg&&'handler' in reg){
      return ns.RegexConverterRule.call(this,reg.regex,reg.handler);
    }else{
      this.rex=""+reg;
      this.reg=new RegExp(this.rex);
    }
    this.ngroups=agh.RegExp.countGroups(this.rex);

    if(handler instanceof Function)
      this.handler=handler;
    else{
      if(!(/\$(?:([&`'+$_])|([0-9]+))/).test(handler))
        this.handler=function(G,C){return handler;};
      else{
        this.handler=function(G,C){
          return handler.replace(/\$(?:([&`'+$_])|(\d+)|\{((?:[^\\{}]|\\.)+)\})/g,function($0,$C,$N,$X,index,input){
            if($C){
              switch($C){
              case '&':return G[0];
              case "+":return G[G.length-1];
              case '$':return '$';
              case '_':return C.input;
              case '`':return C.input.slice(0,C.index);
              case "'":return C.input.slice(C.lastIndex);
              }
            }else if($N){
              var tail='';
              for(;$N.length>0;){
                if($N in G)return G[$N]+tail;
                tail=$N.slice(-1)+tail;
                $N=$N.slice(0,-1);
              }
            }else if($X){
              // ToDo
            }
            return $0;
          });
        };
      }
    }
    return void 0;
  };

  var RegexConverterState=function(){
    this._cstack=[];
  };
  agh.memcpy(RegexConverterState.prototype,{
    pushConverter:function(conv,lparam){
      if(lparam==null)lparam=true;
      this._cstack.push({regex:this.regex,handler:this.handler,lparam:lparam});
      conv._instantiate();
      this.regex  =conv.m_instance_regex;
      this.handler=conv.m_instance_handler;
    },
    popConverter:function(){
      if(this._cstack.length<=0)return false;
      var top=this._cstack[this._cstack.length-1];
      this._cstack.pop();
      this.regex=top.regex;
      this.handler=top.handler;
      return top.lparam;
    }
  });

  agh.Text.RegexConverter=function RegexConverter(flags,pairs){
    this.rules=[];
    if(flags!=null)
      this.m_flags=flags;
    if(pairs instanceof Array){
      for(var i=0,iN=pairs.length;i<iN;i++){
        var pair=pairs[i];
        if(pair instanceof Array){
          this.addRule.apply(this,pair);
        }else if('regex' in pair&&'handler' in pair){
          this.addRule(pair.regex,pair.handler);
        }else{
          this.addRule(pair);
        }
      }
    }
  };
  agh.memcpy(ns.RegexConverter.prototype,{
    m_flags:'g',
    isIndexible:false,
    m_version:0,
    m_instance_version:-1,
    addRule:function(rule,handler){
      this.m_version++;
      if(rule instanceof ns.RegexConverterRule)
        this.rules.push(rule);
      else
        this.rules.push(new ns.RegexConverterRule(rule,handler));
    },
    _instantiate:function(){
      if(this.m_instance_version===this.m_version)
        return this.m_instance_regex;

      this.indices=[];

      var rex='';
      var igroup=1;
      for(var i=0,iN=this.rules.length;i<iN;i++){
        var rule=this.rules[i];

        // redefine backward reference
        var rex2=agh.RegExp.shiftBackReferences(rule.rex,igroup);

        if(i===0)
          rex='('+rex2+')';
        else
          rex+='|('+rex2+')';

        var imap={};
        imap.all  =igroup;
        imap.start=++igroup;
        imap.end  =igroup+=rule.ngroups;
        this.indices.push(imap);
      }

      this.m_instance_version=this.m_version;
      this.m_instance_regex=new RegExp(rex,this.m_flags);

      var self=this;
      this.m_instance_handler=function(m,ctx){
        var i=self._getRuleIndex(m,ctx);
        if(i>=0){
          var index=self.indices[i];
          var rule=self.rules[i];
          ctx.conv=self;
          ctx.rule=rule;
          var capt=Array.prototype.slice.call(m,index.all,index.end);
          //console.log({args0:m,regex0:ctx.regex,index:index,rule:rule,captures:capt});
          return rule.handler.call(self,capt,ctx);
        }
        return void 0;
      };
      return this.m_instance_regex;
    },
    _getRuleIndex:function _getRuleIndex(m,ctx){
      for(var i=0,iN=this.indices.length;i<iN;i++){
        var index=this.indices[i];
        if(m[index.all]!=null)return i;
      }
      return -1;
    },
    convert:function(input){
      this._instantiate();
      if(this.isIndexible){
        var state=new RegexConverterState;
        return agh.RegExp.indexibleReplace(input,this.m_instance_regex,this.m_instance_handler,null,null,state);
      }else
        return agh.RegExp.replace(input,this.m_instance_regex,this.m_instance_handler);
    }
    // switchContext:function(ctx){
    //   this._instantiate();
    //   ctx.regex  =this.m_instance_regex;
    //   ctx.handler=this.m_instance_handler;
    // }
  });
  if(agh.browser.vFx<34){
    // Fx33 以下は非一致キャプチャグループに対し undefined ではなく "" を返す。
    //   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
    // その為、零幅一致の際にどの正規表現に一致したのか判定する事ができない。
    ns.RegexConverter.prototype._getRuleIndex=function _getRuleIndex_implFx33(m,ctx){
      if(m[0].length!==0){
        for(var i=0,iN=this.indices.length;i<iN;i++)
          if(m[this.indices[i].all])return i;
        return -1;
      }

      // gregs 初期化: lastIndex が使える正規表現達
      //   以降で各正規表現 rule.reg に対して一致を試みてどのルールに一致したかを判定する。
      //   しかし rule.reg に g flag がない場合 lastIndex が使えないので一致の判定ができない。
      //   ここでは rule.reg の g flag のある version を初期化子 gregs に代入する。
      if(!this.gregs){
        var flag="g"; // m_flag.replace(/g/g,"")+"g";
        this.gregs=[];
        for(var i=0;i<this.indices.length;i++){
          var reg=this.rules[o].reg;
          this.gregs[i]=reg.global?reg: new RegExp(reg.source,flag);
        }
      }

      // 個々の正規表現を使用して判定
      for(var i=0;i<this.indices.length;i++){
        var reg=this.gregs[i];

        reg.lastIndex=ctx.index;
        var m=reg.exec(ctx.input);
        if(
          m!=null
            &&ctx.index==reg.lastIndex-m[0].length
            &&ctx.lastIndex==reg.lastIndex
        )return i;
      }

      return -1;
    };
  }

  function createSyntaxHighligher(converter){
    return function(text,options){
      var htmlRefuge=(/\/html\b/).test(options||"")&&ns.CreateHtmlRefuge();
      if(htmlRefuge)
        text=htmlRefuge.bank(text);

      text=converter.convert(text);

      if(htmlRefuge)
        text=htmlRefuge.draw(text);

      if(converter.enclosingClassName)
        text='<span class="'+converter.enclosingClassName+'">'+text+'</span>';
      return text;
    };
  }

  // var ruleHashComment=new ns.RegexConverterRule(/#.*(?:\r?\n|\r|$)/,function(m,C){
  //   return '<span class="agh-syntax-comment">'+_h(m[0])+'</span>';
  // });
  var ruleHtmlEscapeDict={'&':'&amp;','<':'&lt;','>':'&gt;','\n':'<br/>','\r\n':'<br/>','\r':'<br/>'};
  var ruleHtmlEscape=new ns.RegexConverterRule(/[<>&]|\r\n?|\r| {2,}/g,function(m){
    return ruleHtmlEscapeDict[m[0]]||m[0].replace(/ (?!$)/g,'&nbsp;');
  });

  //---------------------------------------------------------------------------

  function RegexFactory(parent){
    if(parent instanceof RegexFactory)
      this.rexdict=agh.wrap(parent.rexdict);
    else
      this.rexdict={};
  }
  agh.memcpy(RegexFactory.prototype,{
    defineRegex:function(name,rex){
      if(rex instanceof RegExp)
        rex=rex.source;
      else if(typeof rex!=="string")
        rex=""+rex;

      this.rexdict[name]=this.resolve(rex);
    },
    resolve:function(rex){
      if(rex instanceof RegExp)rex=rex.source;

      var ret={names:{}};
      var self=this;
      var groupCount=0;
      ret.rex=rex.replace(/\\.|\[(?:[^\\\]]|\\.)*\]|\((?!\?)|%\{([^\{\}\s]+)\}|\(\?\<([\w_]+)\>/g,function($0,$nreg,$ncap){
        if($nreg){
          var ent=self.rexdict[$nreg];
          if(ent==null)
            throw new Error("RegexFactory#instantiate: undefined group name %{"+$nreg+"}");

          var shift=groupCount;
          var rex_sub=agh.RegExp.shiftBackReferences(ent.rex,shift);
          for(name in ent.names){
            var index=shift+ent.names[name];
            ret.names[name]=index;
            ret.names[$nreg+"/"+name]=index;
          }

          groupCount+=ent.groupCount;

          return "(?:"+rex_sub+")";
        }else if($ncap){
          groupCount++;
          ret.names[$ncap]=groupCount;
          return "(";
        }else{
          if($0==="(")
            groupCount++;
          return $0;
        }
      });

      ret.groupCount=groupCount;
      return ret;
    },
    getRegex:function(name){
      return this.rexdict[name].rex;
    }
  });

  //---------------------------------------------------------------------------
  // test implementation: sed
  var sed=new ns.RegexConverter;

  var rfac=new RegexFactory;
  rfac.defineRegex("addr1",/\d+|\d+~\d+|\$|\/(?:[^\\\/]|\\.)*\/|\\(.)(?:\\.|(?!\1)[^\\])*?\1/);
  rfac.defineRegex("addr2","[+~]?"+rfac.getRegex("addr1"));
  rfac.defineRegex("addr","(?<addr1>%{addr1})(?:,(?<addr2>%{addr2}))?");
  var put_addr=function(buff,addr){
    if(/^[\\\/]/.test(addr))
      buff.push('<span class="agh-syntax-sed-address agh-syntax-regex">',_h(addr),'</span>');
    else
      buff.push(
        '<span class="agh-syntax-sed-address">',
        addr.replace(/(\d+)|./g,function($0,$1){
          return $1?'<span class="agh-syntax-numeric">'+_h($1)+'</span>':_h($0);
        }),
        '</span>');
  };
  rfac.defineRegex("scmd",/s(.)(?:\\.|(?!\1)[^\\])*?\1(?:\\.|(?!\1)[^\\])*?\1g?/);
  rfac.defineRegex("ycmd",/y(.)(?:\\.|(?!\1)[^\\])*?\1(?:\\.|(?!\1)[^\\])*?\1/);
  rfac.defineRegex("acmd",/[ai](?=\s|$)(?:.|\\\r?\n|\\\r)*/);
  rfac.defineRegex("cmdline",/[\{\}=dDhHgGnNpPx]|[btT:rRwW][ \t]+\S+|[qQl](?:[ \t]+\S+)?|%{acmd}|%{scmd}|%{ycmd}|#.*/);
  var argclass={
    // label
    b:'agh-syntax-label',t:'agh-syntax-label',T:'agh-syntax-label',':':'agh-syntax-label',

    // filename
    r:'agh-syntax-string',R:'agh-syntax-string',w:'agh-syntax-string',W:'agh-syntax-string',

    // number
    q:'agh-syntax-numeric',Q:'agh-syntax-numeric',l:'agh-syntax-numeric',

    // regex, pattern
    s:'agh-syntax-regex',y:'agh-syntax-regex'
  };

  var rdesc=rfac.resolve("%{addr}?(?<cmdline>%{cmdline}[\\t ]*)(?<trail>\\S.*)?(?<endl>\\r?\\n|\\r|$)");
  var idx_addr1  =rdesc.names['addr1'];
  var idx_addr2  =rdesc.names['addr2'];
  var idx_cmdline=rdesc.names['cmdline'];
  var idx_trail  =rdesc.names['trail'];
  var idx_endl   =rdesc.names['endl'];
  sed.addRule(rdesc.rex,function(m){
    var buff=[];
    if(m[idx_addr1]){
      put_addr(buff,m[1]);
      if(m[idx_addr2]){
        buff.push(',');
        put_addr(buff,m[idx_addr2]);
      }
    }

    var cmdline=m[idx_cmdline];
    var cmd=cmdline.slice(0,1);
    if(cmd==='#'){
      buff.push('<span class="agh-syntax-comment">',_h(cmdline),'</span>');
    }else{
      buff.push('<span class="agh-syntax-keyword">',_h(cmd),'</span>');
      var mm;
      if(argclass[cmd]&&(mm=/^([ \t]*)(\S+)(\s*)$/.exec(cmdline.slice(1)))){
        buff.push(_h(mm[1]),'<span class="',argclass[cmd],'">',_h(mm[2]),'</span>',_h(mm[3]));
      }else{
        buff.push(_h(cmdline.slice(1)));
      }
    }

    if(m[idx_trail])
      buff.push(',<span class="agh-syntax-error">',_h(m[idx_trail]),'</span>');
    buff.push(_h(m[idx_endl]));
    return buff.join("");
  });

  // <unrecognized part>
  sed.addRule(/(\S.*?)(\r?\n|\r|$)/g,function(m,c){return '<span class="agh-syntax-error">'+_h(m[1])+'</span>'+(m[2]?'<br/>':"");});
  sed.addRule(ruleHtmlEscape);
  registerSyntaxHighlighter("sed",createSyntaxHighligher(sed));

  //---------------------------------------------------------------------------
  // test implementation: bash
  var bash=new ns.RegexConverter("gm",[
    [
      /^(.*?\$|(?:.*[^\s])?#) (.*)$/,
      function(G,C){return '<span class="agh-syntax-bash-prompt">'+_h(G[1])+'</span> '+agh.Text.Color.bash(G[2]);}
    ],ruleHtmlEscape
  ]);
  registerSyntaxHighlighter(["bash-interactive", "ibash"], createSyntaxHighligher(bash));



  //---------------------------------------------------------------------------
  // 試験実装
  var rfac=new RegexFactory;

  var rule_comment=new ns.RegexConverterRule({
    regex:/\#.*?(?:\r\n?|\n|$)/g,handler:function(G,C){
      return '<span class="agh-syntax-comment"><span class="agh-syntax-comment-delimiter">#</span>'+_h(G[0].slice(1))+'</span>';
    }
  });
  var rule_escapedCharacter=new ns.RegexConverterRule({
    regex:/\\./g,
    handler:function(G,C){return '<span class="agh-syntax-escaped">'+_h(G[0])+'</span>';}
  });
  var push_stringNest={beg:'<span class="agh-syntax-string-delimiter">',end:'</span></span>'};
  var rule_string=new ns.RegexConverterRule({
    regex:/\$?\"(?:[^\\\"`$]|\\.)*(\"|$|(?=[`$]))|\'[^\']*\'|\$\'[^\\\']*(\'?)/g,
    handler:function(G,C){
      if(/^\$\'/.test(G[0])){
        if(G[2]=='\''){
          return '<span class="agh-syntax-string"><span class="agh-syntax-string-delimiter">$\'</span>'+
            _h(G[0].slice(2,-1))+'<span class="agh-syntax-string-delimiter">\'</span></span>';
        }else{
          C.pushConverter(bash_escapedString,push_stringNest);
          return '<span class="agh-syntax-string"><span class="agh-syntax-string-delimiter">$\'</span>'+_h(G[0].slice(2));
        }
      }else if(/^\'/.test(G[0])){
        return '<span class="agh-syntax-string"><span class="agh-syntax-string-delimiter">\'</span>'+
          _h(G[0].slice(1,-1))+'<span class="agh-syntax-string-delimiter">\'</span></span>';
      }

      var i1=/^\$/.test(G[0])?2:1;
      if(G[1]==='"'){
        return '<span class="agh-syntax-string"><span class="agh-syntax-string-delimiter">'+G[0].slice(0,i1)+'</span>'
          +_h(G[0].slice(i1,-1))
          +'<span class="agh-syntax-string-delimiter">'+G[0].slice(-1)+'</span></span>';
      }else{
        C.pushConverter(bash_string,push_stringNest);
        return '<span class="agh-syntax-string"><span class="agh-syntax-string-delimiter">'+G[0].slice(0,i1)+'</span>'+_h(G[0].slice(i1));
      }
    }
  });
  var push_variableNest={beg:'<span class="agh-syntax-variable-delimiter">',end:'</span></span>'};
  rfac.defineRegex("parameterName",/(?:[1-9]\d*\b|[_a-zA-Z][_\w]*\b|[-0@*#?$!0_])/);
  var rule_paramExpansion=new ns.RegexConverterRule({
    regex:rfac.resolve(/\$%{parameterName}|\$\{([!#]?%{parameterName})(?:[^\\}`'"$]|\\.)*(?:(\}|(?=[`'"$]))|$)/).rex,
    handler:function(G,C){
      if(G[1]){
        var buff=[];
        buff.push('<span class="agh-syntax-variable-delimiter">${</span>');
        buff.push('<span class="agh-syntax-variable">',_h(G[1]),'</span>');

        var tailLen=G[0].length-2-G[1].length;
        if(G[2])tailLen-=G[2].length;
        if(tailLen>0)
          buff.push(_h(G[0].substr(2+G[1].length,tailLen)));

        if(G[2]==='}'){
          buff.push('<span class="agh-syntax-variable-delimiter">}</span>');
        }else if(G[2]===''){
          C.pushConverter(bash_paramx,push_variableNest);
        }

        return buff.join("");
      }else{
        return '<span class="agh-syntax-variable-delimiter">$</span><span class="agh-syntax-variable">'+_h(G[0].slice(1))+'</span>';
      }
    }
  });
  var rule_escapedCharacterS=new ns.RegexConverterRule({
    regex:/\\[\\\"`$]/g,
    handler:function(G,C){return '<span class="agh-syntax-escaped">'+_h(G[0])+'</span>';}
  });
  var push_processxNest={beg:'</span><span class="agh-syntax-variable-delimiter">',end:'</span>'};
  var rule_processExpansion=new ns.RegexConverterRule({
    regex:/\$\(|`/g,
    handler:function(G,C){
      if(/^\$\(/.test(G[0])){
        C.pushConverter(bash_processx,push_processxNest);
        return '<span class="agh-syntax-variable-delimiter">$(</span><span class="agh-syntax-default">';
      }else{
        C.pushConverter(bash_processString,push_variableNest);
        return '<span class="agh-syntax-string"><span class="agh-syntax-string-delimiter">`</span>';
      }
    }
  });
  var rule_keywords_dict={};
  function add_keyword(){
    for(var i=0;i<arguments.length;i++){
      var a=arguments[i];
      rule_keywords_dict[a]='<span class="agh-syntax-keyword">'+a+'</span>';
    }
  }
  function add_builtin(){
    for(var i=0;i<arguments.length;i++){
      var a=arguments[i];
      rule_keywords_dict[a]='<span class="agh-syntax-builtin">'+a+'</span>';
    }
  }
  // in は for, case の第三単語の場合のみ。[[ や ]] は固有の文脈を作る。
  add_keyword('!','{','}');
  add_keyword('function');
  add_keyword('for','select','while','until','do','done');
  add_keyword('case','esac');
  add_keyword('if','then','elif','else','fi');
  // [ は終わりの ] とセットで着色したい
  add_builtin(
    '.',':',
    'alias','bg','bind','break','builtin','caller','cd','command','compgen','complete',
    'compopt','continue','declare','dirs','disown','echo','enable','eval','exec',
    'exit','export','false','fc','fg','getopts','hash','help','history','jobs','kill',
    'let','local','logout','mapfile','popd','printf','pushd','pwd','read','readarra',
    'readonly','return','set','shift','shopt','source','suspend','test','times','trap',
    'true','type','typeset','ulimit','umask','unalias','unset','wait'
  );
  var rule_keywords=new ns.RegexConverterRule({
    regex:/(?:[!{}.:]|\b[a-z]+)(?=$|[\s;&|<>()])/g,
    handler:function(G,C){
      return (rule_keywords_dict[G[0]]||G[0]);
    }
  });
  var rule_options=new ns.RegexConverterRule({
    regex:/-[-a-zA-Z0-9]*/g,
    handler:function(G,C){
      return '<span class="agh-syntax-attribute">'+G[0]+'</span>';
    }
  });

  var popHandler=function(G,C){
    var param=C.popConverter();
    if(G[0]=='')
      return param.beg+param.end;
    else
      return param.beg+_h(G[0])+param.end;
  };

  // $'...' の内部
  var bash_escapedString=new ns.RegexConverter("g",[
    {regex:/\'|$/g,handler:popHandler},
    {regex:/\\(?:[abeEfnrtv\\\'\"]|[0-7]{1,3}|x[0-9a-fA-F]{1,3}|u[0-9a-fA-F]{1,4}|U[0-9a-fA-F]{1,8})/,handler:'<span class="agh-syntax-escaped">$&</span>'},
    ruleHtmlEscape
  ]);
  // `...` の内部
  var bash_processString=new ns.RegexConverter("g",[
    {regex:/\`|$/,handler:popHandler},
    rule_escapedCharacterS,
    ruleHtmlEscape
  ]);
  // ${...} の内部
  var bash_paramx=new ns.RegexConverter("g",[
    {regex:/\}|$/g,handler:popHandler},
    rule_paramExpansion,
    rule_processExpansion,
    rule_string,
    rule_escapedCharacter, // ← どの escape が有効かは外側の context に依存する
    ruleHtmlEscape
  ]);
  // "..." の中身
  var bash_string=new ns.RegexConverter("g",[
    {regex:/\"|$/g,handler:popHandler},
    rule_paramExpansion,
    rule_processExpansion,
    rule_escapedCharacterS,
    ruleHtmlEscape
  ]);
  // $(...) の中身
  var bash_processx=new ns.RegexConverter("g",[
    {regex:/\)|$/g,handler:popHandler},
    rule_comment,
    rule_paramExpansion,
    rule_processExpansion,
    rule_string,
    rule_escapedCharacter,
    ruleHtmlEscape
  ]);
  var bash_command=new ns.RegexConverter("g",[
    rule_comment,
    rule_paramExpansion,
    rule_processExpansion,
    rule_string,
    rule_escapedCharacter,
    rule_keywords,
    rule_options,
    ruleHtmlEscape
  ]);
  bash_command.isIndexible=true;
  registerSyntaxHighlighter("bash",createSyntaxHighligher(bash_command));

})();

});
//-----------------------------------------------------------------------------
