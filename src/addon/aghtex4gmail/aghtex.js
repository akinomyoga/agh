// -*- mode:js;coding:utf-8 -*-
agh.scripts.register("addon/aghtex.js",[
  "agh.js",
  "agh.text.js",
  "agh.lang.tex.js"
],function(){
  agh.Namespace("Utils",agh.LaTeX);
  var aghtex=agh.LaTeX.Utils;

  var common=""; // preamble
  agh.memcpy(aghtex,{
    NodeTypeELEMENT_NODE:document.ELEMENT_NODE||1,
    NodeTypeTEXT_NODE:document.TEXT_NODE||3,
    className_switch_src:"aghtex-switch-src",
    className_switch_tex:"aghtex-switch-tex",
    className_switch_on :"aghtex-switch-on",
    className_switch_off:"aghtex-switch-off"
  });

  agh.memcpy(aghtex,{
    html_escape_soft:function(text){
      return text.replace(/[\<\>\&"]/g,function($0){
        switch($0){
        case '<':return "&lt;";
        case '>':return "&gt;";
        case '&':return "&amp;";
        case '"':return "&quot;";
        default:return $0;
        }
      });
    },
    html_escape_pre:function(text){
      return text.replace(/(?:[\<\>\&"\n]|\r\n?)/g,function($0){
        switch($0){
        case '<':return "&lt;";
        case '>':return "&gt;";
        case '&':return "&amp;";
        case '"':return "&quot;";
        case '\r':case '\r\n':
        case '\n':return "<br />";
        default:return $0;
        }
      });
    },
    html_remove_tag:function(html){
      return html.replace(/\<(?:[^"'<>]|"(?:[^"]*)"|'(?:[^']*)')+\>/g,"");
    },
    dom_hasClassName:function(elem,className){
      var cls=elem.className;
      var i=cls.indexOf(className);
      var j=i+className.length;
      return i>=0
        &&(i==0||/\s/.test(cls.substr(i-1,1)))
        &&(j==cls.length||/\s/.test(cls.substr(j,1)));
    },
    dom_addClassName:function(elem,className){
      if(elem.className&&elem.className.length!=0)
        elem.className=className+" "+elem.className;
      else
        elem.className=className;
    },
    dom_getElementsByClassName:(function(){
      if(agh.browser.vIE&&agh.browser.vIE<9)
        return function(node,className){
          function recursive(elem){
            for(var i=0,iN=elem.childNodes.length;i<iN;i++){
              var node=elem.childNodes[i];
              if(node.nodeType==aghtex.NodeTypeELEMENT_NODE){
                if(aghtex.dom_hasClassName(node,className))
                  buff.push(node);
                recursive(node);
              }
            }
          }

          var buff=[];
          if(node.nodeType==aghtex.NodeTypeELEMENT_NODE)
            recursive(node);
          return buff;
        };
      else
        return function(node,className){
          return node.getElementsByClassName(className);
        };
    })(),
    dom_istag:function(elem,tagName){
      return elem&&elem.tagName&&elem.tagName.toLowerCase()==tagName;
    },
    dom_update_style:function(elem,prop,value){
      if(elem.style[prop]!=value)
        elem.style[prop]=value;
    },
    dom_getTextNodes:function(elem){
      function recursive(e,buff){
        e.childNodes
        for(var i=0,iN=e.childNodes.length;i<iN;i++){
          var node=e.childNodes[i];
          if(node.nodeType==aghtex.NodeTypeTEXT_NODE)
            buff.push(node);
          else if(node.nodeType==aghtex.NodeTypeELEMENT_NODE)
            recursive(node,buff);
        }
      }
      var ret=[];
      recursive(elem,ret);
      return ret;
    },
    dom_getInnerText:(function(){
      if(agh.browser.vIE&&agh.browser.vIE<9)
        return function(elem){return elem.innerText;};
      else
        return function(elem){return elem.textContent;};
    })(),
    dom_getTextNodeContent:(function(){
      if(agh.browser.vIE&&agh.browser.vIE<9)
        return function(node){return node.data;};
      else
        return function(node){return node.textContent;};
    })(),
    dom_getInnerTextAndBr:function(elem){
      /// br を正しく改行として取得します。

      function enumerate(buff,elem){
        for(var i=0,iN=elem.childNodes.length;i<iN;i++){
          var node=elem.childNodes[i];
          if(node.nodeType==aghtex.NodeTypeTEXT_NODE)
            buff.push(aghtex.dom_getTextNodeContent(node));
          else if(node.nodeType==aghtex.NodeTypeELEMENT_NODE){
            var tagName=node.tagName.toLowerCase();
            if(tagName=="br")
              buff.push("\n");
            else{
              //■ブロック要素などの場合に改行を挿入する■
              enumerate(buff,node);
            }
          }
        }
      }

      var buff=[];
      enumerate(buff,elem);
      return buff.join("");
    },
    dom_addEventListener:(function(){
      if(agh.browser.vIE<9){
        /* ASSUMPTION for vIE<9:
         *   this function should not be defined in a permanent script context
         *   (like a background page in a Chrome Extension)
         *
         *   IE で永続的なスクリプトコンテクストからこの関数を利用する場合、
         *   各ページ (独立な寿命を持つスクリプトコンテクストの各単位) に対して、
         *   この関数 dom_addEventListener を生成する様に書き換える必要があります。
         */

        var resource=[];
        var window_onunload=function(){
          for(var i=0,iN=resource.length;i<iN;i++){
            try{
              var elem=resource[i][0];
              var eventName=resource[i][1];
              var listener=resource[i][2];
              elem.detachEvent(eventName,listener);
              resource[i][0]=null;
              resource[i][1]=null;
              resource[i][2]=null;
            }catch(ex){}
          }
          resource.length=0;
        };
        resource.push([window,"onunload",window_onunload]);
        window.attachEvent("onunload",window_onunload);

        return function(elem,eventName,listener,useCapture){
          eventName="on"+eventName;
          if(elem.attachEvent(eventName,listener)){
            //alert("dbg20121215 addEL: "+eventName+" ok");
            resource.push([elem,eventName,listener]);
            return true;
          }else{
            //alert("dbg20121215 addEL: "+eventName+" failed");
            return false;
          }
        };
      }

      // default
      return function(elem,eventName,listener,useCapture){
        //alert("dbg20121215 addEL: "+eventName);
        return elem.addEventListener(eventName,listener,useCapture);
      };
    })(),
    _:0
  });
  agh.memcpy(aghtex,{
    html_create_range:(function(){
      var reg_tex_range=new RegExp("{c1}|{h}{c2}{t}|{h}{c3}{t}|{h}{c4}{t}|{c5}".format({
        h:/(?::n\s*)?/.source,
        t:/(?:\s*:n)?/.source,
        //c1:/\$((?:[^\$\<]|\<(?![bB][rR]\s*\/?\>\s*:n))+)\$/.source,
        c1:/\$(?=[^$\s])((?:[^\$\<]|\<(?![bB][rR]\s*\/?\>\s*:n))*[^$\s])\$/.source,
        c2:/\$\$((?:[^\$\<]|\$(?!\$)|\<(?![bB][rR]\s*\/?\>\s*:n))+)\$\$/.source,
        c3:/(\\begin\s*\{\s*eqnarray\*\s*\}(?:[^\\]|\\(?!end\s*\{\s*eqnarray\*\s*\}))*\\end\s*\{\s*eqnarray\*\s*\})/.source,
        c4:/\`\#tex-para\#((?:[^#]|\#(?!\#\'))+)\#\#\'/.source,
        c5:/(\\documentclass\b(?:[^\\]|\\(?!begin\s*\{\s*document\s*\}))+\\begin\s*\{\s*document\s*\}(?:[^\\]|\\(?!end\s*\{\s*document\s*\}))*\\end\s*\{\s*document\s*\})/.source
      }).replace(/:n/g,/\<[bB][rR]\s*\/?\>/.source),'g');

      var remove_anchors=function(html){
        return html.replace(/(^|\<br\s*\/?\>)(?:[ \t]*\&gt\;)+/g,"$1");
      };

      return function(html){
        var fREP=0;
        var html1=html.replace(reg_tex_range,function($0,$1,$2,$3,$4,$5){
          if($1&&$1!=""){
            fREP++;
            var src=remove_anchors($1);
            return '<span class="aghtex-math" title="'+aghtex.html_remove_tag(src)+'">'+src+'</span>';
          }else if($2&&$2!=""){
            fREP++;
            var src=remove_anchors($2);
            return '<p class="aghtex-equation"><span class="aghtex-math" title="'+aghtex.html_remove_tag(src)+'">'+src+'</span></p>';
          }else if($3&&$3!=""){
            fREP++;
            var src=remove_anchors($3);
            return '<div class="aghtex-eqnarray aghtex-para" title="'+aghtex.html_remove_tag(src)+'">'+src+'</div>';
          }else if($4&&$4!=""){
            fREP++;
            var src=remove_anchors($4);
            // return '<div class="aghtex-para" title="'+aghtex.html_remove_tag(src)+'">'+src+'</div>';
            return '<div class="aghtex-para">'+src+'</div>';
          }else if($5&&$5!=""){
            fREP++;
            var src=remove_anchors($5);
            // return '<div class="aghtex-full" title="'+aghtex.html_remove_tag(src)+'">'+src+'</div>';
            return '<div class="aghtex-full">'+src+'</div>';
          }else{
            return $0;
          }
        });
        if(fREP==0)return null;
        return html1;
      };
    })(),
    tex_transform:(function(){
      var sethtml=function(elem,html){
        elem.innerHTML=html;
      };
      var sethtml_math=function(elem,html){
        elem.innerHTML="<tex:math></tex:math>";
        elem.firstChild.innerHTML=html;
      };

      agh.LaTeX.ContextFactory['global'].DefineCommand({AghTeXSplitter:['s@','(@)']});

      var tex_modes={
        full_texview:{
          transform:function(source){
            var doc=new agh.LaTeX.Document(common+source,"global");
            doc.Parse();
            doc.ResolveReferences();

            var DOCV_FILE_TOC='mod:ref/toc';
            if(doc[DOCV_FILE_TOC])
              return {html:doc.html,toc:doc[DOCV_FILE_TOC].data};
            else
              return {html:doc.html};
          },
          sethtml:sethtml
        },
        full:{
          transform:function(source){
            var doc=new agh.LaTeX.Document(common+source,"global");
            doc.Parse();
            doc.ResolveReferences();
            return doc.html;
          },
          sethtml:sethtml
        },
        para:{
          transform:function(source){
            var doc=new agh.LaTeX.Document(common+source,["global","mode.para"]);
            agh.LaTeX.Document.Packages["amssymb"](doc,"","amssymb");
            agh.LaTeX.Document.Packages["amsmath"](doc,"","amsmath");
            return doc.Parse();
          },
          sethtml:sethtml
        },
        math:{
          transform:function(source){
            var doc=new agh.LaTeX.Document(common+source,["global","mode.math"]);
            agh.LaTeX.Document.Packages["amssymb"](doc,"","amssymb");
            agh.LaTeX.Document.Packages["amsmath"](doc,"","amsmath");
            return doc.Parse();
          },
          sethtml:sethtml_math
        },
        eqnarr:{
          transform:function(source,option){
            source="\\begin{array}[t]{r@{&nbsp;}c@{&nbsp;}l}"+source+"\\end{array}";
            if(/\bbraced\b/.test(option))
              source="\\left\\{"+source+"\\right.";
            var doc=new agh.LaTeX.Document(common+source,["global","mode.math"]);
            agh.LaTeX.Document.Packages["amssymb"](doc,"","amssymb");
            agh.LaTeX.Document.Packages["amsmath"](doc,"","amsmath");
            return doc.Parse();
          },
          sethtml:sethtml_math
        }
      };

      return function(target,mode,option){
        mode=tex_modes[mode];
        if(mode==null)mode=tex_modes["full"];

        if(agh.is(target,String)){
          return mode.transform(target,option);
        }else if(agh.is(target,Array)){
          var elems=target;

          var texbuff=[];
          for(var i=0;i<elems.length;i++)
            texbuff.push(aghtex.dom_getInnerText(elems[i]));

          var htmlbuff=mode.transform(texbuff.join("\\AghTeXSplitter{}"),option).split("(@)");
          for(var i=0;i<elems.length;i++)
            mode.sethtml(elems[i],htmlbuff[i]);
        }else{ // if('tagName' in target)
          var span=target;
          var result=mode.transform(aghtex.dom_getInnerText(span),option);
          mode.sethtml(span,result);
        }
      };
    })()
  });

  //***************************************************************************
  //  aghtexSetupMailbody
  //---------------------------------------------------------------------------
  aghtex.Range=function(_document){
    this.empty=true;
    this.nodes=[];
    this.tbuff=[];
    this._document=_document||document;
  }
  agh.memcpy(aghtex.Range.prototype,{
    register_node:function(node){
      if(node.nodeType==aghtex.NodeTypeTEXT_NODE){ // #text
        this.nodes.push(node);
        if(node.aghtex_ispre)
          this.tbuff.push(aghtex.html_escape_pre(aghtex.dom_getTextNodeContent(node)));
        else
          this.tbuff.push(aghtex.html_escape_soft(aghtex.dom_getTextNodeContent(node)));
        this.empty=false;
        return true;
      }else if(node.nodeType==aghtex.NodeTypeELEMENT_NODE){
        if(/^br$/i.test(node.tagName)){
          this.nodes.push(node);
          this.tbuff.push("<br />");
          this.empty=false;
          return true;
        }else if(node.aghtex_ignore_content){
          this.nodes.push(node);
          this.empty=false;
          return true;
        }
      }
      return false;
    },
    get_latex_target:function(elems_tex){
      // pickup texs
      var html1=aghtex.html_create_range(this.tbuff.join(""));
      if(html1==null)return;

      // create elements
      var div=this._document.createElement("div");
      div.innerHTML=html1;

      var maths=aghtex.dom_getElementsByClassName(div,"aghtex-math");
      for(var i=0,iN=maths.length;i<iN;i++)elems_tex.math.push(maths[i]);
      elems_tex.length+=maths.length;

      var paras=aghtex.dom_getElementsByClassName(div,"aghtex-para");
      for(var i=0,iN=paras.length;i<iN;i++)elems_tex.para.push(paras[i]);
      elems_tex.length+=paras.length;

      var fulls=aghtex.dom_getElementsByClassName(div,"aghtex-full");
      for(var i=0,iN=fulls.length;i<iN;i++)elems_tex.full.push(fulls[i]);
      elems_tex.length+=fulls.length;

      // add new contents
      var axis=this.nodes[0];
      var parent=axis.parentNode;
      var _document=this._document;
      agh.Array.each(agh(div.childNodes,Array),function(node){
        if(node.nodeType!=aghtex.NodeTypeELEMENT_NODE){
          var elem=_document.createElement('span');
          elem.appendChild(node);
          elem.className=aghtex.className_switch_tex;
          node=elem;
        }

        aghtex.dom_addClassName(node,aghtex.className_switch_tex);
        parent.insertBefore(node,axis);
      });

      // remove old contents
      for(var i=0,iN=this.nodes.length;i<iN;i++){
        var node=this.nodes[i];
        if(node.parentNode==null)continue;

        if(node.nodeType!=aghtex.NodeTypeELEMENT_NODE){
          var elem=this._document.createElement('span');
          node.parentNode.insertBefore(elem,node);
          elem.appendChild(node);
          node=elem;
        }

        aghtex.dom_addClassName(node,aghtex.className_switch_src);
      }
    }
  });

  aghtex.SetupMailbody20111203=function(_document,body,childNodes){
    var nodes=childNodes(body);

    // capture continued-text range
    var ranges=[];
    var range=new aghtex.Range(_document);
    for(var i=0,iN=nodes.length;i<iN;i++){
      var node=nodes[i];
      if(!range.register_node(node)){
        if(!range.empty){
          ranges.push(range);
          range=new aghtex.Range(_document);
        }
      }
    }
    if(!range.empty)
      ranges.push(range);

    // replace range
    var elems_tex={math:[],para:[],full:[],length:0};
    for(var i=0,iN=ranges.length;i<iN;i++)
      ranges[i].get_latex_target(elems_tex);
    if(elems_tex.length==0)return;

    // tex transform
    var backgroundColorDefault=body.style.backgroundColor;
    body.style.backgroundColor="#FFF8F8";
    if(elems_tex.math.length!=0)
      aghtex.tex_transform(elems_tex.math,"math","");
    if(elems_tex.para.length!=0)
      aghtex.tex_transform(elems_tex.para,"para","");
    if(elems_tex.full.length!=0){
      for(var i=0,iN=elems_tex.full.length;i<iN;i++)
        aghtex.tex_transform(elems_tex.full[i],"full","");
    }
    body.style.backgroundColor=backgroundColorDefault;

    // on/off switch
    aghtex.dom_addClassName(body,aghtex.className_switch_on);
    body.aghtex_switch=true;
    body.style.position="relative";
    var button=_document.createElement('span');
    button.className="aghtex-switch-button";
    button.innerHTML=aghtex.tex_transform("\\rm agh{\\TeX}4GMail On/Off","para");
    aghtex.dom_addEventListener(button,'click',function(){
      if(body.aghtex_switch){
        body.className=body.className.replace(aghtex.className_switch_on,aghtex.className_switch_off);
        body.aghtex_switch=false;
      }else{
        body.className=body.className.replace(aghtex.className_switch_off,aghtex.className_switch_on);
        body.aghtex_switch=true;
      }
    },false);
    body.appendChild(button);
  };

  //***************************************************************************
  //  addonPreviewInitializer
  //---------------------------------------------------------------------------
  aghtex.addonPreviewInitializer=(function(){
    function addonPreviewInitializer(eedit,eprev,prefs){
      this.eedit=eedit;
      this.eprev=eprev;

      this.prefs={
        button_style_right:"3px",
        button_style_display:"fixed",
        button_parent_elem:this.eprev.parentNode
      };
      if(prefs!=null)
        agh.memcpy(this.prefs,prefs);
    }
    agh.memcpy(addonPreviewInitializer.prototype,{
      InitAutoTransform:function(){
        var m_timerid=null;
        var eedit=this.eedit;
        var eprev=this.eprev;
        var type=/^textarea$/i.test(eedit.tagName)?"textarea":"elem";
        var update_eprev=function(){
          m_timerid=null;

          //alert("dbg: tagName={0} type={1} eedit.value={2}".format(eedit.tagName,type,eedit.value.substr(0,200)));
          var text0=type=="textarea"?eedit.value:aghtex.dom_getInnerTextAndBr(eedit);
          var html0=aghtex.html_escape_pre(text0);
          var html1=aghtex.html_create_range(html0);
          if(html1==null){
            eprev.innerHTML=html0;
            return;
          }

          eprev.innerHTML=html1;
          var maths=agh(aghtex.dom_getElementsByClassName(eprev,"aghtex-math"),Array);
          var paras=agh(aghtex.dom_getElementsByClassName(eprev,"aghtex-para"),Array);
          var fulls=agh(aghtex.dom_getElementsByClassName(eprev,"aghtex-full"),Array);
          if(maths.length!=0)aghtex.tex_transform(maths,"math","");
          if(paras.length!=0)aghtex.tex_transform(paras,"para","");
          if(fulls.length!=0)aghtex.tex_transform(fulls,"full","");
        };

        var _window=this.eedit.ownerDocument.defaultView||this.eedit.ownerDocument.parentWindow;
        this.update_eprev=update_eprev;
        this.eedit_onchanged=function(){
          if(m_timerid!=null)
            _window.clearTimeout(m_timerid);
          _m_timerid=_window.setTimeout(update_eprev,200);
        };
      },
      CreateButton:function(html,tooltip){
        var button=this.eprev.ownerDocument.createElement('span');
        button.className="aghtex-button";
        button.innerHTML=html;
        button.title=tooltip;

        this.button_arrange_top=(this.button_arrange_top||-1.5)+2;
        button.style.fontSize="medium";
        button.style.position=this.prefs.button_style_display;
        button.style.right=this.prefs.button_style_right;
        button.style.top=this.button_arrange_top.toString()+"em";

        this.prefs.button_parent_elem.appendChild(button);
        return button;
      },
      CreateButtonToggle:function(html,tooltip,defaultValue){
        var button=this.CreateButton(html,tooltip);

        if(defaultValue){
          button.style.color="white";
          button.aghtex_value=true;
        }else{
          button.style.color="silver";
          button.aghtex_value=false;
        }

        aghtex.dom_addEventListener(button,"click",function(e){
          if(button.aghtex_value){
            button.aghtex_value=false;
            button.style.color="silver";
          }else{
            button.aghtex_value=true;
            button.style.color="white";
          }

          if(button.aghtex_ontoggle instanceof Function)
            button.aghtex_ontoggle(e,button.aghtex_value);
        },false);

        return button;
      },
      _:0
    });

    return addonPreviewInitializer;
  })();
});
