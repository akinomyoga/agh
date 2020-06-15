// -*- mode:js;coding:utf-8 -*-
agh.scripts.register("addon/aghtex4gmail.js", ["addon/aghtex.js"], function() {
  var aghtex = agh.LaTeX.Utils;
  agh.Namespace("Sites", aghtex);

  //***************************************************************************
  //  setupGMailPreview
  //---------------------------------------------------------------------------
  aghtex.setupGMailPreview = (function(){
    function PreviewWindow(eedit){
      this._document=eedit.ownerDocument;
      this._window=this._document.parentWindow||this._document.defaultView;

      this.eedit=eedit;
      this.epare=eedit.parentNode;
      if (aghtex.dom_istag(this.epare,'td')){
        var efrm0=this._document.createElement('div');
        this.epare.appendChild(efrm0);
        efrm0.appendChild(this.eedit);

        this.epare=efrm0;
        this.epare.style.border="1px solid silver";
        this.epare.style.padding="2px";
      }
      this.efrm1=this._document.createElement('div');
      this.epare.appendChild(this.efrm1);
      this.eprev=this._document.createElement('div');
      this.efrm1.appendChild(this.eprev);
      this.eprev.innerHTML="aghtex: ... initializing ...";

      // styles
      this.epare.className="aghtex-preview-container "+this.epare.className;
      this.eedit.className+=" aghtex-edit-frame";
      this.efrm1.className="aghtex-preview-frame";
      this.eedit.style.padding=0;

      //-- size
      var eedit_height=agh.browser.vIE?this.eedit.offsetHeight:this.eedit.clientHeight;
      this.epare.agh_is_vsplit=true;
      this.eedit.style.width="49%";
      this.efrm1.style.width="49%";
      this.eedit.style.display="inline-block";
      this.efrm1.style.display="inline-block";
      this.efrm1.style.height=eedit_height+"px";

      // misc settings
      this.prev=new aghtex.addonPreviewInitializer(this.eedit,this.eprev,{
        button_style_display:"absolute",
        button_style_right:"20px",
        button_parent_elem:this.epare
      });

      this.SetupLinkedResize();
      this.SetupAutoTransform();
      this.SetupLinkedScroll();
      this.SetupFontSize();
    }
    agh.memcpy(PreviewWindow.prototype,{
      SetupAutoTransform:function(){
        this.prev.InitAutoTransform();
        this.prev.update_eprev();

        aghtex.dom_addEventListener(this.eedit,"change",this.prev.eedit_onchanged,false);
        aghtex.dom_addEventListener(this.eedit,"keypress",this.prev.eedit_onchanged,false);
        aghtex.dom_addEventListener(this.eedit,"keyup",this.prev.eedit_onchanged,false);
      },
      SetupLinkedResize:function(){
        var epare=this.epare;
        var efrm1=this.efrm1;
        var eedit=this.eedit;
        var hook_resize=function(){
          var is_vsplit=epare.clientWidth>500;
          if (is_vsplit){
            aghtex.dom_update_style(eedit,'width',"49%");
            aghtex.dom_update_style(efrm1,'width',"49%");
          }else{
            aghtex.dom_update_style(eedit,'width',"100%");
            aghtex.dom_update_style(efrm1,'width',"100%");
          }
          var eedit_height=agh.browser.vIE?eedit.offsetHeight:eedit.clientHeight;
          aghtex.dom_update_style(efrm1,'height',eedit_height+"px");
        };

        aghtex.dom_addEventListener(this._window,"resize",hook_resize,false);
        aghtex.dom_addEventListener(this._document.body,"mousemove",hook_resize,false);
      },
      SetupLinkedScroll:function(){
        var btnLS=this.prev.CreateButtonToggle('<span style="font-family:monospace,serif;">LS</span>',"Enable/disable Linked Scroll",true);

        function set_scroll(edst,esrc){
          if (btnLS.aghtex_value){
            var r=esrc.scrollTop/(esrc.scrollHeight-esrc.clientHeight);
            if (r<0)r=0;else if (r>1)r=1;
            edst.scrollTop=(edst.scrollHeight-edst.clientHeight)*r;
          }
        }

        var efrm1=this.efrm1;
        var eedit=this.eedit;
        aghtex.dom_addEventListener(eedit,"keyup",function(){set_scroll(efrm1,eedit);},true);
        aghtex.dom_addEventListener(eedit,"mousemove",function(){set_scroll(efrm1,eedit);},false);
        aghtex.dom_addEventListener(eedit,"mousewheel",function(){set_scroll(efrm1,eedit);},false);
        aghtex.dom_addEventListener(efrm1,"keyup",function(){set_scroll(eedit,efrm1);},true);
        aghtex.dom_addEventListener(efrm1,"mousemove",function(){set_scroll(eedit,efrm1);},false);
        aghtex.dom_addEventListener(efrm1,"mousewheel",function(){set_scroll(eedit,efrm1);},false);
      },
      SetupFontSize:function(){
        // var button=this.prev.CreateButtonToggle("M","Magnify",false);
        // var epare=this.epare;
        // var epare_defaultFontSize=epare.style.fontSize;
        // button.aghtex_ontoggle=function(e,value){
        //   if (value)
        //     epare.style.fontSize="130%";
        //   else
        //     epare.style.fontSize=epare_defaultFontSize;
        // };

        var fontSize=100;
        var eprev=this.eprev;
        var b0=this.prev.CreateButton('<span style="font-family:monospace,serif;">Z0</span>',"Default size");
        var b1=this.prev.CreateButton('<span style="font-family:monospace,serif;">Z+</span>',"Zoom in");
        var b2=this.prev.CreateButton('<span style="font-family:monospace,serif;">Z-</span>',"Zoom out");
        aghtex.dom_addEventListener(b0,"click",function(){fontSize=100;eprev.style.fontSize=fontSize+"%";},false);
        aghtex.dom_addEventListener(b1,"click",function(){fontSize*=1.2;eprev.style.fontSize=fontSize+"%";},false);
        aghtex.dom_addEventListener(b2,"click",function(){fontSize/=1.2;eprev.style.fontSize=fontSize+"%";},false);
      },
      _:0
    });

    return function(eedit){
      var _document=eedit.ownerDocument;
      var epare=eedit.parentNode;
      var button=_document.createElement('span');
      button.className="aghtex-preview-button";
      button.innerHTML=aghtex.tex_transform("\\rm Preview by agh{\\TeX}4gmail","para");
      epare.style.position="relative";
      epare.appendChild(button);
      aghtex.dom_addEventListener(button,'click',function(){
        epare.removeChild(button);
        var preview=new PreviewWindow(eedit);
      },false);
    };
  })();
  //***************************************************************************
  //  Sites
  //===========================================================================
  //  Site: gmail
  //---------------------------------------------------------------------------
  aghtex.Sites["gmail"]=function(_document){
    if (_document==null)_document=document;

    var reg_tag_div=/^div/i;
    function initialize_mailbody(sender){
      aghtex.SetupMailbody20111203(_document,sender,function(sender){
        var nodes=[];
        function _recursive(elem){
          // enum nodes
          for (var i=0,iN=elem.childNodes.length;i<iN;i++){
            var node=elem.childNodes[i];
            if (node.nodeType==aghtex.NodeTypeELEMENT_NODE){
              if ((/^div$/i).test(node.tagName)){
                // div>:eq(0):not(div)
                if (node.firstChild&&!(/^div$/i).test(node.firstChild.tagName)){
                  for (var j=0,jN=node.childNodes.length;j<jN;j++)
                    nodes.push(node.childNodes[j]);
                  continue;
                }
              }else if ((/^blockquote$/i).test(node.tagName)){
                nodes.push(node); // splitter
                _recursive(node);
                nodes.push(node); // splitter
                continue;
              }
            }

            if (/^(wbr|u|p)$/i.test(node.tagName)&&node.childNodes.length==0)
              node.aghtex_ignore_content=true;
            nodes.push(node);
          }
        }
        _recursive(sender);
        return nodes;
      });
    }
    //-------------------------------------------------------------------------
    var reg_container_id=/^\:/i;
    function create_className_regexp(className){
      return new RegExp("(?:^|\\s)"+className+"(?:$|\\s)",'');
    }
    var reg_cls_Ak=create_className_regexp("Ak");
    var reg_cls_At=create_className_regexp("At");

    var dbgflg=0;
    function document_body_onmousemove(event){
      var sender=event.target||event.srcElement;
      if (sender==null)return;

      gmail_try_setup_mailbody(sender);
      gmail_try_setup_preview1(sender);
      gmail_try_setup_preview2(sender);
    }
    function gmail_try_setup_mailbody(sender){
      if (sender.tag_aghtex)return;

      // div#:9m > div#:37 > textNodes の様な構造になっている。二番目の div を捕まえたい。

      // 判定1: sender ~= /div#:～/
      if (!((/^div$/i).test(sender.tagName)&&(/^\:/).test(sender.id)))return;

      // 判定2: div 以外の子要素
      var firstChild=sender.firstChild;
      if (!(
        (/(?:^|\s)a3s(?:$|\s)/).test(sender.className)
          ||firstChild&&!(/^div$/i).test(firstChild.tagName||"text")))return;

      // 判定3: 親要素に対する判定も追加 2014-09-27
      var parent=sender.parentNode;
      if (!(parent.tagName&&(/^div$/i).test(parent.tagName)&&(/^\:/).test(parent.id)))return;

      sender.tag_aghtex=true;
      initialize_mailbody(sender);
    }
    function gmail_try_setup_preview1(sender){
      if (sender.tag_aghtex)return;
      if (aghtex.dom_istag(sender,'textarea')&&reg_cls_Ak.test(sender.className)){
        if (!aghtex.dom_istag(sender.parentNode,'div')||!reg_cls_At.test(sender.parentNode.className))return;
        if (!reg_container_id.test(sender.id))return;

        sender.tag_aghtex=true;
        aghtex.setupGMailPreview(sender);
      }
    }
    function gmail_try_setup_preview2(sender){
      // 2014-09-27
      if (sender.tag_aghtex)return;

      // for debug
      // if (sender.contentEditable){
      //   console.log("X "+(/^div$/i).test(sender.tagName)+
      //               " "+(/^\:/).test(sender.id)+
      //               " "+(/^div$/i).test(sender.parentNode.tagName)+
      //               " "+(/(?:^|\s)aO7(?:$|\s)/).test(sender.parentNode.className)
      //              );
      // }

      // 判定1:
      if (!(sender.contentEditable=="true"&&(/^div$/i).test(sender.tagName)&&(/^\:/).test(sender.id)))return;
      // 判定2:
      var parent=sender.parentNode;
      if (!((/^div$/i).test(parent.tagName)&&(/(?:^|\s)aO7(?:$|\s)/).test(parent.className)))return;

      sender.tag_aghtex=true;
      aghtex.setupGMailPreview(sender);
    }

    //alert("dbg: "+(reg_cls_At.test("At")&&reg_cls_Ak.test("Ak")));
    aghtex.dom_addEventListener(_document.body,"mousemove",document_body_onmousemove,false);
  };
  //===========================================================================
  //  Site: googlegroups
  //---------------------------------------------------------------------------
  aghtex.Sites["ggroup"]=function(_document){
    if (_document==null)_document=document;

    function initialize_mailbody(sender){
      aghtex.SetupMailbody20111203(_document,sender,function(sender){
        var dummy_br=_document.createElement('br');

        // enum nodes
        var nodes=[];
        for (var i=0,iN=sender.childNodes.length;i<iN;i++){
          var node=sender.childNodes[i];
          // div >0 ^div
          if (aghtex.dom_istag(node,'p')&&node.childNodes.length>0){
            nodes.push(dummy_br);
            for (var j=0,jN=node.childNodes.length;j<jN;j++)
              nodes.push(node.childNodes[j]);
          }else if (aghtex.dom_istag(node,'div')&&/(?:^|\s)qt(?:$|\s)/.test(node.className))
            for (var j=0,jN=node.childNodes.length;j<jN;j++)
              nodes.push(node.childNodes[j]);
          else{
            if (/^(wbr|u|p)$/i.test(node.tagName)&&node.childNodes.length==0)
              node.aghtex_ignore_content=true;
            nodes.push(node);
          }
        }

        return nodes;
      });
    }
    //-------------------------------------------------------------------------
    function is_mailbody_div(div){
      // if (aghtex.dom_istag(div.firstChild,'div'))return false;
      // return div.id=="inbdy";

      // 2013/01/31 修正
      if (aghtex.dom_istag(div.firstChild,'div'))return false;
      if (!(aghtex.dom_istag(div,'div')&&div.style.overflow=='hidden'))return false;
      var p=div.parentNode;
      if (!(aghtex.dom_istag(p,'div')&&p.className==''))return false;
      var pp=p.parentNode;
      return aghtex.dom_istag(pp,'div')&&aghtex.dom_hasClassName(pp,'GAK2G4EDN3');
    }

    function document_body_onmousemove(event) {
      var sender = event.target || event.srcElement;
      if (sender == null || sender.tagName == null) return;
      var tagName=sender.tagName.toLowerCase();

      if (tagName == 'div') {
        if (sender.tag_aghtex) return;
        sender.tag_aghtex = true;

        if (!is_mailbody_div(sender)) return;
        initialize_mailbody(sender);
      } else if (tagName == 'p') {
        var div = sender.parentNode;
        if (!aghtex.dom_istag(div, 'div')
           || aghtex.dom_istag(div.firstChild, 'div')
           || div.id != "inbdy") return;

        if (div.tag_aghtex) return;
        div.tag_aghtex = true;
        initialize_mailbody(div);
      } else if (tagName == 'textarea') {
        if (sender.name != "body") return;

        if (sender.tag_aghtex) return;
        sender.tag_aghtex = true;
        aghtex.setupGMailPreview(sender);
      }
    }

    aghtex.dom_addEventListener(_document.body,"mousemove",document_body_onmousemove,false);
  };
  //===========================================================================
  //  Site: sites.google
  //---------------------------------------------------------------------------
  var handler = {
    getTextNodes: function(elem, opts) {
      if (opts && opts.getTextNodes) return opts.getTextNodes(elem);
      return aghtex.dom_getTextNode(elem);
    },
    checkGuard: function(elem, opts) {
      if (opts && opts.checkGuard) return opts.checkGuard(elem);
      if (elem.aghtexProcessedTextNodes) return false;
      elem.aghtexProcessedTextNodes = true;
      return true;
    },
    initialize_textnodes: function(elem, opts) {
      if (!opts) opts = {};

      // check guard
      if (!this.checkGuard(elem, opts)) return false;

      var emaths = [];
      var eparas = [];

      var texts = this.getTextNodes(elem, opts);
      for (var i = 0, iN = texts.length; i < iN; i++) {
        var text = texts[i];
        var html2 = aghtex.html_create_range(aghtex.html_escape_soft(text.textContent));
        if (html2 == null) continue;

        var div = elem.ownerDocument.createElement("div");
        div.innerHTML = html2;
        var maths = aghtex.dom_getElementsByClassName(div, "aghtex-math");
        for (var j = 0, jN = maths.length; j < jN; j++) emaths.push(maths[j]);
        var paras = aghtex.dom_getElementsByClassName(div, "aghtex-para");
        for (var j = 0, jN = paras.length; j < jN; j++) eparas.push(paras[j]);

        // replace nodes
        var parent = text.parentNode;
        agh.Array.each(agh(div.childNodes, Array), function(node) {
          parent.insertBefore(node, text);
        });
        parent.removeChild(text);
      }

      if (emaths.length != 0) aghtex.tex_transform(emaths, "math", "");
      if (eparas.length != 0) aghtex.tex_transform(eparas, "para", "");
      return true;
    }
  };

  aghtex.Sites["gsite"] = function(_document) {
    if (_document == null) _document = document;
    var div = _document.getElementById("sites-canvas");
    if (div != null)
      handler.initialize_textnodes(div);
  };

  //===========================================================================
  //  Site: github.com
  //---------------------------------------------------------------------------
  aghtex.Sites["github"] = function(_document) {
    if (_document == null) _document = document;
    var _window = _document.defaultView;
    var opts = {
      checkGuard: function(elem) {
        var children = elem.childNodes;
        if (children.length == 0) return false;
        var mark = children[0];
        if (mark.className == 'aghtex4gmail-textnodes-processed') return false;

        var div = _document.createElement('div');
        div.className = 'aghtex4gmail-textnodes-processed';
        div.style.display = 'none';
        elem.insertAdjacentElement('AfterBegin', div);
        return true;
      },
      getTextNodes: function(elem) {
        function recursive(e, buff) {
          for (var i = 0, iN = e.childNodes.length; i < iN; i++) {
            var node = e.childNodes[i];
            if (node.nodeType == aghtex.NodeTypeTEXT_NODE)
              buff.push(node);
            else if (node.nodeType == aghtex.NodeTypeELEMENT_NODE) {
              // 重複適用防止
              if (/(?:^|\s)markdown-body(?:\s|$)/.test(node.className)) continue;
              if (/^(?:pre|code)$/i.test(node.tagName)) continue;
              recursive(node, buff);
            }
          }
        }
        var ret = [];
        recursive(elem, ret);
        return ret;
      }
    };

    // [Preview].onclick
    function setup_preview(elem) {
      if (elem.aghtex_preview_setup) return;
      var preview = aghtex.dom_getElementsByClassName(elem, 'preview-tab')[0];
      var markdown = aghtex.dom_getElementsByClassName(elem, 'markdown-body')[0];
      if (!preview || !markdown) return;
      aghtex.dom_addEventListener(preview, 'click', function() {
        // click した瞬間には未だ内容が設定されていない様なので遅延
        var delay = 10;
        var elapsed = 0;
        var proc = function() {
          elapsed += delay;
          if (elapsed < 1000 && !handler.initialize_textnodes(markdown, opts)) {
            delay = 0 | delay * 1.5 + 0.5;
            _window.setTimeout(proc, delay);
          }
        };
        _window.setTimeout(proc, delay);
      });
      elem.aghtex_preview_setup = true;
    }

    // 初期変換
    var md = agh(aghtex.dom_getElementsByClassName(_document, "markdown-body"), Array);
    agh.Array.each(md, function(elem) {
      handler.initialize_textnodes(elem, opts);
    });
    var tabs = agh(aghtex.dom_getElementsByClassName(_document, "previewable-comment-form"), Array);
    agh.Array.each(tabs, setup_preview);

    // document.onmousemove
    aghtex.dom_addEventListener(_document.body, "mousemove", function() {
      var sender = event.target || event.srcElement;
      if (sender == null || sender.nodeType != aghtex.NodeTypeELEMENT_NODE) return;

      if (aghtex.dom_hasClassName(sender, 'previewable-comment-form'))
        setup_preview(sender);
      else if (aghtex.dom_hasClassName(sender, 'markdown-body'))
        handler.initialize_textnodes(sender, opts);
    }, false);

  };
});
