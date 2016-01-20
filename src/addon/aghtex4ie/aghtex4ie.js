(function(){
  //alert("hello 1234321");
  if(/^https?\:\/\/(?:mail|groups|sites)\.google\.com\//.test(window.location.href)){
    if(window.document.aghtex_initialized)return;
    window.document.aghtex_initialized=true;

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
    var aghtex4ie_content="https://"+location.host+"/agh.addon.aghtex4ie/";
    function load_js(_document,filename){
      var head=_document.getElementsByTagName("head")[0];
      var script=_document.createElement("script");
      script.setAttribute("type","text/javascript");
      script.setAttribute("charset","utf-8");
      script.setAttribute("src",aghtex4ie_content+filename);
      //alert(script.src);
      head.appendChild(script);
    }
    function load_css(_document,filename){
      var head=_document.getElementsByTagName("head")[0];
      var link=_document.createElement("link");
      link.setAttribute("rel","stylesheet");
      link.setAttribute("type","text/css");
      link.setAttribute("charset","utf-8");
      link.setAttribute("href",aghtex4ie_content+filename);
      head.appendChild(link);
    }

    load_js (document,"agh/agh.js");
    load_js (document,"agh/agh.text.js");
    load_js (document,"agh/agh.lang.tex.js");
    load_js (document,"aghtex.js");
    load_css(document,"aghtex.css");
    load_js (document,"aghtex4gmail.js");

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
        alert("error: aghtex4ie.js/initialize_frame "+ex.message);
      }
    }

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

          // 20121215
          if(!register_frame(f))continue;
          // if(f.aghtex_processed!=null)continue;
          // f.aghtex_processed=true; // ERR

          var _window=f;
          initialize_frame(_window);
        }catch(ex){
          alert("aghtex:\r\n  error!\r\n  error_message = "+ex.message);
        }
      }
    },500);
  }
})();
