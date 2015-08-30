//******************************************************************************
//
//			MWG 3.0 - REGEX						K. Murase
//
//******************************************************************************
/// <reference path="agh.js"/>
agh.scripts.register("agh.regex.js",["agh.js"],function(){
//==============================================================================
//	予定: replace の強化版 $replace
//	【1】 複数の [RegExp,function] ペアを割り当て
//==============================================================================
String.prototype.$replace=function(arg1,arg2){
	if(agh.is(arg1,RegExp)||agh.is(arg1,String)){
		return replace2(this,arg1,arg2);
		//return this.replace(arg1,arg2);
	}else if(arg1 instanceof MulReg){
		return arg1.replace(this.valueOf(),arg2);
	}else if(arg1 instanceof Array){
		/// <summary name="F:String.prototype.$replace">
		/// 複数の正規表現を纏めて検索します。
		/// </summary>
		/// <param index="0" name="pairs" type="Array">
		/// [ [<var>(regex)</var>,<var>(handler)</var>] , ...] の形の配列を指定します。
		///   <expression name="(regex)">agh.MultiRegex#register の第一引数に指定する物と同じです。</expression>
		///   <expression name="(handler)">agh.MultiRegex#register の第二引数に指定する物と同じです。</expression>
		/// </param>
		/// <param index="1" name="flag" type="string" optional="true" default="g">
		/// 纏めて検索する際の正規表現のフラグを設定します。
		/// </param>
		return new MulReg(arg2,arg1).replace(this.valueOf());
	}
};
RegExp.prototype.countGroup=function(){
	/// <summary name="F:RegExp.prototype.countGroup">
	/// Capture Group の数を数えます。
	/// </summary>
  return agh.RegExp.countGroups(this);
};
RegExp.addFlags=function(reg,flags){
	var f="";var fD=false;
	if(reg.global||flags.indexOf('g')>=0&&(fD=true))f+='g';
	if(reg.ignoreCase||flags.indexOf('i')>=0&&(fD=true))f+='i';
	if(reg.multiline||flags.indexOf('m')>=0&&(fD=true))f+='m';
	if(fD)
		return new RegExp(reg.source,f);
	else
		return reg;
};
//==============================================================================
//	【1】
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
	/*
	get_zerowidth_regIndex:function(text,index){
		// for Firefox
		
		// lastIndex が有効な正規表現集合の生成
		if(!this.gregs){
			var flag=this.m_flag;
			if(flag.indexOf('g')<0)flags+="g";
			this.gregs=[];
			for(var i=0;i<this.m_len;i++)
				this.gregs[i]=new RegExp(this.regs[i].source,flag);
		}
		
		for(var i=0;i<this.m_len;i++){
			var reg=this.gregs[i];
			reg.lastIndex=index;
			var m=reg.exec(text);
			//alert("dbg:\nreg.exec@"+index+"\nm="+(m==null?'null':m[0].length)+"\nreg.lastIndex="+reg.lastIndex);
			if(m!=null&&index==reg.lastIndex-m[0].length)
				return i;
		}
		
		return -1;
	},
	replace_fast:function(str,obj){
		/// <summary>
		/// 正規表現による置換を実行します。
		/// </summary>
		this.instantiate();
		var self    =this;
		var igroup  =this.igroup;
		var len     =this.m_len;
		var inds    =this.inds;
		var hdls    =this.hdls;
		var regs    =this.regs;
		// 置換
		//----------------------------------
		return str.replace(this.m_reg,function($0){
			// 一致した正規表現の特定
			var i,index;
			if($0.length==0){
				// 零幅一致の場合 Firefox の時だけ
				i=self.get_zerowidth_regIndex(str,arguments[igroup]);
				index=inds[i];
			}else{
				for(i=0;i<len;i++){
					index=inds[i];
					if(arguments[index.all])break;
				}
			}
			if(i<0||len<=i)return $0;
			
			var $R={
				input:str,
				regex:regs[i],
				index:arguments[igroup],
				lastIndex:arguments[igroup]+$0.length
			};
			var $G=[];
			for(var j=index.all;j<index.end;j++)$G.push(arguments[j]);
			return hdls[i].call(obj,$G,$R);
		});
	},
	/*/
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
		// 置換
		//----------------------------------
		return str.replace(this.m_reg,function rep_replace_fast($0){
			// 一致した正規表現の特定
			var i=self.get_reg_index(str,arguments);
			//var i=-1;
			//for(var j=0;j<len;j++)
			//	if(arguments[inds[j].all]!=null){i=j;break;}
			if(i<0)return $0;

			var $R={
				input:str,
				regex:regs[i],
				index:arguments[igroup],
				lastIndex:arguments[igroup]+$0.length
			};
			var $G=[];
			var index=inds[i];
			for(var j=index.all,jN=index.end;j<jN;j++)$G.push(arguments[j]);
			return hdls[i].call(obj,$G,$R);
		});
	},
	//*/
	replace_last:function(str,obj){
		this.instantiate();
		var igroup=this.igroup;
		var len		=this.m_len;
		var inds	=this.inds;
		var hdls	=this.hdls;
		var regs	=this.regs;
		// 置換 $replace を使用
		//----------------------------------
		return str.$replace(this.m_reg,function($G,$R){
			for(var i=0;i<len;i++){
				var index=inds[i];
				if(!$G[index.all])continue;
				$G=$G.slice(index.all,index.end);
				return hdls[i].call(obj,$G,$R);
			}
			return $0;
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
//==============================================================================
//	【2】lastIndex を途中で変更できる置換
//==============================================================================
function replace2(text,reg,rep){
	//-- 引数の調整
	reg=agh(reg,RegExp);
	if(!agh.is(rep,Function)){
		rep=createHandlerFromString((rep||"").toString());
	}
	
	if(!reg.global){
		return replace2local(text,reg,rep);
	}
	
	return replace2global(text,reg,rep);
}
function replace2local(text,reg,rep){
	// global でない場合は、
	// キャプチャと位置を同時に得られる関数は replace しかない
	var $G=[];
    var index=-1;
	text.replace(function($){
		var iC=arguments.length-2;
		for(var i=0;i<iC;i++)
			$G.push(arguments[i]);
		index=arguments[iC+1];
		$I.lastIndex=index+$.length;
	});
	
	if(index<0)return text;
	
	var r=rep($G,{
		regex:reg,
		input:text,
		index:index,
		lastIndex:index+$G[0].length,
		captures:$G
	});
	return text.substr(0,index)+r+text.substr($I.lastIndex);
}
function replace2global(text,reg,rep){
	var bkLast=reg.lastIndex;
	reg.lastIndex=0;
	var ret=[];
	var len=text.length;
	var $I={regex:reg,input:text};
	for(var itext=0;itext<len;){
		// 次の一致
		var $G=reg.exec(text);
		if($G==null){
			ret.push(text.substr(itext));
			break;
		}
    // vIE<9 ではゼロ幅一致の時 lastIndex が勝手に 1 増やされる。
    if(agh.browser.vIE<9&&$G[0].length===0)reg.lastIndex--;
	    
		// 一致情報
		var end=reg.lastIndex;
		var start=end-$G[0].length;
    $I.index    =start;
    $I.lastIndex=end;
    $I.captures =$G;

		// 間の部分
		if(itext<start)
			ret.push(text.slice(itext,start));
		    
		// 置換
		reg.lastIndex=bkLast;
		ret.push(rep($G,$I));
		bkLast=reg.lastIndex;
		reg.lastIndex=$I.lastIndex;
		itext=$I.lastIndex;
		
		// 零幅一致
		if(start==end&&start==$I.lastIndex&&start<input.length){
			ret.push(text.substr(itext++,1));
			reg.lastIndex++;
		}
	}

	reg.lastIndex=bkLast;
	return ret.join("");
}
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
// require agh.Text.Escape.regexp
//------------------------------------------------------------------------------
agh.registerAgehaCast(RegExp,function(flag){
	if(flag==null)flag="g";
	
	// フラグ
	var r=flag.indexOf("r")>=0;
	var b=flag.indexOf("b")>=0;
	flag=flag.replace(/[^imgy]/,"");

	// 変換
	var tgt=this;
	if(agh.is(tgt,Array)){
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
//******************************************************************************
//  agh.RegExp
//
//  2015-01-30 KM, created
agh.Namespace('RegExp',agh);
agh.RegExp.countGroups=function(rex){
  if(rex instanceof RegExp)rex=rex.source;

  // // older code
	// var ngroups=0;
	// rex.replace(/\\[\\\(]|\(\?/g,"").replace(/\(/g,function(){return ngroups++;});
	// return ngroups;

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

//==============================================================================
});
//------------------------------------------------------------------------------
