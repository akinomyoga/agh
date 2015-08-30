// -*- js -*-
(function(){
  var baseurl="chrome://agh.addon.aghtex4thunderbird/content";

  //***************************************************************************
  var iframe=document.createElement("iframe");
  iframe.setAttribute("src",baseurl+"/agh_bgpage.htm");
  iframe.style.height="20px";
  iframe.style.display="none";

  var messagepanebox=document.getElementById("messagepanebox");
  messagepanebox.appendChild(iframe);
  var agh=null;
  var aghtex;
  function check_agh(){
    if(agh!=null)return true;

    agh=iframe.contentWindow.agh;
    if(agh==null)return false;

    aghtex=agh.LaTeX.Utils;
    return true;
  }
  //***************************************************************************
  function enumerate_in_sup(nodes,sup){
    for(var i=0,iN=sup.childNodes.length;i<iN;i++){
      var node=sup.childNodes[i];
      if(/^span$/i.test(node.tagName))
        for(var j=0,jN=node.childNodes.length;j<jN;j++)
          nodes.push(node.childNodes[j]);
      else
        nodes.push(node);
    }
  }
  function enumerate_in_div(nodes,div){
    for(var j=0,jN=div.childNodes.length;j<jN;j++){
      var node=div.childNodes[j];
      if(node.nodeType==aghtex.NodeTypeELEMENT_NODE){
        var tagName=node.tagName&&node.tagName.toLowerCase();
        if(tagName=="pre"){
          nodes.push(node); // 区切

          var ispreDefault=nodes.aghtex_ispre;
          nodes.aghtex_ispre=true;
          enumerate_in_div(nodes,node);
          nodes.aghtex_ispre=ispreDefault;
        }else if(tagName=="blockquote"){
          nodes.push(node); // 区切
          enumerate_in_div(nodes,node);
          nodes.push(node); // 区切
        }else if(tagName=="sup"||tagName=="code"){
          // sup.moz-txt-sup           → ^3 等が上付に変換されている
          // code.moz-txt-verticalline → |～| が何故か囲まれている
          enumerate_in_sup(nodes,node);
        }else if(tagName=="span"&&aghtex.dom_hasClassName(node,"moz-txt-citetags")){
          node.aghtex_ignore_content=true;
          nodes.push(node);
        }else
          nodes.push(node);
      }else{
        if(nodes.aghtex_ispre)
          node.aghtex_ispre=true;
        nodes.push(node);
      }
    }
  }
  function initialize_moz_text_plain(_document,div){
    aghtex.SetupMailbody20111203(_document,div,function(sender){
      var nodes=[];
      enumerate_in_div(nodes,div);
      return nodes;
    });
  }
  function initialize_moz_text_flowed(_document,div){
    aghtex.SetupMailbody20111203(_document,div,function(sender){
      // enum nodes
      var nodes=[];
      enumerate_in_div(nodes,div);
      return nodes;
    });
  }
  
  function initialize_document_with_tex(_window,manifest){
    var _document=_window.document;

    // set xmlns:tex
    if(_document.documentElement.getAttribute("xmlns:tex")==null)
      _document.documentElement.setAttribute("xmlns:tex",baseurl+"/latex/");

    // add stylesheet
    var head=_document.getElementsByTagName("head")[0];
    function load_css(path){
      var link=_document.createElement("link");
      link.rel="stylesheet";
      link.type="text/css";
      link.href=path;
      link.charset="utf-8";
      head.appendChild(link);
    }

    load_css(baseurl+"/agh/latex/latex.fx.css");
    load_css(baseurl+"/aghtex.css");
    load_css(baseurl+"/aghtex4thunderbird.css");

    if(!check_agh())return;

    var div
      =_document.getElementsByClassName("moz-text-plain")[0]
      ||_document.getElementsByClassName("moz-text-flowed")[0];
    if(div!=null){
      aghtex.SetupMailbody20111203(_document,div,function(sender){
        var nodes=[];
        enumerate_in_div(nodes,div);
        return nodes;
      });
    }
  }

  var browser=document.getElementById("messagepane");
  function browser_onload(){
    initialize_document_with_tex(browser.contentWindow);
  }
  browser.addEventListener("load",browser_onload,true);
})();
