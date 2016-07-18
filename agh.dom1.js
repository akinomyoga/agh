//*****************************************************************************
//
//		MWG 2.0 - DOM						K. Murase
//
//*****************************************************************************
/// <reference path="agh.js"/>
agh.scripts.register("agh.dom1.js",["agh.js","event:onload"],function(){
//=============================================================================
/** API List
 *
 * @section complements
 * @var HTMLElement.prototype.innerText
 * @fn  CSSStyleSheet.prototype.addRule
 * @var CSSStyleSheet.prototype.rules
 * @fn  HTMLElement.prototype.attachEvent
 * @fn  window.attachEvent
 * @fn  document.attachEvent
 * @var HTMLElement.prototype.all
 * @var document.all
 * @fn  Node.prototype.insertAfter
 * @fn  HTMLElement.prototype.insertAdjacentElement
 * @fn  HTMLElement.prototype.insertAdjacentHTML
 * @fn  HTMLElement.prototype.insertAdjacentText
 * @var HTMLElement.prototype.currentStyle
 * @fn  HTMLElement.prototype.getBoundingClientRect
 *
 * @namespace agh.document
 * @var agh.document.head
 * @var agh.document.body
 * @var agh.document.html
 * @var agh.document.doctype
 * @fn  agh.document.createElement
 * @fn  agh.document.getElementsByClassName
 * @fn  agh.document.getElementsByTagName // 不完全
 *
 * @namespace ns.StyleSheet
 * @fn ns.StyleSheet.addRule
 * @fn ns.StyleSheet.getStyleValue
 *
 * 他 ElementExtension
 *    agh(obj,'E')
 *    CSSプロパティ拡張
 *
 * @fn ElementExtension.prototype.removeFromParent
 * @fn ElementExtension.prototype.isDescendant
 *
 * // class
 * @fn ElementExtension.prototype.addClass
 * @fn ElementExtension.prototype.removeClass
 * @fn ElementExtension.prototype.hasClass
 * @fn ElementExtension.prototype.switchClass
 *
 * // 座標取得
 * @fn ElementExtension.prototype.getBorderRectC
 * @fn ElementExtension.prototype.getBorderRectP
 * @fn ElementExtension.prototype.getClientRectB
 * @fn ElementExtension.prototype.getViewRectB
 * @fn ElementExtension.prototype.getMarginRectB
 * @fn ElementExtension.prototype.getPaddingRectV
 * @fn ElementExtension.prototype.getContentRectV
 *
 * // styles
 * @fn ElementExtension.prototype.getStyle
 * @fn ElementExtension.prototype.getComputedStyle
 * @fn ElementExtension.prototype.setStyle
 * StyleAttrData
 *   -agh-offset-width
 *   -agh-offset-height
 *   userSelect
 *   opacity
 *
 * // events
 * @fn ElementExtension.prototype.__add
 * @fn ElementExtension.prototype.__remove
 * @fn ElementExtension.prototype.__fire
 * @fn ElementExtension.prototype.captureMouse
 * @fn ElementExtension.prototype.releaseMouse
 * AghEvent
 *   -agh-capturestart
 *   -agh-captureend
 *   -agh-mousemove
 *   -agh-mouseup
 *   -agh-mousedown
 *   -agh-click
 *   -agh-mouseenter
 *   -agh-mouseleve
 *
 * @fn agh.document.parseLength
 *
 */
//	2.0 からの変更点
//		mwg.dynamic_cast["x"] -> agh()
//		mwg.$E(str)  -> agh(hoge,'E')
//		mwg.$E(elem) -> agh(hoge)
//-----------------------------------------------------------------------------
var agh=this;
agh.Namespace("document",agh);
var ns=agh.document;
//-------------------------------------------------------------------
var _extended=agh.document.extended={};
function complement(name,obj){
  /// <summary>
  /// 指定したプロパティが存在していない場合に、其れを指定したオブジェクトで補います。
  /// </summary>
  /// <example>
  /// comlement("Node.prototype.insertAfter",function(){...});
  /// </example>
  var isProp;
  if((isProp=name.startsWith("P:"))){
    name=name.slice(2);
  }
  var names=name.split(".");

  // プロパティの持ち主
  var tgt=window;
  var iM=names.length-1;
  for(var i=0;i<iM;i++){
    if(!(names[i] in tgt))return;
    tgt=tgt[names[i]];
  }

  // 補償
  var prop=names[iM];
  if(prop in tgt)return;
  if(isProp){
    if('get' in obj){
      tgt.__defineGetter__(prop,obj['get']);
      _extended[name+":set"]=true;
    }
    if('set' in obj){
      tgt.__defineSetter__(prop,obj['set']);
      _extended[name+":get"]=true;
    }
    _extended[name]=true;
  }else{
    tgt[prop]=obj;
    _extended[name]=true;
  }
}
//--------------------------------------------------------------------
if(agh.browser.vFx){
  var htesc={
    "&":"&amp;","<":"&lt;",">":"&gt;",
    " ":"&nbsp;",
    "\r":"<br/>","\n":"<br/>","\r\n":"<br/>"
  };
  complement('P:HTMLElement.prototype.innerText',{
    get:function(){
      return this.textContent;
    },
    set:function(value){
      if(value===null)value="null";
      else if(value===undefined)value="undefined";
      else value=value.toString();

      // 直接 textContent に代入すると、空白や改行が潰れてしまう。
      this.innerHTML=agh.Text.Escape(value,"html");
    }
  });
  complement('CSSStyleSheet.prototype.addRule',function(selector,rule){
    this.insertRule(selector+'{'+rule+'}',this.cssRules.length);
  });
  complement('P:CSSStyleSheet.prototype.rules',{get:function(){return this.cssRules;}});
}
//--------------------------------------------------------------------
//		attachEvent
//--------------------------------------------------------------------
var AttachEvent=function(eventName,proc){
  if(eventName.startsWith("on"))eventName=eventName.substr(2);
  this.addEventListener(eventName,proc,false);
};
complement('HTMLElement.prototype.attachEvent',AttachEvent);
complement('window.attachEvent',AttachEvent);
complement('document.attachEvent',AttachEvent);
complement('P:HTMLElement.prototype.all',{get:function(){return this.getElementsByTagName("*");}});
if(agh.browser.vFx)document.all=0; // to suppress warning
complement('P:document.all',{get:function(){return this.getElementsByTagName("*");}});
complement("Node.prototype.insertAfter",function(node,ref){
  var next=ref.nextSibling;
  if(next)return this.insertBefore(node,next);
  this.appendChild(node);
  return node;
});
complement("HTMLElement.prototype.insertAdjacentElement",function(where,elem){
  switch(where.toLowerCase()){
    case "beforebegin":
      return this.parentNode.insertBefore(elem,this);
    case "afterbegin":
      return this.insertBefore(elem,this.firstChild);
    case "beforeend":
      return this.appendChild(elem);
    case "afterend":
      return this.parentNode.insertAfter(elem,this);
    default:
      return null;
  }
});
complement("HTMLElement.prototype.insertAdjacentHTML",function(where,ht){
  var r=this.ownerDocument.createRange();
  r.setStartBefore(this);
  var frag=r.createContextualFragment(ht);
  this.insertAdjacentElement(where,frag)
});
complement("HTMLElement.prototype.insertAdjacentText",function(where,text){
  var node=this.owberDocument.createTextNode(text||"");
  this.insertAdjacentElement(where,node);
});
complement("P:HTMLElement.prototype.currentStyle",{
  get:function(){
    return document.defaultView?document.defaultView.getComputedStyle(this,''):this.style;
  }
});
complement("HTMLElement.prototype.getBoundingClientRect",function(){
  // if(vFx<3||isWk)
  var e=this;
  var body=e.ownerDocument.body;
  var html=e.ownerDocument.documentElement;

  var x=e.offsetLeft;
  var y=e.offsetTop;
  while(e!=body&&e.offsetParent!=null){
    e=e.offsetParent;
    x+=e.offsetLeft+e.clientLeft;
    y+=e.offsetTop+e.clientTop;
  }

  // 途中のスクロールの引き算
  e=this;
  while(true){
    if(e.style.position=="absolute"){
      e=e.offsetParent;
    }else{
      e=e.parentNode;
    }
    if(e==body||e==null||e.tagName==null)break;
    x-=e.scrollLeft;
    y-=e.scrollTop;
  }

  // 全体のスクロール
  x-=body.scrollLeft-html.clientLeft;
  y-=body.scrollTop-html.clientTop

  var w=this.offsetWidth;
  var h=this.offsetHeight;
  return {
    left:x,
    top:y,
    width:w,
    height:h,
    right:x+w,
    bottom:y+h
  };
});
//*****************************************************************************
//
//		agh.document
//
//*****************************************************************************
//		getElements その他
//-----------------------------------------------------------------------------
agh.memcpy(agh.document,{
  head:document.getElementsByTagName("head")[0],
  body:document.body,
  html:document.documentElement,
  doctype:document.doctype,
  createElement:function(tagName,props,styles){
    var r=document.createElement(tagName);
    if(props)agh.memcpy(r,props);
    if(styles)agh(r,'E')._.setStyle(styles);
    return r;
  }
});
// agh.document.getElementsByClassName
if(document.getElementsByClassName){
  agh.document.getElementsByClassName=function(_class){
    return document.getElementsByClassName(_class);
  };
}else{
  agh.document.getElementsByClassName=function(_class){
    return agh.Array.filter(document.all,function(elem){
      return elem.className&&agh.Array.contains(elem.className.split(' '),_class);
    });
  };
}
// agh.document.getElementsByTagName
if(agh.browser.vIE){
  /* ■ TODO: cssselector.js に在る物を移植
  // pref2urn, urn2pref 初期化
  var pref2urn={};
  var urn2pref={};
  var reg=function(pref,urn){
    pref2urn[pref]=urn;
    urn2pref[urn]=pref;
  };
  reg("",document.documentElement.tagUrn);
  agh.Array.each(document.namespaces,function(ns){reg(ns.name,ns.urn);});

  agh.document.getElementsByTagName=function(tagName){
    var urn;
    var i=tagName.indexOf(':');
    if(i<0){
      urn=document.documentElement.tagUrn;
    }else{
      urn=pref2urn[tagName.substr(0,i)];
      tagName=tagName.substr(i+1);
    }
    return agh.Array.filter(document.getElementsByTagName(tagName),function(elem){
      return elem.tagUrn==urn;
    });
  };
  //*/
}else{
  agh.document.getElementsByTagName=function(tagName){
    return agh(document.getElementsByTagName(tagName),Array);
  };
}
//-----------------------------------------------------------------------------
//		agh.document.StyleSheet
//-----------------------------------------------------------------------------
// CHECK: head の初期化が終わっていない時点で追加しても大丈夫か?
var style=document.createElement("style");
//style.appendChild(document.createTextNode('')); //?
style.type="text/css";
style.id="[agh.dom1.js:stylesheet]";
if(agh.document.head)
  agh.document.head.appendChild(style);

agh.Namespace('StyleSheet',ns);
ns.StyleSheet.addRule=function(selector,property){
  if(agh.browser.vIE){
    style.styleSheet.addRule(selector,property);
  }else{
    style.sheet.addRule(selector,property);
  }
};
ns.StyleSheet.getStyleValue=function(selector,property){
  // TODO: selector 文字列の正規化
  property=agh.Text.Escape(property,"camel");
  for(var j=document.styleSheets.length-1;j>=0;j--){
    var rules=document.styleSheets[j].rules;
    for(var i=rules.length-1;i>=0;i--){
      var rule=rules[i];
      if(rule.selectorText.toLowerCase()==selector.toLowerCase())
        return rule.style[property];
    }
  }
  return '';
};
//*/
//*****************************************************************************
//
//		HTMLElement 拡張
//
//*****************************************************************************
(function(){
  var CreateRect=function(l,t,w,h){
    return {
      x:l,y:t,
      left:l,top:t,
      width:w,height:h,
      right:l+w,top:t+h
    };
  };
  var ElementExtension=function(elem){
    this.elem=elem;
  };
  ns.ElementExtension=ElementExtension;
  agh.memcpy(ElementExtension.prototype,{
    addClass:function(className){
      var classes=agh.Array.union(
        this.elem.className.split(' '),
        className.split(' ')
      );
      this.elem.className=classes.join(' ');
    },
    removeClass:function(className){
      var classes=this.elem.className.split(' ');
      var removee=className.split(' ');
      classes=agh.Array.filter(classes,function(cls){
        return !agh.Array.contains(removee,cls);
      });
      this.elem.className=classes.join(' ');
    },
    hasClass:function(className){
      var clss_elm=this.elem.className.split(' ');
      var clss_arg=className.split(' ');
      return agh.Array.intersection(clss_elm,clss_arg).length==clss_arg.length;
    },
    switchClass:function(base,name){
      var classes=this.elem.className.split(' ');
      base+="-";
      classes=agh.Array.filter(classes,function(cls){return !cls.startsWith(base);});
      classes.push(base+name);
      this.elem.className=classes.join(' ');
    },
    //=========================================================================
    //	DOM
    //=========================================================================
    removeFromParent:function(){
      if(this.elem.parentNode)
        this.elem.parentNode.removeChild(this.elem);
    },
    isDescendant:function(cand){
      if(cand==null)return false;
      while(cand.parentNode){
        cand=cand.parentNode;
        if(cand==this.elem)return true;
      }
      return false;
    },
    //=========================================================================
    //	幾何
    //=========================================================================
    getBorderRectC:function(){
      /// <summary>
      /// border 外辺の client 座標を取得します。
      /// </summary>
      var r=this.elem.getBoundingClientRect();
      return CreateRect(r.left,r.top,r.right-r.left,r.bottom-r.top);
    },
    getBorderRectP:function(){
      /// <summary>
      /// border 外辺の page 座標を取得します。
      /// </summary>
      var doc=this.elem.ownerDocument;
      var html=doc.documentElement;
      var dx,dy;
      if(agh.browser.vIE&&!agh.browser.isQks){
        dx=html.scrollLeft-html.clientLeft;
        dy=html.scrollTop-html.clientTop;
      }else{
        dx=doc.body.scrollLeft-html.clientLeft;
        dy=doc.body.scrollTop-html.clientTop;
      }

      var r=this.elem.getBoundingClientRect();
      return CreateRect(r.left+dx,r.top+dy,r.right-r.left,r.bottom-r.top);
    },
    getClientRectB:function(){
      /// <summary>
      /// border 内辺の box 座標を取得します。
      /// </summary>
      var bl=ns.parseLength(this.getComputedStyle("border-left-width"));
      var bt=ns.parseLength(this.getComputedStyle("border-top-width"));
      var br=ns.parseLength(this.getComputedStyle("border-right-width"));
      var bb=ns.parseLength(this.getComputedStyle("border-bottom-width"));
      var l=bl;
      var t=bt;
      var w=this.elem.offsetWidth-br-bl;
      var h=this.elem.offsetHeight-bt-bb;
      return CreateRect(l,t,w,h);
    },
    getViewRectB:function(){
      /// <summary>
      /// スクロールバーを除いた border 内辺の座標を取得します。
      /// </summary>
      var l=this.elem.clientLeft;
      var t=this.elem.clientTop;
      var w=this.elem.clientWidth;
      var h=this.elem.clientHeight;
      if(l==0&&t==0&&w==0&&h==0)
        return this.getClientRectB();

      return CreateRect(l,t,w,h);
    },
    getMarginRectB:function(){
      var mt=ns.parseLength(this.getComputedStyle("margin-top"));
      var ml=ns.parseLength(this.getComputedStyle("margin-left"));
      var mr=ns.parseLength(this.getComputedStyle("margin-right"));
      var mb=ns.parseLength(this.getComputedStyle("margin-bottom"));
      return CreateRect(
        -ml,-mt,
        this.elem.offsetWidth+ml+mr,
        this.elem.offsetHeight+mt+mb
        );
    },
    getPaddingRectV:function(){
      var sl=this.elem.scrollLeft;
      var st=this.elem.scrollTop;
      var sw=this.elem.scrollWidth;
      var sh=this.elem.scrollHeight;

      // scrollW/H 修正必要性
      var scroll_ok=false;
      if(agh.browser.vIE){
        var w;{
          var txt_w=this.getComputedStyle("width");
          var txt_h=this.getComputedStyle("height");
          w=!!txt_w.match(/^[\d.]/)||!!txt_h.match(/^[\d.]/);
        }

        if(agh.browser.isQks){
          scroll_ok=w;
        }else{
          var pos=this.getComputedStyle("position");
          var ovf=this.getComputedStyle("overflow");
          scroll_ok=w&&(pos==null||pos==""||ovf!="visible");
        }
      }else{
        // overflow 指定
        function ok2(t){return t=="auto"||t=="scroll"||t=="hidden";}
        var txt_ovf1=this.getComputedStyle("overflow").toLowerCase();
        var txt_ovf2=this.getComputedStyle("overflow-x").toLowerCase();
        var txt_ovf3=this.getComputedStyle("overflow-y").toLowerCase();
        scroll_ok=ok2(txt_ovf1)||ok2(txt_ovf2)||ok2(txt_ovf3);

        // 負の scrollW/H 値
        if(sh<0||sw<0)scroll_ok=false;
      }

      // scrollW/H 修正
      if(!scroll_ok){
        var bl=ns.parseLength(this.getComputedStyle("border-left-width"));
        var bt=ns.parseLength(this.getComputedStyle("border-top-width"));
        var br=ns.parseLength(this.getComputedStyle("border-right-width"));
        var bb=ns.parseLength(this.getComputedStyle("border-bottom-width"));
        var biw=this.elem.offsetWidth-br-bl;
        var bih=this.elem.offsetHeight-bt-bb;
        sw=biw;
        sh=bih;
      }

      return CreateRect(sl,st,sw,sh);
    },
    getContentRectV:function(){
      var r=this.getPaddingRectV();
      var pt=ns.parseLength(this.getComputedStyle("padding-top"));
      var pl=ns.parseLength(this.getComputedStyle("padding-left"));
      var pr=ns.parseLength(this.getComputedStyle("padding-right"));
      var pb=ns.parseLength(this.getComputedStyle("padding-bottom"));
      return CreateRect(
        r.left+pl,
        r.top+pt,
        r.width-pr-pl,
        r.height-pt-pb);
    }
  });

  agh.registerAgehaExtension(function(){
    if(this.tagName){
      if(!this._)this._=new ElementExtension(this);
      return this;
    }
  });
  agh.registerAgehaCast('E',function(obj){
    var r=null;
    if(this.tagName){
      r=this;
    }else if(agh.is(this,String)){
      r=document.getElementById(this);
    }

    return r&&agh(r);
  });
})();
//==============================================================================
//		スタイルの拡張
//==============================================================================
(function(){
  var StyleAttrData={
    '-agh-offset-width':{
      g:function(elem){return elem.offsetWidth;},
      s:function(elem,value){
        value=ns.parseLength(value);
        if(!agh.browser.vIE||!agh.browser.isQks){
          value-=ns.parseLength(elem._.getComputedStyle('border-left-width'));
          value-=ns.parseLength(elem._.getComputedStyle('border-right-width'));
          value-=ns.parseLength(elem._.getComputedStyle('padding-left-width'));
          value-=ns.parseLength(elem._.getComputedStyle('padding-right-width'));
        }
        if(value<0)value=0;
        elem.style.width=value+'px';

        // TODO: overflow:visible だと正しく働かない事 (勝手に変更するか?)
      }
    },
    '-agh-offset-height':{
      g:function(elem){return elem.offsetHeight;},
      s:function(elem,value){
        value=ns.parseLength(value);
        if(!agh.browser.vIE||!agh.browser.isQks){
          value-=ns.parseLength(elem._.getComputedStyle('border-top-width'));
          value-=ns.parseLength(elem._.getComputedStyle('border-bottom-width'));
          value-=ns.parseLength(elem._.getComputedStyle('padding-top-width'));
          value-=ns.parseLength(elem._.getComputedStyle('padding-bottom-width'));
        }
        if(value<0)value=0;
        elem.style.height=value+'px';

        // TODO: overflow:visible だと正しく働かない事 (勝手に変更するか?)
      }
    }
  };
  ns.ElementExtension.StyleAttributeData=StyleAttrData;
  if(agh.browser.vIE){
    var return_false=function(){return false;};
    agh.memcpy(StyleAttrData,{
      userSelect:{
        g:function(elem){
          return elem.unselectable==""||elem.unselectable.toLowerCase()=="on"?"auto":"none";
        },
        s:function(elem,value){
          // TODO: 子孫要素にも適用するか?
          if(value=="none")value=false;
          if(value){
            elem.unselectable="on";
            elem.detachEvent("onselectstart",return_false);
          }else{
            elem.unselectable="off";
            elem.attachEvent("onselectstart",return_false);
          }
        }
      },
      opacity:{
        g:function(elem){
          return elem.filters["alpha"]?elem.filters["alpha"].opacity/100:1.0;
        },
        s:function(elem,value){
          value=parseFloat(value)*100;
          // DOM に登録されていないと filters は unknown?
          if(typeof elem.filters!='unknown'&&elem.filters["alpha"]){
            elem.filters["alpha"].opacity=value;
          }else{
            elem.style.filter+="alpha(opacity="+value.toString()+")";
          }
        }
      }
    });
  }else if(agh.browser.vFx){
    agh.memcpy(StyleAttrData,{
      userSelect:{
        g:function(elem){
          return elem.style.MozUserSelect;
        },
        s:function(elem,value){
          if(agh.is(value,Boolean))value=value?"auto":"none";
          elem.style.MozUserSelect=value;
        }
      }
    });
  }else if(agh.browser.isWk){
    agh.memcpy(StyleAttrData,{
      userSelect:{
        g:function(elem){
          return elem.style['-webkit-user-select'];
        },
        s:function(elem,value){
          if(agh.is(value,Boolean))value=value?"auto":"none";
          elem.style['-webkit-user-select']=value;
        }
      }
    });
  }
  agh.memcpy(ns.ElementExtension.prototype,{
    getStyle:function(prop){
      if(prop in StyleAttrData&&StyleAttrData[prop].g){
        return StyleAttrData[prop].g(this.elem);
      }

      prop=agh.Text.Escape(prop,"camel");
      //if(this.elem.style[prop])
        return this.elem.style[prop];
    },
    getComputedStyle:function(propertyName){
      if(window.getComputedStyle){
        return getComputedStyle(this.elem,null).getPropertyValue(propertyName);
      }else if(document.defaultView){
        return document.defaultView.getComputedStyle(this.elem,null).getPropertyValue(propertyName);
      }else if(this.elem.currentStyle){
        //TODO>:camelize は必要か?
        return this.elem.currentStyle[agh.Text.Escape(propertyName,"camel")];
      }

      return this.getStyle(propertyName);
    },
    setStyle:function(prop,value){
      if(agh.is(prop,String)){
        if(prop in StyleAttrData&&StyleAttrData[prop].s){
          StyleAttrData[prop].s(this.elem,value)
        }else{
          this.elem.style[agh.Text.Escape(prop,"camel")]=value;
        }
      }else{
        var self=this;
        agh.Array.each(agh.ownkeys(prop),function(key){
          self.setStyle(key,prop[key]);
        });
      }
    }
  });
})();
//=============================================================================
//		マウスの追跡
//=============================================================================
var modify_event=agh.browser.vIE?function(e){
  e.buttons={
    left:!!(e.button&1),
    mid:!!(e.button&4),
    right:!!(e.button&2)
  };
  if(e.srcElement!=null){
    // TODO: 実は body のスクロール量を足すだけで良い? pageX/pageY の仕様に依存
    //e.pageX=e.offsetX+agh(e.srcElement,'E')._.getPageX();
    //e.pageY=e.offsetY+agh(e.srcElement,'E')._.getPageY();
    var body=e.srcElement.ownerDocument.body;
    e.pageX=e.clientX+body.scrollLeft;
    e.pageY=e.clientY+body.scrollTop;
  }
}:function(e){
  e.buttons={
    left:e.button==0,
    mid:e.button==1,
    right:e.button==2
  };
};
(function(){
  var elem=null;
  function register(obj){
    clear(elem);
    elem=obj;
    elem._.__fire('-agh-capturestart',{});
  }
  function clear(obj){
    if(elem==null||obj!=elem)return;
    elem._.__fire('-agh-captureend',{});
    elem=null;
  }

  document.attachEvent("onmousemove",function(e){
    if(elem==null)return;
    elem._.__fire('-agh-mousemove',e);
  });
  document.attachEvent("onmouseup",function(e){
    if(elem==null)return;
    modify_event(e);
    elem._.__fire('-agh-mouseup',e);
  });
  document.attachEvent("onmousedown",function(e){
    if(elem==null)return;
    modify_event(e);
    elem._.__fire('-agh-mousedown',e);
  });
  if(agh.browser.vIE){
    agh.memcpy(ns.ElementExtension.prototype,{
      captureMouse:function(bubble){
        register(this.elem);
        if(bubble!=null)
          this.elem.setCapture(bubble);
      },
      releaseMouse:function(bubble){
        clear(this.elem);
        if(bubble!=null)
          this.elem.releaseCapture(bubble);
      }
    });
  }else{
    agh.memcpy(ns.ElementExtension.prototype,{
      captureMouse:function(){
        register(this.elem);
      },
      releaseMouse:function(){
        clear(this.elem);
      }
    });
  }
})();
//=============================================================================
//		イベントの拡張
//=============================================================================
(function(){
  var EventHandlerData={};
  ns.ElementExtension.EventHandlerData=EventHandlerData;

  agh.memcpy(ns.ElementExtension.prototype,{
    __add:function(name,handler){
      if(name in EventHandlerData){
        EventHandlerData[name].add.call(this,handler);
      }else{
        this.elem.attachEvent(name,handler);
      }
    },
    __remove:function(name,handler){
      if(name in EventHandlerData){
        EventHandlerData[name].remove.call(this,handler);
      }else{
        this.elem.detachEvent(name,handler);
      }
    },
    __fire:function(name,e){
      if(e.srcElement==null)e.srcElement=e.target;
      if(name in EventHandlerData){
        var key=EventHandlerData[name].key;
        var hlist=this[key];
        if(hlist==null)return;
        for(var i=0;i<hlist.length;i++){
          hlist[i].call(this,e);
        }
      }
    }
  });
  //---------------------------------------------------------------------------
  //		event: -agh-mouseup
  //---------------------------------------------------------------------------
  function CreateModifiedEvent(name,target){
    var k="event:"+name;
    EventHandlerData[name]={
      key:k,
      add:function(h){
        if(!this[k]){
          this[k]=[];
          var _=this;
          this.elem.attachEvent(target,function(e){
            modify_event(e);
            _.__fire(name,e);
          });
        }
        this[k].push(h);
      },
      remove:function(h){
        if(!this[k])return;
        var i=agh.Array.indexOf(this[k],h);
        if(i<0)return false;
        agh.Array.remove_atD(this[k],i);
        return true;
      }
    };
  }
  CreateModifiedEvent("-agh-mouseup","onmouseup");
  CreateModifiedEvent("-agh-mousemove","onmousemove");
  //---------------------------------------------------------------------------
  //		event: -agh-click
  //---------------------------------------------------------------------------
  var k_click="event:-agh-click";
  if(agh.browser.vIE){
    EventHandlerData["-agh-click"]={
      key:k_click,
      add:function(h){
        if(!this[k_click]){
          this[k_click]=[];

          var _=this;
          this.elem.attachEvent("onclick",function(e){
            modify_event(e);
            _.__fire("-agh-click",e);
          });
          this.elem.attachEvent("ondblclick",function(e){
            modify_event(e);
            _.__fire("-agh-click",e);
          });
        }
        this[k_click].push(h);
      },
      remove:function(h){
        if(!this[k_click])return;
        var i=agh.Array.indexOf(this[k_click],h);
        if(i<0)return false;
        agh.Array.remove_atD(this[k_click],i);
        return true;
      }
    };
  }else{
    CreateModifiedEvent("-agh-click","onclick");
  }
  //---------------------------------------------------------------------------
  //		event: -agh-mousedown
  //---------------------------------------------------------------------------
  var k_mousedown="event:-agh-mousedown";
  if(agh.browser.vIE){
    EventHandlerData["-agh-mousedown"]={
      key:k_mousedown,
      add:function(h){
        if(!this[k_mousedown]){
          this[k_mousedown]=[];

          var prev_up=false;
          var _=this;
          this.elem.attachEvent("onmouseup",function(){prev_up=true;});
          this.elem.attachEvent("onmousemove",function(){prev_up=false;});
          this.elem.attachEvent("onselectstart",function(e){
            if(!prev_up)return;
            modify_event(e);
            e.buttons.left=true;
            _.__fire("-agh-mousedown",e);
          });
          this.elem.attachEvent("onmousedown",function(e){
            modify_event(e);
            _.__fire("-agh-mousedown",e);
          });
        }
        this[k_mousedown].push(h);
      },
      remove:function(h){
        if(!this[k_mousedown])return;
        var i=agh.Array.indexOf(this[k_mousedown],h);
        if(i<0)return false;
        agh.Array.remove_atD(this[k_mousedown],i);
        return true;
      }
    };
  }else{
    CreateModifiedEvent("-agh-mousedown","onmousedown");
  }
  //---------------------------------------------------------------------------
  //		event: -agh-mouseenter / -agh-mouseleave
  //---------------------------------------------------------------------------
  if(agh.browser.vIE){
    CreateModifiedEvent("-agh-mouseenter","onmouseenter");
    CreateModifiedEvent("-agh-mouseleave","onmouseleave");
  }else{
    var k_mleave="event:-agh-mouseleave";
    var k_menter="event:-agh-mouseenter";
    var k_mhover="state:-agh-hoveringState";
    var prop_outto=agh.browser.vFx?"relatedTarget":"toElement";
    EventHandlerData["-agh-mouseleave"]={
      key:k_mleave,
      add:function(h){
        if(!this[k_mleave]){
          this[k_mleave]=[];

          var _=this;
          this.elem.attachEvent("onmouseout",function(e){
            if(!_[k_mhover])return;
            if(e[prop_outto]!=_.elem&&!_.isDescendant(e[prop_outto])){
              _[k_mhover]=false;
              _.__fire("-agh-mouseleave",e);
            }
          });
        }
        this[k_mleave].push(h);
      },
      remove:function(h){
        if(!this[k_mleave])return;
        var i=agh.Array.indexOf(this[k_mleave],h);
        if(i<0)return false;
        agh.Array.remove_atD(this[k_mleave],i);
        return true;
      }
    };
    EventHandlerData["-agh-mouseenter"]={
      key:k_menter,
      add:function(h){
        if(!this[k_menter]){
          this[k_menter]=[];

          var _=this;
          this.elem.attachEvent("onmouseover",function(e){
            if(_[k_mhover])return;
            _[k_mhover]=true;
            _.__fire("-agh-mouseenter",e);
          });
        }
        this[k_menter].push(h);
      },
      remove:function(h){
        if(!this[k_menter])return;
        var i=agh.Array.indexOf(this[k_menter],h);
        if(i<0)return false;
        agh.Array.indexOf(this[k_menter],i);
        return true;
      }
    };
  }
})();
//*****************************************************************************
//
//		agh.document 追加
//
//*****************************************************************************
//-----------------------------------------------------------------------------
//		agh.document.parseLength
//-----------------------------------------------------------------------------
(function(){
  var units=(function(){
    var dummy0=agh.document.createElement("div",null,{
      width:'2px',height:'2px',
      position:'absolute',left:'0',top:'0',
      overflow:'hidden'
    });
    var dummy=agh.document.createElement("div",null,{
      width:'10px',height:'10ex',
      margin:'0',padding:'0'
    });
    dummy0.appendChild(dummy);
    document.body.appendChild(dummy0);
    var pixels=agh.Array.map(["ex","em","cm","in"],function(unit){
      dummy.style.height=10+unit;
      return dummy.offsetHeight/10;
    });
    dummy0._.removeFromParent();

    return {
      ex:pixels[0],
      em:pixels[1],
      cm:pixels[2],
      'in':pixels[3],
      mm:pixels[2]/10,
      pt:pixels[3]/72,
      pc:pixels[3]/6,
      '%':0
    };
  })();

  agh.document.parseLength=function(value){
    /// <summary>
    /// 長さの表現を読み取って px を単位にした数値に変換します。
    /// </summary>
    /// <param name="value">変換元のオブジェクトを指定します。
    /// ・文字列で "3ex" 等の様に "数値単位" で指定した場合はそれを px 単位で返します。数字と単位の間には空白は含められません。
    /// 対応している単位は px in pc pt mm cm です。認識できない単位の場合には数値の部分だけ返します。
    /// 単位として % が指定されている場合には 0 を返します。
    /// ・数値で指定した場合には、それをその儘返します。但し NaN の場合には 0 を返します。
    /// ・null / undefined を指定した場合には 0 を返します。
    /// </param>
    if(value==null)return 0;
    if(agh.is(value,Number))return isNaN(value)?0:value;
    value=value.toString();

    var m=value.match(/([\+\-]?[\d\.]+)(\w*\b|\%)/);
    if(m==null){return 0;}
    var u=m[2] in units?units[m[2]]:1;
    var n=parseFloat(m[1]);
    return isNaN(n)?0:n*u;
  };
})();
//=============================================================================
});
//-----------------------------------------------------------------------------
