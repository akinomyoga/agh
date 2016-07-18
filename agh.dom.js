//*****************************************************************************
//
//    MWG 3.0 - DOM                                                   K. Murase
//
//*****************************************************************************
agh.scripts.register("agh.dom.js",["agh.js","agh.text.js"],function(){
  // agh.dom1.js の API を組み直し

  var agh=this;
  agh.Namespace('dom',agh);

  function _empty(){}
  function _false(){return false;}

  function insertAfter(elem,node,ref){
    if(elem.insertAfter)
      return elem.insertAfter(node,ref);

    var next=ref.nextSibling;
    if(next)return elem.insertBefore(node,next);
    elem.appendChild(node);
    return node;
  }

  function insertAdjacentNode(elem,position,node){
    // insertAdjacentElement in IE は element しか受け付けない?
    switch(position.toLowerCase()){
    case "beforebegin":
      if(elem.parentNode)
        return elem.parentNode.insertBefore(node,elem);
      else
        return null;
    case "afterbegin":
      return elem.insertBefore(node,elem.firstChild);
    case "beforeend":
      return elem.appendChild(node);
    case "afterend":
      if(elem.parentNode)
        return insertAfter(elem.parentNode,node,elem);
      return null;
    default:
      return null;
    }
  }

  function insertAdjacentHTML(elem,position,html){
    if(elem.insertAdjacentHTML)
      return elem.insertAdjacentHTML(position,html);

    var range=elem.ownerDocument.createRange();
    range.setStartBefore(elem);
    var frag=range.createContextualFragment(html);
    return insertAdjacentNode(elem,position,frag);

    // var nodes=elem.ownerDocument.createElement('div');
    // nodes.innerHTML=html;
    // nodes=nodes.children;
    // switch(position){
    // case 'beforebegin':case 'beforeend':
    //   for(var i=nodes.length-1;i>=0;i--)
    //     insertAdjacentNode(elem,position,nodes[i]);
    //   break;
    // default:
    //   nodes=agh(nodes,Array);
    //   for(var i=0,iN=nodes.length;i<iN;i++)
    //     insertAdjacentNode(elem,position,nodes[i]);
    //   break;
    // }
  }

  function insertAdjacentText(elem,position,text){
    if(elem.insertAdjacentText)
      return elem.insertAdjacentText(elem,position,text);
    return insertAdjacentText(elem.ownerDocument.createTextNode(text));
  }

  var insertPositions={
    beforebegin:'beforeBegin',
    afterbegin:'afterBegin',
    beforeend:'beforeEnd',
    afterend:'afterEnd',

    before:'beforeBegin',
    begin:'afterBegin',
    end:'beforeEnd',
    after:'afterEnd'
  };
  agh.dom.insert=function(elem,node,position){
    position=insertPositions[(position||"").toLowerCase()]||'beforeEnd';

    if(node!=null){
      if(node.nodeType!=null){
        /// @fn agh.dom.insert(elem,node,position)
        ///   指定した DOM ノードを指定した位置に挿入します。
        return insertAdjacentNode(elem,position,node);
      }else if("string"===typeof node||node instanceof String){
        /// @fn agh.dom.insert(elem,html,position)
        ///   指定した HTML を指定した位置に挿入します。
        return insertAdjacentHTML(elem,position,node);
      }else if(node instanceof Array){
        /// @fn  agh.dom.insert(elem,[...],position)
        ///   指定したノード・HTML の列を指定した位置に挿入します。
        switch(position){
        case 'beforeBegin':case 'beforeEnd':
          for(var i=node.length-1;i>=0;i--)
            agh.dom.insert(elem,node[i],position);
          return true;
        default:
          for(var i=0,iN=node.length;i<iN;i++)
            agh.dom.insert(elem,node[i],position);
          return true;
        }
      }else if('length' in node){
        return agh.dom.insert(elem,agh(node,Array),position);
      }
    }

    return null;
  };
  agh.dom.insertText=function(elem,text,position){
    position=insertPositions[(position||"").toLowerCase()]||'afterEnd';
    return insertAdjacentText(elem,position,text);
  };

  agh.dom.remove=function(node){
    if(node.parentNode)
      node.parentNode.removeChild(node);
  };
  agh.dom.isDescendantOf=function(descendant,ancestor){
    if(descendant==null||ancestor==null)return false;
    var parent=descendant.parentNode;
    while(parent){
      if(parent===ancestor)return true;
      parent=parent.parentNode;
    }
    return false;
  };

  agh.dom.getInnerText=function(elem){
    return elem.innerText;
  };
  agh.dom.setInnerText=function(elem,value){
    elem.innerText=value;
  };
  if(agh.browser.vFx<45){
    agh.dom.getInnerText=function(elem){
      return elem.textContent;
    };
    agh.dom.setInnerText=function(elem,value){
      if(value===null)value="null";
      else if(value===undefined)value="undefined";
      else value=value.toString();
      elem.innerHTML=agh.Text.Escape(value,"html");
    };
  }else if(agh.browser.vIE){
    agh.dom.setInnerText=function(elem,value){
      try{
        elem.innerText=value;
      }catch(ex){
        // 手持ちの IE6 環境の所為だと思うが
        // 何故か例外が発生するので。
        elem.innerHTML=agh.Text.Escape(value,"html");
      }
    };
  }

  if(agh.browser.vIE){
    // IE8: DOM Tree に追加されていない要素の
    //      offsetParent プロパティにアクセスするとエラーになる。
    var getOffsetParent=function(elem){
      return elem.parentNode&&elem.offsetParent;
    };
  }else{
    var getOffsetParent=function(elem){
      return elem.offsetParent;
    };
  }

  //---------------------------------------------------------------------------
  // css styles

  // ■直接 obj にオブジェクトを設定すると
  // IE でメモリリークが発生するのでは?

  var bucketKey="[[agh.dom/bucket]]";
  agh.dom.bucket=function(obj,create){
    if(bucketKey in obj)
      return obj[bucketKey];
    else if(create!==false)
      return obj[bucketKey]=new AgehaBucket;
    else
      return null;
  };
  function AgehaBucket(){}
  AgehaBucket.prototype.reset=function(name,value){
    var old=this[name];
    if(arguments.length===1||value===undefined){
      delete this[name];
    }else{
      this[name]=value;
    }
    return old;
  };

  //---------------------------------------------------------------------------
  // @fn agh.dom.stylesheet

  agh.dom.stylesheet=function(target){
    /**
     * 要素を追加する為の新しいドキュメントを指定します。
     *
     * @param target = document
     *   スタイルシートの適用先の HTMLDocument を指定します。
     *   HTMLElement が指定された場合は target.ownerDocument が使用されます。
     *   省略された場合は window.document が使用されます。
     */
    if(target==null)
      target=document;
    else if(target.ownerDocument)
      target=target.ownerDocument;

    var b=agh.dom.bucket(target);
    return b.stylesheet||(b.stylesheet=new AgehaStyleSheet(target));

    // agh.dom.stylesheet().insert();
  };
  function AgehaStyleSheet(target){
    var _document=target||document;

    // this.m_style
    if(agh.browser.vIE&&_document.createStyleSheet){
      try{
        this.m_sheet=_document.createStyleSheet();
      }catch(ex){}
    }
    if(!this.m_sheet){
      this.m_style=_document.createElement("style");
      this.m_style.type="text/css";
      this.m_style.appendChild(_document.createTextNode(""));
      var head=_document.getElementsByTagName("head")[0]||_document.documentElement;
      head.appendChild(this.m_style);
      this.m_sheet=this.m_style.sheet;
    }

    this.rules=this.m_sheet.cssRules||this.m_sheet.rules;
    this.m_seltext={};
    this.m_csstext={};
  }
  agh.memcpy(AgehaStyleSheet.prototype,{
    m_style:null,
    m_sheet:null,
    rules:null,
    m_seltext:null,
    m_csstext:null,
    _add_impl:function(selector,css,index){
      return this.m_sheet.insertRule(selector+"{"+css+"}",index);
    },
    _remove_impl:function(index){
      this.m_sheet.deleteRule(index);
    },
    add:function(selector,css,index){
      if(arguments.length>=2){
        var _index=this._add_impl(selector,css,index||this.rules.length);
        this.m_seltext[selector]=this.rules[_index].selectorText||selector;
        this.m_csstext[css]=this.rules[_index].style.cssText||css;
        return _index;
      }else if(arguments.length===1&&selector instanceof Object){
        for(var key in selector)
          this.add(key,selector[key]);
      }
    },
    _remove_implSelector:function(selector){
      var selectorText=this.m_seltext[selector]||selector;
      for(var i=this.rules.length-1;i>=0;i--){
        if(this.rules[i].selectorText===selectorText)
          this._remove_impl(i);
      }
    },
    _remove_implRule:function(selector,css){
      var selectorText=this.m_seltext[selector]||selector;
      var cssText=this.m_csstext[css]||css;
      for(var i=this.rules.length-1;i>=0;i--){
        var rule=this.rules[i];
        if(rule.selectorText===selectorText
           &&this.rules[i].style.cssText===cssText)
          this._remove_impl(i);
      }
    },
    remove:function(sel,css){
      if(arguments.length===2){
        if(agh.is(sel,String)&&agh.is(css,String))
          return this._remove_implRule(sel,css);
      }

      if(typeof sel=="number"||sel instanceof Number)
        return this._remove_impl(sel);
      if(typeof sel=="string"||sel instanceof String)
        return this._remove_implSelector(sel);
    },
    clear:function(){
      for(var i=this.rules.length-1;i>=0;i--)
        this._remove_impl(i);
    }
  });
  if(agh.browser.vIE){
    // overwrite codes for IE
    agh.memcpy(AgehaStyleSheet.prototype,{
      _add_impl:function(selector,rules,index){
        this.m_sheet.addRule(selector,rules,index);
        return index;
      },
      _remove_impl:function(index){
        this.m_sheet.removeRule(index);
      }
    });
  }

  //---------------------------------------------------------------------------
  // @fn agh.dom.getStyle
  // @fn agh.dom.setStyle
  // @fn agh.dom.defineCustomCssProperty

  var CustomCssProperties={};
  agh.dom.defineCustomCssProperty=function(propertyName,definition){
    if(arguments.length===2){
      /// @fn agh.dom.defineCustomCssProperty(propertyName,definition)
      CustomCssProperties[propertyName]=definition;
      CustomCssProperties[agh.Text.Escape(propertyName,'camel')]=definition;
    }else if(arguments.length===1){
      /// @fn agh.dom.defineCustomCssProperty({propertyName:definition})
      var defs=arguments[0];
      var keys=agh.ownkeys(defs);
      for(var i=0;i<keys.length;i++)
        agh.dom.defineCustomCssProperty(keys[i],defs[keys[i]]);
    }
  };

  agh.dom.getStyle=function(elem,propertyName,pseudo){
    /// @fn agh.dom.getStyle(elem,propertyName)
    ///   現在の表示に使われている computed style を取得します。
    ///   @param[in] elem
    ///   @param[in] propertyName
    if(propertyName in CustomCssProperties&&CustomCssProperties[propertyName].get)
      return CustomCssProperties[propertyName].get(elem);

    if(elem.ownerDocument.defaultView){
      var style=elem.ownerDocument.defaultView.getComputedStyle(elem,pseudo);
      if(propertyName==null)return style;
      return style.getPropertyValue(propertyName);
    }else if(window.getComputedStyle){
      var style=window.getComputedStyle(elem,pseudo);
      if(propertyName==null)return style;
      return style.getPropertyValue(propertyName);
    }else{
      // 擬似クラスには対応できない
      if(pseudo!=null&&pseudo!=="")return null;

      var style=elem.currentStyle||elem.style;
      if(propertyName==null)return style;
      return style[agh.Text.Escape(propertyName,"camel")];
    }
  };
  agh.dom.setStyle=function(elem,prop,value){
    if(arguments.length===3){
      /// @fn agh.dom.setStyle(elem,propertyName,value)
      ///   要素に CSS プロパティを適用します。
      ///   @param[in] propertyName 設定するプロパティの名前を指定します。
      ///   @param[in] value 設定するプロパティの値を指定します。
      if(prop in CustomCssProperties&&CustomCssProperties[prop].set){
        CustomCssProperties[prop].set(elem,value);
      }else{
        elem.style[agh.Text.Escape(prop,"camel")]=value;
      }
    }else if(arguments.length===2){
      /// @fn agh.dom.setStyle(elem,dict)
      ///   要素にスタイルを適用します。
      ///   @param[in] dict key-value ペアで設定するプロパティ名・値を指定するオブジェクトです。
      var keys=agh.ownkeys(prop);
      for(var i=0;i<keys.length;i++)
        agh.dom.setStyle(elem,keys[i],prop[keys[i]]);
    }
  };

  // -agh-user-select, TODO agh.browser.vOp
  if(agh.browser.vIE){
    agh.dom.defineCustomCssProperty('-agh-user-select',{
      get:function(elem){
        // -agh-user-select = "auto" or true
        //   when unselectable="off" or undefined
        // -agh-user-select = "none" or false
        //   when unselectable="on" or ""
        return elem.unselectable!==""&&elem.unselectable.toLowerCase()!=="on"?"auto":"none";
      },
      set:function(elem,value){
        // TODO: 子孫要素にも適用するか?
        value=!!value&&value!=="none";
        var oldValue=elem.unselectable!==""&&elem.unselectable!=="on";
        if(value===oldValue)return;
        if(value){
          elem.unselectable="off";
          elem.attachEvent("onselectstart",_false);
        }else{
          elem.unselectable="on";
          elem.detachEvent("onselectstart",_false);
        }
      }
    });
  }else if(agh.browser.vOp){
    agh.dom.defineCustomCssProperty('-agh-user-select',{
      get:function(elem){
        return elem.unselectable.toLowerCase()!=="on"?"auto":"none";
      },
      set:function(elem,value){
        value=!!value&&value!=="none";
        var oldValue=elem.unselectable!=="on";
        if(value===oldValue)return;
        if(value){
          elem.unselectable="off";
          //agh.addEventListener(elem,"selectstart",_false,false);//opera に selectstart はない
        }else{
          elem.unselectable="on";
          //agh.removeEventListener(elem,"selectstart",_false,false);
        }
      }
    });
  }else if(agh.browser.vFx){
    agh.dom.defineCustomCssProperty('-agh-user-select',{
      get:function(elem){
        return elem.style.MozUserSelect;
      },
      set:function(elem,value){
        if(agh.is(value,Boolean))value=value?"auto":"none";
        elem.style.MozUserSelect=value;
      }
    });
  }else if(agh.browser.isWk){
    agh.dom.defineCustomCssProperty('-agh-user-select',{
      get:function(elem){
        return elem.style['-webkit-user-select'];
      },
      set:function(elem,value){
        if(agh.is(value,Boolean))value=value?"auto":"none";
        elem.style['-webkit-user-select']=value;
      }
    });
  }

  // -agh-opacity
  if(agh.browser.vIE){
    agh.dom.defineCustomCssProperty('-agh-opacity',{
      get:function(elem){
        return elem.filters["alpha"]?elem.filters["alpha"].opacity/100:1.0;
      },
      set:function(elem,value){
        value=parseFloat(value)*100;
        // DOM に登録されていないと filters は unknown?
        if(typeof elem.filters!='unknown'&&elem.filters["alpha"]){
          elem.filters["alpha"].opacity=value;
        }else{
          elem.style.filter+="alpha(opacity="+value.toString()+")";
        }
      }
    });
  }else{
    agh.dom.defineCustomCssProperty('-agh-opacity',{
      get:function(elem){return agh.dom.getStyle(elem,'opacity');},
      set:function(elem,value){agh.dom.setStyle(elem,'opacity',value);}
    });
  }

  //---------------------------------------------------------------------------
  // className

  agh.dom.addClassName=function addClassName(elem,className){
    elem.className=agh.Array.union(
      elem.className.split(' '),
      className.split(' ')
    ).join(' ');
  };
  agh.dom.removeClassName=function removeClassName(elem,className){
    elem.className=agh.Array.difference(
      elem.className.split(' '),
      className.split(' ')
    ).join(' ');
  };
  agh.dom.hasClassName=function hasClassName(elem,className){
    var elem_classes=elem.className.split(' ');
    var check_classes=className.split(' ');
    // return agh.Array.intersection(elem_classes,check_classes).length==check_classes.length;
    for(var i=0;i<check_classes.length;i++){
      var chk=check_classes[i];
      for(var j=0;elem_classes[j]!=chk;)
        if(++j==elem_classes.length)
          return false;
    }
    return true;
  };
  agh.dom.switchClassName=function switchClassName(elem,base,name){
    /// @fn agh.dom.switchClassName
    ///   要素の base+"-" で始まるクラスを全て削除し、
    ///   代わりに base+"-"+name というクラスを追加します。
    var classes=elem.className.split(' ');
    base+="-";
    classes=agh.Array.filter(classes,function(cls){return !cls.startsWith(base);});
    classes.push(base+name);
    elem.className=classes.join(' ');
  };

  //---------------------------------------------------------------------------
  // 座標・幾何

  function Rectangle(x,y,width,height){
    this.x=x;
    this.y=y;
    this.width=width;
    this.height=height;

    this.left=x;
    this.top=y;
    this.right=x+width;
    this.bottom=y+height;
  }
  Rectangle.prototype.shiftD=function(dx,dy){
    this.x+=dx;
    this.left+=dx;
    this.right+=dx;
    this.y+=dy;
    this.right+=dy;
    this.bottom+=dy;
    return this;
  };
  Rectangle.prototype.contains=function(x,y){
    return this.left<=x&&x<this.right&&this.top<=y&&y<this.bottom;
  };
  agh.dom.Rectangle=Rectangle;

  agh.dom.parseLength=(function(){
    var units={
      ex:7,em:12,
      cm:37.8,mm:3.78,
      'in':96,pc:16,pt:4.0/3.0
    };

    agh.scripts.wait(['event:onload'],function(){
      var tmp0=document.createElement('div');
      agh.dom.setStyle(tmp0,{
        width:'2px',height:'2px',
        position:'absolute',left:'0',top:'0',
        overflow:'hidden'
      });
      var tmp=document.createElement('div');
      agh.dom.setStyle(tmp,{
        width:'10px',height:'10ex',
        margin:'0',padding:'0'
      });

      try{
        tmp0.appendChild(tmp);
        document.body.appendChild(tmp0);
        function measure(unit){
          tmp.style.height=10+unit;
          return tmp.offsetHeight/10;
        }
        var ex_px=measure("ex");
        var em_px=measure("em");
        var cm_px=measure("cm");
        var in_px=measure("in");
        document.body.removeChild(tmp0); // 何故か IE6 で例外
      }catch(ex){}

      units={
        ex:ex_px  , em:em_px   ,
        cm:cm_px  , mm:cm_px/10,
        'in':in_px, pc:in_px/6 , pt:in_px/72
      };
    });

    return function(value,referenceElement){
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
      if(typeof value==="number"||value instanceof Number)return isNaN(value)?0:value;
      value=value.toString();

      var m=value.match(/([-+]?[.\d]+)(%|\w*\b)/);
      if(m==null)return 0;

      var u=1;
      if(m[2] in units){
        u=units[m[2]];
      }else if(m[2]==='%'){
        // TODO referenceElement==null (document.body 等) の場合は % は何が基準になっているのか?
        //      window, documentElement, あるいはそれらから計算される何か?
        if(referenceElement)
          u=agh.dom.getStyle(referenceElement,'-agh-container-width')/100;
        else if(window.innerWidth!=null)
          u=window.innerWidth/100;
      }

      var n=parseFloat(m[1]);
      return isNaN(n)?0:n*u;
    }
  })();

  if(agh.browser.vIE){
    var parseLength_internal=function(value,childElement){
      var referenceElement=childElement.parentNode&&childElement.offsetParent;

      // IE は小数で計算すると結果がずれる?
      // (margin を取得する時だけでも良いかも知れない)
      return 0|agh.dom.parseLength(value,referenceElement);
    }
  }else{
    var parseLength_internal=function(value,childElement){
      var referenceElement=childElement.offsetParent;
      return agh.dom.parseLength(value,referenceElement);
    }
  }

  agh.dom.defineCustomCssProperty({
    '-agh-border-left-width':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'border-left-width'),elem);},
      set:function(elem,value){elem.style.borderLeftWidth=parseLength_internal(value,elem)+"px";}
    },
    '-agh-border-top-width':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'border-top-width'),elem);},
      set:function(elem,value){elem.style.borderTopWidth=parseLength_internal(value,elem)+"px";}
    },
    '-agh-border-right-width':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'border-right-width'),elem);},
      set:function(elem,value){elem.style.borderRightWidth=parseLength_internal(value,elem)+"px";}
    },
    '-agh-border-bottom-width':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'border-bottom-width'),elem);},
      set:function(elem,value){elem.style.borderBottomWidth=parseLength_internal(value,elem)+"px";}
    },
    '-agh-margin-left':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'margin-left'),elem);},
      set:function(elem,value){elem.style.marginLeft=parseLength_internal(value,elem)+"px";}
    },
    '-agh-margin-top':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'margin-top'),elem);},
      set:function(elem,value){elem.style.marginTop=parseLength_internal(value,elem)+"px";}
    },
    '-agh-margin-right':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'margin-right'),elem);},
      set:function(elem,value){elem.style.marginRight=parseLength_internal(value,elem)+"px";}
    },
    '-agh-margin-bottom':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'margin-bottom'),elem);},
      set:function(elem,value){elem.style.marginBottom=parseLength_internal(value,elem)+"px";}
    },
    '-agh-padding-left':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'padding-left'),elem);},
      set:function(elem,value){elem.style.paddingLeft=parseLength_internal(value,elem)+"px";}
    },
    '-agh-padding-top':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'padding-top'),elem);},
      set:function(elem,value){elem.style.paddingTop=parseLength_internal(value,elem)+"px";}
    },
    '-agh-padding-right':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'padding-right'),elem);},
      set:function(elem,value){elem.style.paddingRight=parseLength_internal(value,elem)+"px";}
    },
    '-agh-padding-bottom':{
      get:function(elem){return parseLength_internal(agh.dom.getStyle(elem,'padding-bottom'),elem);},
      set:function(elem,value){elem.style.paddingBottom=parseLength_internal(value,elem)+"px";}
    },
    '-agh-container-width':{
      get:function(elem){
        var pl=agh.dom.getStyle(elem,'-agh-padding-left');
        var pr=agh.dom.getStyle(elem,'-agh-padding-right');
        var bl=agh.dom.getStyle(elem,'-agh-border-left-width');
        var br=agh.dom.getStyle(elem,'-agh-border-right-width');
        return elem.offsetWidth-pl-pr-bl-br;
      }
    },
    '-agh-container-height':{
      get:function(elem){
        var pl=agh.dom.getStyle(elem,'-agh-padding-top');
        var pr=agh.dom.getStyle(elem,'-agh-padding-bottom');
        var bl=agh.dom.getStyle(elem,'-agh-border-top-width');
        var br=agh.dom.getStyle(elem,'-agh-border-bottom-width');
        return elem.offsetHeight-pl-pr-bl-br;
      }
    },
    '-agh-box-sizing':{
      get:(function(){
        if(agh.browser.vIE){
          if(agh.browser.vIE>=8){
            return function(elem){return agh.dom.getStyle(elem,'box-sizing')||agh.dom.getStyle(elem,'-ms-box-sizing');};
          }else if(agh.browser.vIE>=6&&!agh.browser.isQks){
            return function(elem){return 'content-box';};
          }else{
            return function(elem){return 'border-box';};
          }
        }else if(agh.browser.vFx){
          return function(elem){return agh.dom.getStyle(elem,'box-sizing')||agh.dom.getStyle(elem,'-moz-box-sizing');};
        }else if(agh.browser.isWk){
          return function(elem){return agh.dom.getStyle(elem,'box-sizing')||agh.dom.getStyle(elem,'-webkit-box-sizing');};
        }else if(agh.browser.vOp){
          return function(elem){return agh.dom.getStyle(elem,'box-sizing')||agh.dom.getStyle(elem,'-o-box-sizing');};
        }else{
          return function(elem){return agh.dom.getStyle(elem,'box-sizing');};
        }
      })()
    },
    '-agh-offset-width':{
      get:function(elem){return elem.offsetWidth;},
      set:function(elem,value){
        value=parseLength_internal(value,elem);
        if(agh.dom.getStyle(elem,'-agh-box-sizing')!=='border-box'){
          value-=agh.dom.getStyle(elem,'-agh-border-left-width');
          value-=agh.dom.getStyle(elem,'-agh-border-right-width');
          value-=agh.dom.getStyle(elem,'-agh-padding-left');
          value-=agh.dom.getStyle(elem,'-agh-padding-right');
        }
        if(value<0)value=0;
        elem.style.width=value+"px";

        // TODO: overflow:visible だと正しく働かない (勝手に変更するか?)
      }
    },
    '-agh-offset-height':{
      get:function(elem){return elem.offsetHeight;},
      set:function(elem,value){
        value=parseLength_internal(value,elem);
        if(agh.dom.getStyle(elem,'-agh-box-sizing')!=='border-box'){
          value-=agh.dom.getStyle(elem,'-agh-border-top-width');
          value-=agh.dom.getStyle(elem,'-agh-border-bottom-width');
          value-=agh.dom.getStyle(elem,'-agh-padding-top');
          value-=agh.dom.getStyle(elem,'-agh-padding-bottom');
        }
        if(value<0)value=0;
        elem.style.height=value+"px";

        // TODO: overflow:visible だと正しく働かない (勝手に変更するか?)
      }
    }
  });

  // getCssTransform: test implementation
  //
  // - 引数に基準となる要素を指定できる様にする?
  //
  // 問題点
  // - 3D transformations には対応していない
  // - 平行移動については正確ではない (現在は使用していないので放置している)。
  //
  // 参考
  // - CSS Transforms 仕様書 http://www.w3.org/TR/css3-transforms/
  agh.dom.getCssTransform=(function(){
    var identity=[1,0,0,1,0,0];
    identity.isIdentity=true;
    var getCssTransform=function(elem,origin){
      if(elem===origin
         ||elem===elem.ownerDocument.documentElement
         ||elem.parentNode==null)
        return identity;

      var m=getCssTransform(elem.parentNode,origin);

      var transform=agh.dom.getStyle(elem,"transform");
      var $;
      if(transform&&($=transform.match(/(\w+)\s*\(([^()]*)\)/))){
        if($[1]=="matrix"){
          var f=$[2].split(",");
          for(var i=0;i<6;i++)
            f[i]=f[i]==null?identity[i]:+f[i];
          // ※mathrx f[4],f[5] の単位は px である。
          //   但し明示的に "px" と表示される事は無い (指定時にも単位は付けない)

          // a0 a2 a4     f0 f2 f4     m0 m2 m4
          // a1 a3 a5  =  f1 f3 f5  X  m1 m3 m5
          //  0  0  1      0  0  1      0  0  1
          var a0=f[0]*m[0]+f[2]*m[1];
          var a1=f[1]*m[0]+f[3]*m[1];
          var a2=f[0]*m[2]+f[2]*m[3];
          var a3=f[1]*m[2]+f[3]*m[3];
          var a4=f[0]*m[4]+f[2]*m[5]+f[4];
          var a5=f[1]*m[4]+f[3]*m[5]+f[5];
          if(m===identity)m=agh.wrap(identity);
          m[0]=a0;m[1]=a1;
          m[2]=a2;m[3]=a3;
          m[4]=a4;m[5]=a5;
          m.isIdentity=false;
        }
        //■rotate etc (computedStyle で現れる事はない?)
        //■transform-origin
      }
      return m;
    };
    return getCssTransform;
  })();

  function measure_cache(elem){
    this.elem=elem;
  }
  agh.memcpy(measure_cache.prototype,{
    css:function(name){
      if(name in this)return this[name];
      return this[name]=agh.dom.getStyle(this.elem,name);
    },
    update_border_box:(function(){
      if(document.createElement("div").getBoundingClientRect){
        return function updateBorderBoxRectInWindow(){
          /// ブラウザ表示領域中における要素の border-box の配置を計算します
          /// @param[out] this.bbox_x
          /// @param[out] this.bbox_y
          /// @param[out] this.bbox_w
          /// @param[out] this.bbox_h
          this.update_border_box=_empty;

          var rect=this.elem.getBoundingClientRect(this.elem);
          this.bbox_x=rect.left;
          this.bbox_y=rect.top;
          this.bbox_w=rect.right-rect.left;
          this.bbox_h=rect.bottom-rect.top;
        };
      }else{
        // if(agh.browser.vFx<3||agh.browser.isWk)
        return function updateBorderBoxRectInWindow(){
          /// ブラウザ表示領域中における要素の border-box の配置を計算します
          /// @param[out] this.bbox_x
          /// @param[out] this.bbox_y
          /// @param[out] this.bbox_w
          /// @param[out] this.bbox_h
          this.update_border_box=_empty;

          var e=this.elem;
          var body=e.ownerDocument.body;
          var html=e.ownerDocument.documentElement;

          var x=e.offsetLeft;
          var y=e.offsetTop;
          var offset;
          while(e!=body&&(e=getOffsetParent(e))!=null){
            x+=e.offsetLeft+e.clientLeft;
            y+=e.offsetTop+e.clientTop;
          }

          // 途中のスクロールの引き算
          e=this.elem;
          for(;;){
            if(agh.dom.getStyle(e,'position')=='absolute'){
              e=getOffsetParent(e);
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
          this.bbox_x=x;
          this.bbox_y=y;
          this.bbox_w=this.elem.offsetWidth;
          this.bbox_h=this.elem.offsetHeight;

          // ToDo 以下の内容を確認
          // <a href="http://terurou.hateblo.jp/entry/20071018/1192637545">getClientRects()とgetBoundingClientRect()の違いとその動作のまとめ - DenkiYagi</a>
          // <a href="http://gifnksm.hatenablog.jp/entry/20090506/1241630603">nicovio Thumbinfo popupで使っている要素の位置取得関数 - gifnksmの雑多なメモ</a>
        };
      }
    })(),
    update_padding_box:function updatePaddingBoxRectInClient(){
      /// 要素の client 領域中における padding-box の配置を計算します
      /// @param[out] this.pbox_x
      /// @param[out] this.pbox_y
      /// @param[out] this.pbox_w
      /// @param[out] this.pbox_h
      this.update_padding_box=_empty;

      var elem=this.elem;
      var sl=elem.scrollLeft;
      var st=elem.scrollTop;
      var sw=elem.scrollWidth;
      var sh=elem.scrollHeight;

      // body の場合は特別
      if(elem==elem.ownerDocument.body)sl=st=0;

      // scrollW/H 修正必要性
      var scroll_ok=false;
      if(agh.browser.vIE){
        var w;{
          var txt_w=agh.dom.getStyle(elem,'width');
          var txt_h=agh.dom.getStyle(elem,'height');
          w=!!txt_w.match(/^[\d.]/)||!!txt_h.match(/^[\d.]/);
        }

        if(agh.browser.isQks){
          scroll_ok=w;
        }else{
          var pos=agh.dom.getStyle(elem,'position');
          var ovf=agh.dom.getStyle(elem,'overflow');
          scroll_ok=w&&(pos==null||pos==""||ovf!="visible");
        }
      }else{
        // overflow 指定
        function check_scroll(t){
          t=t.toLowerCase();
          return t=="auto"||t=="scroll"||t=="hidden";
        }
        scroll_ok=
          sh>=0&&sw>=0&& // 負の scrollW/H 値
          check_scroll(agh.dom.getStyle(elem,'overflow'))||
          check_scroll(agh.dom.getStyle(elem,'overflow-x'))||
          check_scroll(agh.dom.getStyle(elem,'overflow-y'));
      }

      // scrollW/H 修正
      if(!scroll_ok){
        var bl=this.css('-agh-border-left-width');
        var bt=this.css('-agh-border-top-width');
        var br=this.css('-agh-border-right-width');
        var bb=this.css('-agh-border-bottom-width');
        var biw=elem.offsetWidth-br-bl;
        var bih=elem.offsetHeight-bt-bb;
        sw=biw;
        sh=bih;
      }

      this.pbox_x=-sl;
      this.pbox_y=-st;
      this.pbox_w=sw;
      this.pbox_h=sh;
    },
    update_client_box:function(){
      this.update_client_box=_empty;

      this.cbox_x=this.elem.clientLeft;
      this.cbox_y=this.elem.clientTop;
      this.cbox_w=this.elem.clientWidth;
      this.cbox_h=this.elem.clientHeight;
      if(this.cbox_x===0&&this.cbox_y===0&&this.cbox_w===0&&this.cbox_h===0){
        // scrollbar が設定されていないと client* に何も設定されていない事がある
        this.cbox_x=this.css('-agh-border-left-width');
        this.cbox_y=this.css('-agh-border-top-width');
        this.cbox_w=this.elem.offsetWidth-this.cbox_x-this.css('-agh-border-right-width');
        this.cbox_h=this.elem.offsetHeight-this.cbox_y-this.css('-agh-border-bottom-width');
      }
    }
  });

  var calculateRelativePosition=(function(){
    // 各座標間の変換経路
    //
    //  [page] ⇔ [frame] ⇔ +--------+
    //           [offset] ⇔ | border | ⇔ [view]
    //           [margin] ⇔ +--------+ ⇔ [client] ⇔ [padding] ⇔ [content]
    //
    var branch_map={
      border :{branch:0,depth:0},
      frame  :{branch:1,depth:1},
      page   :{branch:1,depth:2},
      offset :{branch:2,depth:1},
      margin :{branch:3,depth:1},
      view:   {branch:4,depth:1},
      client :{branch:5,depth:1},
      padding:{branch:5,depth:2},
      content:{branch:5,depth:3}
    };

    var branch_lowering=[
      [ // branch0
      ],[ // branch1
        function border2frame(r,c){
          c.update_border_box();
          r.x-=c.bbox_x;
          r.y-=c.bbox_y;
        },
        function frame2page(r,c){
          var _document=c.elem.ownerDocument;
          var html=_document.documentElement;
          if(agh.browser.vIE&&!agh.browser.isQks){
            r.x-=html.scrollLeft-html.clientLeft;
            r.y-=html.scrollTop-html.clientTop;
          }else{
            // Cr では body.scrollTop に値が入る
            // Fx, IE では html.scrollTop に値が入る
            r.x-=_document.body.scrollLeft+html.scrollLeft-html.clientLeft;
            r.y-=_document.body.scrollTop+html.scrollTop-html.clientTop
          }
        }
      ],[ // branch2
        function border2offset(r,c){
          r.x-=c.elem.offsetLeft;
          r.y-=c.elem.offsetTop;
        }
      ],[ // branch3
        function border2margin(r,c){
          r.x-=c.css('-agh-margin-left');
          r.y-=c.css('-agh-margin-top');
        }
      ],[ // branch4
        function border2view(r,c){
          r.x+=c.css('-agh-border-left-width');
          r.y+=c.css('-agh-border-top-width');
        }
      ],[ // branch5
        function border2client(r,c){
          c.update_client_box();
          r.x+=c.cbox_x;
          r.y+=c.cbox_y;
        },
        function client2padding(r,c){
          c.update_padding_box();
          r.x+=c.pbox_x;
          r.y+=c.pbox_y;
        },
        function padding2content(r,c){
          r.x+=c.css('-agh-padding-left');
          r.y+=c.css('-agh-padding-top');
        }
      ]
    ];

    return function(r,c,from,to){
      r.x=0;
      r.y=0;
      if(from===to)return;

      var f=branch_map[from];
      var t=branch_map[to];
      if(f.branch===t.branch){
        var lower=branch_lowering[f.branch];
        if(f.depth<=t.depth){
          for(var i=f.depth;i<t.depth;i++)lower[i](r,c);
        }else{
          for(var i=f.depth;i<t.depth;i++)lower[i](r,c);
          r.x=-r.x;
          r.y=-r.y;
        }
      }else{
        var flower=branch_lowering[f.branch];
        var tlower=branch_lowering[t.branch];
        for(var i=0;i<f.depth;i++)flower[i](r,c);
        r.x=-r.x;
        r.y=-r.y;
        for(var i=0;i<t.depth;i++)tlower[i](r,c);
      }
    };
  })();

  var box_definitions={
    'margin-box':{
      default_origin:'frame',
      position:'margin',
      calculate_size:function(r,c){
        r.w=c.elem.offsetWidth+c.css('-agh-margin-left')+c.css('-agh-margin-right');
        r.h=c.elem.offsetHeight+c.css('-agh-margin-top')+c.css('-agh-margin-bottom');
      }
    },
    'border-box':{
      default_origin:'frame',
      position:'border',
      calculate_size:function(r,c){
        r.w=c.elem.offsetWidth;
        r.h=c.elem.offsetHeight;
      }
    },
    'view-box':{
      default_origin:'frame',
      position:'view',
      calculate_size:function(r,c){
        r.w=c.elem.offsetWidth-c.css('-agh-border-left-width')-c.css('-agh-border-right-width');
        r.h=c.elem.offsetHeight-c.css('-agh-border-top-width')-c.css('-agh-border-bottom-width');
      }
    },
    'client-box':{
      default_origin:'frame',
      position:'client',
      calculate_size:function(r,c){
        c.update_client_box();
        r.w=c.cbox_w;
        r.h=c.cbox_h;
      }
    },
    'padding-box':{
      default_origin:'frame',
      position:'padding',
      calculate_size:function(r,c){
        c.update_padding_box();
        r.w=c.pbox_w;
        r.h=c.pbox_h;
      }
    },
    'content-box':{
      default_origin:'frame',
      position:'content',
      calculate_size:function(r,c){
        c.update_padding_box();
        r.w=c.pbox_w-c.css('-agh-padding-left')-c.css('-agh-padding-right');
        r.h=c.pbox_h-c.css('-agh-padding-top')-c.css('-agh-padding-bottom');
      }
    }
  };

  agh.dom.getRectangle=function getRectangle(elem,type,origin){
    /// @fn agh.dom.getRectangle
    ///   要素の type で指定した領域を取得します。
    /// @param[in] elem
    /// @param[in] type   'margin-box' | 'border-box' | 'view-box' | 'client-box' | 'padding-box' | 'content-box'
    /// @param[in] origin 'page' | 'frame' | 'offset' | 'margin' | 'border' | 'view' | 'client' | 'padding' | 'content'
    if((type=box_definitions[type])){
      var c=new measure_cache(elem);
      var r={};
      calculateRelativePosition(r,c,origin||type.default_origin,type.position);
      type.calculate_size(r,c);

      var mat=null;
      if(origin==='page'||origin==='frame'){
        var transf=agh.dom.getCssTransform(elem);
        if(!transf.isIdentity){
          mat=transf;
          r.x-=Math.min(0,r.w*mat[0])+Math.min(0,r.h*mat[2]);
          r.y-=Math.min(0,r.w*mat[1])+Math.min(0,r.h*mat[3]);
        }
      }

      var ret=new Rectangle(r.x,r.y,r.w,r.h);
      ret.matrix2d=mat;

      return ret;
    }
  };

  agh.dom.ElementHighlighter=(function(){
    function ElementMetric(elem){
      var rect;
      rect=agh.dom.getRectangle(elem,'margin-box','page');
      this.mx=rect.x;
      this.my=rect.y;
      this.mw=rect.width;
      this.mh=rect.height;

      rect=agh.dom.getRectangle(elem,'border-box','margin');
      this.ox=rect.x;
      this.oy=rect.y;
      this.ow=rect.width;
      this.oh=rect.height;

      rect=agh.dom.getRectangle(elem,'view-box','border');
      this.vl=rect.x;
      this.vt=rect.y;
      this.vw=rect.width;
      this.vh=rect.height;

      rect=agh.dom.getRectangle(elem,'client-box','border');
      this.cl=rect.x;
      this.ct=rect.y;
      this.cw=rect.width;
      this.ch=rect.height;

      rect=agh.dom.getRectangle(elem,'padding-box','page');
      this.px=rect.x;
      this.py=rect.y;
      this.pw=rect.width;
      this.ph=rect.height;

      this.ml=agh.dom.getStyle(elem,'-agh-margin-left');
      this.mr=agh.dom.getStyle(elem,'-agh-margin-right');
      this.mt=agh.dom.getStyle(elem,'-agh-margin-top');
      this.mb=agh.dom.getStyle(elem,'-agh-margin-bottom');
      this.bl=agh.dom.getStyle(elem,'-agh-border-left-width');
      this.br=agh.dom.getStyle(elem,'-agh-border-right-width');
      this.bt=agh.dom.getStyle(elem,'-agh-border-top-width');
      this.bb=agh.dom.getStyle(elem,'-agh-border-bottom-width');
      this.pl=agh.dom.getStyle(elem,'-agh-padding-left');
      this.pr=agh.dom.getStyle(elem,'-agh-padding-right');
      this.pt=agh.dom.getStyle(elem,'-agh-padding-top');
      this.pb=agh.dom.getStyle(elem,'-agh-padding-bottom');
    }

    function ElementHighlighter(_document){
      this._document=_document||document;
      this.initializeContents();
      this.target=null;
    }
    ElementHighlighter.NOT_TARGET='agh.dom.ElementHighlighter.NOT_TARGET';
    agh.memcpy(ElementHighlighter.prototype,{
      createFrameElement:function(bgcolor,borderStyle,isChild){
        var f=this._document.createElement('div');
        agh.dom.setStyle(f,{
    	    zIndex:65535,
    	    padding:"0px",margin:"0px",overflow:'hidden',
    	    position:'absolute',
          backgroundColor:bgcolor,
          border:borderStyle
        });

        var shift=isChild?-1:0;
        f.setRectangle=function(l,t,w,h){
          agh.dom.setStyle(this,{
            left:(l+shift)+'px',
            top:(t+shift)+'px',
            '-agh-offset-width':w,
            '-agh-offset-height':h
          });
          if(this.e_tips){
            this.e_tips.style.left=l+'px';
            this.e_tips.style.top=(t+h+2)+'px';
          }
        };
        f.clear=function(){this.setRectangle(0,0,20,20);};
        f[ElementHighlighter.NOT_TARGET]=true;
        f.clear();
        return f;
      },
      initializeContents:function(){
        this.panel1=this._document.createElement('div');
        agh.dom.setStyle(this.panel1,{
    	    zIndex:1,
    	    backgroundColor:"white",
    	    position:"absolute",left:"0px",top:"0px",
    	    color:"red",margin:"0px",padding:"1ex",fontFamily:"monospace",fontSize:'10px',
          '-agh-opacity':0.7
        });
        this.panel1[ElementHighlighter.NOT_TARGET]=true;
        this._document.body.appendChild(this.panel1);

        this.frame1=this.createFrameElement('#77f','1px dashed blue');
        {
          this.frame2=this.createFrameElement('#f77','1px dashed red',true);
          {
            this.frame3=this.createFrameElement('#c7f','1px dashed purple',true);
            this.frame2.appendChild(this.frame3);
            this.frame4=this.createFrameElement('white','1px dashed black',true);
            this.frame2.appendChild(this.frame4);
          }
          this.frame1.appendChild(this.frame2);
        }
        agh.dom.setStyle(this.frame1,'-agh-opacity',0.4);
        this.frame1.e_tips=this.panel1;
        this._document.body.appendChild(this.frame1);

        this.frame5=this.createFrameElement('transparent','1px dashed green');
        agh.dom.setStyle(this.frame5,'-agh-opacity',0.6);
        this._document.body.appendChild(this.frame5);
      },
      clearHighlightTarget:function(){
        this.target=null;
        this.frame1.style.display='none';
        this.frame5.style.display='none';
        this.panel1.style.display='none';

        // clear state
        // agh.dom.setStyle(this.frame5,{borderWidth:'1px'});
        // agh.dom.setInnerText(this.panel1,"");
        // this.frame1.clear();
        // this.frame2.clear();
        // this.frame3.clear();
        // this.frame4.clear();
        // this.frame5.clear();
      },

      setHighlightTarget:function(elem){
        if(this.target==elem)return;

        if(elem[ElementHighlighter.NOT_TARGET]){
          this.clearHighlightTarget();
          return;
        }else{
          this.target=elem;
          this.frame1.style.display='block';
          this.frame5.style.display='block';
          this.panel1.style.display='block';
        }

        var m=new ElementMetric(elem);
        this.frame1.setRectangle(m.mx,m.my,m.mw,m.mh);
        this.frame2.setRectangle(m.ox,m.oy,m.ow,m.oh);
        this.frame3.setRectangle(m.vl,m.vt,m.vw,m.vh);
        this.frame4.setRectangle(m.cl,m.ct,m.cw,m.ch);
        agh.dom.setStyle(this.frame5,{
          borderTop:m.pt>0?m.pt+"px solid green":'1px solid #0f0',
          borderLeft:m.pl>0?m.pl+"px solid green":'1px solid #0f0',
          borderRight:m.pr>0?m.pr+"px solid green":'1px solid #0f0',
          borderBottom:m.pb>0?m.pb+"px solid green":'1px solid #0f0'
        });
        this.frame5.setRectangle(m.px,m.py,m.pw,m.ph);
        this.panel1.innerHTML=[
          // "wh({w}, {h})".format(m),
          "margin-box: xywh({mx}, {my}, {mw}, {mh})".format(m),
          "- border-box: xywh({ox}, {oy}, {ow}, {oh})".format(m),
          "--- view-box: xywh({vl}, {vt}, {vw}, {vh})".format(m),
          "--- client-box: xywh({cl}, {ct}, {cw}, {ch})".format(m),
          "padding-box: xywh({px}, {py}, {pw}, {ph})".format(m),
          "- content-box: xywh({Cx}, {Cy}, {Cw}, {Ch})".format({Cx:m.px+m.pl,Cy:m.py+m.pt,Cw:m.pw-m.pl-m.pr,Ch:m.ph-m.pt-m.pb}),
          "margin: {mt}px {mr}px {mb}px {ml}px".format(m),
          "padding: {pt}px {pr}px {pb}px {pl}px".format(m),
          "border-width: {bt}px {bb}px {br}px {bl}px".format(m),
          "nest = "+get_chain(elem),
          // "calc_path = ({path_x}, {path_y})".format(m)
          ""
        ].join("<br />");

        function get_chain(elem){
          if(elem==null)return null;
          var r='<b>'+elem.tagName+'</b>';
          var o=getOffsetParent(elem);
          elem=elem.parentNode;
          while(elem!=null&&elem.tagName){
            if(elem==o){
              r="<b>"+elem.tagName+"</b> &gt; "+r
              o=getOffsetParent(elem);
            }else{
              r=elem.tagName+" &gt; "+r
            }
            elem=elem.parentNode;
          }
          return r;
        }
      }
    });

    return ElementHighlighter;
  })();

  agh.dom.debug1=function debug1(){
    var h=new agh.dom.ElementHighlighter();
    agh.addEventListener(document,'click',function(e){
      var elem=e.srcElement||e.target;
      if(elem!=null)
        h.setHighlightTarget(elem);
    });
  };

  agh.dom.debug2=function debug1(){
    function focus(elem,x,y){
      var chl=elem.children;
      for(var i=0;i<chl.length;i++){
        var ch=chl[i];
        if(ch[agh.dom.ElementHighlighter.NOT_TARGET])continue;
        var rect=agh.dom.getRectangle(ch,'border-box','frame');
        if(rect&&rect.contains(x,y))
          return ch;
      }
      return null;
    }

    var h=new agh.dom.ElementHighlighter();
    agh.addEventListener(document,'mousemove',function(e){
      var elem=e.srcElement||e.target;
      if(elem==null)return;

      if(elem[agh.dom.ElementHighlighter.NOT_TARGET]){
        if(h.target==null)return;

        var x=e.clientX;
        var y=e.clientY;
        // var elem=h.target;
        var elem=elem.ownerDocument.body;
        if(elem==null)return;
        for(var next;(next=focus(elem,x,y))!=null;)
          elem=next;

        if(elem[agh.dom.ElementHighlighter.NOT_TARGET])return;
      }

      h.setHighlightTarget(elem);
    });
  };

  //---------------------------------------------------------------------------
  // イベント

  if(agh.browser.vIE<9){
    var dispatchEvent=function(elem,eventName,params){
      var e=document.createEventObject();
      e.type=eventName;

      if(params)
        agh.memcpy(e,params);

      elem.fireEvent("on"+eventName,e);
    };
  }else{
    var dispatchEvent=function(elem,eventName,params){
      var e=document.createEvent(params&&params.eventType||"HTMLEvents");
      var bubbles=params&&params.bubbles!=null?params.bubbles:false;
      var cancelable=params&&params.cancelable!=null?params.cancelable:false;
      e.initEvent(eventName,bubbles,cancelable);

      if(params)
        agh.memcpy(e,params);

      return elem.dispatchEvent(e);
    };
  }

  var EventDefinitions={};
  agh.dom.attach=function(elem,name,handler,useCapture){
    if(name in EventDefinitions){
      return EventDefinitions[name].add(elem,name,handler,useCapture);
    }else{
      return agh.addEventListener(elem,name,handler,useCapture);
    }
  };
  agh.dom.detach=function(elem,name,handler,useCapture){
    if(name in EventDefinitions){
      return EventDefinitions[name].remove(elem,name,handler,useCapture);
    }else{
      return agh.removeEventListener(elem,name,handler,useCapture);
    }
  };
  agh.dom.fire=function(elem,name,params){
    if(name in EventDefinitions){
      return EventDefinitions[name].fire(elem,name,params);
    }else{
      return dispatchEvent(elem,name,params);
    }
  };

  function CustomEventInfo(elem){
    this.elem=elem;
    this.capt={};
    this.bubl={};
    this.flags={};
  }
  CustomEventInfo.Key='[[agh.dom.CustomEventInfo]]';
  agh.memcpy(CustomEventInfo,{
    flag:function(target,flagName,value){
      var info=target[CustomEventInfo.Key];
      if(arguments.length===2){
        /// @fn CustomEventInfo.flag(target,flagName)
        ///   target に関連付けられた変数の値を取得します。
        ///   @param[in] target   値の関連付けられた対象のオブジェクトを指定します。
        ///   @param[in] flagName 変数名を指定します。
        if(!info)
          return undefined;
        return info.flags[flagName];
      }else if(arguments.length===3){
        /// @fn CustomEventInfo.flag(target,flagName,value)
        ///   target に関連付けられた値を設定します。
        ///   @param[in] target   関連付ける対象のオブジェクトを指定します。
        ///   @param[in] flagName 変数名を指定します。
        ///   @param[in] value    新しい値を指定します。
        ///   @return target に関連付けられていた古い値を返します。
        if(!info)
          info=target[CustomEventInfo.Key]=new CustomEventInfo(target);
        var oldValue=info.flags[flagName];
        info.flags[flagName]=value;
        return oldValue;
      }
    },
    add:function(target,eventName,handler,useCapture){
      var info=target[CustomEventInfo.Key];
      if(!info)info=target[CustomEventInfo.Key]=new CustomEventInfo(target);
      var dict=useCapture?info.capt:info.bubl;
      var hlist=dict[eventName];
      if(!hlist)hlist=dict[eventName]=[];
      hlist.push(handler);
    },
    remove:function(target,eventName,handler,useCapture){
      var info=target[CustomEventInfo.Key];
      if(!info)return false;
      var dict=useCapture?info.capt:info.bubl;
      var hlist=dict[eventName];
      if(!hlist)return false;

      var index=agh.Array.indexOf(hlist,handler);
      if(index>=0){
        agh.Array.remove_atD(hlist,index);
        return true;
      }else
        return false;
    },
    _simple_fire:function(target,eventName,params,useCapture){
      var info=target[CustomEventInfo.Key];
      if(!info)return true; // true = キャンセルされず
      var dict=useCapture?info.capt:info.bubl;
      var hlist=dict[eventName];
      if(!hlist)return true;

      // * 複数の handler が登録されている時は登録された順に実行される。
      // * preventDefault, stopPropagation しても同じ所に登録された handler は常に実行する。
      params.currentTarget=target;
      for(var i=0,iN=hlist.length;i<iN;i++){
        try{
          hlist[i].call(target,agh.wrap(params));
        }catch(ex){
          if(!agh.scripts.invoke_onerror(hlist[i],ex))
            window.setTimeout(function(){throw ex;},0);
        }
      }
    },
    _create_propagate_chain:function(target){
      if(target.nodeType!=null){
        var chain=[];
        var ent=target;
        do chain.push(ent);while((ent=ent.parentNode));
        chain.push(target.ownerDocument);
        chain.push(target.ownerDocument.defaultView||window);
        return chain;
      }else if(target.defaultView){
        return [target,target.defaultView];
      }else
        return [target];
    },
    fire:function(target,eventName,params){
      var _defaultCanceled=false;
      var _propagateCanceled=false;
      params.target=target;
      params.type=eventName;
      params.preventDefault=function(){_defaultCanceled=true;};
      if(params.cancelable)
        params.stopPropagation=function(){_propagateCanceled=true;};
      else
        params.stopPropagation=_empty;
      params.preventBubble=null;
      params.preventCapture=null;

      if(params.bubbles){
        var chain=this._create_propagate_chain(target);

        // capturing
        for(var i=chain.length;!_propagateCanceled&&--i>=0;)
          this._simple_fire(chain[i],eventName,params,true);

        // bubbling
        for(var i=0;!_propagateCanceled&&i<chain.length;i++)
          this._simple_fire(chain[i],eventName,params,false);
      }else{
        this._simple_fire(target,eventName,params,true);
        if(!_propagateCanceled)
          this._simple_fire(target,eventName,params,false);
      }

      // cancelBubble/returnValue の状態を fire 元に返す:
      params.cancelBubble=_propagateCanceled;
      params.returnValue=!_defaultCanceled;
      return !_defaultCanceled;
    }
  });

  agh.dom.defineCustomEvent=function defineCustomEvent(eventName,definition){
    if(arguments.length===1&&arguments[0] instanceof Object){
      var dict=arguments[0];
      var keys=agh.ownkeys(dict);
      for(var i=0,iN=keys.length;i<iN;i++)
        defineCustomEvent(keys[i],dict[keys[i]]);
    }else{
      if(definition==null)definition={};

      // add/remove
      if(!('add' in definition)){
        if('init' in definition){
          definition.add=function(target,eventName,handler,useCapture){
            if(!CustomEventInfo.flag(target,"init:"+eventName,true))
              definition.init(target,eventName);
            CustomEventInfo.add(target,eventName,handler,useCapture);
          };
        }else{
          definition.add=function(target,eventName,handler,useCapture){
            CustomEventInfo.add(target,eventName,handler,useCapture);
          };
        }

        definition.remove=function(target,eventName,handler,useCapture){
          CustomEventInfo.remove(target,eventName,handler,useCapture);
        };
      }

      // fire
      if(!('fire' in definition)){
        definition.fire=function(target,eventName,params){
          CustomEventInfo.fire(target,eventName,params);
        };
      }

      EventDefinitions[eventName]=definition;
    }
  };

  //-----------------------------------
  // ModifiedMouseEvent

  if(agh.browser.vIE<=8){
    var modifyMouseEventArgs=function(e){
      e.buttons={
        left:!!(e.button&1),
        mid:!!(e.button&4),
        right:!!(e.button&2)
      };

      if(e.srcElement!=null){
        // TODO: 実は body のスクロール量を足すだけで良い? pageX/pageY の仕様に依存
        //e.pageX=e.offsetX+agh(e.srcElement,'E')._.getPageX();
        //e.pageY=e.offsetY+agh(e.srcElement,'E')._.getPageY();
        var _document=e.srcElement.ownerDocument;
        var body=_document.body;
        var html=_document.documentElement;
        e.pageX=e.clientX+(body.scrollLeft||html.scrollLeft);
        e.pageY=e.clientY+(body.scrollTop||html.scrollTop);
      }
    };
  }else{
    var modifyMouseEventArgs=function(e){
      e.buttons={
        left:e.button==0,
        mid:e.button==1,
        right:e.button==2
      };
    };
  }

  function fireModifiedMouseEvent(target,customEvent,e){
    // ※agh.wrap ではなく agh.memcpy を使うのは、
    //   メソッドの実行・プロパティの書き換えが元の e に及ばない様にする為。
    //   実際に agh.wrap をすると "button property が
    //   MouseEvent じゃない物に対して適用されました" 等のエラーが出る。
    var args=agh.memcpy(agh.memcpy({},e),{bubbles:false});
    modifyMouseEventArgs(args);
    if(CustomEventInfo.fire(target,customEvent,args)){
      return true;
    }else{
      e.preventDefault(); // agh.addEventListener
      return false;
    }
  }

  function attachModifiedMouseEvent(target,originalEvent,customEvent){
    agh.addEventListener(target,originalEvent,function(e){
      return fireModifiedMouseEvent(target,customEvent,e);
    },false);
  }

  if(agh.browser.vIE){
    var initMouseEvents=function(target){
      if(CustomEventInfo.flag(target,'agh.dom.initMouseEvents',true))return;

      var mousedown_prevup=false;

      // mouseup
      agh.addEventListener(target,'mouseup',function(e){
        mousedown_prevup=true;
        return fireModifiedMouseEvent(target,'-agh-mouseup',e);
      },false);

      // mousemove
      agh.addEventListener(target,'mousemove',function(e){
        mousedown_prevup=false;
        return fireModifiedMouseEvent(target,'-agh-mousemove',e);
      },false);

      // mousedown
      agh.addEventListener(target,'selectstart',function(e){
        if(!mousedown_prevup)return;

        var args=agh.memcpy(agh.memcpy({},e),{bubbles:false});
        args.button|=1;
        modifyMouseEventArgs(args);
        CustomEventInfo.fire(target,'-agh-mousedown',args);
        return true;
      },false);
      attachModifiedMouseEvent(target,'mousedown','-agh-mousedown');

      // click
      attachModifiedMouseEvent(target,'click','-agh-click');
      attachModifiedMouseEvent(target,'dblclick','-agh-click');

      // mouseenter
      // mouseleave
      attachModifiedMouseEvent(target,'mouseenter','-agh-mouseenter');
      attachModifiedMouseEvent(target,'mouseleave','-agh-mouseleave');
    };
  }else{
    var initMouseEvents=function(target){
      if(CustomEventInfo.flag(target,'agh.dom.initMouseEvents',true))return;

      attachModifiedMouseEvent(target,'mouseup','-agh-mouseup');
      attachModifiedMouseEvent(target,'mousemove','-agh-mousemove');
      attachModifiedMouseEvent(target,'mousedown','-agh-mousedown');
      attachModifiedMouseEvent(target,'click','-agh-click');

      // mouseenter
      // mouseleave
      var state_hover=false;
      var targetPropertyName=agh.browser.vFx?"relatedTarget":"toElement";
      agh.addEventListener(target,'mouseover',function(e){
        if(state_hover)return;
        state_hover=true;

        var args=agh.memcpy(agh.memcpy({},e),{bubbles:false});
        modifyMouseEventArgs(args);
        CustomEventInfo.fire(target,'-agh-mouseenter',args);
        return true;
      },false);
      agh.addEventListener(target,'mouseout',function(e){
        if(!state_hover)return;
        var toElement=e[targetPropertyName];
        if(toElement!=target&&!agh.dom.isDescendantOf(toElement,target)){
          state_hover=false;

          var args=agh.memcpy(agh.memcpy({},e),{bubbles:false});
          modifyMouseEventArgs(args);
          CustomEventInfo.fire(target,'-agh-mouseleave',args);
          return true;
        }
      },false);
    };
  }

  agh.dom.defineCustomEvent({
    '-agh-click'     :{init:initMouseEvents},
    '-agh-mousedown' :{init:initMouseEvents},
    '-agh-mouseup'   :{init:initMouseEvents},
    '-agh-mousemove' :{init:initMouseEvents},
    '-agh-mouseenter':{init:initMouseEvents},
    '-agh-mouseleave':{init:initMouseEvents}
  });

  //-----------------------------------
  // capture

  (function(){
    agh.dom.defineCustomEvent('-agh-capturestart');
    agh.dom.defineCustomEvent('-agh-captureend');

    var state_target=null;
    var state_bubble=false;
    function registerCapture(target,bubble){
      if(state_target===target)return;
      clearCapture(state_target);
      state_target=target;
      state_bubble=!!bubble;
      CustomEventInfo.fire(state_target,'-agh-capturestart',{});
    }
    function clearCapture(target,bubble){
      if(state_target==null||target!==state_target)return;
      CustomEventInfo.fire(state_target,'-agh-captureend',{});
      state_target=null;
      state_bubble=null;
    }
    function stop_event(e){
      // 強制停止 (他の要素にイベントが伝播しない様にする)
      // ※agh.addEventListener で preventDefault/stopPropagation は保証されている。
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    agh.addEventListener(document,"mousemove",function(e){
      if(state_target){
        var args=agh.memcpy(null,e);
        args.bubbles=state_bubble;
        modifyMouseEventArgs(args);
        CustomEventInfo.fire(state_target,'-agh-mousemove',args);
        return stop_event(e);
      }
    },false);
    agh.addEventListener(document,"mouseup",function(e){
      if(state_target){
        var args=agh.memcpy(null,e);
        args.bubbles=state_bubble;
        modifyMouseEventArgs(args);
        CustomEventInfo.fire(state_target,'-agh-mouseup',args);
        return stop_event(e);
      }
    },false);
    agh.addEventListener(document,"mousedown",function(e){
      if(state_target){
        var args=agh.memcpy(null,e);
        args.bubbles=state_bubble;
        modifyMouseEventArgs(args);
        CustomEventInfo.fire(state_target,'-agh-mousedown',args);
        return stop_event(e);
      }
    },false);

    // setCapture は IE6, Fx4 にある。今後他のブラウザも対応するかも。
    agh.dom.captureMouse=function(elem,bubble){
      registerCapture(elem,bubble);
      if(bubble!=null&&elem.setCapture)
        elem.setCapture(bubble);
    };
    agh.dom.releaseMouse=function(elem,bubble){
      clearCapture(elem,bubble);
      if(bubble!=null&&elem.releaseCapture)
        elem.releaseCapture(bubble);
    };
  })();

/* ToDo agh.dom1.js からの移植
 *
 * @fn agh.document.parseLength
 *
 * @var agh.document.head
 * @var agh.document.body
 * @var agh.document.html
 * @var agh.document.doctype
 * @fn  agh.document.createElement
 *
 * 以下は、調べた所誰も使っていない
 *
 * @section complements
 * @fn  CSSStyleSheet.prototype.addRule
 * @var CSSStyleSheet.prototype.rules
 * @var HTMLElement.prototype.currentStyle
 * @fn ns.StyleSheet.addRule
 * @fn ns.StyleSheet.getStyleValue
 *
 * @namespace agh.document
 * @fn  agh.document.getElementsByClassName
 * @fn  agh.document.getElementsByTagName // 不完全
 *
 */

});
