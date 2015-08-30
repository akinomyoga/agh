// -*- js -*-
var aghtexCmdStartPreview;
(function(){
  var baseurl="chrome://agh.addon.aghtex4thunderbird/content";

  //***************************************************************************
  var appcontent=document.getElementById("appcontent");

  var hbox=document.createElement("hbox");
  hbox.flex=1;
  appcontent.appendChild(hbox);

  var contentFrame=document.getElementById("content-frame");
  contentFrame.flex=1;
  contentFrame.style.width="30px";
  hbox.appendChild(contentFrame);

  var previewFrame=document.createElement("iframe");
  previewFrame.setAttribute("src",baseurl+"/agh_bgpage.htm");
  previewFrame.flex=1;
  previewFrame.style.width="30px";
  previewFrame.aghtex_defaultDisplay=previewFrame.style.display;
  previewFrame.style.display="none";
  hbox.appendChild(previewFrame);

  var agh=null;
  var aghtex;
  function initialize_aghtex(){
    if(agh!=null)return true;
    agh=previewFrame.contentWindow.agh;
    if(agh==null)return false;
    aghtex=agh.LaTeX.Utils;
    return true;
  }
  //***************************************************************************

  var eprev_onload=function(){
    var editor=GetCurrentEditor();
    if(editor==null)return;

    if(!initialize_aghtex()){
      alert("aghtex: failed to initialize agh!");
      return;
    }

    if(contentFrame.aghtex_preview_iniitialized)return;
    contentFrame.aghtex_preview_iniitialized=true;

    var eedit=contentFrame.contentDocument.body;
    var eprev=previewFrame.contentDocument.getElementById("preview_area");
    var prev=new aghtex.addonPreviewInitializer(eedit,eprev);
    prev.InitAutoTransform();
    editor.addEditorObserver({EditAction:prev.eedit_onchanged});

    var fontSize=100;
    var b0=prev.CreateButton("Z0","Default size");
    var b1=prev.CreateButton("Z+","Zoom in");
    var b2=prev.CreateButton("Z-","Zoom out");
    b0.addEventListener("click",function(){fontSize=100;eprev.style.fontSize=fontSize+"%";},false);
    b1.addEventListener("click",function(){fontSize*=1.2;eprev.style.fontSize=fontSize+"%";},false);
    b2.addEventListener("click",function(){fontSize/=1.2;eprev.style.fontSize=fontSize+"%";},false);
  };

  aghtexCmdStartPreview=function(){
    previewFrame.style.display=previewFrame.aghtex_defaultDisplay;
    eprev_onload();
    //previewFrame.addEventListener("load",eprev_onload,true);

    var btn=document.getElementById("aghtex-start-preview");
    btn.style.display="none";
    //btn.disabled=true;
  };
  // var btnStartPreview=document.getElementById("aghtex-start-preview");
  // btnStartPreview.addEventListener("click",aghtexCmdStartPreview,false);

  // contentFrame.addEventListener("load",eprev_onload,true);
  //***************************************************************************
})();
