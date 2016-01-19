agh.scripts.register("agh.forms1.js",[
  "agh.js",
  "agh.dom1.js",
  "agh.forms1.css"
],function(){

//******************************************************************************
var createBorder=function(type){
  /// <param name="type">境界線の種類を指定します。b0 b1 b2 等を指定することが出来ます。</param>
  var clsName="agh-forms-"+type;
  var ret=agh(document.createElement("div"));
  ret._.addClass(clsName);
  ret.set_style=function(name){
    ret._.switchClass(clsName,name);
  };
  return ret;
};

agh.Namespace("OldForms",agh);
var BUTTON_LEFT=agh.browser.vIE?1:0;
var WIDTH_CONTAINS_BORDER=agh.browser.vIE;
//------------------------------------------------------------------------------
//		Button
//------------------------------------------------------------------------------
var ButtonWidthOffset=WIDTH_CONTAINS_BORDER?{b0:0,b1:-2,b2:-4}:{b0:-2,b1:-4,b2:-7};
agh.OldForms.Button=function(){
  var b0=createBorder("b0");
  var b1=createBorder("b1");
  var b2=createBorder("b2");
  b0.appendChild(b1);
  b1.appendChild(b2);
  if(agh.browser.vIE){
    b0.unselectable="on";
    b1.unselectable="on";
    b2.unselectable="on";
  }
  
  var set_style=function(name){
    b0.set_style(name);
    b1.set_style(name);
    b2.set_style(name);
  };
  set_style("free");
  
  //	event
  //-------------------------------------
  // IE:
  //   setCapture していても onmouseout 及び onmouseleave が呼び出される。
  //   X 素早くクリックして doubleclick と認識されると、onmouseup も onmousedown も発生しなくなる。
  // Fx:
  //   setCapture していると onmouseout も onmouseleave も呼び出されなくなる。
  //   X onfocusout が働かない
  //   X ボタンの内容が選択されてしまう。
  // Sf:
  //   setCapture 自体が無い。
  //   X onfocusout が働かない
  //   X ボタンの内容が選択されてしまう。
  var hasCapture=false;
  var hasFocus=false;
  b0.attachEvent("onmousedown",function(e){
    if(e&&e.button!=BUTTON_LEFT)return;
    set_style("press");
    if(b0.setCapture){
      b0.setCapture();
      hasCapture=true;
    }
    b0.focus();
    hasFocus=true;
  });
  b0.attachEvent("onmouseup",function(){
    if(hasCapture&&b0.releaseCapture){
      b0.releaseCapture();
      hasCapture=false;
    }
    set_style("focus");
  });
  b0.attachEvent("onmouseenter",function(){
    //if(event.srcElement!=this)return;
    if(hasCapture)set_style("press");
  });
  b0.attachEvent("onfocusout",function(){
    hasFocus=false;
    set_style("free");
  });
  if(agh.browser.vIE){
    b0.attachEvent("onmouseleave",function(){
      set_style(hasFocus?"focus":"free");
    });
    b0.attachEvent("onkeypress",function(){
      if(event&&event.keyCode==13)
        b0.click();
    });
    b0.attachEvent("onlosecapture",function(){
      if(hasCapture&&b0.releaseCapture){
        b0.releaseCapture();
        hasCapture=false;
      }
      set_style("focus");
    });
    b0.attachEvent("onselectstart",function(){return false;});
  }else if(agh.browser.vSf){
    b0.attachEvent("onmouseout",function(){
      set_style(hasFocus?"focus":"free");
    });
  }
  //	public
  //-------------------------------------
  b0.contentElement=b2;
  b0.appendChild=function(x){
    b2.appendChild(x);
  };
  b0.setPosition=function(left,top,width,height){
    if(left)b0.style.left=parseInt(left)+"px";
    if(top)b0.style.top=parseInt(top)+"px";
    if(width){
      width=parseInt(width);
      b0.style.width=(width+ButtonWidthOffset.b0)+"px";
      b1.style.width=(width+ButtonWidthOffset.b1)+"px";
      b2.style.width=(width+ButtonWidthOffset.b2)+"px";
    }
    if(height){
      height=parseInt(height);
      b0.style.height=(height+ButtonWidthOffset.b0)+"px";
      b1.style.height=(height+ButtonWidthOffset.b1)+"px";
      b2.style.height=(height+ButtonWidthOffset.b2)+"px";
    }
  };
  
  return b0;
};
//==============================================================================
//		TabPage
//==============================================================================
agh.OldForms.TabPage=function(tabnames){
  var main=document.createElement("table");
  main.cellSpacing="0px";
  main.className="agh-forms-tabpage";
  var tabline=main.insertRow(-1);
  var tablineCell=function(){
    return agh(tabline.insertCell(tabline.cells.length-1));
  };
  var empty=tablineCell();
  empty._.addClass("agh-forms-tabsep-empty");
  empty.innerHTML="&nbsp;";
  
  var field=main.insertRow(-1).insertCell(-1);
  field.className="agh-forms-tabfld";
  var activeIndex=-1;
  var separators=[];
  
  var tabcells=[];
  var pages=[];
  main.pages=pages;
  
  var updateView=function(){
    var LEN=pages.length;
    if(LEN==0)return;
    
    var tb;
    for(var i=0;i<LEN;i++){
      var active=activeIndex==i;
      
      var sep=separators[i];
      if(active)
        sep.set_style("l");
      else if(i==0)
        sep.set_style("s");
      else if(activeIndex+1==i)
        sep.set_style("r");
      else
        sep.set_style("m");
      
      var tabcell=tabcells[i];
      tabcell.set_style(active?"active":"inactive");
        
      var page=pages[i];
      if(active)page.show();else page.hide();
    }
    if(activeIndex+1==LEN)
      separators[LEN].set_style("r");
    else
      separators[LEN].set_style("e");
    
    field.colSpan=separators.length*4+pages.length+1;
    
    if(agh.browser.vIE&&main.pageWidth){
      tabline_width=separators.length*4;
      agh.Array.each(pages,function(page){tabline_width+=page.tabElement.clientWidth;});
      empty.style.width=parseInt(main.pageWidth)-tabline_width;
    }
  }
  main.show=function(index){
    pages[index].activate();
  };
  //--------------------------------------------
  //		Separator
  //--------------------------------------------
  var Separator=function(){
    this.bar=[
      this.createBar("m0"),
      this.createBar("m1"),
      this.createBar("m2"),
      this.createBar("m3")
    ];
    separators.push(this);
  };
  agh.memcpy(Separator.prototype,{
    createBar:function(type){
      var sep=tablineCell();
      sep._.addClass("agh-forms-tabsep");
      sep._.switchClass("agh-forms-tabsep",type);
      
      var div=document.createElement("div");
      div.innerHTML="&nbsp;";
      sep.appendChild(div);
      
      return sep;
    },
    set_style:function(name){
      this.bar[0]._.switchClass("agh-forms-tabsep",name+"0");
      this.bar[1]._.switchClass("agh-forms-tabsep",name+"1");
      this.bar[2]._.switchClass("agh-forms-tabsep",name+"2");
      this.bar[3]._.switchClass("agh-forms-tabsep",name+"3");
    }
  });
  //--------------------------------------------
  //		TabTag
  //--------------------------------------------
  var TabCell=function(){
    var i=tabcells.length;
    
    // tabline に追加
    if(i==0)new Separator().set_style("s");
    var td=tablineCell();
    new Separator().set_style("e");
    
    // style の設定
    td._.addClass("agh-forms-tabtag0");
    if(agh.browser.vIE)td.unselectable="on";
    td.attachEvent("onselectstart",function(){return false;});
    td.attachEvent("onmousedown",function(){main.show(i);});
    var div=agh(document.createElement("div"));
    div._.addClass("agh-forms-tabtag1");
    td.appendChild(div);
    
    // member
    this.td=td;
    this.div=div;
    
    tabcells.push(this);
  };
  TabCell.prototype.set_style=function(name){
    this.td._.switchClass("agh-forms-tabtag0",name);
    this.div._.switchClass("agh-forms-tabtag1",name);
  };
  //--------------------------------------------
  //		TabPage
  //--------------------------------------------
  var TabPageWidthOffset=WIDTH_CONTAINS_BORDER?{holder:0,content:-2}:{holder:-2,content:-7};
  var TabPageHeightOffset=WIDTH_CONTAINS_BORDER?{holder:0,content:-1}:{holder:-1,content:-6};
  var TabPage=function(){
    // 新しい Tab 表示場所
    var cell=new TabCell();
    cell.set_style("inactive");
    
    // 新しい TabPage 内容
    var holder=document.createElement("div");
    holder.className="agh-forms-tabpg0";
    var div=document.createElement("div");
    div.className="agh-forms-tabpg1";
    holder.appendChild(div);
    
    this.__holder=holder;
    this.contentElement=div;
    this.tabElement=cell.div;
    field.appendChild(holder);
    pages.push(this);
    
    updateView();
  };
  agh.memcpy(TabPage.prototype,{
    activate:function(){
      activeIndex=this.getIndex();
      updateView();
    },
    getIndex:function(){
      return agh.Array.indexOf(main.pages,this);
    },
    show:function(){
      this.__holder.style.display="block";
    },
    hide:function(){
      this.__holder.style.display="none";
    },
    setPageSize:function(width,height){
      this.width=width;
      this.__holder.style.width=width+TabPageWidthOffset.holder;
      this.contentElement.style.width=width+TabPageWidthOffset.content;
      
      this.height=height;
      this.__holder.style.height=height+TabPageHeightOffset.holder;
      this.contentElement.style.height=height+TabPageHeightOffset.content;
    }
  });
  //--------------------------------------------
  //		Public
  //--------------------------------------------
  // もっと良いインターフェースを考える
  main.addTab=function(tabname){
    if(agh.is(tabname,Array)){
      agh.Array.each(tabname,function(name){main.addTab(name);});
      return;
    }
    
    var page=new TabPage();
    page.tabElement.innerText=tabname;
    if(main.pageWidth)
      page.setPageSize(main.pageWidth,main.pageHeight);
  };
  main.style.width="500px";
  main.setPageSize=function(width,height){
    main.style.width=width;
    main.pageWidth=width;
    main.pageHeight=height;
    agh.Array.each(pages,function(page){page.setPageSize(width,height);});
  }
  main.setPosition=function(left,top){
    main.style.left=left;
    main.style.top=top;
  };
  
  return main;
};

});
