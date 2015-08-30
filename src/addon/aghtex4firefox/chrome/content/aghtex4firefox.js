// -*- mode:js;coding:utf-8 -*-
//
// Title: agh.addon.aghtex4firefox/aghtex4firefox.js
// Author: Copyright (C) 2012, Koichi Murase <myoga.murase@gmail.com>, all rights reserved.
//
(function(){
  var aghtex4firefox_base="chrome://aghtex4firefox.addon.agh/content/";
  function load_js(_document,filename){
    var head=_document.getElementsByTagName("head")[0];
    var script=_document.createElement("script");
    script.setAttribute("type","text/javascript");
    script.setAttribute("charset","utf-8");
    script.setAttribute("src",aghtex4firefox_base+filename);
    //alert(script.src);
    head.appendChild(script);
  }
  function load_css(_document,filename){
    var head=_document.getElementsByTagName("head")[0];
    var link=_document.createElement("link");
    link.setAttribute("rel","stylesheet");
    link.setAttribute("type","text/css");
    link.setAttribute("charset","utf-8");
    link.setAttribute("href",aghtex4firefox_base+filename);
    head.appendChild(link);
  }

  //-------------------------------------------------------------------------
  // check url

  var url=window.location.href;
  var key=null;
  if(/\/\/mail\.google\.com\//.test(url))
    key="gmail";
  else if(/\/\/groups\.google\.com\//.test(url))
    key="ggroup";
  else if(/\/\/sites\.google\.com\//.test(url))
    key="gsite";
  if(key==null)return;

  //-------------------------------------------------------------------------
  // load agh library

  var _document=window.document;
  load_js (_document,"agh/agh.js");
  load_js (_document,"agh/agh.text.js");
  load_js (_document,"agh/agh.lang.tex.js");
  load_js (_document,"aghtex.js");
  load_css(_document,"aghtex.css");
  load_js (_document,"aghtex4gmail.js");

  //-------------------------------------------------------------------------
  // search frames
  var initialize_frame=function(_window){
    if(!(window.agh&&agh.LaTeX&&agh.LaTeX.Utils)){
      window.setTimeout(function(){initialize_frame(_window);},200);
      return;
    }

    try{
      var aghtex=agh.LaTeX.Utils;
      load_css(_window.document,"aghtex.css");
      load_css(_window.document,"agh/latex/latex.ie.css");
      aghtex.Sites[key](_window.document);
    }catch(ex){
      // alert("@ aghtex4firefox.js/initialize_frame\r\nerror: "+ex.message);
    }
  }

  initialize_frame(window);
  // window.setInterval(function(){
  //   // var frames=document.frames; // IE
  //   var frames=document.getElementsByTagName("iframe");
  //   for(var i=0,iN=frames.length;i<iN;i++){
  //     try{
  //       var f=frames[i]; // frames(i) for Fx

  //       if(f.aghtex_processed!=null)continue;
  //       f.aghtex_processed=true;
        
  //       var _window=f.contentWindow; // f for IE
  //       initialize_frame(_window);
  //     }catch(ex){
  //       alert("aghtex:\r\n  error!\r\n  error_message = "+ex.message);
  //     }
  //   }
  // },500);
})();
