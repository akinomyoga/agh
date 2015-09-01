//*****************************************************************************
//
//			MWG 3.0 - REGEX						K. Murase
//
//*****************************************************************************
/// <reference path="agh.js"/>
agh.scripts.register("agh.regex.js",["agh.js"],function(){
  var agh=this;

  //***************************************************************************
  // agh extension
  //
  //   require agh.Text.Escape.regexp
  //
  agh.registerAgehaCast(RegExp,function(flag){
    if(flag==null)flag="g";

    // フラグ
    var r=flag.indexOf("r")>=0;
    var b=flag.indexOf("b")>=0;
    flag=flag.replace(/[^imgy]/,"");

    // 変換
    var tgt=this;
    if(tgt instanceof Array){
      if(r)tgt=agh.Array.map(tgt,agh.Text.Escape.regexp);
      tgt=tgt.join("|");
      if(b)tgt="\\b(?:"+tgt+")\\b";
      return new RegExp(tgt,flag);
    }else{
      if(r)tgt=agh.Text.Escape(this.toString(),"regexp");
      if(b)tgt="\\b(?:"+tgt+")\\b";
      return new RegExp(tgt,flag);
    }
  });
  //***************************************************************************
  // agh.RegExp
  //
  //   2015-01-30 KM, created
  //
  agh.Namespace('RegExp',agh);
  agh.RegExp.countGroups=function(rex){
    if(rex instanceof RegExp)rex=rex.source;

    // // 2015-01-19
    // var ngroups=0;
    // rex.replace(/\\.|\[(?:[^\\\]]|\\.)*\]|\((?!\?)/g,function($0){if($0==='(')ngroups++;});
    // return ngroups;

    // 2015-01-30 http://stackoverflow.com/questions/16046620/regex-to-count-the-number-of-capturing-groups-in-a-regex
    return new RegExp(rex+'|').exec('').length-1;
  };
  agh.RegExp.shiftBackReferences=function(rex,offset){
    if(rex instanceof RegExp)rex=rex.source;
    return rex.replace(/\\(\d+)|\\.|\[(?:[^\\\]]|\\.)*\]/g,function($0,$1){
      if($1){
        var index=offset+(0|$1);
        if(index>99&&agh.browser.vIE)
          throw new Error("agh.RegExp.shiftBackReferences: a backward reference with a too large index (rex = "+rex.source+" shift="+offset+" index="+index+").");
        return '\\'+index;
      }
      return $0;
    });
  };
  agh.RegExp.flags=function(reg){
    var r="";
    if(reg.global)r+="g";
    if(reg.ignoreCase)r+="i";
    if(reg.multiline)r+="m";
    if(reg.sticky)r+="y";
    return r;
  };
  agh.RegExp.addFlags=function(reg,flags){
    var f="";var fD=false;
    if(reg.global||flags.indexOf('g')>=0&&(fD=true))f+='g';
    if(reg.ignoreCase||flags.indexOf('i')>=0&&(fD=true))f+='i';
    if(reg.multiline||flags.indexOf('m')>=0&&(fD=true))f+='m';
    if(fD)
      return new RegExp(reg.source,f);
    else
      return reg;
  };

  function createHandlerFromString(tmpl){
    if(tmpl.match(/\$(?:\d+|[\&\+\`\'])/)){
      return function($G,$I){
        return tmpl.replace(/\$(?:(\d+)|([\&\+\`\']))/g,function($0,$1,$2){
          if(!!$1){
            var r="";
            do{
              if($1 in $G)return $G[$1]+r;
              r=$1.substr($1.length-1)+r;
              $1=$1.substr(0,$1.length-1);
            }while($1.length>0);
          }else{
            if($2=="&")return $0;
            if($2=="`")return $I.input.substr(0,$I.index);
            if($2=="&")return $I.input.substr($I.lastIndex);
            if($2=="+")return $G[$G.length-1];
          }
          return $0;
        });
      };
    }else{
      return function($G,$I){
        return tmpl;
      };
    }
  }

  agh.RegExp.indexibleReplace=(function(){
    /*?lwiki
     * :@fn agh.RegExp.indexibleReplace(input,regex,handler,start=0,end=input.length);
     *  :@param regex : RegExp
     *   置換部分列の決定に用いる正規表現を指定します。
     *   global の設定されている場合、複数回の置換を行います。
     *   global が設定されていない場合、最初の一致に対してのみ置換を行います。
     *  :@param handler : function(matches,context)
     *   置換部分列の置換結果を計算する関数を指定します。
     *   :@param matches : Array
     *    一致部分列およびキャプチャの配列が渡されます。
     *    0番目の要素に一致部分列全体が設定されます。
     *    1番目以降にキャプチャ部分列が設定されます。
     *   :@param context : Object
     *    :@var[in]     context.input
     *     置換対象の文字列が渡されます。
     *    :@var[in,out] context.regex : RegExp
     *     置換部分列の決定に用いた正規表現が渡されます。
     *     次の置換部分列の決定に用いる正規表現を返します。
     *    :@var[in,out] context.handler : Function
     *     置換結果の決定に用いられた関数が渡されます。常に handler 自身です。
     *     次の置換部分列の置換結果の計算に用いられる handler を返します。
     *    :@var[in,out] context.index
     *     置換部分列の開始位置が渡されます。
     *    :@var[in,out] context.lastIndex
     *     置換部分列
     *    :@var[in,out] context.他
     *     handler の呼出を超えて共有する変数を自由に設定できます。
     *   :@return
     *    置換後の文字列を返します。
     *    undefined を返した場合は置換を行いません。
     *  :@param start = 0 : Number
     *   置換対象の範囲の開始境界を指定します。
     *  :@param end = input.length : Number
     *   置換対象の範囲の末端境界を指定します。
     */

    function LocalIndexibleReplace(input,reg,handler,start,end){
      var m=null;
      var ctx={regex:reg,input:input,handler:handler};

      // reg.exec(input) => set m, ctx.index, ctx.lastIndex
      if(start==0){
        // global でない場合は、
        // キャプチャと位置を同時に得られる関数は replace しかない
        input.replace(reg,function($0){
          m=Array.prototype.slice.call(arguments,0,-2);
          ctx.index=arguments[arguments.length-2];
          ctx.lastIndex=ctx.index+$0.length;
        });
      }else{
        // global な version を生成するしかない。
        if(reg.aghGlobalVersion==null)
          reg.aghGlobalVersion=reg.global?reg:agh.RegExp.addFlags(reg,'g');

        reg.aghGlobalVersion.lastIndex=start;
        m=reg.aghGlobalVersion.exec(input);
        if(m!=null){
          ctx.lastIndex=reg.aghGlobalVersion.lastIndex;
          // vIE<9 ではゼロ幅一致の時 lastIndex が勝手に 1 増やされる。
          if(agh.browser.vIE<9&&m[0].length===0)ctx.lastIndex--;
          ctx.index=ctx.lastIndex-m[0].length;
        }
      }

      if(m==null||end<ctx.lastIndex)return input;

      ctx.captures=m;

      var replaced=handler(m,ctx);
      if(replaced===undefined)return input;
      if(ctx.index<start)ctx.index=start;
      if(ctx.lastIndex<ctx.index)ctx.lastIndex=ctx.index;
      return input.slice(0,ctx.index)+replaced+input.substr(ctx.lastIndex);
    }

    // ■buff に関連する処理の部分を分離すれば replace だけでなく each や split なども実装できる?
    function GlobalIndexibleReplace(input,regex,handler,start,end){
      var buff=[];
      if(start>0)buff.push(input.slice(0,start));
      var ctx={input:input,regex:regex,handler:handler};
      for(var itext=start;itext<end;){
        // ctx.regex.exec()
        var m,mend;
        {
          var reg=ctx.regex; // assert(reg.global);
          var originalLastIndex=reg.lastIndex;
          reg.lastIndex=itext;
          m   =reg.exec(input);
          mend=reg.lastIndex;
          reg.lastIndex=originalLastIndex;

          // vIE<9 ではゼロ幅一致の時 lastIndex が勝手に 1 増やされる。
          if(agh.browser.vIE<9&&m!=null&&m[0].length===0)mend--;
        }
        if(m==null||end<mend)
          break;

        // update context
        ctx.index    =mend-m[0].length;
        ctx.lastIndex=mend;
        ctx.captures =m;

        // ctx.handler()
        var replaced=ctx.handler(m,ctx);
        if(ctx.index<itext)
          ctx.index=itext;
        if(ctx.lastIndex<ctx.index)
          ctx.lastIndex=ctx.index;

        // output
        if(replaced===undefined){
          if(itext<ctx.lastIndex)
            buff.push(input.slice(itext,ctx.lastIndex));
        }else{
          if(itext<ctx.index)
            buff.push(input.slice(itext,ctx.index));
          buff.push(replaced);
        }

        // update itext
        //   零幅一致の場合は1文字進める
        if(ctx.lastIndex>itext)
          itext=ctx.lastIndex;
        else
          buff.push(input.substr(itext++,1));
      }

      if(itext<input.length)
        buff.push(input.slice(itext));
      return buff.join("");
    }

    return function(input,reg,rep,start,end){
      //-- 引数の調整
      if(!(reg instanceof RegExp))
        reg=agh(reg,RegExp);
      if(!(rep instanceof Function))
        rep=createHandlerFromString((rep||"").toString());

      if(start==null)
        start=0;
      else if(start<0)
        start=Math.max(0,start+input.length);

      if(end==null)
        end=input.length;
      else if(end<0)
        end=Math.max(0,end+input.length);
      else if(end>input.length)
        end=input.length;

      if(end<start)
        return input;
      else if(reg.global)
        return GlobalIndexibleReplace(input,reg,rep,start,end);
      else
        return LocalIndexibleReplace(input,reg,rep,start,end);
    };
  })();

  agh.RegExp.replace=function(input,reg,handler){
    if(!(reg instanceof RegExp))
      reg=agh(reg,RegExp);
    if(!(handler instanceof Function))
      handler=createHandlerFromString((handler||"").toString());

    var ctx={input:input,regex:reg,handler:handler};
    return input.replace(reg,function($0){
      var count=arguments.length;
      ctx.captures=Array.prototype.slice.call(arguments,0,-2);
      ctx.index=arguments[count-2];
      ctx.lastIndex=ctx.index+$0.length;
      var replaced=handler(ctx.captures,ctx);
      return replaced===undefined?$0:replaced;
    });
  };

//==============================================================================
//	【1】agh.Text.MultiRegex
//==============================================================================
var MulReg=agh.Text.MultiRegex=function(flag,pairs){
  /// <summary name="T:agh.Text.MultiRegex">
  /// 複数の正規表現で纏めて処理を行う時に使用するクラスです。
  /// </summary>
  /// <param name="pairs" type="Array">
  /// [ [<var>(regex)</var>,<var>(handler)</var>] , ...] の形の配列を指定します。
  ///   <expression name="(regex)">agh.Text.MultiRegex#register の第一引数に指定する物と同じです。</expression>
  ///   <expression name="(handler)">agh.Text.MultiRegex#register の第二引数に指定する物と同じです。</expression>
  /// </param>
  /// <param name="flags" type="string" optional="true" default="g">
  /// 纏めて検索する際の正規表現のフラグを設定します。
  /// </param>
  this.rexs=[]; // 正規表現文字列
  this.regs=[]; // RegExp
  this.hdls=[]; // ハンドラ
  this.inds=[]; // capture-group の番号たち
  this.igroup=1;
  this.replace=this.replace_fast;

  // 引数解析 : flags
  //----------------------------------
  if(agh.is(flag,String)){
    if(flag)this.m_flag=flag;
  }
  // 引数解析 : pairs
  //----------------------------------
  if(agh.is(pairs,Array)){
    var _this=this;
    //----------------------------------
    agh.Array.each(pairs,function(pair){
      _this.register(pair[0],pair[1]);
    });
  }
};
agh.memcpy(MulReg.prototype,{
  m_reg:null,
  m_len:0,
  m_flag:"g",
  register:function(regex,handler){
    /// <summary>
    /// 新しい正規表現とハンドラのペアを登録します。
    /// </summary>
    /// <param name="regex">
    ///   regex には正規表現を指定します。文字列又は RegExp インスタンスを指定する事が可能です。
    ///   RegExp の場合、そのフラグは無視されます。
    ///   全体で共通のフラグを使用し、それは MultiRegex コンストラクタの引数で指定する事が可能です。
    ///   ・零幅一致する正規表現を指定した場合、置換処理は実行されません。
    /// </param>
    /// <param name="handler">
    ///   handler には置換後の文字列又は、置換後の文字列を計算する関数を指定します。
    ///   <overload type="string">
    ///     文字列で指定する場合には $0 又は $(数字) を含める事が可能です。
    ///     $0 を指定した場合には、その部分は一致文字列全体に置換されます。
    ///     $(数字) を指定した場合には、その数字に対応するキャプチャグループの内容に置換されます。
    ///     そのキャプチャグループが複数回捕捉を行った場合には、最後に捕捉した文字列に置換されます。
    ///   </overload>
    ///   <overload type="function">
    ///     指定する関数のシグニチャは次の様になります。
    ///     <param name="$G">第一引数 $G: キャプチャした値を保持する配列を指定します。
    ///     第零要素には一致した部分文字列全体が格納されています。
    ///     第一要素以降には、キャプチャグループの出現順にそれぞれのグループがキャプチャした内容が格納されます。
    ///     一つのキャプチャが複数回捕捉を行った場合には、最後に捕捉した文字列が格納されます。
    ///     </param>
    ///     <param name="$R">第二引数 $R: 検索結果に関する情報を保持するオブジェクトを指定します。
    ///     $R.input : 検索対象の文字列を保持します。
    ///     $R.regex : パターン一致に使用した正規表現オブジェクトを保持します。
    ///     $R.index : 一致の開始位置を保持します。
    ///     $R.lastIndex : 一致の末端を保持します。
    ///     </param>
    ///     <returns>置換後の部分文字列を返します。</returns>
    ///   </overload>
    /// </param>
    //-- handler
    if(agh.is(handler,Function)){
      this.hdls.push(handler);
    }else if(agh.is(handler,String)){
      var targetstr=handler;
      this.hdls.push(function($G,$R){
        return targetstr.replace(/\$([0-9]+)/g,function($0,$N){
          return $N in $G?$G[$N]:$0;
        });
      });
    }else{
      throw new Error("Specified replacement target has invalid type.");
    }

    //-- reg
    var reg=agh(regex,RegExp);
    this.regs.push(reg);

    //-- rex
    var iwhole=this.igroup;
    var rex=agh.RegExp.shiftBackReferences(reg,iwhole);
    this.rexs.push("("+rex+")");

    //-- ind
    this.inds.push({
      all:iwhole,							// この regex に依る一致全体の番号
      start:++this.igroup,				// この regex の捕捉範囲の初め (不使用)
      end:this.igroup+=agh.RegExp.countGroups(reg)	// この regex の捕捉範囲の終端
    });
    this.m_len++;
    this.m_reg=null;
  },
  // private
  instantiate:function(){
    if(this.m_reg)return;
    // 正規表現
    //----------------------------------
    this.m_reg=new RegExp(this.rexs.join("|"),this.m_flag);
  },
  get_reg_index:(function(){
    if(agh.browser.vFx<34)
      return function get_reg_indexFx(text,args){
        // Fx33 以下は非一致キャプチャグループに対し undefined ではなく "" を返す。
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
        if(args[0].length==0){
          // gregs 初期化: lastIndex が使える正規表現達
          if(!this.gregs){
            var flag=this.m_flag;
            if(flag.indexOf('g')<0)flag+="g";
            this.gregs=[];
            for(var i=0;i<this.m_len;i++)
              this.gregs[i]=new RegExp(this.regs[i].source,flag);
          }

          // 個々の正規表現を使用して判定
          var index=args[this.igroup];
          for(var i=0;i<this.m_len;i++){
            var reg=this.gregs[i];
            reg.lastIndex=index;
            var m=reg.exec(text);
            if(m!=null&&index==reg.lastIndex-m[0].length)return i;
          }

          return -1;
        }else{
          for(var i=0,iN=this.m_len;i<iN;i++)
            if(args[this.inds[i].all])return i;
          return -1;
        }
      };
    else
      return function get_reg_index(text,args){
        for(var i=0,iN=this.m_len;i<iN;i++)
          if(args[this.inds[i].all]!=null)return i;
        return -1;
      };
  })(),
  replace_fast:function(str,obj){
    this.instantiate();
    var self    =this;
    var igroup  =this.igroup;
    var len     =this.m_len;
    var inds    =this.inds;
    var hdls    =this.hdls;
    var regs    =this.regs;
    var ctx     ={input:str,regex:this.m_reg,handler:null};
    return str.replace(this.m_reg,function rep_replace_fast($0){
      // 一致した正規表現の特定
      var i=self.get_reg_index(str,arguments);
      if(i<0)return $0;

      ctx.index    =arguments[igroup];
      ctx.lastIndex=arguments[igroup]+$0.length;
      ctx.captures =arguments;
      var index=inds[i];
      var captures=Array.prototype.slice.call(arguments,index.all,index.end);
      return hdls[i].call(obj,captures,ctx);
    });
  },
  replace_last:function(str,obj){
    this.instantiate();
    var self    =this;
    var igroup=this.igroup;
    var len		=this.m_len;
    var inds	=this.inds;
    var hdls	=this.hdls;
    var regs	=this.regs;
    return agh.RegExp.indexibleReplace(str,this.m_reg,function(m,ctx){
      var i=self.get_reg_index(str,m);
      if(i<0)return m[0];

      var index=inds[i];
      var captures=m.slice(index.all,index.end);
      return hdls[i].call(obj,captures,ctx);
    });
  },
  set_replace:function(value){
    switch(value){
    case "indexable":
      this.replace=this.replace_last;
      break;
    case "fast":
      this.replace=this.replace_fast;
      break;
    }
  }
});
//******************************************************************************
//		agh.Text.Regex
//------------------------------------------------------------------------------
agh.Text.Regex={
  js_number:/\bNaN\b|[\b\+\-]?Infinity\b|\b(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]\d+)?\b|\b0x[\dA-Fa-f]+\b/g,
  js_string:/"(?:[^\\"]|\\.)*"|'(?:[^\\']|\\.)*'/g,
  ht_entt_ref:/\&(?:[A-Za-z\d\-\_]+|\#\d+|\#[xX][\dA-Fa-f]+)\;/g
};
agh.Text.Regex.ht_tag=new RegExp("\\<"+/\/?[A-Za-z\-\_]+/.source+"(?:[^\"\'\\>]|"+agh.Text.Regex.js_string.source+")*\\>","g");
//==============================================================================
});
//------------------------------------------------------------------------------
