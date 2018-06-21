//******************************************************************************
//
//      MWG 2.0 - FORMS            K. Murase
//
//******************************************************************************
/// <reference path="agh.js"/>
/// <reference path="agh.dom1.js"/>
/// <reference path="agh.class.js"/>
// ToDo agh.dom1.js から agh.dom.js (ver2) に乗り換える。
agh.scripts.register("agh.forms.js", [
  "agh.js",
  "agh.class.js",
  "agh.dom.js"
], function() {
//==============================================================================
var agh=this;
agh.Namespace("Forms",agh);
var ns=agh.Forms;

//******************************************************************************
//  agh.Forms.ControlBase
//==============================================================================
(function(){
  var CHECK_NATURAL=function(value){
    return agh.is(value,Number)&&value>0;
  };
  ns.ControlBase=new agh.Class("agh.Forms.ControlBase",null,{
    // should be position:absolute
    e_main:null,
    getMainElement:function getter(){
      return this.e_main;
    },
    //----------------------------------------------------------------------
    parentControl:null,
    OnAfterAppend:function event(parent){
      this.__fire('AfterAppend',{parent:this.parentControl});
    },
    OnBeforeRemove:function event(parent){
      this.__fire('BeforeRemove',{parent:this.parentControl});
    },
    //======================================================================
    //  大きさ
    //======================================================================
    OnPositionChanged:function event(){
      this.__fire('PositionChanged',{left:this.m_left,top:this.m_top});
    },
    OnSizeChanged:function event(){
      this.__fire('SizeChanged',{width:this.m_width,height:this.m_height});
    },
    OnDockChanged:function event(before,after){
      this.__fire('DockChanged',{dock_before:before,dock_after:after});
    },
    //----------------------------------------------------------------------
    m_swidth:100,  // Number 設定の横幅 (Dock 時に !=m_width)
    m_sheight:100, // Number 設定の高さ (Dock 時に !=m_height)
    m_width:100,   // Number 表示の横幅 (含 border)
    m_height:100,  // Number 表示の高さ (含 border)
    m_sleft:0,     // Number 設定の左端
    m_stop:0,      // Number 設定の上端
    m_left:-1,     // Number 表示の左端
    m_top:-1,      // Number 表示の上端

    m_dock:null,   // null, "fill", "top", "bottom", "right", "left"
    // この要素に割り当てられた親内の表示領域 (Dock 用)
    m_ddock:null,  // Number (m_dock が反映されたかどうかを見る為に親が使用)
    m_dleft:null,  // Number
    m_dright:null, // Number
    m_dtop:null,   // Number
    m_dbottom:null,// Number
    m_ofs_r:null,  // Number? 表示の右端からのオフセット (Dock 時)
    m_ofs_b:null,  // Number? 表示の下端からのオフセット (Dock 時)

    m_mgn_t:0,     // Number Dock 時の上端マージン
    m_mgn_b:0,     // Number Dock 時の下端マージン
    m_mgn_r:0,     // Number Dock 時の右端マージン
    m_mgn_l:0,     // Number Dock 時の左端マージン
    //----------------------------------------------------------------------
    getLeft:function getter(){return this.m_left;},
    getTop:function getter(){return this.m_top;},
    getWidth:function getter(){return this.m_width;},
    getHeight:function getter(){return this.m_height;},
    setLeft:function setter(l){
      if(!agh.is(l,Number))return;
      this.m_sleft=l;this.recalcPos();
    },
    setTop:function setter(t){
      if(!agh.is(t,Number))return;
      this.m_stop=t;this.recalcPos();
    },
    setWidth:function setter(w){
      if(!CHECK_NATURAL(w))return;
      this.m_swidth=w;this.recalcSize();
    },
    setHeight:function setter(h){
      if(!CHECK_NATURAL(h))return;
      this.m_sheight=h;this.recalcSize();
    },
    setSize:function(width,height){
      /// <summary>
      /// 大きさを設定します。
      /// </summary>
      /// <param name="width" type="Number" optional="true">横幅を指定します。</param
      /// <param name="height" type="Number" optional="true">高さを指定します。</param
      if(CHECK_NATURAL(width))this.m_swidth=width;
      if(CHECK_NATURAL(height))this.m_sheight=height;
      this.recalcSize();
    },
    setPosition:function(left,top,width,height){
      if(agh.is(left,Number))this.m_sleft=left;
      if(agh.is(top,Number))this.m_stop=top;
      this.recalcPos();

      if(arguments.length>=3)
        this.setSize(width,height);
    },
    //----------------------------------------------------------------------
    getDock:function getter(){return this.m_dock;},
    setDock:function setter(dock){
      var old=this.m_dock;
      if(old==dock)return;
      this.m_dock=dock;
      this.OnDockChanged(old,dock);
    },
    getMarginTop:function getter(){return this.m_mgn_t;},
    getMarginBottom:function getter(){return this.m_mgn_b;},
    getMarginLeft:function getter(){return this.m_mgn_r;},
    getMarginRight:function getter(){return this.m_mgn_l;},
    setMarginTop:function setter(t){
      if(!agh.is(t,Number))return;
      this.m_mgn_t=t;
      this.recalcSize();
    },
    setMarginBottom:function setter(b){
      if(!agh.is(b,Number))return;
      this.m_mgn_b=b;
      this.recalcSize();
    },
    setMarginLeft:function setter(r){
      if(!agh.is(r,Number))return;
      this.m_mgn_r=r;
      this.recalcSize();
    },
    setMarginRight:function setter(l){
      if(!agh.is(l,Number))return;
      this.m_mgn_l=l;
      this.recalcSize();
    },
    setMargin:function(t,r,b,l){
      if(r==null)r=t;
      if(b==null)b=t;
      if(l==null)l=r;
      if(agh.is(t,Number))this.m_mgn_t=t;
      if(agh.is(b,Number))this.m_mgn_b=b;
      if(agh.is(r,Number))this.m_mgn_r=r;
      if(agh.is(l,Number))this.m_mgn_l=l;
      this.recalcSize();
      this.recalcPos();  // ← サイズが差し引きで変わらない場合の為
    },
    getMarginHeight:function getter(){
      return this.m_mgn_t+this.m_height+this.m_mgn_b;
    },
    getMarginWidth:function getter(){
      return this.m_mgn_l+this.m_width+this.m_mgn_r;
    },
    //----------------------------------------------------------------------
    //  位置・大きさの再計算
    //----------------------------------------------------------------------
    recalcPos:function(){
      var left=this.m_sleft;
      var top=this.m_stop;
      var ofs_r=null;
      var ofs_b=null;

      if(this.parentControl!=null)switch(this.m_dock){
        case "top":
        case "left":
        case "fill":
          left  =this.m_dleft+this.m_mgn_l;
          top   =this.m_dtop+this.m_mgn_t;
          break;
        case "bottom":
          left  =this.m_dleft+this.m_mgn_l;
          ofs_b =this.parentControl.m_cheight-this.m_dbottom+this.m_mgn_b;
          top   =this.m_dbottom-this.getMarginHeight();
          break;
        case "right":
          ofs_r =this.parentControl.m_cwidth-this.m_dright+this.m_mgn_r;
          top   =this.m_dtop+this.m_mgn_t;
          left  =this.m_dright-this.getMarginWidth();
          break;
      }

      var ch=false;
      if(this.m_left!=left)this.m_left=left,ch=true;
      if(this.m_top!=top)this.m_top=top,ch=true;
      if(this.m_ofs_r!=ofs_r)this.m_ofs_r=ofs_r,ch=true;
      if(this.m_ofs_b!=ofs_b)this.m_ofs_b=ofs_b,ch=true;
      if(ch){
        this._renderPosition(left,top,ofs_r,ofs_b);
        this.OnPositionChanged();
      }
    },
    recalcSize:function(){
      var width=this.m_swidth;
      var height=this.m_sheight;

      if(this.parentControl!=null)switch(this.m_dock){
        case "fill":
          width=this.m_dright-this.m_dleft-this.m_mgn_l-this.m_mgn_r;
          height=this.m_dbottom-this.m_dtop-this.m_mgn_t-this.m_mgn_b;
          break;
        case "bottom":
        case "top":
          width=this.m_dright-this.m_dleft-this.m_mgn_l-this.m_mgn_r;
          break;
        case "right":
        case "left":
          height=this.m_dbottom-this.m_dtop-this.m_mgn_t-this.m_mgn_b;
          break;
      }

      if(width!=this.m_width||height!=this.m_height){
        this.m_width=width;
        this.m_height=height;
        this.recalcInnerSize();
        this.OnSizeChanged();
      }
    },
    recalcInnerSize:function(){
      var w=this.m_width;
      var h=this.m_height;
      agh.dom.setStyle(this.e_main,'-agh-offset-width' ,w);
      agh.dom.setStyle(this.e_main,'-agh-offset-height',h);
    },
    recalcSizeRecursive:function(){
      this.recalcInnerSize();
    },
    _renderPosition:function(l,t,ofs_r,ofs_b){
      var style=this.e_main.style;
      if(ofs_r==null){
        style.left=l+"px";
        style.right='';
      }else{
        //if(agh.browser.vIE)ofs_r--;
        style.right=ofs_r+"px";
        style.left='';
      }
      if(ofs_b==null){
        style.top=t+"px";
        style.bottom='';
      }else{
        //if(agh.browser.vIE)ofs_b--;
        style.bottom=ofs_b+"px";
        style.top='';
      }
    }
  });

  ns.Element=new agh.Class("agh.Forms.Element",ns.ControlBase,{
    constructor:function(elem){
      this.base();
      this.e_main=elem;
      elem.style.position="absolute";
      elem.style.left="1px";
      elem.style.top="1px";
    }
  });
})();
//******************************************************************************
//  agh.Forms.Control
//==============================================================================
(function(){
  //--------------------------------------------------------------------------
  // 境界線の設定
  //--------------------------------------------------------------------------
  var c_high='threedhighlight';  //#ffffff
  var c_dark='threeddarkshadow'; //#404040
  var c_face='threedface';       //#d4d0c8
  var c_shad='threedshadow';     //#808080
  if(agh.browser.vCr){
    c_high='#ffffff';
    c_dark='#404040';
    c_face='#d4d0c8';
    c_shad='#808080';
  }

  var WIDTH_CONTAINS_BORDER=agh.browser.vIE&&agh.browser.isQks||agh.browser.vIE<6;
  var BORDER_STYLES={
    none:{
      name:'none',
      b0css:"border-width:0px;",
      b1css:"border-width:0px;background-color:"+c_face+";",
      b0_size:{w:0,h:0},
      b1_size:{w:0,h:0},
      padding:{t:0,b:0,r:0,l:0}
    },
    outset:{
      name:'outset',
      b0css:"border-width:1px;border-style:solid;border-color:"+c_high+" "+c_dark+" "+c_dark+" "+c_high+";",
      b1css:"border-width:1px;border-style:solid;border-color:"+c_face+" "+c_shad+" "+c_shad+" "+c_face+";background-color:"+c_face+";",
      b0_size:{w:2,h:2},
      b1_size:{w:2,h:2},
      padding:{t:0,b:0,r:0,l:0}
    },
    inset:{
      name:'inset',
      b0css:"border-width:1px;border-style:solid;border-color:"+c_shad+" "+c_high+" "+c_high+" "+c_shad+";",
      b1css:"border-width:1px;border-style:solid;border-color:"+c_dark+" "+c_face+" "+c_face+" "+c_dark+";background-color:"+c_face+";",
      b0_size:{w:2,h:2},
      b1_size:{w:2,h:2},
      padding:{t:0,b:0,r:0,l:0}
    },
    press:{ // ボタン押下時
      name:'press',
      b0css:"border-width:1px;border-style:solid;border-color:"+c_dark+" "+c_high+" "+c_high+" "+c_dark+";",
      b1css:"border-width:1px;border-style:solid;border-color:"+c_shad+" "+c_face+" "+c_face+" "+c_shad+";background-color:"+c_face+";",
      b0_size:{w:2,h:2},
      b1_size:{w:2,h:2},
      padding:{t:0,b:0,r:0,l:0}
    },
    bold:{
      name:'bold',
      b0css:"border-width:1px;border-style:solid;border-color:"+c_face+" "+c_dark+" "+c_dark+" "+c_face+";",
      b1css:"border-width:1px;border-style:solid;border-color:"+c_high+" "+c_shad+" "+c_shad+" "+c_high+";background-color:"+c_face+";",
      b0_size:{w:2,h:2},
      b1_size:{w:2,h:2},
      padding:{t:2,b:2,r:2,l:2}
    },
    inset1:{
      name:'inset1',
      b0css:"border-width:1px;border-style:solid;border-color:"+c_shad+" "+c_high+" "+c_high+" "+c_shad+";",
      b1css:"border-width:0px;background-color:"+c_face+";",
      b0_size:{w:2,h:2},
      b1_size:{w:0,h:0},
      padding:{t:0,b:0,r:0,l:0}
    },
    outset1:{
      name:'outset1',
      b0css:"border-width:1px;border-style:solid;border-color:"+c_high+" "+c_shad+" "+c_shad+" "+c_high+";",
      b1css:"border-width:0px;background-color:"+c_face+";",
      b0_size:{w:2,h:2},
      b1_size:{w:0,h:0},
      padding:{t:0,b:0,r:0,l:0}
    },
    flat:{
      name:'flat',
      b0css:"border-width:1px;border-style:solid;border-color:"+c_shad+";",
      b1css:"border-width:0px;background-color:"+c_face+";",
      b0_size:{w:2,h:2},
      b1_size:{w:0,h:0},
      padding:{t:0,b:0,r:0,l:0}
    },
    groove:{
      name:'groove',
      b0css:"border-width:1px;border-style:solid;border-color:"+c_shad+" "+c_high+" "+c_high+" "+c_shad+";",
      b1css:"border-width:1px;border-style:solid;border-color:"+c_high+" "+c_shad+" "+c_shad+" "+c_high+";background-color:"+c_face+";",
      b0_size:{w:2,h:2},
      b1_size:{w:2,h:2},
      padding:{t:0,b:0,r:0,l:0}
    }
  };

  function initializeStyleSheetControlBorders(sheet){
    sheet.add(
      "div.agh-forms-ctrl-b0",
      "display:block;margin:0px;padding:0px;cursor:default;position:absolute;");
    sheet.add(
      "div.agh-forms-ctrl-b1",
      "margin:0px;padding:0px;position:absolute;top:0px;left:0px;");
    sheet.add(
      "div.agh-forms-ctrl-c0",
      "margin:0px;padding:0px;border-width:0px;overflow:hidden;position:absolute;top:0px;left:0px;");

    var keys=agh.ownkeys(BORDER_STYLES);
    for(var i=0;i<keys.length;i++){
      var border=BORDER_STYLES[keys[i]];
      sheet.add("div.agh-forms-ctrl-b0-"+border.name,border.b0css);
      sheet.add("div.agh-forms-ctrl-b1-"+border.name,border.b1css);
    }
  }

  function initializeStyleSheetTabPages(sheet){
    sheet.add("table.agh-forms-tabpage-table","margin:0;");

    // head: tab sep rpad
    sheet.add(
      "td.agh-forms-tabpage-tab,td.agh-forms-tabpage-sep,td.agh-forms-tabpage-rpad",
      "margin:0;padding:0;vertical-align:top;background-color:"+c_face+";border-bottom:1px solid white;");
    sheet.add(
      [
        "td.agh-forms-tabpage-sep0-l","td.agh-forms-tabpage-sep1-l","td.agh-forms-tabpage-sep2-l","td.agh-forms-tabpage-sep3-l",
        "td.agh-forms-tabpage-sep0-r","td.agh-forms-tabpage-sep1-r","td.agh-forms-tabpage-sep2-r","td.agh-forms-tabpage-sep3-r",
        "td.agh-forms-tabpage-tab0-a"
      ].join(),
      "border-bottom:0px none transparent;"
    );

    // rpad
    sheet.add("td.agh-forms-tabpage-rpad","width:100%;height:20px;");

    // tab
    sheet.add("td.agh-forms-tabpage-tab" ,"white-space:nowrap;");
    sheet.add("div.agh-forms-tabpage-tab","margin:0;border-top:1px solid "+c_high+";padding:3px 4px 2px 4px;");
    sheet.add("td.agh-forms-tabpage-tab0-n","border-top:2px solid "+c_face+";");
    // ※ IE8: td 要素に position:relative を指定すると td の border が表示されなくなる。

    // sep
    function tabpage_sep_color(sel,a1,a2,b1,b2,c1){
      if(arguments.length==3){
        sheet.add(sel,"border-top:"+a1+"px solid "+a2+";");
      }else if(arguments.length==4){
        sheet.add(sel,"border-top:"+a1+"px solid "+a2+";background-color:"+b1+";");
      }else if(arguments.length==5){
        sheet.add(sel       ,"border-top:"+a1+"px solid "+a2+";");
        sheet.add(sel+" div","border-top:"+b1+"px solid "+b2+";");
      }else if(arguments.length==6){
        sheet.add(sel       ,"border-top:"+a1+"px solid "+a2+";background-color:"+c1+";");
        sheet.add(sel+" div","border-top:"+b1+"px solid "+b2+";");
      }
    }
    sheet.add("td.agh-forms-tabpage-sep div",
              "margin:0;padding:0;display:inline-block;width:1px;overflow:hidden;border-width:0px;font-size:1px;");
    tabpage_sep_color("td.agh-forms-tabpage-sep2-s",4,c_face,c_high);
    tabpage_sep_color("td.agh-forms-tabpage-sep3-s",3,c_face,1,c_high);
    tabpage_sep_color("td.agh-forms-tabpage-sep0-m",3,c_face,1,c_dark,c_shad);
    tabpage_sep_color("td.agh-forms-tabpage-sep1-m",4,c_face,c_dark);
    tabpage_sep_color("td.agh-forms-tabpage-sep2-m",4,c_face,c_high);
    tabpage_sep_color("td.agh-forms-tabpage-sep3-m",3,c_face,1,c_high);
    tabpage_sep_color("td.agh-forms-tabpage-sep0-e",3,c_face,1,c_dark,c_shad);
    tabpage_sep_color("td.agh-forms-tabpage-sep1-e",4,c_face,c_dark);
    tabpage_sep_color("td.agh-forms-tabpage-sep0-l",2,c_face,c_high);
    tabpage_sep_color("td.agh-forms-tabpage-sep1-l",1,c_face,1,c_high);
    tabpage_sep_color("td.agh-forms-tabpage-sep2-l",1,c_high);
    tabpage_sep_color("td.agh-forms-tabpage-sep3-l",1,c_high);
    tabpage_sep_color("td.agh-forms-tabpage-sep0-r",1,c_high);
    tabpage_sep_color("td.agh-forms-tabpage-sep1-r",1,c_high);
    tabpage_sep_color("td.agh-forms-tabpage-sep2-r",1,c_face,1,c_dark,c_shad);
    tabpage_sep_color("td.agh-forms-tabpage-sep3-r",2,c_face,c_dark);

    sheet.add(
      "td.agh-forms-tabpage-body",
      "margin:0;padding:0;"
        +"height:100%;position:relative;"
        +"background-color:"+c_dark+";"
        +"border-left:1px solid "+c_high+";");
    sheet.add(
      "div.agh-forms-tabpage-body",
      "margin:0;padding:0;"
        +"border-right:1px solid "+c_shad+";"
        +"border-bottom:1px solid "+c_shad+";"
        +"position:absolute;top:0;left:0;"
        +"width:100%;height:100%;");
  }

  // CSS の内容を動的に生成する:
  // -外部 CSS にしていると .css の読込が遅れたりした場合に、幾何計算がずれる。
  // -各要素にインラインで指定するのは大変だし、クラスの変更による書き換えも大変。
  // -環境や設定によって表示する内容を変更するのも楽。
  function initialize_stylesheet(document){
    if(agh.dom.bucket(document).reset('agh.forms.js/stylesheet.initialized',true))return;

    var sheet=agh.dom.stylesheet();
    initializeStyleSheetControlBorders(sheet);
    initializeStyleSheetTabPages(sheet);
  }

  //--------------------------------------------------------------------------
  // 定義
  //--------------------------------------------------------------------------
  var clsname="agh.Forms.Control";
  agh.Forms.Control=new agh.Class(clsname,ns.ControlBase,{
    m_border:BORDER_STYLES['none'],
    createElement:function(tagName,props,styles){
      var r=this.m_document.createElement(tagName);
      if(props)agh.memcpy(r,props);
      if(styles)agh.dom.setStyle(r,styles);
      return r;
    },
    createError:function(msg){
      var m=arguments.callee.caller;
      if('fullName' in m)
        msg=m.fullName+": "+msg;
      return new Error(msg);
    },
    //======================================================================
    constructor:function(doc){
      this.base();
      this.childControls=[];

      // note: className による style 指定は DOM Tree に追加しないと有効にならない。
      //  これは、DOM Tree 追加前の -agh-offset-width 等の計算の際に不便。
      //  従って、できるだけスクリプトの中で直接スタイルを設定してしまう事にする。
      //  (他の CSS 指定と輻輳しない為にも直接指定した方が良い。)
      //  →_styles_b0, ..., _styles_c0
      // note: Chrome では inline stylesheet でも DOM Tree に追加しないと有効にならない様だ。
      //  なので、以下の様に _styles_b0 等を指定しても意味がないという事になる。
      //  対策として Forms#Show で recalcSizeRecursive を実行する事にした。

      this.m_document=doc||document;
      initialize_stylesheet(this.m_document);
      this.e_b0=this.createElement('div',{className:'agh-forms-ctrl-b0'});
      this.e_b1=this.createElement('div',{className:'agh-forms-ctrl-b1'});
      this.e_c0=this.createElement('div',{className:'agh-forms-ctrl-c0'});
      this.e_main=this.e_b0;

      this.e_b0.appendChild(this.e_b1);
      this.e_b1.appendChild(this.e_c0);

      agh.dom.attach(this.e_b0,'-agh-click'     ,agh.delegate(this,this.OnClick));
      agh.dom.attach(this.e_b0,'-agh-mousedown' ,agh.delegate(this,this.OnMouseDown));
      agh.dom.attach(this.e_b0,'-agh-mouseup'   ,agh.delegate(this,this.OnMouseUp));
      agh.dom.attach(this.e_b0,'-agh-mousemove' ,agh.delegate(this,this.OnMouseMove));
      agh.dom.attach(this.e_b0,'-agh-mouseenter',agh.delegate(this,this.OnMouseEnter));
      agh.dom.attach(this.e_b0,'-agh-mouseleave',agh.delegate(this,this.OnMouseLeave));
      agh.dom.attach(this.e_b0,'mouseover'      ,agh.delegate(this,this.OnMouseOver));
      agh.dom.attach(this.e_b0,'mouseout'       ,agh.delegate(this,this.OnMouseOut));

      this.setBorderStyle("none");
      this.setPosition(0,0);
      //this.e_b0.attachEvent('onresize',agh.delegate(this,this.OnSizeChanged));
      //this.e_c0.attachEvent('onresize',agh.delegate(this,this.OnClientSizeChanged));
    },
    getContentElement:function getter(){
      return this.e_c0;
    },
    setContentStyle:function(style){
      agh.dom.setStyle(this.e_c0,style);
    },
    //======================================================================
    //  大きさ (ControlBase から継承)
    //======================================================================
    setBorderStyle:function(style){
      // resolve
      var border;
      if(agh.is(style,String)){
        var border=BORDER_STYLES[style];
        if(!border)throw this.createError("Unknown BorderStyle");
      }else
        border=style;

      // apply
      this.m_border=border;
      if(border.name){
        agh.dom.switchClassName(this.e_b0,"agh-forms-ctrl-b0",border.name);
        agh.dom.switchClassName(this.e_b1,"agh-forms-ctrl-b1",border.name);
      }else{
        agh.dom.setStyle(this.e_b0,border.b0_style);
        agh.dom.setStyle(this.e_b1,border.b1_style);
      }
      this.recalcInnerSize();
    },
    //----------------------------------------------------------------------
    m_pad_t:0,     // Number
    m_pad_b:0,     // Number
    m_pad_r:0,     // Number
    m_pad_l:0,     // Number
    getPaddingTop:function getter(){return this.m_pad_t+this.m_border.padding.t;},
    getPaddingBottom:function getter(){return this.m_pad_b+this.m_border.padding.b;},
    getPaddingLeft:function getter(){return this.m_pad_l+this.m_border.padding.l;},
    getPaddingRight:function getter(){return this.m_pad_r+this.m_border.padding.r;},
    setPaddingTop:function setter(t){
      if(!agh.is(t,Number))return;
      this.m_pad_t=t;this.recalcInnerSize();
    },
    setPaddingBottom:function setter(b){
      if(!agh.is(b,Number))return;
      this.m_pad_b=b;this.recalcInnerSize();
    },
    setPaddingLeft:function setter(r){
      if(!agh.is(r,Number))return;
      this.m_pad_r=r;this.recalcInnerSize();
    },
    setPaddingRight:function setter(l){
      if(!agh.is(l,Number))return;
      this.m_pad_l=l;this.recalcInnerSize();
    },
    setPadding:function(t,r,b,l){
      if(!r)r=t;
      if(!b)b=t;
      if(!l)l=r;
      if(agh.is(t,Number))this.m_pad_t=t;
      if(agh.is(b,Number))this.m_pad_b=b;
      if(agh.is(r,Number))this.m_pad_r=r;
      if(agh.is(l,Number))this.m_pad_l=l;
      this.recalcInnerSize();
    },
    //----------------------------------------------------------------------
    m_cwidth:100,  // Number 中身の横幅 (除 padding)
    m_cheight:100, // Number 中身の高さ (除 padding)
    getClientWidth:function getter(){return this.m_cwidth;},
    getClientHeight:function getter(){return this.m_cheight;},
    OnClientSizeChanged:function event(){
      this.recalcChildrenSize();
      this.__fire('ClientSizeChanged',{width:this.m_cwidth,height:this.m_cheight});
    },
    //----------------------------------------------------------------------
    recalcInnerSize:function override(){
      var w=this.m_width;
      var h=this.m_height;
      agh.dom.setStyle(this.e_b0,'-agh-offset-width' ,w);
      agh.dom.setStyle(this.e_b0,'-agh-offset-height',h);
      agh.dom.setStyle(this.e_b1,'-agh-offset-width' ,w-=this.m_border.b0_size.w);
      agh.dom.setStyle(this.e_b1,'-agh-offset-height',h-=this.m_border.b0_size.h);
      agh.dom.setStyle(this.e_c0,'-agh-offset-width' ,w-=this.m_border.b1_size.w+this.getPaddingLeft()+this.getPaddingRight());
      agh.dom.setStyle(this.e_c0,'-agh-offset-height',h-=this.m_border.b1_size.h+this.getPaddingTop()+this.getPaddingBottom());
      this.e_c0.style.left=this.getPaddingLeft()+"px";
      this.e_c0.style.top =this.getPaddingTop() +"px";
      if(this.m_cwidth!=w||this.m_cheight!=h){
        this.m_cwidth =w;
        this.m_cheight=h;
        this.OnClientSizeChanged();
      }
    },

    //======================================================================
    //  親子関係
    //======================================================================
    childControls:[],
    addControl:function(ctrl){
      if(ctrl instanceof agh.Forms.ControlBase){
        if(ctrl.parentControl==this)return;
        if(ctrl.parentControl!=null)
          this.removeControl(ctrl,true);

        // 追加
        this.childControls.push(ctrl);
        ctrl.parentControl=this;
        ctrl.__add('SizeChanged',this,this.eh_child_SizeChanged);
        ctrl.__add('DockChanged',this,this.eh_child_DockChanged);
        this.e_c0.appendChild(ctrl.getMainElement());

        // 再配置
        if(ctrl.m_dock!=null){
          this.recalcChildrenSize(this.childControls.length-1);
        }

        ctrl.OnAfterAppend();
      }else{
        throw this.createError("The specified argument is not Control instance.");
      }
    },
    removeControl:function(ctrl,suppressLayout){
      if(agh.is(ctrl,agh.Forms.Control)){
        if(ctrl.parentControl!=this)
          throw this.createError("The specified control is not child of this control.");
        ctrl.OnBeforeRemove();

        // 削除
        agh.dom.remove(ctrl.getMainElement());
        ctrl.__remove('SizeChanged',this,this.eh_child_SizeChanged);
        ctrl.__remove('DockChanged',this,this.eh_child_DockChanged);
        ctrl.parentControl=null;
        var i=agh.Array.indexOf(this.childControls,ctrl);
        agh.Array.remove_atD(this.childControls,i);

        // 再配置
        if(suppressLayout)return;
        if(ctrl.m_document==null)return;
        this.recalcChildrenSize(i);
      }else{
        throw this.createError("The specified argument is not Control instance.");
      }
    },
    eh_child_SizeChanged:function(child,args){
      if(child.m_dock==null)return;
      var i=agh.Array.indexOf(this.childControls,child);
      if(i<0)throw this.createError("fatal"); // イベントの hook/unhook に問題
      this.recalcChildrenSize(i);
    },
    eh_child_DockChanged:function(child,args){
      var i=agh.Array.indexOf(this.childControls,child);
      if(i<0)throw this.createError("fatal"); // イベントの hook/unhook に問題
      this.recalcChildrenSize(i);
    },
    //----------------------------------------------------------------------
    m_allowOverwrapMargin:false,
    m_calculating_chsz:false,
    recalcChildrenSize:function(start){
      /// <summary>
      /// Dock を有する子コントロールの配置を再計算します。
      /// </summary>
      /// <param name="start" type="Number" optional="true">
      /// 再計算の開始位置を指定します。
      /// この番号よりも若いコントロールについては、再計算を省略します。
      /// 引数を省略した場合は、全ての子コントロールについて再計算を実施します。
      /// </param>
      if(this.m_calculating_chsz)return;
      if(start==null)start=0;
      else if(start>=this.childControls.length)return;

      this.m_calculating_chsz=true;

      if(this.m_allowOverwrapMargin)
        this._recalcChildrenSize_implOverwrapMargin(start);
      else
        this._recalcChildrenSize_implAdditiveMargin(start);

      this.m_calculating_chsz=false;
    },
    _recalcChildrenSize_implAdditiveMargin:function(start){
      var left  =0;
      var right =this.m_cwidth;
      var top   =0;
      var bottom=this.m_cheight;
      for(var i=0;i<this.childControls.length;i++){
        var child=this.childControls[i];
        if(child.m_dock==null&&child.m_ddock==null)continue;
        if(start<=i){
          child.m_ddock  =child.m_dock;
          child.m_dleft  =left;
          child.m_dright =right;
          child.m_dtop   =top;
          child.m_dbottom=bottom;
          child.recalcSize();
          child.recalcPos();
        }
        switch(child.m_dock){
        case "left"  :left  +=child.getMarginWidth();break;
        case "right" :right -=child.getMarginWidth();break;
        case "top"   :top   +=child.getMarginHeight();break;
        case "bottom":bottom-=child.getMarginHeight();break;
        }
      }
    },
    _recalcChildrenSize_implOverwrapMargin:function(start){
      var left=0,right=this.m_cwidth,top=0,bottom=this.m_cheight;
      var mleft  =left  -this.getPaddingLeft();
      var mright =right +this.getPaddingRight();
      var mtop   =top   -this.getPaddingTop();
      var mbottom=bottom+this.getPaddingBottom();

      for(var i=0;i<this.childControls.length;i++){
        var child=this.childControls[i];
        if(child.m_dock==null&&child.m_ddock==null)continue;
        if(start<=i){
          child.m_ddock  =child.m_dock;
          child.m_dleft  =Math.max(mleft  ,left  -child.getMarginLeft());
          child.m_dright =Math.min(mright ,right +child.getMarginRight());
          child.m_dtop   =Math.max(mtop   ,top   -child.getMarginTop());
          child.m_dbottom=Math.min(mbottom,bottom+child.getMarginBottom());
          child.recalcSize();
          child.recalcPos();
        }
        switch(child.m_dock){
        case "left":
          left=child.m_dleft+child.getMarginWidth();
          mleft=left-child.getMarginRight();
          break;
        case "right":
          right=child.m_dright-child.getMarginWidth();
          mright=right+child.getMarginLeft();
          break;
        case "top":
          top=child.m_dtop+child.getMarginHeight();
          mtop=top-child.getMarginBottom();
          break;
        case "bottom":
          bottom=child.m_dbottom-child.getMarginHeight();
          mbottom=bottom+child.getMarginTop();
          break;
        }
      }
    },
    recalcSizeRecursive:function override(){
      // CSS の設定が外部から変更されたときの為に、
      // -agh-offset-width の計算を再度実行し直す。
      if(this.m_calculating_size)return;
      this.m_calculating_size=true;

      this.recalcInnerSize();
      for(var i=0;i<this.childControls.length;i++)
        this.childControls[i].recalcSizeRecursive();

      this.m_calculating_size=false;
    },
    //======================================================================
    //  各種イベント
    //======================================================================
    OnClick:function event(args){
      this.__fire('Click',args);
    },
    OnMouseDown:function event(args){
      this.__fire('MouseDown',args);
    },
    OnMouseUp:function event(args){
      this.__fire('MouseUp',args);
    },
    OnMouseOut:function event(args){
      this.__fire('MouseOut',args);
    },
    OnMouseOver:function event(args){
      this.__fire('MouseOver',args);
    },
    OnMouseMove:function event(args){
      this.__fire('MouseMove',args);
    },
    OnMouseLeave:function event(args){
      this.__fire('MouseLeave',args);
    },
    OnMouseEnter:function event(args){
      this.__fire('MouseEnter',args);
    },
    //*/
    //======================================================================
    //  スタイル
    //======================================================================
    m_opacity:1.0,
    getOpacity:function getter(){
      // var o=parseFloat(agh.dom.getStyle(this.e_b0,"-agh-opacity"));
      // return isNaN(o)?1.0:o;
      return this.m_opacity;
    },
    setOpacity:function setter(value){
      this.m_opacity=value;
      agh.dom.setStyle(this.e_b0,"-agh-opacity",value);
    },
    m_backcolor:c_face,
    m_forecolor:"black",
    getBackColor:function getter(){
      return this.m_backcolor;
    },
    setBackColor:function setter(value){
      if(this.m_backcolor==value)return;
      this.m_backcolor=value;
      this.e_b1.style.backgroundColor=value;
    },
    getForeColor:function getter(){
      return this.m_forecolor;
    },
    setForeColor:function setter(value){
      if(this.m_forecolor==value)return;
      this.m_forecolor=value;
      this.e_b1.style.color=value;
    },
    m_hscroll:false,
    m_vscroll:false,
    getHScroll:function getter(){return this.m_hscroll;},
    getVScroll:function getter(){return this.m_vscroll;},
    setHScroll:function setter(value){
      if(this.m_hscroll==value)return;
      this.m_hscroll=value;
      this.e_c0.style.overflowX
        =this.m_hscroll==null?'auto':
        this.m_hscroll?'scroll':
        'hidden';
    },
    setVScroll:function setter(value){
      if(this.m_vscroll==value)return;
      this.m_vscroll=value;
      this.e_c0.style.overflowY
        =this.m_vscroll==null?'auto':
        this.m_vscroll?'scroll':
        'hidden';
    },
    setScroll:function setter(value){
      this.setHScroll(value);
      this.setVScroll(value);
    },
    //======================================================================
    //  プロパティ
    //======================================================================
    m_text:"Control1",
    getText:function getter(){return this.m_text;},
    setText:function setter(value){
      this.m_text=value;
      this.OnTextChanged({value:value});
    },
    OnTextChanged:function event(e){
      this.__fire('TextChanged',e);
    },
    __term__:0
  });
})();
//******************************************************************************
//  agh.Forms.Button
//==============================================================================
(function(){
  ns.Button=new agh.Class('agh.Forms.Button',ns.Control,{
    constructor:function(doc){
      this.base(doc);
      this.setBorderStyle("outset");
      this.setContentStyle({
        textAlign:'center',
        fontSize:'12px',
        fontFamily:"'MS UI Gothic','MS PGothic'",
        AghUserSelect:"none",
        padding:'2px'
      });
      this.setSize(64,24);
    },
    OnMouseDown:function override(e){
      if(e.buttons.left){
        this.set_state("push");
        agh.dom.captureMouse(this.e_b0);
        this.m_pushed=true;
        e.cancelBubble=true;
      }
      this.callbase(e);
    },
    OnMouseUp:function override(e){
      if(e.buttons.left){
        this.set_state("free");
        this.m_pushed=false;
        agh.dom.releaseMouse(this.e_b0);
      }
      this.callbase(e);
    },
    OnMouseEnter:function override(e){
      if(this.m_pushed)this.set_state("push");
      this.callbase(e);
    },
    OnMouseLeave:function override(e){
      if(this.m_pushed)this.set_state("free");
      this.callbase(e);
    },
    m_pushed:false,
    m_state:'free',
    set_state:function(s){
      if(s==this.m_state)return;
      switch(s){
        case "free":
          this.setBorderStyle("outset");
          this.setPaddingTop(0);
          this.setPaddingLeft(0);
          break;
        case "push":
          this.setBorderStyle("press");
          this.setPaddingTop(1);
          this.setPaddingLeft(1);
          break;
      }
      this.m_state=s;
    },
    m_text:"Button1",
    setText:function setter$override(text){
      this.e_c0.appendChild(document.createTextNode(text));
      this.callbase(text);
    },
    __term__:0
  });
})();
//******************************************************************************
//  agh.Forms.Titlebar
//==============================================================================
(function(){
  var TITLE_COLORS={
    blue:{
      start:"#0a246a",
      end:"#a6caf0",
      imageData:'data:image/png;base64,'
        +"iVBORw0KGgoAAAANSUhEUgAAAKAAAAABCAIAAADW7TIxAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8"
        +"YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAJZJREFUKFNdkFsW"
        +"gCAIRIHP1tHq2v9/DTOAmnV8gF6v+HU/rmbmERj4M1CJfUAMm7DVIgI9vlwj6v5ijr0IH0CRRGbjuZ3P"
        +"3A9oGZRRNyx5wXhxIp0iKwkUY9lTOA1N1xI4hgS2mvLUW8A5JRkC9eRCErgQBJq/Ul3u9Wzhx7D1q4aV"
        +"qnLxKW14ALcKJDCRIKD+dEvHAX4woAZeM/JNKAAAAABJRU5ErkJggg=="
    },
    green:{
      start:"#0a6a24",
      end:"#a6f0a6",
      imageData:'data:image/png;base64,'
        +"iVBORw0KGgoAAAANSUhEUgAAAKAAAAABCAIAAADW7TIxAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8"
        +"YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAJZJREFUKFNdkTsC"
        +"wzAIQ4Gx5+jpev+9kcTHJhlsA/KzIP75fT0/M49ww6ETtV8bSuFhqQ2sUCuBtP95VuIGMqNyYyXQzQYz"
        +"fgERUkD4PI+QoMNRhZ4XCYL0iJqRq5A7dYxGXs7aT/lcwLmVZgjMGSz8NJMONYzLeRnXVQKPw7LaM1Qp"
        +"m1YDPbsNXBPQfxAQ8+cDxt4H+AAuxwZewEvJ3QAAAABJRU5ErkJggg=="
    },
    gray:{
      start:'#808080',
      end:'#c0c0c0'
    }
  };
  ns.Titlebar=new agh.Class('agh.Forms.Titlebar',ns.Control,{
    constructor:function(doc){
      this.base(doc);
      this.setSize(18,19);
      this.setDock('top');
      this.setPaddingBottom(1);

      this.init_gradient();
      this.init_title();
      this.init_buttons();

      this.e_b0.isTitleBarFace=true;
      this.e_b1.isTitleBarFace=true;
      this.e_c0.isTitleBarFace=true;

      this.setText("Hello");
    },
    init_gradient:function(){
      // 背景グラデーション
      var color=TITLE_COLORS.blue;
      if(agh.browser.vIE){
        // IE
        this.e_c0.style.filter
          ="progid:DXImageTransform.Microsoft.Gradient(GradientType=1,StartColorStr="
          +color.start+",EndColorStr="+color.end+")";
      }else if(agh.browser.isWk){
        this.e_c0.style.background
          ="-webkit-gradient(linear, left top, right top, from("
          +color.start+"), to("+color.end+"))";
      }else{
        // Firefox
        this.e_image=this.createElement("img",{
          //alt:'titlebar',
          src:color.imageData
        },{
          AghUserSelect:'none',
          height:'18px',
          width:'18px',
          position:'absolute',
          left:'0px',
          top:'0px'
        });
        this.e_c0.appendChild(this.e_image);

        // 画像だけだと Drag & Drop の際に、
        // 画像リンクの D&D に為ってしまう為、上から被せる。
        this.e_cover=this.createElement("div",null,{
          AghUserSelect:'none',
          height:'18px',
          width:'18px',
          position:'absolute',
          left:'0px',
          top:'0px',
          AghOpacity:"0"
        });
        this.e_c0.appendChild(this.e_cover);

        this.e_image.isTitleBarFace=true;
        this.e_cover.isTitleBarFace=true;
        var _this=this;
        this.__add('ClientSizeChanged',null,function(sender,e){
          var w=_this.m_cwidth+'px';
          _this.e_cover.style.width=w;
          _this.e_image.style.width=w;
        });
      }
    },
    init_title:function(){
      this.e_icon=this.createElement("img",{
        src:agh.scripts.AGH_URLBASE+"agh.forms.form.png"
      },{
        position:"absolute",
        left:"2px",
        top:"1px",
        width:'16px',height:'16px',
        AghUserSelect:"none"
      });
      this.e_c0.appendChild(this.e_icon);

      // タイトル文字列
      this.e_title=this.createElement("span",{isTitleBarFace:true},{
        color:"white",fontWeight:"bold",
        fontFamily:"MS UI Gothic",
        position:"absolute",
        left:"20px",
        top:agh.browser.vFx?"2px":"3px",
        fontSize:"12px",
        AghUserSelect:"none"
      });
      this.e_c0.appendChild(this.e_title);

      if(agh.browser.vIE){
        agh.dom.setStyle(this.e_icon,"-agh-opacity",1.0);
        agh.dom.setStyle(this.e_title,"-agh-opacity",1.0);
      }
    },
    init_buttons:function(){
      this.c_btnC=this.createButton("agh.forms.clo.png");
      this.c_btnC.setMargin(2,2);
      this.c_btnC.getContentElement().title="閉じる";
      this.c_btnC.__add('Click',this,this.OnCloseButton);
      this.addControl(this.c_btnC);

      this.c_btnX=this.createButton("agh.forms.max.png");
      this.c_btnX.__add('Click',this,this.OnMaximizeButton);
      this.c_btnX.getContentElement().title="最大化";
      this.addControl(this.c_btnX);

      this.c_btnN=this.createButton("agh.forms.min.png");
      this.c_btnN.__add('Click',this,this.OnMinimizeButton);
      this.c_btnN.getContentElement().title="最小化";
      this.addControl(this.c_btnN);

      /*
      this.c_btnR=this.createButton("agh.forms.res.png");
      this.c_btnR.__add('Click',this,this.OnRestoreButton);
      this.c_btnR.getContentElement().title="元に戻す (縮小)";
      this.addControl(this.c_btnR);
      //*/

      if(agh.browser.vIE){
        agh.dom.setStyle(this.c_btnC.getMainElement(),"-agh-opacity",1.0);
        agh.dom.setStyle(this.c_btnX.getMainElement(),"-agh-opacity",1.0);
        agh.dom.setStyle(this.c_btnN.getMainElement(),"-agh-opacity",1.0);
      }
    },
    createButton:function(srcname){
      var src=agh.scripts.AGH_URLBASE+srcname;
      var b=new agh.Forms.Button();
      b.setContentStyle({
        fontSize:'8px',
        backgroundImage:"url("+src+")",
        backgroundRepeat:"no-repeat",
        padding:'0px'
      });
      b.setMargin(2,0);
      b.setDock("right");
      b.setSize(16,14);
      b.setText("");
      return b;
    },
    //======================================================================
    //    文字列
    //======================================================================
    e_icon:null,
    e_image:null,
    e_cover:null,
    m_text:"Titlebar",
    e_title:null,
    setText:function setter$override(value){
      agh.dom.setInnerText(this.e_title,value);
      this.callbase(value);
    },
    //======================================================================
    //    ボタン
    //======================================================================
    c_btnC:null, // 閉じる
    c_btnN:null, // 最小化
    c_btnX:null, // 最大化
    c_btnR:null, // 元のサイズに戻す
    OnCloseButton:function event(e){
      this.__fire('CloseButton',e);
    },
    OnMaximizeButton:function event(e){
      this.__fire('MaximizeButton',e);
    },
    OnMinimizeButton:function event(e){
      this.__fire('MinimizeButton',e);
    },
    OnRestoreButton:function event(e){
      this.__fire('RestoreButton',e);
    },
    //======================================================================
    //    ドラッグ
    //======================================================================
    OnTitleDragStart:function event(e){
      this.__fire('TitleDragStart',e);
    },
    OnTitleDrag:function event(e){
      this.__fire('TitleDrag',e);
    },
    OnTitleDragEnd:function event(e){
      this.__fire('TitleDragEnd',e);
    },
    m_tdrag:false,
    m_tdrag_scrX:0,
    m_tdrag_scrY:0,
    OnMouseDown:function override(e){
      if(e.buttons.left&&(e.srcElement||e.target).isTitleBarFace){
        if(!this.m_tdrag){
          this.m_tdrag=true;
          this.m_tdrag_scrX=e.screenX;
          this.m_tdrag_scrY=e.screenY;

          agh.dom.captureMouse(this.e_b0,true);
          this.OnTitleDragStart(e);
        }
      }
      this.callbase(e);
    },
    OnMouseMove:function override(e){
      if(this.m_tdrag){
        e.dragDeltaX=e.screenX-this.m_tdrag_scrX;
        e.dragDeltaY=e.screenY-this.m_tdrag_scrY;
        this.OnTitleDrag(e);
      }
      this.callbase(e);
    },
    OnMouseUp:function override(e){
      if(this.m_tdrag){
        this.m_tdrag=false;
        agh.dom.releaseMouse(this.e_b0,true);

        e.dragDeltaX=e.screenX-this.m_tdrag_scrX;
        e.dragDeltaY=e.screenY-this.m_tdrag_scrY;
        this.OnTitleDragEnd(e);
      }
      this.callbase(e);
    },
    __term__:0
  });
})();
//******************************************************************************
//  agh.Forms.Form
//==============================================================================
(function(){
  var WINSTATE_NORMAL=1;
  var WINSTATE_MAX   =2;
  var WINSTATE_MIN   =3;
  //--------------------------------------------------------------------------
  //    dummy_frame
  //--------------------------------------------------------------------------
  var dummy_frame={
    isDummy:true,
    m_document:null,
    e_main:null,
    init:function(form){
      var elem=form.getMainElement();
      this.initializeMainElement(elem.ownerDocument);

      var rect=agh.dom.getRectangle(elem,'border-box','page');
      agh.dom.setStyle(this.e_main,{
        display:"block",
        '-agh-offset-width' :this.m_ow=this.m_w=rect.width,
        '-agh-offset-height':this.m_oh=this.m_h=rect.height
      });

      var body=this.m_document.body;
      var dmat=agh.dom.getCssTransform(body);
      if(dmat.isIdentity)dmat=null;

      // initialize this.m_ol, this.m_ot and frame position
      var x=rect.x,y=rect.y;
      if(dmat){
        x-=agh.dom.getStyle(body,"-agh-margin-left");
        y-=agh.dom.getStyle(body,"-agh-margin-top");

        var m=dmat;
        var _x=x,_y=y,_det=1.0/(m[0]*m[3]-m[1]*m[2]);
        x=_det*(m[3]*_x-m[2]*_y);
        y=_det*(m[0]*_y-m[1]*_x);

        x-=agh.dom.getStyle(body,"-agh-border-left-width");
        y-=agh.dom.getStyle(body,"-agh-border-top-width");
      }
      this._updatePosition(this.m_ol=x,this.m_ot=y);

      // 表示角度の設定
      this.omat=rect.matrix2d;
      if(this.omat){
        // set transform (mat = document.body からの相対的な変換)
        var mat=dmat?agh.dom.getCssTransform(elem,body): this.omat;
        this.e_main.style.transformOrigin="0px 0px";
        this.e_main.style.transform="matrix({0}, {1}, {2}, {3}, {4}, {5})".format(mat[0],mat[1],mat[2],mat[3],0,0);
      }else
        this.e_main.style.transform="none";
    },
    initializeMainElement:function(doc){
      if(doc==null||this.m_document==doc)return;

      if(this.e_main)agh.dom.remove(this.e_main);
      this.m_document=doc;
      this.e_main=doc.createElement("div");
      agh.dom.setStyle(this.e_main,{
        margin:"0",padding:"0",
        zIndex:"60000",
        position:"absolute",
        border:"4px solid gray"
        //border:"2px dotted black"
      });
      doc.body.appendChild(this.e_main);
    },
    _updatePosition:function(x,y){
      this.e_main.style.left=(this.m_l=x)+"px";
      this.e_main.style.top =(this.m_t=y)+"px";
    },
    getWidth:function(){return this.m_w;},
    getLeft:function(){return this.m_l;},
    getHeight:function(){return this.m_h;},
    getTop:function(){return this.m_t;},
    setWidth:function(value){
      agh.dom.setStyle(this.e_main,"-agh-offset-width",this.m_w=value);
    },
    setLeft:function(value){
      this._updatePosition(value,this.m_t);
    },
    setHeight:function(value){
      agh.dom.setStyle(this.e_main,"-agh-offset-height",this.m_h=value);
    },
    setTop:function(value){
      this._updatePosition(this.m_l,value);
    },
    setSize:function(width,height){
      agh.dom.setStyle(this.e_main,"-agh-offset-width",this.m_w=width);
      agh.dom.setStyle(this.e_main,"-agh-offset-height",this.m_h=height);
    },
    setPosition:function(left,top){
      this._updatePosition(left,top);
    },
    terminate:function(form){
      this.e_main.style.display="none";

      if(form==null)return;

      var w=form.getWidth();
      var h=form.getHeight();
      var dw=this.m_w-this.m_ow;
      var dh=this.m_h-this.m_oh;
      form.setSize(w+dw,h+dh);

      var l=form.getLeft();
      var t=form.getTop();
      var dl=this.m_l-this.m_ol;
      var dt=this.m_t-this.m_ot;
      form.setPosition(l+dl,t+dt);
    }
  };
  //--------------------------------------------------------------------------
  //    Resize: 大きさの変更
  //--------------------------------------------------------------------------
  var RESIZE_TYPES=["nw","n","ne","w",false,"e","sw","s","se"];
  var resizer_base={
    ox:0,ol:0,ow:0,
    oy:0,ot:0,oh:0,

    matb:null,
    mat1:null,

    // (x,y) 移動量
    dx:0,dy:0,

    // CSS Transforms 2D 補正
    smod_cw:0.5,
    smod_ch:0.5,
    smod_dx:0,
    smod_dy:0,

    select:function(form){
      this.ow=form.getWidth();
      this.ol=form.getLeft();
      this.oh=form.getHeight();
      this.ot=form.getTop();

      // CSS Transforms (2D)
      this.matb=agh.dom.getCssTransform(form.e_main);
      if(this.matb.isIdentity){
        this.matb=null;
        this.mat1=null;
      }else{
        this.mat1=agh.dom.getCssTransform(form.e_main,form.e_main.parentNode);

        {
          // determine this.smod_cw and this.smod_ch
          //
          //   ■agh.Forms.Form で transform-origin の値を別途管理する。
          //     % 指定かどうか、%指定ならばどの様な値になっているかを保持する。
          //     this.smod_cw, this.smod_ch はわざわざ計算せずに保持している値を用いる。
          //
          //   以下のコードは暫定的な物。
          //   transform-origin が全て % で指定されていると仮定して px 値から % 値を算出している。
          var ox=Number.NaN,oy=Number.NaN,w=Number.NaN,h=Number.NaN;
          var m;

          var style=agh.dom.getStyle(form.e_main);
          var porigin=(style.transformOrigin||"").split(" ");
          if((m=/^([-+]?[\d.]+)px$/.exec(porigin[0])))ox=+m[1];
          if((m=/^([-+]?[\d.]+)px$/.exec(porigin[1])))oy=+m[1];
          if((m=/^([-+]?[\d.]+)px$/.exec(style.width)))w=+m[1];
          if((m=/^([-+]?[\d.]+)px$/.exec(style.height)))h=+m[1];

          this.smod_cw=isNaN(ox)||isNaN(w)?0: ox/w;
          this.smod_ch=isNaN(oy)||isNaN(h)?0: oy/h;
        }
      }
    },
    init:function(form,e){
      this.ox=e.clientX;
      this.oy=e.clientY;
      this.select(form);
    },
    update:function(form,e){
      var dx=e.clientX-this.ox;
      var dy=e.clientY-this.oy;
      if(this.matb){
        var m=this.matb;
        var _dx=dx,_dy=dy;
        var _det=1.0/(m[0]*m[3]-m[1]*m[2]);
        dx=_det*(m[3]*_dx-m[2]*_dy);
        dy=_det*(m[0]*_dy-m[1]*_dx);
      }
      this.internal_update(form,dx,dy);
    },
    updateSize:function(form,dw,dh){
      /// @fn updateSize
      /// @param dw form 座標での幅の変化量を指定します。
      /// @param dh form 座標での高さの変化量を指定します。

      form.setSize(this.ow+dw,this.oh+dh);
      var m=this.mat1;
      if(m&&!m.isIdentity){
        dw*=this.smod_cw;
        dh*=this.smod_ch;
        this.smod_dx=(dw*m[0]+dh*m[2])-dw;
        this.smod_dy=(dw*m[1]+dh*m[3])-dh;
      }else{
        this.smod_dx=0;
        this.smod_dy=0;
      }

      form.setPosition(
        this.ol+this.dx+this.smod_dx,
        this.ot+this.dy+this.smod_dy);
    },
    updatePosition:function(form,dx,dy){
      /// @fn updatePosition
      /// @param dx form 座標での左端の位置変化量を指定します。
      /// @param dy form 座標での上端の位置辺加療を指定します。

      var m=this.mat1;
      if(m&&!m.isIdentity){
        this.dx=dx*m[0]+dy*m[2];
        this.dy=dx*m[1]+dy*m[3];
      }else{
        this.dx=dx;
        this.dy=dy;
      }
      form.setPosition(
        this.ol+this.dx+this.smod_dx,
        this.ot+this.dy+this.smod_dy);
    }
  };
  var RESIZERS={
    nw:agh.wrap(resizer_base,{
      internal_update:function(form,dx,dy){
        this.updateSize(form,-dx,-dy);
        this.updatePosition(form,dx,dy);
      }
    }),
    n:agh.wrap(resizer_base,{
      internal_update:function(form,dx,dy){
        this.updateSize(form,0,-dy);
        this.updatePosition(form,0,dy);
      }
    }),
    ne:agh.wrap(resizer_base,{
      internal_update:function(form,dx,dy){
        this.updateSize(form,dx,-dy);
        this.updatePosition(form,0,dy);
      }
    }),
    w:agh.wrap(resizer_base,{
      internal_update:function(form,dx,dy){
        this.updateSize(form,-dx,0);
        this.updatePosition(form,dx,0);
      }
    }),
    e:agh.wrap(resizer_base,{
      internal_update:function(form,dx,dy){
        this.updateSize(form,dx,0);
      }
    }),
    sw:agh.wrap(resizer_base,{
      internal_update:function(form,dx,dy){
        this.updateSize(form,-dx,dy);
        this.updatePosition(form,dx,0);
      }
    }),
    s:agh.wrap(resizer_base,{
      internal_update:function(form,dx,dy){
        this.updateSize(form,0,dy);
      }
    }),
    se:agh.wrap(resizer_base,{
      internal_update:function(form,dx,dy){
        this.updateSize(form,dx,dy);
      }
    }),
    drag:agh.wrap(resizer_base,{
      internal_update:function(form,dx,dy){
        this.updatePosition(form,dx,dy);
      }
    })
  };
  var resizeController={
    m_enableAlpha:true,  // 設定: サイズ変更時に本体を半透明にするか否か
    m_use_dummy:true,    // 設定: サイズ変更時にフレームを使用するか否か
    init:function(form,resizer,e){
      if(this.m_enableAlpha)
        agh.dom.setStyle(form.getMainElement(),"-agh-opacity",0.5);

      if(this.m_use_dummy){
        dummy_frame.init(form);
        form=dummy_frame;
      }

      resizer.init(form,e);
    },
    update:function(form,resizer,e){
      if(this.m_use_dummy)
        form=dummy_frame;

      resizer.update(form,e);
    },
    terminate:function(form,resizer,e){
      if(this.m_enableAlpha)
        agh.dom.setStyle(form.getMainElement(),"-agh-opacity",form.getOpacity());

      this.update(form,resizer,e);
      if(this.m_use_dummy){
        dummy_frame.terminate();
        resizer.select(form);
        resizer.update(form,e);
      }
    }
  };
  //--------------------------------------------------------------------------
  //    Drag: 位置の変更
  //--------------------------------------------------------------------------
  // var DRAGGER={
  //   m_drag_origx:0,
  //   m_drag_origy:0,
  //   select:function(form){
  //     this.m_drag_origx=form.getLeft();
  //     this.m_drag_origy=form.getTop();
  //   },
  //   init:function(form,e){
  //     this.select(form);
  //   },
  //   update:function(form,e){
  //     var x=this.m_drag_origx+e.dragDeltaX;
  //     var y=this.m_drag_origy+e.dragDeltaY;
  //     form.setPosition(x,y);
  //   }
  // };

  var DRAGGER=RESIZERS.drag;

  //--------------------------------------------------------------------------
  agh.Forms.Form=new agh.Class('agh.Forms.Form',agh.Forms.Control,{
    constructor:function(doc){
      this.base(doc);
      this.getMainElement().style.fontSize="12px";
      this.setBorderStyle('bold');
      this.setSize(200,200);
      this.setPosition(100,100);

      this.c_title=new agh.Forms.Titlebar();
      this.c_title.setText("Form1");
      this.c_title.__add('TitleDragStart',this,this.eh_title_DragStart);
      this.c_title.__add('TitleDragEnd',this,this.eh_title_DragEnd);
      this.c_title.__add('TitleDrag',this,this.eh_title_Drag);
      this.c_title.__add('CloseButton',this,this.eh_title_CloseButton);
      this.c_carea=new agh.Forms.Control();
      this.c_carea.setDock("fill");
      // TODO: hook to
      // CloseButton
      // MaximizeButton
      // MinimizeButton
      // RestoreButton

      this.base.addControl.call(this,this.c_title);
      this.base.addControl.call(this,this.c_carea);
    },
    c_title:null,
    c_carea:null,
    m_winstate:WINSTATE_NORMAL, // max min normal
    //----------------------------------------------------------------------
    //    Drag
    //----------------------------------------------------------------------
    eh_title_DragStart:function(sender,e){
      resizeController.init(this,DRAGGER,e);
    },
    eh_title_Drag:function(sender,e){
      resizeController.update(this,DRAGGER,e);
    },
    eh_title_DragEnd:function(sender,e){
      resizeController.terminate(this,DRAGGER,e);
    },
    eh_title_CloseButton:function(sender,e){
      agh.dom.remove(this.e_b0);
    },
    //----------------------------------------------------------------------
    //    Resize
    //----------------------------------------------------------------------
    m_resizable:true,
    setResizable:function setter(value){
      if(this.m_resizable=value){
        this.m_resize_pre=null;
      }
    },
    getResizable:function getter(){
      return this.m_resizable;
    },
    m_resize_type:null, // サイズ変更候補
    m_resizing:null,
    OnMouseMove:function override(e){
      if(this.m_resizing){
        resizeController.update(this,this.m_resizing,e);
      }else if(this.m_resizable&&this.m_winstate==WINSTATE_NORMAL){
        var rectP=agh.dom.getRectangle(this.e_b0,'border-box','frame');

        // get mouse position in border-box coordinates
        var l=e.clientX-rectP.x;
        var t=e.clientY-rectP.y;
        if(rectP.matrix2d){
          var m=rectP.matrix2d;
          var _l=l;
          var _t=t;

          // solve the following equations:
          //   _l  =  m0 m2  X l
          //   _t     m1 m3    t
          var _det=1.0/(m[0]*m[3]-m[1]*m[2]);
          l=_det*( m[3]*_l-m[2]*_t);
          t=_det*(-m[1]*_l+m[0]*_t);
        }

        var r=this.m_width-1-l;
        var b=this.m_height-1-t;
        var area_id=(l<4?0:r<4?2:1)+(t<4?0:b<4?2:1)*3; // 3×3 分割
        var type;
        if(type=RESIZE_TYPES[area_id]){
          this.m_resize_type=type;
          this.e_b0.style.cursor=type+"-resize";
        }else if(this.m_resize_type){
          this.m_resize_type=null;
          this.e_b0.style.cursor="default";
        }
      }
      this.callbase(e);
    },
    OnMouseDown:function override(e){
      if(e.buttons.left&&this.m_resize_type&&!this.m_resizing){
        this.m_resizing=RESIZERS[this.m_resize_type];
        resizeController.init(this,this.m_resizing,e);
        agh.dom.captureMouse(this.e_b0,true);
        if(e.preventDefault)e.preventDefault();
      }
      this.callbase(e);
    },
    OnMouseUp:function override(e){
      if(this.m_resizing){
        agh.dom.releaseMouse(this.e_b0,true);
        resizeController.terminate(this,this.m_resizing,e);
        this.m_resizing=null;
      }
      this.callbase(e);
    },
    //======================================================================
    //    公開関数
    //======================================================================
    Show:function(){
      this.m_document.body.appendChild(this.getMainElement());
      this.recalcSizeRecursive();
    },
    addControl:function override(ctrl){
      return this.c_carea.addControl(ctrl);
    },
    getContentElement:function override(){
      return this.c_carea.getContentElement();
    },
    setContentStyle:function override(styles){
      return this.c_carea.setContentStyle(styles);
    },
    //======================================================================
    //    表示
    //======================================================================
    m_text:"Form1",
    setText:function setter$override(value){
      this.c_title.setText(value);
      this.callbase(value);
    }
  });
})();
//******************************************************************************
//  agh.Forms.TabPage
//==============================================================================
(function(){
  ns.TabPage=new agh.Class('agh.Forms.TabPage',ns.Control,{
    constructor:function(doc){
      this.base(doc);
      this.setBorderStyle("none");
      this.setSize(200,200);

      this.setContentStyle({position:'relative'});
      this.e_table=this.m_document.createElement("table");
      this.e_table.className="agh-forms-tabpage-table";
      this.e_table.cellSpacing="0px";
      this.e_head=this.e_table.insertRow(-1);
      this.e_head.className="agh-forms-tabpage-head";
      agh.dom.setStyle(this.e_head,{
        textAlign:'center',
        fontSize:'12px',
        fontFamily:"'MS UI Gothic','MS PGothic'",
        AghUserSelect:'none'
      });
      this.e_body0=this.e_table.insertRow(-1);
      this.e_body1=this.e_body0.insertCell(-1);
      this.e_body1.className="agh-forms-tabpage-body";
      this.e_body1.colSpan=5;
      this.e_body2=this.m_document.createElement("div");
      this.e_body2.className="agh-forms-tabpage-body";
      this.e_body1.appendChild(this.e_body2);

      this.m_tabs=[];

      this.e_rpad=this.e_head.insertCell();
      this.e_rpad.className="agh-forms-tabpage-rpad";

      this.m_tabs[-1]={seps:this._generateSeps()};
      this.m_tabCount=0;
      this.m_selectedTab=-1;

      this.getContentElement().appendChild(this.e_table);
    },
    _generateSeps:function(){
      var s0=this.e_head.insertCell(this.e_head.cells.length-1);
      var s1=this.e_head.insertCell(this.e_head.cells.length-1);
      var s2=this.e_head.insertCell(this.e_head.cells.length-1);
      var s3=this.e_head.insertCell(this.e_head.cells.length-1);
      s0.className="agh-forms-tabpage-sep agh-forms-tabpage-sep0-s";
      s1.className="agh-forms-tabpage-sep agh-forms-tabpage-sep1-s";
      s2.className="agh-forms-tabpage-sep agh-forms-tabpage-sep2-s";
      s3.className="agh-forms-tabpage-sep agh-forms-tabpage-sep3-s";
      s0.innerHTML="<div>&nbsp;</div>";
      s1.innerHTML="<div>&nbsp;</div>";
      s2.innerHTML="<div>&nbsp;</div>";
      s3.innerHTML="<div>&nbsp;</div>";
      return [s0,s1,s2,s3];
    },
    addTab:function(text){
      var self=this;
      var index=this.m_tabCount++;
      var tabInfo={index:index};
      this.m_tabs[index]=tabInfo;
      tabInfo.text=text||"Tab"+(index+1);

      this.e_body1.colSpan=5*(this.m_tabCount+1);

      var t0=this.e_head.insertCell(this.e_head.cells.length-1);
      t0.className="agh-forms-tabpage-tab agh-forms-tabpage-tab0-n";
      agh.addEventListener(t0,"mousedown",function(e){
        self.setSelectedTab(tabInfo.index);
      });
      tabInfo.e_tab0=t0;

      var t1=this.m_document.createElement("div");
      t1.className="agh-forms-tabpage-tab agh-forms-tabpage-tab1-n";
      agh.dom.setInnerText(t1,tabInfo.text);
      t0.appendChild(t1);
      tabInfo.e_tab1=t1;

      var page=new ns.Control(this.m_document);
      page.setPosition(0,0);
      tabInfo.c_page=page;
      tabInfo.e_page=page.getMainElement();
      tabInfo.e_page.style.display="none";
      this.e_body2.appendChild(tabInfo.e_page);

      tabInfo.seps=this._generateSeps();

      if(index==0){
        this.setSelectedTab(index);
      }else{
        this.renderTabSep(index);
        this.renderTabSep(index-1);
      }

      return tabInfo;
    },
    renderTabSep:function(index){
      var info=this.m_tabs[index];

      var type="m";
      if(index===-1)
        type="s";
      else if(index===this.m_tabs.length-1)
        type="e";

      if(this.m_selectedTab>=0){
        if(index===this.m_selectedTab-1)
          type="l";
        else if(index===this.m_selectedTab)
          type="r";
      }

      agh.dom.switchClassName(info.seps[0],"agh-forms-tabpage-sep0",type);
      agh.dom.switchClassName(info.seps[1],"agh-forms-tabpage-sep1",type);
      agh.dom.switchClassName(info.seps[2],"agh-forms-tabpage-sep2",type);
      agh.dom.switchClassName(info.seps[3],"agh-forms-tabpage-sep3",type);
    },
    renderAllTabs:function(){
      for(var i=-1;i<this.m_tabs.length;i++)
        this.renderTabSep(i);
    },
    getSelectedTab:function getter(){return this.m_selectedTab;},
    setSelectedTab:function setter(value){
      if(this.m_selectedTab==value)return;

      var oldValue=this.m_selectedTab;
      this.m_selectedTab=value;

      if(oldValue>=0){
        var info=this.m_tabs[oldValue];
        agh.dom.switchClassName(info.e_tab0,"agh-forms-tabpage-tab0","n");
        agh.dom.switchClassName(info.e_tab1,"agh-forms-tabpage-tab1","n");
        if(value<0||oldValue!=value-1)
          this.renderTabSep(oldValue);
        if(value<0||oldValue-1!=value)
          this.renderTabSep(oldValue-1);
        info.e_page.style.display="none";
      }

      if(value>=0){
        var info=this.m_tabs[value];
        agh.dom.switchClassName(info.e_tab0,"agh-forms-tabpage-tab0","a");
        agh.dom.switchClassName(info.e_tab1,"agh-forms-tabpage-tab1","a");
        this.renderTabSep(value);
        this.renderTabSep(value-1);

        info.e_page.style.display="block";
        info.c_page.setSize(this.m_tabpage_cwidth||100,this.m_tabpage_cheight||100);
        info.c_page.recalcSizeRecursive();
      }
    },
    recalcInnerSize:function $override(){
      this.callbase();
      if(this.e_table){
        // constructor 呼出後

        var headHeight=Math.max(this.e_rpad.offsetHeight,21);
        var w=this.m_cwidth;
        var h=this.m_cheight-headHeight;
        agh.dom.setStyle(this.e_table,'-agh-offset-width' ,w);
        agh.dom.setStyle(this.e_body1,'-agh-offset-width' ,w);w-=2;
        agh.dom.setStyle(this.e_body1,'-agh-offset-height',h);h--;
        agh.dom.setStyle(this.e_body2,'-agh-offset-width' ,w);w--;
        agh.dom.setStyle(this.e_body2,'-agh-offset-height',h);h--;
        this.m_tabpage_cwidth =w;
        this.m_tabpage_cheight=h;
        if(this.m_selectedTab>=0){
          var info=this.m_tabs[this.m_selectedTab];
          info.c_page.setSize(w,h);
        }
      }
    },
    recalcSizeRecursive:function $override(){
      this.callbase();
      if(this.m_selectedTab>=0)
        this.m_tabs[this.m_selectedTab].c_page.recalcSizeRecursive();
    },
    m_text:"TabPage1"
  });
})();
//==============================================================================
});
//------------------------------------------------------------------------------
