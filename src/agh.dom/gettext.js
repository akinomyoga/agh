// -*- mode:js;coding:utf-8 -*-
/*
 * Filename gettext.js
 * Title    getDisplayedText(node,option)
 * Author   KM
 *
 * Synopsis
 *
 *   @fn window.getDisplayedText(node,option);
 *     display, visibility, content 等を考慮に入れて textContent を取得します。
 *
 *     @param option.includeContent [default = false]
 *       擬似要素の(content プロパティで指定される)内容も出力するかどうかを指定します。
 *
 *     @param option.showHidden     [default = false]
 *       display:none や visibility:hidden の要素の内容も出力するかどうかを指定します。
 *
 *     @param option.counterBase    [default = node.defaultView.ownerDocument.body]
 *       CSS Counter 値の計算開始点の要素を指定します。
 *
 *   @fn window.getContentString(elem,pseudoClass,counterBase);
 *     指定要素 elem の擬似要素 pseudoClass の内容を取得します。
 *
 *     @param elem
 *
 *     @param pseudoClass ":before" または ":after"
 *
 *     @param counterBase [default = elem]
 *       CSS Counter 値の計算開始点の要素を指定します。
 *
 *   @fn window.getListItemText(value,listStyleType,hasSuffix);
 *     CSS list-style-type に従って整数を文字列に変換します。
 *
 *     @param value         整数
 *     @param listStyleType CSS list-style-type 値
 *     @param hasSuffix     [default = false]
 *       '1. ' や '一、' における '. ' や '、' の部分を取得するかどうかを指定します。
 *
 *   定義先を window 以外に変更したい場合は [gettext.export] の部分を適当に書き換えて下さい。
 *
 * 取得規則
 *
 *   * :before, :after の content
 *
 *     option.includeContent が指定されていなければ content は無視される。
 *
 *     content の中身は content の CSS 指定を元に自前で計算しているので、
 *     実際の表示とは異なる可能性がある。以下にその規則を挙げる。
 *
 *     - 文字列はそのまま出力する。
 *     - attr() は属性に設定されている属性を出力する。
 *     - counter(counterName,list-style-type)
 *       はカウンタ counterName の現在の値を出力する。
 *       ※何故か Chrome では counter(item,roman) 等と指定しても getComputedStyle で見ると counter(item) になっている。
 *     - counters(counterName,name,list-style-type) は階層を持った counter の値を sep で区切って出力する。
 *     - url() は現状は無視する
 *       ■ToDo: [url] 等と表示する様にしても良い (が、CSS には対応できない場合は単純に無視しろと書かれている)
 *     - open-quote/close-quote, no-open-quote/no-close-quote は現状、常に '"' を出力する。
 *       ■ToDo: quotes プロパティなどを取得する方法が見付かれば今後対応する予定
 *
 *   * br は content が指定され、それが有効であればそれを出力する。
 *     それ以外の場合に改行 LF を出力する。
 *
 *   * ol>li や ul>li 等のリストの記号も content の一種として出力する。
 *     リスト項目の種類(list-style-type)として以下の物に対応している。
 *
 *     特殊
 *
 *     - none
 *     - normal
 *
 *     固定記号
 *
 *     - disc
 *     - circle
 *     - square
 *     - disclosure-close
 *     - disclosure-open
 *     - hyphen  (非標準)
 *     - check   (非標準)
 *     - box     (非標準)
 *     - diamond (非標準)
 *
 *     一般的序数
 *
 *     - decimal type=1
 *     - decimal-leading-zero
 *     - lower-roman type=i
 *     - upper-roman type=I
 *     - lower-latin lower-alpha type=a
 *     - upper-latin upper-alpha type=A
 *     - lower-greek
 *     - upper-greek (非標準)
 *
 *     漢字文化圏の序数
 *
 *     - cjk-decimal
 *     - simp-chinese-informal
 *     - trad-chinese-informal cjk-ideographic
 *     - japanese-informal
 *     - korean-hanja-informal
 *     - simp-chinese-formal
 *     - trad-chinese-formal
 *     - japanese-formal
 *     - korean-hanja-formal
 *     - korean-hangul-formal
 *     - hiragana
 *     - katakana
 *     - hiragana-iroha
 *     - katakana-iroha
 *
 *     以下の物は未対応である (■ToDo)
 *
 *     - hebrew, georgian, syriac, tamil, ethiopic-numeric
 *     - armenian, lower-armenian, upper-armenian
 *
 *     リスト項目の種類は以下の優先順位で決定する。
 *     (1) CSSプロパティ list-style-type (2) type属性 (3) 親(ol/ul)のtype属性 (4) 既定値。
 *     ul>li の "既定値" はリストの階層によって決まり、深さ1の場合は disc、深さ2の場合は circle、
 *     深さ3以上の場合は square を採用する。ol>li の "既定値" は decimal である。
 *
 *     リスト項目の番号は ol/@start, li/@value で制御できる。
 *     - ol/@start でリストの最初の項目の番号を指定する
 *     - li/@value でその項目の値を指定する
 *
 * ■BUG evaluateAt に display:none な物を指定するとカウンタが最後まで走ってしまう
 *   同じかどうかを判定するのではなく、通り過ぎたかどうかを判定する必要がある。
 *   a 全ての要素を走る
 *   b display:none はスキップするが、スキップする度に順序判定を行う
 *   c 順序判定の計算過程の構造をインクリメンタルに更新する
 *   ※順序判定はルートから同じ深さで要素を比較して行って最初にずれがある所の順序を返す様にすれば良い。
 *
 * 既知の制限
 *   * getComuptedStyle で quotes を取得できない。従って、quotes で指定した括弧には対応できない。
 *   * Chrome では content:open-quote と指定した物が取得できない。従って、引用符は全く出力されない。
 *   * Chrome では content:counter(name,style) と指定した style が getComputedStyle で取得できない。
 *     従って、表示に反して整数で counter の値が取得される事になる。
 *
 * ChangeLog
 *
 * 2014-10-05 KM
 *   * content: counter(), counters() list-style-type 対応
 *     Chrome では取得できない様子
 *   * bugfix, 或要素で reset されたカウンタが兄弟に公開されている問題→evaluateAt を再実装して解決。
 *   * bugfix, evaluateAt に pseudoClass を渡していない所為で :before/:after での結果が正しく取得できていなかった。
 *   * bugfix, counter-reset in x:before は x 自体の子要素には見えない筈なのでその様に修正。
 *   * bugfix, counter が存在しない場合に 0 で counter-reset する様に修正。
 *   * 関数名を getInnerText から getDisplayedText に変更。副産物の関数として getContentString, getListItemText を公開。
 *
 * 2014-10-04 KM img/@alt, 関数名変更
 * 2014-10-02 KM List Style Types
 * 2014-10-01 KM CSS Counters
 * 2014-09-30 KM Created
 *
 */
(function(){
  var ELEMENT_NODE=document.ELEMENT_NODE||1;
  var TEXT_NODE=document.TEXT_NODE||3;

  var getComputedStyle=(function(){
    function camelize(text){
      return text.toString().replace(/-(\w)/g,function($0,$1){return $1.toString();});
    }

    if(document.defaultView)
      return function(elem,pseudoClass,propertyName){
        var css=elem.ownerDocument.defaultView.getComputedStyle(elem,pseudoClass);
        if(css==null||pseudoClass&&(css.display==null||css.display==''))return null;
        if(propertyName==null)return css;
        return css.getPropertyValue(propertyName);
      };
    else if(window.getComputedStyle)
      return function(elem,pseudoClass,propertyName){
        var css=window.getComputedStyle(elem,pseudoClass);
        if(css==null||pseudoClass&&(css.display==null||css.display==''))return null;
        if(propertyName==null)return css;
        return css.getPropertyValue(propertyName);
      };
    else if(document.body.currentStyle)
      return function(elem,pseudoClass,propertyName){
        if(pseudoClass)return null;
        var css=elem.currentStyle;
        if(propertyName==null)return css;
        return css[camelize(propertyName)];
      };
    else
      return function(elem,pseudoClass,propertyName){
        if(pseudoClass)return null;
        var css=elem.style;
        if(propertyName==null)return css;
        return css[camelize(propertyName)];
      };
  })();

  var getTextNodeData=(function(){
    var textNode=document.createTextNode("test");
    if(!textNode.textContent&&textNode.data)
      return function(node){return node.data;};
    else
      return function(node){return node.textContent;};
  })();

  function getTextNodeDisplayedText(text,whiteSpace){
    if(text.nodeType===TEXT_NODE){
      if(whiteSpace==null)
        whiteSpace=node.parentNode;
      text=getTextNodeData(text);
    }

    if(whiteSpace&&whiteSpace.nodeType===ELEMENT_NODE)
      whiteSpace=getComputedStyle(whiteSpace,null,'white-space');

    switch(whiteSpace){
    case 'pre':
      return text.replace(/ /g,'\xA0').replace(/\t/g,'\xA0\xA0\xA0\xA0');
    case 'pre-wrap':
      return text;
    case 'pre-line':
      return text.replace(/[ \t]+/g,' ');
    case 'nowrap':
      return text.replace(/[ \t\r\n]+/g,'\xA0');
    case 'normal':
    default:
      return text.replace(/[ \t\r\n]+/g,' ');
    }
  }

  function isHtmlList(elem){
    return (/^[uo]l$/i).test(elem.tagName);
  }
  function isHtmlListItem(elem){
    return (/^li$/i).test(elem.tagName)
      &&elem.parentNode&&(/^[uo]l$/i).test(elem.parentNode.tagName)
  }

  var listStyleTypeTable=(function(){
    // http://www.w3.org/TR/2013/WD-css-counter-styles-3-20130718/

    var lower_roman_table=[
      {i:'i',v:'v',x:'x'},
      {i:'x',v:'l',x:'c'},
      {i:'c',v:'d',x:'m'},
      {i:'m',v:'\u2181',x:'\u2182'},
      {i:'\u2182',v:'\u2187',x:'\u2188'},
      {i:'\u2188',v:'\u2187'}
    ];
    var upper_roman_table=[
      {i:'I',v:'V',x:'X'},
      {i:'X',v:'L',x:'C'},
      {i:'C',v:'D',x:'M'},
      {i:'M',v:'\u2181',x:'\u2182'},
      {i:'\u2182',v:'\u2187',x:'\u2188'},
      {i:'\u2188',v:'\u2187'}
    ];
    function roman(value,table,suffix){
      var ret='';
      if(0<=value&&value<900000){
        for(var e=0;value>0;value=0|value/10,e++){
          var c=table[e];
          switch(value%10){
          case 9:ret=c.i+c.x+ret;break;
          case 8:ret=c.i+ret;
          case 7:ret=c.i+ret;
          case 6:ret=c.i+ret;
          case 5:ret=c.v+ret;break;
          case 4:ret=c.i+c.v+ret;break;
          case 3:ret=c.i+ret;
          case 2:ret=c.i+ret;
          case 1:ret=c.i+ret;break;
          }
        }
      }else{
        ret=value;
      }
      return suffix?ret+suffix:ret;
    }

    function alphabetic(value,digits,suffix){
      if(value<0){
        value=-value;
        var sign='-';
      }else
        var sign='';

      var ret='';
      var radix=digits.length;
      for(;value-->0;value=0|value/radix)
        ret=digits.charAt(value%radix)+ret;
      if(suffix)
        return sign+ret+suffix;
      else
        return sign+ret;
    }

    var cjk_decimal_digits="〇一二三四五六七八九";
    function numeric(value,digits,suffix){
      if(value<0){
        value=-value;
        var sign='-';
      }else
        var sign='';

      var ret='';
      var radix=digits.length;
      for(;value>0;value=0|value/radix)
        ret=digits.charAt(value%radix)+ret;
      if(suffix)
        return sign+ret+suffix;
      else
        return sign+ret;
    }

    var japanese_informal_table={
      digits:'〇,一,二,三,四,五,六,七,八,九'.split(','),
      jusshin:',十,百,千'.split(','),
      manshin:',万,億,兆,京,垓,秭,穣,溝,澗,正,載,極,恒河沙,阿僧祇,那由他,不可思議,無量大数'.split(','),
      minus:'マイナス',suffix:'、',drop1_japanese:true
    };
    var japanese_formal_table={
      digits:'零,壱,弐,参,四,伍,六,七,八,九'.split(','),
      jusshin:',拾,百,阡'.split(','),
      manshin:',萬,億,兆,京,垓,秭,穣,溝,澗,正,載,極,恒河沙,阿僧祇,那由他,不可思議,無量大数'.split(','),
      minus:'マイナス',suffix:'、'
    };
    var japanese_xformal_table={
      digits:'零,壹,貮,參,肆,伍,陸,柒,捌,玖'.split(','),
      jusshin:',拾,陌,阡'.split(','),
      manshin:',萬,億,兆,京,垓,秭,穣,溝,澗,正,載,極,恒河沙,阿僧祇,那由他,不可思議,無量大数'.split(','),
      minus:'マイナス',suffix:'、'
    };
    var korean_hangul_formal_table={
      digits:'영,일,이,삼,사,오,육,칠,팔,구'.split(','),
      jusshin:',십,백,천'.split(','),
      manshin:',만,억,조'.split(','),
      //minus:'마이너스  ',suffix:', '
      minus:null,suffix:'、'
    };
    var korean_hanja_informal_table={
      digits:'零,一,二,三,四,五,六,七,八,九'.split(','),
      jusshin:',十,百,千'.split(','),
      manshin:',萬,億,兆'.split(','),
      //minus:'마이너스  ',suffix:', ',drop1_korean:true
      minus:null,suffix:'、',drop1_korean:true
    };
    var korean_hanja_formal_table={
      digits:'零,壹,貮,參,四,五,六,七,八,九'.split(','),
      jusshin:',拾,百,仟'.split(','),
      manshin:',萬,億,兆'.split(','),
      //minus:'마이너스  ',suffix:', '
      minus:null,suffix:'、'
    };
    var simp_chinese_informal_table={
      digits:'零,一,二,三,四,五,六,七,八,九'.split(','),
      jusshin:',十,百,千'.split(','),
      manshin:',万,亿,万亿'.split(','),
      minus:'负',suffix:'、',flag_ling:true
    };
    var simp_chinese_formal_table={
      digits:'零,壹,贰,叁,肆,伍,陸,柒,捌,玖'.split(','),
      jusshin:',拾,佰,仟'.split(','),
      manshin:',萬,亿,万亿'.split(','),
      minus:'负',suffix:'、',flag_ling:true
    };
    var trad_chinese_informal_table={
      digits:'零,一,二,三,四,五,六,七,八,九'.split(','),
      jusshin:',十,百,千'.split(','),
      manshin:',万,亿,兆'.split(','),
      minus:'負',suffix:'、',flag_ling:true
    };
    var trad_chinese_formal_table={
      digits:'零,壹,貮,參,肆,伍,陸,柒,捌,玖'.split(','),
      jusshin:',拾,佰,仟'.split(','),
      manshin:',萬,億,兆'.split(','),
      minus:'負',suffix:'、',flag_ling:true
    };
    function cjkcounter(value,table,hasSuffix){
      var abs=value;
      var sign='';
      if(value==0){
        if(hasSuffix)
          return table.digits[0]+table.suffix;
        else
          return table.digits[0];
      }else if(value<0){
        if(table.minus){
          sign=table.minus;
          abs=-abs;
        }else{
          return numeric(elem,counter,cjk_decimal_digits,hasSuffix&&table.suffix);
        }
      }
      var ret='';
      for(var e=0;abs>0;e++){
        if(e>=table.manshin.length)
          return numeric(elem,counter,cjk_decimal_digits,hasSuffix&&table.suffix);

        var gc=0;
        var ling=false;

        if(abs%10000==0)continue;
        ret=table.manshin[e]+ret;
        for(var x=0;x<4;abs=0|abs/10,x++){
          var a=abs%10;
          if(a==0){
            ling=true;
            continue;
          }

          // ling rule
          if(table.flag_ling&&ling){
            ret=table.digits[0]+ret;
            ling=false;
          }

          gc++;
          ret=table.jusshin[x]+ret;

          // drop1 rule
          if(a==1&&(table.drop1_japanese&&x>0
                    ||table.drop1_korean&&(x>0&&gc!=1||e==1&&x==0)))
            continue;

          ret=table.digits[a]+ret;
        }
      }
      if(hasSuffix)
        return sign+ret+table.suffix;
      else
        return sign+ret;
    }

    function create_fixed_marker(ch,suffix){
      var cf=ch+suffix;
      var ret=function(value,hasSuffix){return hasSuffix?cf:ch;};
      ret.fixed=true;
      return ret;
    }

    var counter_dict={
      none              :create_fixed_marker('',''),
      normal            :{}, // default
      disc              :create_fixed_marker('*',' '),   // * \u2022 \u00B7
      circle            :create_fixed_marker('o',' '),   // o \u2218 \u25E6
      square            :create_fixed_marker('+',' '),   // + \u25AA
      'disclosure-close':create_fixed_marker('[+]',' '), // > \u25B8
      'disclosure-open' :create_fixed_marker('[-]',' '), // v \u25BE
      hyphen            :create_fixed_marker('-',' '),   // -       (非標準)
      check             :create_fixed_marker('v',' '),   // v ./ \/ (非標準)
      box               :create_fixed_marker('=',' '),   // = # ::  (非標準)
      diamond           :create_fixed_marker('<>',' '),  // <>      (非標準)
      decimal:function(value,hasSuffix){
        if(hasSuffix)value+='. ';
        return value;
      },
      'decimal-leading-zero':function(value,hasSuffix){
        value=value.toString();
        if(value.length<2)value='0'+value;
        if(hasSuffix)value+='. ';
        return value;
      },
      'lower-roman':function(value,hasSuffix){
        return roman(value,lower_roman_table,hasSuffix&&'. ');
      },
      'upper-roman':function(value,hasSuffix){
        return roman(value,upper_roman_table,hasSuffix&&'. ');
      },
      'cjk-decimal':function(value,hasSuffix){
        return numeric(value,cjk_decimal_digits,hasSuffix&&'、');
      },
      'lower-latin':function(value,hasSuffix){
        return alphabetic(value,"abcdefghijklmnopqrstuvwxyz",hasSuffix&&'、');
      },
      'upper-latin':function(value,hasSuffix){
        return alphabetic(value,"ABCDEFGHIJKLMNOPQRSTUVWXYZ",hasSuffix&&'、');
      },
      'lower-greek':function(value,hasSuffix){
        return alphabetic(value,"αβγδεζηθικλμνξοπρστυφχψω",hasSuffix&&'、');
      },
      'upper-greek':function(value,hasSuffix){ // (非標準)
        return alphabetic(value,"ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ",hasSuffix&&'、');
      },
      hiragana:function(value,hasSuffix){
        return alphabetic(value,"あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐゑをん",hasSuffix&&"、");
      },
      katakana:function(value,hasSuffix){
        return alphabetic(value,"アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン",hasSuffix&&"、");
      },
      'hiragana-iroha':function(value,hasSuffix){
        return alphabetic(value,"いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑひもせす",hasSuffix&&"、");
      },
      'katakana-iroha':function(value,hasSuffix){
        return alphabetic(value,"イロハニホヘトチリヌルヲワカヨタレソツネナラムウヰノオクヤマケフコエテアサキユメミヒヱヒモセス",hasSuffix&&"、");
      },

      'simp-chinese-informal':function(value,hasSuffix){return cjkcounter(value,simp_chinese_informal_table,hasSuffix);},
      'trad-chinese-informal':function(value,hasSuffix){return cjkcounter(value,trad_chinese_informal_table,hasSuffix);},
      'japanese-informal'    :function(value,hasSuffix){return cjkcounter(value,japanese_informal_table,hasSuffix);},
      'korean-hanja-informal':function(value,hasSuffix){return cjkcounter(value,korean_hanja_informal_table,hasSuffix);},
      'simp-chinese-formal'  :function(value,hasSuffix){return cjkcounter(value,simp_chinese_formal_table,hasSuffix);},
      'trad-chinese-formal'  :function(value,hasSuffix){return cjkcounter(value,trad_chinese_formal_table,hasSuffix);},
      'japanese-formal'      :function(value,hasSuffix){return cjkcounter(value,japanese_formal_table,hasSuffix);},
      'korean-hanja-formal'  :function(value,hasSuffix){return cjkcounter(value,korean_hanja_formal_table,hasSuffix);},
      'korean-hangul-formal' :function(value,hasSuffix){return cjkcounter(value,korean_hangul_formal_table,hasSuffix);}

      // CSS Counter Styles http://dev.w3.org/csswg/css-counter-styles/ Lv3 2014/8/21
      //■ToDo その他も実装
      // hebrew (lower/upper)-armenian armenian georgian
      // syriac tamil ethiopic-numeric
      // https://developer.mozilla.org/ja/docs/Web/CSS/list-style-type

      // 所で、ギリシャ数字 (イオニア式) という物もあるそうだ。@ wikipedia
    };

    counter_dict['lower-alpha']=counter_dict['lower-latin'];
    counter_dict['upper-alpha']=counter_dict['upper-latin'];
    counter_dict['cjk-ideographic']=counter_dict['trad-chinese-informal'];

    counter_dict[1]=counter_dict.decimal;
    counter_dict.i=counter_dict['lower-roman'];
    counter_dict.I=counter_dict['upper-roman'];
    counter_dict.a=counter_dict['lower-latin'];
    counter_dict.A=counter_dict['upper-latin'];

    return counter_dict;
  })();

  function CssCounterEmulator(elem,baseElement){
    this.baseElement=baseElement||(elem?elem.ownerDocument:document).body;
    this.frame=null;
    this.quote_depth=0;
  }
  function updateCounters(frame,elem,pseudoClass){
    var css=getComputedStyle(elem,pseudoClass);
    var processed={};

    if(!pseudoClass){
      var isol=isHtmlList(elem);
      if(isol)var start=elem.start!=null&&elem.start!=''?parseInt(elem.start):1;
    }else if(pseudoClass==':before'){
      var isolli=isHtmlListItem(elem);
      if(isolli)var value=elem.value!=null&&elem.value!=''?parseInt(elem.value):null;
    }

    var inc=css&&css.counterIncrement;
    if(inc==''||inc=='none')inc=null;
    if(isolli)inc='html:li '+(value==null?1:'='+value)+(inc?' '+inc:'');
    if(inc){
      // 既存のカウンタの値を増減
      inc.replace(/([\w:]+)(?:\s+(=?)([-+]?\d+))?/g,function($0,$1,$eq,$V){
        var reset=$eq=='=';
        var delta=(!$V||$V=="")?1: parseInt($V);
        if(!reset&&delta==0)return;

        var data=null;
        for(var dframe=frame;dframe;dframe=dframe.parent)
          if($1 in dframe.data){data=dframe.data;break;}
        if(data==null){
          reset=true;
          data=frame.data;
        }

        if(reset){
          data[$1]=delta;
        }else{
          data[$1]+=delta;
        }
        processed[$1]=1;
        //dbg.log("inc2: "+[$0,$1,reset,delta,data[$1]].join());
        //dbg.inspect("inc2: frame",frame);
        //console.log('inc2: '+elem.tagName+(pseudoClass||'')+' '+$1+"="+data[$1]);
      });
    }

    var rst=css&&css.counterReset;
    if(rst==''||rst=='none')rst=null;
    if(isol)rst='html:li '+(start-1)+(rst?' '+rst:'');
    if(rst){
      // カウンタを生成
      rst.replace(/([\w:]+)\s+([-+]?\d+)?/g,function($0,$1,$2){
        // dbg.log("rst1: "+[$0,$1,$2].join()+" @ "+elem.tagName+pseudoClass);
        //console.log('set: '+elem.tagName+(pseudoClass||'')+' '+$1+"="+frame.data[$1]);
        if(processed[$1])return;
        frame.data[$1]=$2&&$2!=""?parseInt($2):0;
      });
    }
  }
  // ↓counter spec がなくても evaluateAt で要求される可能性もあるのでこれは使えない。
  // function hasPseudoCounterSpec(elem,pseudoClass){
  //   var css=getComputedStyle(elem1,':before');
  //   if(css.display=='none')return false;
  //   if((/^li$/i).test(elem.tagName)&&pseudoClass=='before')return true;
  //   var inc=css.counterIncrement;
  //   if(inc&&inc!='')return true;
  //   var rst=css.counterReset;
  //   if(rst&&rst!='')return true;
  //   return false;
  // }
  CssCounterEmulator.prototype.evaluateAt=function(elem,pseudoClass){
    var iPC=pseudoClass==':before'?1:pseudoClass==':after'?2:0;
    if(this.prevElem===elem&&this.prevIPC===iPC)return true;
    this.prevElem=elem;
    this.prevIPC=iPC;

    if(this.frame==null){
      if(getComputedStyle(this.baseElement,null,'display')!='none')
        var frame={ifiber:0,target:{elem:this.baseElement,iPC:0},data:{}};
      else
        var frame={ifiber:3};
    }else{
      var frame=this.frame;
    }

    mainloop:for(;;){
      switch(frame.ifiber){
      case 0:
        if(!frame.target)dbg.inspect(frame);
        updateCounters(frame,frame.target.elem,frame.target.pseudoClass);

      case 1:
        if(frame.target.elem===elem&&frame.target.iPC===iPC){
          frame.ifiber=1;
          break mainloop;
        }

        if(!frame.target.iPC){
          var children=[];
          var elem1=frame.target.elem;
          if(getComputedStyle(elem1,':before','display')!='none')
            children.push({elem:elem1,pseudoClass:':before',iPC:1});
          for(var i=0,iN=elem1.children.length;i<iN;i++){
            var elem2=elem1.children[i];
            if(getComputedStyle(elem2,null,'display')!='none')
              children.push({elem:elem2,iPC:0});
          }
          if(getComputedStyle(elem1,':after','display')!='none')
            children.push({elem:elem1,pseudoClass:':after',iPC:2});

          if(children.length>0){
            frame.children=children;
            frame.i=0;
            frame.iN=children.length;
            frame.ifiber=2;
            continue mainloop;
          }
        }
        frame.ifiber=3;
        continue mainloop;

      case 2:
        if(frame.i<frame.iN){
          frame.ifiber=2;
          frame={ifiber:0,target:frame.children[frame.i++],parent:frame,data:{}};
          continue mainloop;
        }

      case 3:
        if(frame.parent==null){
          frame.ifiber=3;
          this.frame=frame;
          return false;
        }else{
          frame=frame.parent;
          continue mainloop;
        }
      }
    }

    this.frame=frame;
    return true;
  };
  CssCounterEmulator.prototype.getValue=function(counterName){
    for(var dframe=this.frame;dframe;dframe=dframe.parent)
      if(counterName in dframe.data){
        var value=dframe.data[counterName];
        return value;
      }
    return null;
  };
  CssCounterEmulator.prototype.getListItemText=function(counterName,listStyleType,hasSuffix){
    var value=this.getValue(counterName);
    if(value==null)return hasSuffix?'?. ':'?';
    var type=listStyleTypeTable[listStyleType]||listStyleTypeTable.decimal;
    return type(value,hasSuffix);
  };
  CssCounterEmulator.prototype.getListItemTextLong=function(counterName,separator,listStyleType,hasSuffix){
    var type=listStyleTypeTable[listStyleType];
    var ret=null;
    for(var dframe=this.frame;dframe;dframe=dframe.parent){
      if(counterName in dframe.data){
        var value=dframe.data[counterName];
        buff.push(value);
        if(ret==null){
          ret=type?type(value,hasSuffix):value+'. ';
        }else{
          ret=(type?type(value,false):value)+separator+ret;
        }
      }
    }
    if(ret)return ret;

    // fallback
    ret='?'+separator+'?';
    if(hasSuffix)ret+='. ';
    return ret;
  };
  CssCounterEmulator.prototype.getDepth=function(counterName,separator){
    var ret=0;
    for(var dframe=this.frame;dframe;dframe=dframe.parent)
      if(counterName in dframe.data)ret++;
    return ret;
  };

  var parseContentProperty=(function(){
    var rex_string  =/"(?:[^\\"]|\\.)*"|'(?:[^\\']|\\.)*'/.source;
    var rex_arg     ="(?:"+rex_string+"|[^\"',()])+";
    var rex_attr    =/attr\(\s*([-_\w]+)\s*\)/.source;
    var rex_counter ="counter\\(\\s*([-_\\w]+)\\s*(?:,\\s*("+rex_arg+")\\s*)?\\)";
    var rex_counters="counters\\(\\s*([-_\\w]+)\\s*,\\s*("+rex_string+")\\s*(?:,\\s*("+rex_arg+")\\s*)?\\)";
    var rex_url     ="url\\((?:[^)\"\']|"+rex_string+")+\\)";
    var reg_content=new RegExp(
      "("+rex_string+")|"+rex_attr+"|(\\b(?:no-)?\\b(?:open|close)-quote)|"
        +rex_counter+"|"+rex_counters+"|"+rex_url,
      'g');

    function parseCssString(literal){
      return literal.slice(1,-1).replace(/\\([0-9a-zA-Z]{1,8})|\\(.)/g,function($0,$1,$2){
        if($1&&$1!="")
          return String.fromCharCode(parseInt($1,16));
        else if($2&&$2!="")
          return $2;
      });
    }

    var reg_string=new RegExp(rex_string,'g');
    function parseArgument(literal){
      return literal.replace(reg_string,function($0){
        return parseCssString(literal);
      });
    }

    return function parseContentProperty(value,elem,pseudoClass,counter){
      if(value==null||value==''||value=='none'||value=='normal')return null;

      // 内容が単純な場合、何故か勝手に引用符が外される。
      // ※"none" や "normal" 等の文字列と none や normal の指定を区別出来ない。
      if((/^[^\x00-\x2F\x3A-\x40\x5B-\x60\x7B-\xA0]+$/).test(value))
        return value;

      //dbg.log("content: "+value);
      //dbg.log("quotes: "+getComputedStyle(elem,null,'quotes'));

      var buff=[];
      value.toString().replace(reg_content,function($0,$S,$A,$Q,$Cn,$Ct,$CCn,$CCs,$CCt){
        if($S&&$S!=""){
          buff.push(parseCssString($S));
        }else if($A&&$A!=""){
          if(elem[$A])
            buff.push(elem[$A]);
        }else if($Q&&$Q!=""){
          if($Q=='no-open-quote'||$Q=='open-quote')
            var depth=counter.quote_depth++;
          else
            var depth=--counter.quote_depth;

          if($Q=='open-quote'||$Q=='close-quote')
            buff.push('"');
          //■quotes未実装
          // if($Q=='open-quote')
          //   buff.push(quotes[Math.min(2*depth  ,quotes.length-1)]);
          // else if($Q=='close-quote')
          //   buff.push(quotes[Math.min(2*depth+1,quotes.length-1)]);
        }else if($Cn&&$Cn!=""){
          var name=$Cn;
          if(counter==null)
            buff.push('#');
          else{
            counter.evaluateAt(elem,pseudoClass);
            // dbg.log("$0={0} $Cn={1} $Ct={2} ".format($0,$Cn,$Ct));
            buff.push(counter.getListItemText(name,$Ct,false));
          }
        }else if($CCn&&$CCn!=""){
          var name=$CCn;
          var sep=parseCssString($CCs);
          if(counter==null)
            buff.push('#'+sep+'#');
          else{
            counter.evaluateAt(elem,pseudoClass);
            buff.push(counter.getListItemTextLong(name,sep,$CCt,false));
          }
        }
      });
      return buff.join('');
    };
  })();

  function isVisible(elem,pseudoClass){
    var display=getComputedStyle(elem,pseudoClass,'display');
    if(display=='none'
       ||display=='table-column-group'
       ||display=='table-column')return false;
    var visibility=getComputedStyle(elem,pseudoClass,'visibility');
    if(visibility=='hidden')return false;
    return true;
  }

  function getBeforeContent(elem,option){
    if(!option.showHidden&&!isVisible(elem,':before'))return null;
    var ret=parseContentProperty(getComputedStyle(elem,':before','content'),elem,':before',option.counter);
    if(isHtmlListItem(elem)){
      option.counter.evaluateAt(elem,':before');
      var depth=option.counter.getDepth('html:li');
      var indent='';
      for(var i=0;i<depth;i++)indent+='  ';
      if(!ret){
        // select representation
        var type
          =listStyleTypeTable[getComputedStyle(elem,null,'list-style-type')]
          ||listStyleTypeTable[elem.type]
          ||listStyleTypeTable[elem.parentNode.type];
        if(!type||type===listStyleTypeTable.normal){
          if((/^oll$/i).test(elem.parentNode.tagName)){
            type='decimal';
          }else{
            type=depth==0?'disc':depth==1?'circle':'square';
          }
          type=listStyleTypeTable[type];
        }

        // exec representation
        if(type.fixed)
          ret=type(null,true);
        else{
          option.counter.evaluateAt(elem,':before');
          var value=option.counter.getValue('html:li');
          ret=type(value,true);
        }
      }
      return indent+ret;
    }
    return ret;
  }
  function getAfterContent(elem,option){
    if(!option.showHidden&&!isVisible(elem,':after'))return null;
    return parseContentProperty(getComputedStyle(elem,':after','content'),elem,':after',option.counter);
  }

  function retrieveInnerText(buff,node,option){
    if(node.nodeType==TEXT_NODE)
      buff.push(getTextNodeDisplayedText(node));

    if(node.nodeType==ELEMENT_NODE){
      if(!option.showHidden&&!isVisible(node))return;

      // todo textarea etc.
      if((/^textarea$/i).test(node.tagName)){
        buff.push(node.value);
      }

      var whiteSpaceOfNode=getComputedStyle(node,null,'white-space');

      var isline0=null;
      /// @fn outputBlockLine(node,pseudoClass)
      /// @fn outputBlockLine(isline)
      /// 要素の中にある複数の項目を改行で区切るかどうか判定し改行を出力する。
      var outputBlockLine=function(arg1,pseudoClass){
        if(arg1&&arg1.tagName){
          var display=getComputedStyle(arg1,pseudoClass,'display');
          var isline1=display=='block'||display=='list-item'||display=='run-in'
            ||display=='table'||display=='table-row'||display=='table-caption';
          if(display=='list-item'&&pseudoClass==':before'&&isHtmlListItem(arg1))isline1=false;
        }else{
          var isline1=!!arg1;
        }

        if(isline0!==null&&(isline0||isline1))buff.push('\n');
        isline0=isline1;
      };

      var hasContent=false;
      if(option.includeContent){
        var content=getBeforeContent(node,option);
        if(content){
          hasContent=true;
          outputBlockLine(node,':before');
          buff.push(content);
        }
      }

      if((/^img$/i).test(node.tagName)){
        outputBlockLine(false);
        var alt=node.alt;
        if(!alt||alt=='')alt='image';
        buff.push('[',alt,']');
      }

      var childNodes=node.childNodes;
      for(var i=0,iN=childNodes.length;i<iN;i++){
        var child=childNodes[i];
        if(child.nodeType==TEXT_NODE){
          var text=getTextNodeDisplayedText(child,whiteSpaceOfNode);
          if((/^[ \xA0]$/).test(text)&&!(/^pre(?:-wrap)?$/).test(whiteSpaceOfNode)&&isline0!==false)continue;
          if(isline0)buff.push('\n');
          buff.push(text);
          isline0=false;
        }else{
          if(!option.showHidden&&!isVisible(child))continue;
          outputBlockLine(child,null);
          retrieveInnerText(buff,child,option);
        }
      }

      if(option.includeContent){
        var content=getAfterContent(node,option);
        if(content){
          hasContent=true;
          outputBlockLine(node,':after');
          buff.push(content);
        }
      }

      if(!hasContent&&(/^br$/i).test(node.tagName))
        buff.push('\n');
    }
  }

  // [gettext.export]
  window.getDisplayedText=function getDisplayedText(node,option){
    if(!option)
      option={includeContent:false,showHidden:false};
    else if(typeof option.valueOf()=="string"){
      option={
        includeContent:option.indexOf('c')>=0,
        showHidden:option.indexOf('h')>=0
      };
    }
    option.counter=new CssCounterEmulator(node,option.counterBase);
    var buff=[];
    retrieveInnerText(buff,node,option);
    return buff.join('');
  };
  window.getContentString=function(elem,pseudoClass,counterBase){
    // ::before/::after 正規化 → :before/:after
    if(pseudoClass.slice(0,2)==='::')pseudoClass=pseudoClass.slice(1);

    var content=getComputedStyle(elem,pseudoClass,'content');
    return parseContentProperty(
      content,elem,pseudoClass,
      new CssCounterEmulator(elem,counterBase||elem));
  };
  window.getListItemText=function(value,listStyleType,hasSuffix){
    var type=listStyleTypeTable[listStyleType]||listStyleTypeTable.decimal;
    return type(value,hasSuffix);
  };

  // [gettext.tests]
  if(window.dbg&&window.dbg.printh){
    // var css=document.createElement('style');
    // css.type="text/css";

    var div=document.createElement('div');
    div.className="test";
    document.body.appendChild(div);

    div.innerHTML='<style>.test p:before{counter-reset:item;} .test span{quotes:"「" "」" "『" "』"} .test span:before{counter-increment:item 1;content:counter(item,hiragana) open-quote;}</style>'
      +'<p><span>H</span> <span>E</span> <span>L</span> <span>L</span> <span>O</span></p>';
    dbg.log(getDisplayedText(div,"c"));
    div.innerHTML='<ul><li>A</li><li>B</li><li>C</li><li>D</li></ul>';
    dbg.log(getDisplayedText(div,"c"));
    div.innerHTML='<ol><li>A</li><li>B</li><li>C</li><li>D</li><li>A</li><li>B</li><li>C</li><li>D</li><li>A</li><li>B</li><li>C</li><li>D</li></ol>';
    dbg.log(getDisplayedText(div,"c"));
    div.firstChild.style.listStyleType='japanese-informal';
    dbg.log(getDisplayedText(div,"c"));
    div.firstChild.style.listStyleType='cjk-decimal';
    dbg.log(getDisplayedText(div,"c"));
    div.firstChild.style.listStyleType='katakana';
    dbg.log(getDisplayedText(div,"c"));
    div.firstChild.style.listStyleType='lower-roman';
    dbg.log(getDisplayedText(div,"c"));
  }
})();
