// -*- mode:js;coding:utf-8 -*-
//
// Title: agh.addon.aghtex4firefox/browserOverlay.js
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

  function mainview_onload(event){
    var _window=event.target.defaultView;
    if(_window.wrappedJSObject)
      _window=_window.wrappedJSObject;

    if(_window.document.aghtex4firefox_initialized)return;
    _window.document.aghtex4firefox_initialized=true;

    // for debug
    // if(_window.document.body)
    //   _window.document.body.style.backgroundColor='#ffeeee';

    if(/^https?\:\/\/(?:mail|groups|sites)\.google\.com\//.test(_window.location.href))
      load_js(_window.document,"aghtex4firefox.js");
  }

  function browser_onload(){
    var	frame=window.document.getElementById("appcontent");
    if(frame&&!frame.aghtex4firefox_initialized){
      frame.aghtex4firefox_initialized=true;
      frame.addEventListener("DOMContentLoaded",mainview_onload,false);
    }
  }
  function browser_onunload(){
    window.removeEventListener("load",browser_load,false);
    window.removeEventListener("unload",browser_onload,false);
    var	frame=window.document.getElementById("appcontent");
    if(frame&&frame.aghtex4firefox_initialized){
      frame.aghtex4firefox_initialized=false;
      frame.removeEventListener("DOMContentLoaded",mainview_onload,false);
    }
  }

  window.addEventListener("load",browser_onload,false);
  window.addEventListener("unload",browser_onunload,false);
})();
