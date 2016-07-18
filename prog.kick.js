(function(){
  var ua=navigator.userAgent;
  var isFx=ua.indexOf("Gecko")>=0;
  var isIE=ua.indexOf("IE")>=0;
  var isSf=ua.indexOf("Safari")>=0;
  var isOp=ua.indexOf("Opera")>=0;
  if(!isFx&&!isIE&&!isSf&&!isOp)return;

  (function load_agh_js(){
    if(window.agh&&window.agh.scripts)return;
    var mwgjs="http://tkynt2.phys.s.u-tokyo.ac.jp/~murase/agh/agh.js";
    var scripts=document.getElementsByTagName("script");
    for(var i=0;i<scripts.length;i++){
      var src=scripts[i].src;
      var rep=src.replace(/prog\.kick\.(js|jgz|js\.gz)$/,"agh.$1");
      if(src!=rep){mwgjs=rep;break;}
    }
    document.write('<script type="text/javascript" charset="utf-8" src="'+mwgjs+'"></script>\r\n');
  })();

  function delayed_wait(delay,waitlist,func){
    var waiter=function(){
      window.setTimeout(function(){
        agh.scripts.wait(waitlist,func);
      },delay);
    };

    if(isIE){
      window.attachEvent("onload",waiter);
    }else{
      window.addEventListener("load",waiter,false);
    }
  }

  delayed_wait(100,[
    "agh.js",
    "agh.text.js",
    "agh.text.color.js",
    "agh.text.color.css"
  ],function(){
    var for_tag=function(elem,tagName,proc){
      var elems=elem.getElementsByTagName(tagName);
      for(var i=0;i<elems.length;i++)proc(elems[i],i);
    }

    for_tag(document,"pre",function(pre){
      if(pre.className.match(/\bdiff\b/)){
        pre.innerHTML=agh.Text.Color(pre.innerHTML,"diff","/html").replace(/\<br[ \t\v\f\r\n]*\/?\>/ig,"\n");
      }

      if(pre.className.match(/\bcpp\b/)){
        pre.innerHTML=agh.Text.Color(pre.innerHTML,"cpp","/html");
      }else if(pre.className.match(/\bx86\b/)){
        pre.innerHTML=agh.Text.Color(pre.innerHTML,"x86","/html");
      }else if(pre.className.match(/\bcs\b/)){
        pre.innerHTML=agh.Text.Color(pre.innerHTML,"cs","/html");
      }else if(pre.className.match(/\bjs\b/)){
        pre.innerHTML=agh.Text.Color(pre.innerHTML,"js","/html");
      }
    });

    for_tag(document,"dl",function(dl){
      if(!dl.className.match(/\bprog-items\b/))return;
      for_tag(dl,"dt",function(dt){
        dt.innerHTML=agh.Text.Color(dt.innerHTML,"cpp","/html");
      });
    });

    for_tag(document,"table",function(table){
      if(!table.className.match(/\btext-macro\b/))return;
      for_tag(table,"td",function(td){
        td.innerHTML=agh.Text.Color(td.innerHTML,"cpp","/html");
      });
    });
  });

})();
