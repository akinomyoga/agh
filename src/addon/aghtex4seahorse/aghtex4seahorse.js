// -*- mode:js;coding:utf-8 -*-
(function(){
  var aghtex=agh.LaTeX.Utils;

  function load_css_data(_window,content){
    var div=_window.document.createElement("div");
    div.innerHTML='<br><style type="text/css">'+content+'</style>';
    var head=_window.document.getElementsByTagName("head")[0];
    var style=div.getElementsByTagName("style")[0];
    head.appendChild(style);
  }

  function initframe(_window){
    var url=_window.location.href;
    var key=null;
    if(/\/\/mail\.google\.com\//.test(url))
      key="gmail";
    else if(/\/\/groups\.google\.com\//.test(url))
      key="ggroup";
    else if(/\/\/sites\.google\.com\//.test(url))
      key="gsite";
    if(key==null)return;

    _window.attachEvent("onerror",function(msg,url,line){
      alert([
        "iframe.onerror",
        "  message = "+msg,
        "  url = "+url,
        "  line = "+line
      ].join("\n"));
    });
    aghtex.Sites[key](_window.document);

    load_css_data(_window,aghtex["aghtex.css/content"]);
    load_css_data(_window,aghtex["latex.ie.css/content"]);
  }

  window.attachEvent("onerror",function(msg,url,line){
    alert([
      "window.onerror",
      "  message = "+msg,
      "  url = "+url,
      "  line = "+line
    ].join("\n"));
  });

  var register_frame_list=[];
  function register_frame(frame){
    for(var i=0;i<register_frame_list.length;i++)
      if(register_frame_list[i]===frame)
        return false;
    register_frame_list.push(frame);
    return true;
  }

  initialize_frame(window);
  window.setInterval(function(){
    var frames=document.frames;
    for(var i=0,iN=frames.length;i<iN;i++){
      try{
        var f=frames(i);
        if(!register_frame(f))continue;

        var _window=f;
        initframe(_window);
      }catch(ex){alert("error!");alert("error_message = "+ex.message);}
    }
  },200);
})();
