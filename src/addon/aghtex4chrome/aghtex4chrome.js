// -*- js -*-
(function(){
  var BackgroundCallId=0;
  function BackgroundCall(con,op,args,callback){
    var id=BackgroundCallId++;
    function callback_(info){
      if(id==info.callId){
        callback(info.returnValue);
        con.onMessage.removeListener(callback_);
      }
    }
    con.onMessage.addListener(callback_);
    con.postMessage({callId:id,operation:op,arguments:args});
  }


  function aghtex4chrome_initializeView(_document){
    var head=_document.getElementsByTagName("head")[0];
    if(head){
      var link=_document.createElement("link");
      link.rel="stylesheet";
      link.type="text/css";
      link.charset="utf-8";
      link.href=chrome.extension.getURL("agh/latex/latex.sf.css");
      head.appendChild(link);

      // favicon
      var link=_document.createElement("link");
      link.rel="icon";
      link.type="type/png";
      link.href=chrome.extension.getURL("agh.icon.agh_16x16.png");
      head.appendChild(link);
    }

    var aghtexBaseUrl=chrome.extension.getURL("agh/agh.js").slice(0,-6)+"latex/";
    var eHTML=_document.documentElement;
    if(eHTML.getAttribute("xmlns:tex")==null)
      eHTML.setAttribute("xmlns:tex",aghtexBaseUrl);
  }

  var escape_html_dict={'&':'&amp;','<':'&lt;','>':'&gt;'};
  function escape_html(text){
    return text.replace(/[&<>]/g,function($0){return escape_html_dict[$0];});
  }
  function color_tex(text){
    return escape_html(text).replace(/(\\(?:[^!"#$&'()=~|\-\^`{\[;:\]+},.\/<>?_ \n\t\r\f\b　\\%*0-9]+\*?|(?:[^*&]|&amp;|&lt;|&gt;)\*?|\*|$))|(\%[^\n]*(?:\n|$))|(&amp;|&gt;|&lt;|[\0-\/:-?\[-`{-\x7F])/g,function($0,$1,$2,$3){
      if($1!=null&&$1!=""){
        return '<span class="agh-color-tex-command">'+$0+'</span>';
      }else if($2!=null&&$2!=""){
        return '<span class="agh-color-tex-comment">'+$0+'</span>';
      }else if($3!=null&&$3!=""){
        return '<span class="agh-color-tex-control">'+$0+'</span>';
      }else return $0;
    });
  }

  function init_site_texfile(eSrc){
    var key="agh.addon.aghtex4chrome/texview";
    var ext=window[key]={};

    var _document=eSrc.ownerDocument;
    var texfile=_document.defaultView.location.href.replace(/#.*$/,"");
    var islocal=/^file:\/\//.test(texfile);

    ext.connection=chrome.extension.connect();

    var source={
      update_async:function(content){
        if(this.flag_process)return;
        this.flag_process=true;
        if(this.contentElement==null){
          var self=this;
          var e_content=this.contentElement=_document.createElement("div");
          e_content.className="aghtex-texview-content";

          this.content=content;
          this.lastModified=new Date().toUTCString();
          BackgroundCall(ext.connection,"tex_transform",[this.content,"full_texview"],function(info){
            e_content.innerHTML=info.html;
            eSrc.parentNode.insertBefore(e_content,eSrc);
            self.set_toc(info.toc);
            self.flag_process=false;
          });

          eSrc.innerHTML=color_tex(this.content);
          return true;
        }else{
          if(this.content==content){
            this.flag_process=false;
            return false;
          }
          var self=this;
          var e_content=this.contentElement;

          this.content=content;
          this.lastModified=new Date().toUTCString();
          BackgroundCall(ext.connection,"tex_transform",[this.content,"full_texview"],function(info){
            e_content.innerHTML=info.html;
            self.set_toc(info.toc);
            self.flag_process=false;
          });

          // eSrc.textContent=this.content;
          eSrc.innerHTML=color_tex(this.content);
          return true;
        }
      },
      set_toc:function(toc){
        if(!this.tocElement)return;
        if(toc){
          var buff=[];
          buff.push('<div class="aghtex-viewtex-toc-contents">Contents</div>');
          for(var i=0;i<toc.length;i++){
            var entry=toc[i];
            buff.push('<a class="aghtex-viewtex-toc-',entry.type,'" href="#',entry.id,'">',entry.content,'</a>');
          }
          this.tocElement.innerHTML=buff.join("");
          this.tocElement.style.display="block";
        }else{
          this.tocElement.style.display="none";
        }
      }
    };
    source.tocElement=_document.createElement("div");
    source.tocElement.className="aghtex-viewtex-toc";
    source.tocElement.style.display="none";
    source.update_async(eSrc.textContent);

    aghtex4chrome_initializeView(_document);
    var e_menu=_document.createElement("div");
    e_menu.className="aghtex-viewtex-menu";
    e_menu.createButton=function(html,type){
      var e_button=_document.createElement("a");
      if(type=="switch"){
        e_button.className="aghtex-viewtex-menu-button aghtex-viewtex-off";
      }else{
        e_button.className="aghtex-viewtex-menu-button";
      }
      e_button.innerHTML=html;
      this.appendChild(e_button);
      return e_button;
    };

    if(!islocal){
      var l1=_document.createElement("div");
      l1.className="aghtex-viewtex-menu-download";
      l1.innerHTML='<a href="'+texfile+'?">Download the TeX file</a>';
      e_menu.appendChild(l1);
      e_menu.appendChild(_document.createElement("hr"));
    }

    var b1=e_menu.createButton("Preview","switch");
    function b1_onclick(){
      if(!/-on$/.test(b1.className)){
        b1.className=b1.className.replace(/-off$/,"-on");
        b2.className=b2.className.replace(/-on$/,"-off");
        source.contentElement.style.display="block";
        eSrc.style.display="none";
      }
    }
    b1.addEventListener("click",b1_onclick);

    e_menu.appendChild(source.tocElement);

    var b2=e_menu.createButton("TeX Source","switch");
    function b2_onclick(){
      if(!/-on$/.test(b2.className)){
        b2.className=b2.className.replace(/-off$/,"-on");
        b1.className=b1.className.replace(/-on$/,"-off");
        source.contentElement.style.display="none";
        eSrc.style.display="block";
      }
    }
    b2.addEventListener("click",b2_onclick);

    b1_onclick();

    if(islocal){
      var texfile_bk=texfile.replace(/\/([^\/]*\.tex)$/,"/%23$1%23");
      function getBinaryData(xmlhttp){
        if(xmlhttp.responseText&&xmlhttp.responseText.length!=0){
          var data=xmlhttp.responseText;
          var len=data.length;
          var buff=[];
          for(var i=0;i<len;i++)
            buff[i]=data.charCodeAt(i)&0xFF;
          return buff;
        }
        return null;
      }
      function reload_from(url){
        var http=new XMLHttpRequest();
        http.open("GET",url,false);

        // ローカルの場合、更新されていてもされていなくてもロードされている様子
        http.setRequestHeader("If-Modified-Since",source.lastModified);

        if(http.overrideMimeType){
          // binary load
          http.overrideMimeType('text/plain; charset=x-user-defined');
          http.send(null);

          var buff=getBinaryData(http);
          if(buff!=null){
            // var msg="reloaded "+buff.length+" bytes (status = "+http.status+")";
            // msg+="\n"+http.getAllResponseHeaders();
            // msg+="\nsource.lastModified = "+source.lastModified;
            // alert(msg);

            BackgroundCall(ext.connection,"agh.Text.Decode",[buff],function(latexSource){
              source.update_async(latexSource);
            });
            return true;
          }
        }else{
          http.send(null);
          if(http.responseText&&http.responseText.length!=0){
            source.update_async(http.responseText); //.replace(/\r?\n/g,"\n")
            return true;
          }
        }

        return false;
      }
      function reload(){
        if(source.flag_process)return;
        if(!reload_from(texfile_bk))
          reload_from(texfile);
      }

      e_menu.appendChild(_document.createElement("hr"));
      var bR=e_menu.createButton("Reload");
      bR.addEventListener("click",reload);
      var timerId=null;
      var b3=e_menu.createButton("Auto Reload (Off)","switch");
      b3.addEventListener("click",function(){
        if(/-on$/.test(b3.className)){
          b3.className=b3.className.replace(/-on$/,"-off");
          b3.textContent="Auto Reload (Off)";
          if(timerId)
            window.clearTimeout(timerId);
        }else{
          b3.className=b3.className.replace(/-off$/,"-on");
          b3.textContent="Auto Reload (On)";

          var autoreload_worker=function(){
            reload();
            timerId=window.setTimeout(autoreload_worker,1000);
          };
          autoreload_worker();
        }
      });
    }

    var aghtex4chrome_webpage_url="http://tkynt2.phys.s.u-tokyo.ac.jp/~murase/agh/addon/";
    e_menu.appendChild(_document.createElement("hr"));
    var d=_document.createElement("div");
    d.style.textAlign="center";
    d.style.padding="1ex";
    d.innerHTML
      ='Powered by<br /><img style="width:16px;height:16px;vertical-align:middle;" src="'
      +chrome.extension.getURL("agh.icon.agh_16x16.png")
      +'" alt="Ageha library" title="Ageha library" /> <a href="'
      +aghtex4chrome_webpage_url
      +'" target="_blank">AgehaTeX Extension</a>';
    e_menu.appendChild(d);

    _document.body.appendChild(e_menu);
  }

  //---------------------------------------------------------------------------

  var url=window.location.href;
  if(/\.tex(?:$|#)/.test(url)&&document.body){
    //document.body.style.backgroundColor="#ffeeee";
    var pres=document.getElementsByTagName("pre");
    if(pres.length>0)
      init_site_texfile(pres[0]);
  }

  var key=null;
  if(/\/\/mail\.google\.com\//.test(url))
    key="gmail";
  else if(/\/\/groups\.google\.com\//.test(url))
    key="ggroup";
  else if(/\/\/sites\.google\.com\//.test(url))
    key="gsite";

  if(key!=null)
    agh.LaTeX.Utils.Sites[key]();
})();
