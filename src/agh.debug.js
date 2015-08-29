//******************************************************************************
//
//			MWG 2.0 - debug						K. Murase
//
//******************************************************************************
/// <reference path="agh.js"/>
/// <reference path="agh.dom.js"/>
/// <reference path="agh.class.js"/>
/// <reference path="agh.forms.js"/>
agh.scripts.register("agh.debug.js",[	
	"agh.js","agh.dom.js",
  "agh.text.color.js","prog.std.css",
  "agh.debug.css",
  "agh.class.js","agh.forms.js"
],function(){
//==============================================================================

  agh.Namespace('debug',agh);

  agh.debug.benchmark=(function(){
    function single_measure(func,factor){
      function _empty(){}

      var originalTitle=document.title;
      document.title+="[agh.debug.benchmark "+func.get_name()+"] x "+factor;
      var t0=new Date().getTime();
      for(var i=0;i<factor;i++)_empty();
      var t1=new Date().getTime();
      for(var i=0;i<factor;i++)func();
      var t2=new Date().getTime();
      document.title=originalTitle;
      return t2-2*t1+t0;
    }

    return function benchmark(func,factor){
      var result;
      if(factor!=null)
        result=single_measure(func,factor);
      else
        for(factor=1;result<100&&factor<1000000;factor*=10)
          result=single_measure(func,factor);
      return result*(1000/factor);
    };
  })();

//-----------------------------------------------------------------------------
//  ObjectTree

  // utility functions
  function in_s(name,obj){
    try{
      return name in obj
    }catch(ex){
      return false;
    }
  }

  if(Object.getOwnPropertyNames){
    var getOwnPropertyNames=function(obj){
      if(obj==null)return [];
      return agh.Array.uniqueD(Object.getOwnPropertyNames(Object(obj)));
    };
  }else{
    // Object DontEnum Properties
    var DontEnumProperties=[
      // Object
      'constructor', // '__parent__',
      'hasOwnProperty','isPrototypeOf','propertyIsEnumerable',
      'valueOf','toString','toLocaleString',

      // Browser specific properties
      'eval','toSource','watch','unwatch','unique',

      // Function, Array
      'name','prototype','length',
      'arguments','callee','caller',

      // RegExp
      'global','ignoreCase','lastIndex','multiline','source'
    ];
    var getOwnPropertyNames=function(obj){
      var a=agh.ownkeys(obj);

      try{
        if(obj.hasOwnProperty)
          for(var i=0;i<DontEnumProperties.length;i++){
            var prop=DontEnumProperties[i];
            if(obj.hasOwnProperty(prop))a.push(prop);
          }
      }catch(ex){}
      
      return agh.Array.uniqueD(a);
    };
  }


  if({}.__proto__){
    var getPrototypeOf=function(obj){
      if(obj!=null)
        return obj.__proto__;
      else
        return null;
    };
  }else if(Object.getPrototypeOf){
    var getPrototypeOf=function(obj){
      if(obj==null)
        return null;
      else if(typeof obj==="object")
        return Object.getPrototypeOf(obj);
      else if(obj.constructor&&obj.constructor.prototype!==obj)
        return obj.constructor.prototype;
      else
        return null;
    };
  }else{
    var getPrototypeOf=function(obj){
      if(obj==null)
        return null;
      else if(obj.constructor&&obj.constructor.prototype!==obj)
        return obj.constructor.prototype;
      else
        return null;
    };
  }

  function getObjectTypeName(obj){
    if(obj==null)
      return obj===undefined?'Undefined':'Null';

    // 自身の上で定義された toString で試す。
    // - 配列の場合「中身」の toString() を連結した物になるので除外
    try{
      if(!(obj instanceof Array)){
        var m;
        var s=obj.toString();
        if((m=/^\s*\[object\s+([^\s\[\]]+)\]/.exec(s)))return m[1];
      }
    }catch(ex){}

    // IE7 以前は HTML ノードは JavaScript オブジェクトではない。
    // IE8 以降も Object.prototype.toString では判定できない。
    if(agh.browser.vIE)
      try{
        /* Fx が obj.nodeType でエラーを吐く:
         *   TypeError: Value does not implement interface Node.
         */
        if(typeof obj.nodeType==="number"){
          switch(obj.nodeType){
          case 1:return 'HTMLElement';
          case 2:return 'Attr';
          case 3:return 'Text';
          case 4:return 'CDATASection';
          case 5:return 'Entity';
          case 6:return 'EntityReference';
          case 7:return 'ProcessingInstruction';
          case 8:return 'Comment';
          case 9:return 'HTMLDocument';
          case 10:return 'DocumentType';
          case 11:return 'DocumentFragment';
          case 12:return 'Notation';
          default:return 'Node';
          }
        }
      }catch(ex){}

    // Object.prototype.toString で試す。
    try{
      var m;
      var s=Object.prototype.toString.apply(obj);
      if((m=/^\s*\[object\s+([^\s\[\]]+)\]/.exec(s)))return m[1];
    }catch(ex){}

    try{
      if(typeof obj.constructor==="function"){
        var s=Function.prototype.get_name.call(obj.constructor);
        if(s.length>0)return s;
      }
    }catch(ex){}

    return null;
  }

  // String
  var StringPropertyType={
    innerHTML:{
      htmlTitle:function(s){
        if(s.length>240||s.indexOf("\n")>=0){
          return '<span class="agh-debug-tree-string">[html...]</span>';
        }else
          return agh.Text.Color(s,'html');
      },
      colorType:'html',
      className:'agh-prog-html'
    },
    'default':{
      htmlTitle:function(s){
        if(s.length>240)s=s.slice(0,240)+"...";
        return '<span class="agh-debug-tree-string">"'+agh.Text.Escape(agh.Text.Escape(s,'backslash'),'html')+'"</span>';
      },
      colorType:null,
      className:'agh-prog-txt'
    }
  };
  agh.memcpy(StringPropertyType,StringPropertyType,{
    outerHTML:'innerHTML',
    innerText:'default',
    outerText:'default',
    textContent:'default'
  });

  // HTMLElement
  if(agh.browser.vIE<8){
    var isHtmlElement=function(obj){
      if(obj==null)return false;
      return obj.constructor==null&&obj.nodeType===1;
    };
  }else if(agh.browser.vIE<9){
    var isHtmlElement=function(obj){
      if(obj==null)return false;
      return obj instanceof Element&&obj.nodeType===1;
    };
  }else{
    var isHtmlElement=function(obj){
      if(obj==null)return false;
      return obj instanceof HTMLElement&&obj.nodeType===1;
    };
  }

  // Function
  function isClassConstructor_chkproto(prototype){
    if(prototype==null||prototype===Object.prototype)
      return false;
    if(agh.Array.difference(getOwnPropertyNames(prototype),['constructor','__proto__']).length>0)
      return true;
    return isClassConstructor_chkproto(getPrototypeOf(prototype));
  }
  var isClassConstructor=function(obj){
    if(typeof obj!=="function")return false;
    if(obj===Object)return true;
    return isClassConstructor_chkproto(obj.prototype);
  };
  function getFunctionSource(obj){
    if(obj!=null){
      try{
        return Function.prototype.toString.call(obj);
      }catch(ex){}

      try{
        if(Function.prototype.toSource)
          Function.prototype.toSource.call(obj);
      }catch(ex){}

      try{
        return obj.toString();
      }catch(ex){}
    }

    return "";
  }

  var errorFacilityCodeNames=[
    // 0-9
    'FACILITY_NULL','FACILITY_RPC','FACILITY_DISPATCH','FACILITY_STORAGE','FACILITY_ITF',
    null,null,'FACILITY_WIN32','FACILITY_WINDOWS','FACILITY_SECURITY, FACILITY_SECURITY',
    // 10-19
    'FACILITY_CONTROL','FACILITY_CERT','FACILITY_INTERNET','FACILITY_MEDIASERVER','FACILITY_MSMQ',
    'FACILITY_SETUPAPI','FACILITY_SCARD','FACILITY_COMPLUS','FACILITY_AAF','FACILITY_URT',
    // 20-29
    'FACILITY_ACS','FACILITY_DPLAY','FACILITY_UMI','FACILITY_SXS','FACILITY_WINDOWS_CE',
    'FACILITY_HTTP','FACILITY_USERMODE_COMMONLOG',null,null,null,
    // 30-39
    null,'FACILITY_USERMODE_FILTER_MANAGER','FACILITY_BACKGROUNDCOPY','FACILITY_CONFIGURATION','FACILITY_STATE_MANAGEMENT',
    'FACILITY_METADIRECTORY','FACILITY_WINDOWSUPDATE','FACILITY_DIRECTORYSERVICE','FACILITY_GRAPHICS','FACILITY_SHELL',
    // 40-49
    'FACILITY_TPM_SERVICES','FACILITY_TPM_SOFTWARE',null,null,null,
    null,null,null,'FACILITY_PLA','FACILITY_FVE',
    // 50-59
    'FACILITY_FWP','FACILITY_WINRM','FACILITY_NDIS','FACILITY_USERMODE_HYPERVISOR','FACILITY_CMI',
    'FACILITY_USERMODE_VIRTUALIZATION','FACILITY_USERMODE_VOLMGR','FACILITY_BCD','FACILITY_USERMODE_VHD',null,
    // 60 61
    'FACILITY_SDIAG','FACILITY_WEBSERVICES'
  ];
  errorFacilityCodeNames[80]='FACILITY_WINDOWS_DEFENDER';
  errorFacilityCodeNames[81]='FACILITY_OPC';
  var errorStatusSeveities=[
    '0 (STATUS_SEVERITY_SUCCESS)',
    '1 (STATUS_SEVERITY_INFORMATIONAL)',
    '2 (STATUS_SEVERITY_WARNING)',
    '3 (STATUS_SEVERITY_ERROR)'
  ];
  var modifyErrorObject=function(error){
    // エラー情報の補足
    if(agh.browser.vIE&&'number' in error){
      // https://msdn.microsoft.com/en-us/library/cc231198.aspx
      // https://msdn.microsoft.com/en-us/library/cc231200.aspx
      // https://msdn.microsoft.com/en-us/library/windows/desktop/ms690088%28v=vs.85%29.aspx
      var codes=new Number(error.number);
      var hi=codes>>16;
      codes.SCODE=hi&0x8000?'1 (SEVERITY_ERROR)':'0 (SEVERITY_SUCCESS)';
      codes.RCODE=(hi&0x1000)?errorStatusSeveities[hi>>14&0x3]: (hi&0x4000?'1 (reserved)':'0 (reserved)');
      codes.CCODE=hi&0x2000?'1 (customer-defined error)':'0 (Microsoft-defined error)';
      codes.NCODE=hi&0x1000?'1 (NTSTATUS)':'0 (reserved)';
      codes.XCODE=hi&0x0800?'1 (TRK)':'0 (reserved)';
      codes.Facility=(hi&0x07FF)+' ('+(errorFacilityCodeNames[hi&0x07FF]||'unknown')+')';
      codes.Code=codes&0xFFFF;
      error.number=codes;
    }
    return error;
  };

  var ObjectTreeInfo=agh.Class('ObjectTreeInfo',null,{
    initializeNode:function(tnode){
      tnode.eline.innerHTML=tnode._html_keyeq()+"[agh.debug internal object]";
    }
  });
  var ObjectTreeErrorInfo=agh.Class('ObjectTreeErrorInfo',ObjectTreeInfo,{
    constructor:function(title,error){
      this.base();
      this.title=title;
      this.error=error;
    },
    initializeNode:function override(tnode){
      var _this=this;
      tnode.eline.innerHTML=tnode._html_keyeq()+'<span class="agh-debug-tree-error">'+agh.Text.Escape(this.title,'html')+'</span>';
      tnode.initializeContent=function(){
        agh.dom.addClassName(tnode.ehold,'agh-debug-tree-error-hold');

        var div=tnode._document.createElement('div');
        div.className='agh-debug-tree-error';
        div.innerHTML='<b>Error</b> '+agh.Text.Escape(_this.error.message,'html');
        tnode.ehold.appendChild(div);

        _this.error=modifyErrorObject(_this.error);
        tnode._appendMemberNodes(tnode.ehold,_this.error);
      };
    }
  });
  var ObjectTreeStackInfo=agh.Class('ObjectTreeStackInfo',ObjectTreeInfo,{
    constructor:function(stackframe){
      this.base();
      this.frames=stackframe;
    },
    initializeNode:function override(tnode){
      var _this=this;
      var frames=this.frames;
      tnode.eline.innerHTML=tnode._html_keyeq()+'<span class="agh-debug-tree-string">stack['+this.frames.length+']</span>';
      tnode.initializeContent=function(){
        for(var i=0;i<frames.length;i++){
          var f=frames[i];
          var text="frame["+i+"]";
          if(f.file){
            text+=" @ "+f.file;
            if(f.line||f.column){
              text+=":"+(f.line||'?');
              if(f.column)text+=":"+f.column;
            }
          }
          if(f.calleeName||f.typeName||f.methodName){
            text+="\nfunction = "+(f.calleeName||'<anonymous>');
            if(f.typeName||f.methodName)
              text+=" [as "+(f.typeName||'<unknown>')+" # "+(f.methodName||'<unknown>')+"]";
          }
          var div=tnode._document.createElement('div');
          agh.dom.setInnerText(div,text);
          tnode.ehold.appendChild(div);

          if(f.callee)
            tnode._appendFunctionSource(getFunctionSource(f.callee));
          if(f._this)
            tnode.ehold.appendChild(agh.debug.createObjectTree('this',f._this));
          if(f.arguments)
            for(var j=0;j<f.arguments.length;j++)
              tnode.ehold.appendChild(agh.debug.createObjectTree("arguments["+j+"]",f.arguments[j]));
          
          tnode.ehold.appendChild(agh.debug.createObjectTree('(frame)',f));
        }
        
        //@@
      };
    }
  });

  var HTML_EQ=' <span class="agh-debug-tree-eq">=</span> ';
  agh.debug.ObjectTreeNode=function ObjectTreeNode(key,obj,_document){
    this.key=key;
    this.obj=obj;
    this._document=_document||window.document;

    this.enode=this._document.createElement("div");
    this.enode.className='agh-debug-tree-node';

    this.eline=this._document.createElement("div");
    this.eline.className='agh-debug-tree-line';
    agh.dom.setStyle(this.eline,'-agh-user-select',false);
    this.enode.appendChild(this.eline);

    this.ehold=null;
    this.contentInitialized=false;
    this.stateExpanded=false;

    this._initializeNode();

    if(this.initializeContent){
      agh.dom.addClassName(this.eline,'agh-debug-tree-line-closed');
      agh.dom.attach(this.eline,'-agh-click',agh.delegate(this,this.eline_onclick),false);
    }
  };
  agh.memcpy(agh.debug.ObjectTreeNode.prototype,{
    element:function(){return this.enode;},
    _htmlObjectMark:function(text){
      return '<span class="agh-debug-tree-mark">['+agh.Text.Escape(text,'html')+']</span>';
    },
    _htmlObjectInstance:function(type,o){
      if(!o)o='object';
      if(type!=null)
        return '<span class="agh-debug-tree-mark">['+o+' <span class="agh-debug-tree-mark-type">'+agh.Text.Escape(type,'html')+'</span>]</span>';
      else
        return '<span class="agh-debug-tree-mark">['+o+']</span>';
    },
    _html_keyeq:function(){
      if(this.key!=null)
        return '<span class="agh-debug-tree-key">'+agh.Text.Escape(this.key,'html')+'</span> <span class="agh-debug-tree-eq">=</span> ';
      else
        return '';
    },
    OnInitializeContent:function(){
      this.contentInitialized=true;
      if(!this.ehold){
        this.ehold=this._document.createElement('div');
        this.ehold.className='agh-debug-tree-hold-closed';
        this.enode.appendChild(this.ehold);
      }
      this.ehold.innerHTML="";
      this.initializeContent(); // 内部で contentInitialized=false (canceled) する可能性有り。
    },
    eline_onclick:function(){
      if(!this.stateExpanded){
        // expanding
        if(!this.contentInitialized)
          this.OnInitializeContent();
        agh.dom.switchClassName(this.eline,'agh-debug-tree-line','expand');
        agh.dom.switchClassName(this.ehold,'agh-debug-tree-hold','expand');
        this.stateExpanded=true;
      }else{
        // closing
        agh.dom.switchClassName(this.eline,'agh-debug-tree-line','closed');
        agh.dom.switchClassName(this.ehold,'agh-debug-tree-hold','closed');
        this.stateExpanded=false;
      }
    },
    //-------------------------------------------------------------------------
    // 内容構築
    _initializeNode:function(){
      this.typeName=getObjectTypeName(this.obj);

      var type=typeof this.obj;
      if(this.obj==null){
        if(type==="undefined"){
          this.eline.innerHTML=this._html_keyeq()+'<span class="agh-debug-tree-keyword">undefined</span>';
        }else{
          this.eline.innerHTML=this._html_keyeq()+'<span class="agh-debug-tree-keyword">null</span>';
        }
      }else{
        switch(type){
        case "object":case "function":break;
        case "number":
          this.eline.innerHTML=this._html_keyeq()+'<span class="agh-debug-tree-number">'+this.obj+'</span>';
          return;
        case "string":
          this._initializeNode_string();
          return;
        case "boolean":
          this.eline.innerHTML=this._html_keyeq()+'<span class="agh-debug-tree-boolean">'+this.obj+'</span>';
          return;
        }

        if(this.obj instanceof ObjectTreeInfo){
          this.obj.initializeNode(this);
          return;
        }

        this._initializeNode_object();
      }
    },
    //---------------------------------
    // object
    _getFunctionSource:function(){
      if(this.functionSource)
        return this.functionSource;
      else
        return this.functionSource=getFunctionSource(this.obj);
    },
    _initializeNode_object:function(){
      var htline=this._html_keyeq()+this._htmlObjectInstance(this.typeName);

      try{
        var __proto__=getPrototypeOf(this.obj);
        if(__proto__===Number.prototype){
          var s=Number.prototype.toString.call(this.obj);
          htline+=' <span class="agh-debug-tree-number">'+s+'</span>';
        }else if(__proto__===String.prototype){
          var s=String.prototype.toString.call(this.obj);
          htline+=' <span class="agh-debug-tree-string">"'+agh.Text.Escape(agh.Text.Escape(s,'backslash'),'html')+'"</span>';
        }else if(__proto__===Boolean.prototype){
          var s=Boolean.prototype.toString.call(this.obj);
          htline+=' <span class="agh-debug-tree-boolean">'+s+'</span>';
        }else if(__proto__===RegExp.prototype){
          //var s=this.obj.source?"/"+this.obj.source+"/":this.obj.toString();
          var s=RegExp.prototype.toString.call(this.obj);
          htline+=' <span class="agh-debug-tree-string">'+agh.Text.Escape(agh.Text.Escape(s,'backslash'),'html')+'</span>';
        }else if(typeof this.obj==="function"){
          if(isClassConstructor(this.obj)){
            var className=this.obj.className||this.obj.get_name();
            if(!(className&&className!=""))
              className=this.key&&this.key!=""?this.key:'<anonymous>';

            var bfline=[];
            bfline.push(this._html_keyeq());
            bfline.push('<span class="agh-debug-tree-mark">[class ');
            bfline.push('<span class="agh-debug-tree-mark-class">',agh.Text.Escape(className,'html'),'</span>');
            bfline.push(']</span>');
            htline=bfline.join('');
          }

          var s=this._getFunctionSource().replace(/\/\*.+\*\/|\/\/[^\r\n]+(?=$|[\r\n])/g,"");
          var m;
          if((m=/^function\s*([^\s()]*)\s*\(([^()]*)\)\s*(\{\s*\[native\s+code\]\s*\})?/.exec(s))){
            var h=' function'+(m[1]!=null&&m[1]!=""?' '+m[1]:"")+'('+m[2]+')';
            if(m[3]!=null&&m[3]!=""){
              this.isNative=true;
              // htline=this._html_keyeq()+this._htmlObjectInstance('Function','native');
              h=' native'+h;
            }

            htline+=agh.Text.Color(h,'js');
            // if(m[3]!=null&&m[3]!="")
            //   htline+=' { '+this._htmlObjectMark('native code')+' }';
          }
        }
      }catch(ex){
        // toString を上書きされた時に変な結果を返さない様に Number.prototype.toString などを用いる。
        // 但し、Object.create, agh.wrap 等で wrap されたオブジェクトに対して、その型専用の関数を使うと例外を発生する。
      }


      this.eline.innerHTML=htline;
        
      this.initializeContent=this._initializeContent_object;
    },
    _appendMemberNodes:function _static(elem,obj){
      var keys=getOwnPropertyNames(obj);
      if(keys.length>2048){
        var result=confirm("指定したプロパティは "+keys.length+" 個の子ノードを持ちます。\n"
                           +"展開するとブラウザの応答が遅くなる可能性があります。\n"
                           +"展開しますか?");
        if(!result)return false;
      }

      for(var i=0;i<keys.length;i++){
        try{
          var child=obj[keys[i]];
        }catch(ex){
          var child=new ObjectTreeErrorInfo("プロパティの取得に失敗しました",ex);
        }
        var node=new agh.debug.ObjectTreeNode(keys[i],child);
        elem.appendChild(node.element());
      }

      var __proto__=getPrototypeOf(obj);
      if(__proto__)
        elem.appendChild(new agh.debug.ObjectTreeNode('__proto__',__proto__).element());
      return true;
    },
    _appendFunctionSource:function(source){
      var html=agh.Text.Color(source||this._getFunctionSource(),"js");
      html=agh.Text.Color(html,".iline","/html");
      var pre=this._document.createElement('pre');
      if(agh.browser.vIE<9){
        // IE8 bug (http://qiita.com/kbyay_/items/5c5fafa36d0e6aaca87a)
        pre.className='agh-debug-tree-source-ie8 agh-prog-js';
        var div=this._document.createElement("div");
        div.innerHTML=html;
        pre.appendChild(div);
      }else{
        pre.className='agh-debug-tree-source agh-prog-js';
        pre.innerHTML=html;
      }
      this.ehold.appendChild(pre);
    },
    _initializeContent_object:function(){
      if(typeof this.obj==="function"&&!this.isNative)
        this._appendFunctionSource();

      if(this.obj instanceof Error)
        this.obj=modifyErrorObject(this.obj);

      if(!this._appendMemberNodes(this.ehold,this.obj))
        this.contentInitialized=false;
    },
    //---------------------------------
    // object
    _initializeNode_string:function(){
      try{
        var s=String.prototype.toString.call(this.obj);
      }catch(ex){
        this._initializeNode_object();
        return;
      }

      var desc;
      if((desc=StringPropertyType[this.key])){
        this.eline.innerHTML=this._html_keyeq()+desc.htmlTitle(s);
        this.initializeContent=this._initializeContent_string;
        return;
      }

      var THRESH=240;
      if(s.length>THRESH){
        this.eline.innerHTML=this._html_keyeq()+'<span class="agh-debug-tree-string">"'+agh.Text.Escape(agh.Text.Escape(s.slice(0,THRESH),'backslash'),'html')+'..."</span>';
        this.initializeContent=this._initializeContent_string;
        return;
      }

      this.eline.innerHTML=this._html_keyeq()+'<span class="agh-debug-tree-string">"'+agh.Text.Escape(agh.Text.Escape(s,'backslash'),'html')+'"</span>';
    },
    _initializeContent_string:function(){
      if(this.value)
        var s=this.value;
      else{
        try{
          var s=this.value=String.prototype.toString.call(this.obj);
        }catch(ex){
          this.ehold.appendChild(this._document.createTextNode("[error on converting to string]"));
          return;
        }
      }

      if(s.length>10000){
        var result=confirm("指定した文字列は "+s.length+" 文字あります。\n"
                           +"展開するとブラウザの応答が遅くなる可能性があります。\n"
                           +"展開しますか?");
        if(!result){
          this.contentInitialized=false;
          return;
        }
      }

      var pre=this._document.createElement('pre');
      var desc=StringPropertyType[this.key]||StringPropertyType['default'];
      pre.className='agh-debug-tree-source '+desc.className;
      if(desc.colorType)
        pre.innerHTML=agh.Text.Color(s,desc.colorType);
      else
        pre.innerHTML=agh.Text.Escape(s,'html');
      this.ehold.appendChild(pre);
    }
  });

  function old_codes(){
    Debug.Tree.prototype._createStringNode=function(key,str){
			elem.lastChild.ondblclick=function(){
				var elem=prompt("変更後の値を入力して下さい",obj0[key0]);
				if(elem!=null){
					elem=elem.toString();
					try{obj0[key0]=elem;this.innerHTML='"'+String.Escape.HTML(elem)+'"';}
					catch(e){alert("書き込み出来ませんでした");}
				}
			}
	    return elem;
    }

    Debug.Tree.prototype.Some2Node=function(key,obj,parent){
	    if(typeof(obj)=="object"){
		    if(obj==null){
			    return new Array(this._createEndNode(this._html_keyeq()+this.tObj+"null".fontcolor("blue")));
		      //}else if(obj instanceof Array){
		    }else if(!(obj instanceof Object)){
			    //Detect HTMLElement
			    try{
				    if(obj.nodeType!=null&&obj.tagName!=null&&typeof(obj.tagName)=="string"){
					    return this.Element2Node(key,obj);
				    }
			    }catch(e){}
		    }
		    return this.Object2Node(key,obj);
	    }else return new Array(this._createEndNode(this._html_keyeq()+"type:"+typeof(obj)));
    };

    Debug.Tree.prototype.Element2Node=function(key,elem){
	    var desc="";
	    switch(elem.nodeName){
		  case "#comment":
			  if(elem.text!=null&&elem.text.substr(0,5)=="<?xml"){
				  desc="&lt;?".fontcolor("blue")+"xml ".fontcolor("brown")+"?&gt;".fontcolor("blue");
			  }else{
				  desc="&lt;!-- --&gt;".fontcolor("green");
			  }
			  break;
		  case "#data":
		  case "#text"://今の状態では #text ノードはここには来ない
			  //TODO:
		  default:
			  desc=this.lt+elem.tagName.fontcolor("brown");
			  if(elem.id!=null&&elem.id!="")desc+=' id'.fontcolor("red")+('="'+elem.id+'"').fontcolor("blue");
			  desc+=this.gt;
			  break;
	    }
	    return new Array(x,x.holder);
    };
    Debug.Tree.prototype.Function2Node=function(key,func){
	    var r=this.Function2NodeBase(key,func);
	    r[0].makeContent();
	    r[0].makeMember();
	    r[0].onclick=function(){this.swch();};
	    return r;
    };
    Debug.Tree.prototype.Function2NodeBase=function(key,func){
	    var text=key+"()"+HTML_EQ+"[function]".fontcolor("gray");
	    var x=this.newNode(key+"()"+HTML_EQ+"[function]".fontcolor("gray"));
	    var this0=this;
	    var this_tree=this;
	    x.makeMember=function(){
		    try{
			    this_tree.Object2Node("prototype",func.prototype).$each(this.holder.appendChild);
		    }catch(e){}
		    
		    if(func.caller instanceof Function)
			    this_tree.Function2Node("caller",func.caller).$each(holderAppender);
		    if(func.arguments!=null){
			    try{
				    var a=this_tree.Arguments2Node("arguments",func.arguments,func.getArgumentList());
				    a.$each(holderAppender);
			    }catch(e){alert("err");}
		    }
		    for(var key2 in func){
			    if(Function.IsInstance(func[key2])){
				    this_tree.Function2NodeBase(key2,func[key2]).$each(holderAppender);
			    }else{
				    this_tree.Some2Node(key2,func[key2],func).$each(holderAppender);
			    }
		    }
	    };
    };
    Debug.Tree.prototype.Arguments2Node=function(key,args,arglist){
	    var r=this.Object2Node(key,args);
	    var i=0;
	    while(typeof(args[i])!="undefined"&&args[i]!=null){
		    var f_key=(Function.IsInstance(args[i]))?"Function2NodeBase":"Some2Node";
		    try{
			    var key1=i<arglist.length?arglist[i]:i.toString();
			    this[f_key](key1,args[i]).$each(r[1].appendChild);
		    }catch(e){}
		    i++;
	    }
	    while(i<arglist.length){
		    this.Some2Node(arglist[i],null).$each(r[i].appendChild);
		    i++;
	    }
	    if(i>0)r[0].opened=true;
	    return r;
    };
  }

  agh.debug.createObjectTree=function createObjectTree(name,obj){
    return new agh.debug.ObjectTreeNode(name,obj).element();
  };

//-----------------------------------------------------------------------------
// HTMLTreeNode

  var DomTreeInfo=agh.Class('DomTreeInfo',ObjectTreeInfo,{
    constructor:function(elem){
      this.base();
      this.elem=elem;
    },
    initializeNode:function override(tnode){
      var _this=this;

      var htTitle=null;
      switch(this.elem.nodeType){
      case 1:
        var h=agh.Text.Escape['html-attr'];
        var buff=[];
        buff.push('<',this.elem.tagName);

        // 基本的な属性を先に。
        if(this.elem.id)buff.push(' id="',h(this.elem.id),'"');
        if(this.elem.name)buff.push(' name="',h(this.elem.name),'"');
        if(this.elem.className)buff.push(' class="',h(this.elem.className),'"');
        if(this.elem.style.cssText)buff.push(' style="',h(this.elem.style.cssText),'"');

        // その他の属性を後に。
        var attrs=this.elem.attributes;
        for(var i=0;i<attrs.length;i++){
          var a=attrs[i];
          if('specified' in a&&!a.specified)continue;
          var name=a.nodeName.toLowerCase();
          if(name=="id"||name=="name"||name=="class"||name=="style")continue;
          buff.push(' ',attrs[i].nodeName,'="',h(attrs[i].nodeValue),'"');
        }

        if(this.elem.childNodes.length)
          buff.push('>');
        else
          buff.push(' />');
        htTitle=agh.Text.Color(buff.join(""),"html");
        break;
      case 3:
        var value=this.elem.nodeValue.replace(/\s+/g," ");
        if(value.length>=100)value=value.slice(0,100)+"...";
        htTitle='<span class="agh-debug-tree-keyword">#text</span> '+agh.Text.Escape(value,"html");
        break;
      case 4:
        htTitle='<span class="agh-debug-tree-keyword">&lt;![CDATA[ ... ]]&gt;</span>';
        break;
      case 7:
        htTitle='<span class="agh-debug-tree-keyword">&lt;?instruction?&gt;</span>';
        break;
      case 8:
        var value=this.elem.nodeValue.replace(/\s+/g," ");
        if(value.length>=100)value=value.slice(0,100)+"...";
        htTitle=agh.Text.Color('<!-- '+value.replace(/\\?-/g,"\\-")+' -->','html');
        break;
      case 9:
        htTitle='<span class="agh-debug-tree-keyword">#document</span>';
        break;
      case 10:
        htTitle='<span class="agh-debug-tree-keyword">&lt;!DOCTYPE&gt;</span>';
        break;
      default:
        htTitle='<span class="agh-debug-tree-keyword">#unknown</span>';
        break;
      }
      tnode.eline.innerHTML=tnode._html_keyeq()+htTitle;

      // switch(obj.nodeType){
      // case 1:return 'HTMLElement';
      // case 2:return 'Attr';
      // case 3:return 'Text';
      // case 4:return 'CDATASection';
      // case 5:return 'Entity';
      // case 6:return 'EntityReference';
      // case 7:return 'ProcessingInstruction';
      // case 8:return 'Comment';
      // case 9:return 'HTMLDocument';
      // case 10:return 'DocumentType';
      // case 11:return 'DocumentFragment';
      // case 12:return 'Notation';
      // default:return 'Node';
      // }

      if(this.elem.childNodes&&this.elem.childNodes.length){
        tnode.initializeContent=function(){
          var nodes=_this.elem.childNodes;
          for(var i=0;i<nodes.length;i++){
            var node=new agh.debug.ObjectTreeNode(null,new DomTreeInfo(nodes[i]));
            tnode.ehold.appendChild(node.element());
          }
        };
      }
    }
  });

  agh.debug.createDomTree=function(elem){
    return new agh.debug.ObjectTreeNode(null,new DomTreeInfo(elem)).element();
  };

//-----------------------------------------------------------------------------
// Console

  function function_name(f){
    // fullName は agh.Class のメソッドで使われる
    if(f==null)return "&lt;global&gt;"
    var r=f.fullName||f.get_name();
    return agh.Text.Escape(r&&r!=""?r:"<anonymous>",'html');
  }

  function Console(target){
    this.target=target;
    this._document=target.ownerDocument;
  }
  agh.memcpy(Console.prototype,{
    _puthead:function(title){
      var div=this._document.createElement("div");
      div.className='agh-debug-console-head';
      div.innerHTML=title+' - <span class="agh-debug-console-date">'+new Date().toString()+"</span>";
      this.target.appendChild(div);
      return div;
    },
    _puttext:function(text){
      var div=this._document.createElement("div");
      div.className='agh-debug-console-body';
      agh.dom.setInnerText(div,text);
      this.target.appendChild(div);
      return div;
    },
    _puthtml:function(html){
      var div=this._document.createElement("div");
      div.className='agh-debug-console-body';
      div.innerHTML=html;
      this.target.appendChild(div);
      return div;
    },
    _putbar:function(){
      var hr=this._document.createElement("hr");
      hr.className='agh-debug-console';
      this.target.appendChild(hr);
      return hr;
    },
    log:function(text,_caller){
      var title='log() from <span class="agh-debug-console-caller">'+function_name(_caller||arguments.callee.caller)+'</span>';
      this._puthead(title);
      this._puttext(text);
      this._putbar();
    },
    inspect:function(){
      if(arguments.length<=1){
        var name="(inspect)";
        var obj=arguments[0];
      }else{
        var name=arguments[0];
        var obj=arguments[1];
      }

      var title='inspect() from <span class="agh-debug-console-caller">'+function_name(arguments.callee.caller)+'</span>';
      this._puthead(title);
      try{
        var e=agh.debug.createObjectTree(name,obj);
      }catch(ex){log(ex.stack);}
      this._puthtml("").appendChild(agh.debug.createObjectTree(name,obj));
      this._putbar();
    },
    print:function printh(text){
      var elem=this._puttext(text);
      elem.style.marginLeft="1em";
    },
    printh:function printh(html){
      var elem=this._puthtml(html);
      elem.style.marginLeft="1em";
    },
    printm:function(texmath){
      var _this=this;
      agh.scripts.wait(["agh.lang.tex.js"],function(){
        var doc=new agh.LaTeX.Document(texmath,["global","mode.math"]);
        _this.printh("<tex:math>"+doc.Parse()+"</tex:math>");
      });
    },
    reportError:function(sender,error){
      this.inspect('Error',{
        sender:sender,
        error:error,
        stacktrace:new ObjectTreeStackInfo(agh.debug.captureStackTrace())
      });
      return error;
    },
    stacktrace:function(){
      this.inspect('stacktrace',new ObjectTreeStackInfo(agh.debug.captureStackTrace(1)));
      return error;
    }
  });
  agh.debug.Console=Console;

//-----------------------------------------------------------------------------
// StackTrace

  agh.debug.captureStackTrace=(function(){
    //-------------------------------------------------------------------------
    // new Error().stack を用いる方法
    // - ブラウザ毎に書式が異なるので切り替える。
    // - Cr Fx では new Error() した時点で ex.stack が設定される。
    // - IE10 では throw した後に ex.stack が設定される。
    // - Op では ex.stacktrace らしい

    var NativeError=window.Error; // 後で Error を自前の物に置換するかも知れない。
    // window.Error=function(message,file,line){
    //   window.lastStackTrace=agh.debug.captureStackTrace(1);
    //   return new NativeError(message,file,line);
    // };
    function getErrorStack(){
      try{
        throw new NativeError("");
      }catch(ex){
        return ex.stack||ex.stacktrace;
      }
    }

    if(agh.browser.vFx||agh.browser.vOp)
      var fillStackByErrorStack=function fillStackByErrorStackFx(data){
        var s=getErrorStack();
        if(s==null)return;

        // index = -1  <-> function getErrorStack
        // index =  0  <-> function fillStackByErrorStackFx
        // index =  1  <-> function captureStackTrace
        var index=-1;
        s.replace(/^\s*([^()\n]*)(\([^\n]*\))?@([^@\n]*?)(?:\:(\d+)(?:\:(\d+))?)?$/mg,function($0,fname,args,file,line,column){
          if(index>=0){
            if(!data[index])data[index]={};
            data[index].calleeName=fname;
            data[index].file=file;
            data[index].line=0|line;
            if(column!=null&&column!="")
              data[index].column=0|column;
          }
          index++;
        });
      }
    else if(agh.browser.vCr||agh.browser.vIE>=10)
      var fillStackByErrorStack=function fillStackByErrorStackCr(data){
        var s=getErrorStack();
        log("stack trace = "+s);
        if(s==null)return;
        var index=-1;
        s.replace(/^\s*at\s+(?:([^()\n]+?)\:(\d+)(?:\:(\d+))?|([^\n]+?)(?:\s+\(([^()\n]+?)\:(\d+)(?:\:(\d+))?\))?)\s*$/mg,function($0,file1,line1,col1,fname2,file2,line2,col2){
          if(index>=0){
            if(!data[index])data[index]={};

            if(fname2&&fname2!=""){
              data[index].calleeName=fname2;
              data[index].file=file2;
              data[index].line=0|line2;
              if(col2!=null&&col2!="")
                data[index].column=0|col2;
            }else{
              data[index].file=file1;
              data[index].line=0|line1;
              if(col1!=null&&col1!="")
                data[index].column=0|col1;
            }
          }
          index++;
        });
      }
    else
      fillStackByErrorStack=null;

    function fillStackByArgumentsChain(data){
      var fun=arguments.callee;
      var index=0;
      for(var index=0;fun;index++){
        if(!data[index])data[index]={};

        for(var i=0;i<index;i++)
          if(data[i].callee===fun)return; // 再帰呼び出しの場合、無限ループになるのを防ぐ

        data[index].callee=fun;
        data[index].arguments=agh(fun.arguments,Array);

        fun=fun.caller;
      }
    }

    function captureStackTrace_default(level){
      if(level==null)level=0;

      var data=[];
      fillStackByArgumentsChain(data);
      if(fillStackByErrorStack)
        fillStackByErrorStack(data);

      return data.slice(2+level);
    }

    //-------------------------------------------------------------------------
    // V8 (JavaScript Engine) の場合、スタックトレース専用の情報が取得できる
    if(Error.captureStackTrace){
      function captureStackTrace_V8API(level){
        if(level==null)level=0;
        var data=[];
        var originalPrepareStackTrace=Error.prepareStackTrace;
        try{
          // http://qiita.com/halhide/items/caf81a7166d92dcfdcd1
          Error.prepareStackTrace=function(err,stack){
            // https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
            for(var i=0;i<stack.length;i++){
              var frame=stack[i];
              var callee=frame.getFunction();
              data.push({
                _this:frame.getThis(),
                typeName:frame.getTypeName(),
                methodName:frame.getMethodName(),
                callee:callee,
                arguments:agh(callee.arguments,Array),
                calleeName:frame.getFunctionName(),
                file:frame.getFileName(),
                line:frame.getLineNumber(),
                column:frame.getColumnNumber(),
                isTopLevel:frame.isToplevel(),
                isNative:frame.isNative(),
                isConstructor:frame.isConstructor(),
                isEval:frame.isEval(),
                evalOrigin:frame.getEvalOrigin()
              });
            }
            return data;
          };
          Error.captureStackTrace({},arguments.callee);
          ret=data.slice(level);
        }catch(ex){}
        
        Error.prepareStackTrace=originalPrepareStackTrace;

        return ret||captureStackTrace_default(level+1);
      }

      return captureStackTrace_V8API;
    }

    //-------------------------------------------------------------------------

    return captureStackTrace_default;
  })();

//=============================================================================
});
//-----------------------------------------------------------------------------
