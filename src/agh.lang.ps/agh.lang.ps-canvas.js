  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //		Canvas Painting
  //----------------------------------------------------------------------------
  var CANVAS_LNCAP=SVG_LNCAP;
  var CANVAS_LNJOIN=VML_LNJOIN;

  ns.GraphicsCanvas=agh.Class(nsName+'.GraphicsCanvas',ns.GraphicsBase,{
    constructor:function(elem){
      this.base();
      this.elem=elem;
      this.canvas=null;
      this.ctx=null;
    },
    init_context:function(){
      if(this.ctx)return;
      if(this.elem.tagName.toLowerCase()=='canvas'){
        this.canvas=this.elem;
      }else{
        this.elem.innerHTML='<canvas width="'+this.m_width+'" height="'+this.m_height+'"></canvas>';
        this.canvas=this.elem.firstChild;
      }
      this.ctx=this.canvas.getContext('2d');

      // 座標空間の設定
      var ww=parseFloat(this.m_width);
      var hh=parseFloat(this.m_height);
#%(
      alert([
        "this.m_bbl={0} ({1})\n".format(this.m_bbl,typeof this.m_bbl),
        "this.m_bbb={0} ({1})\n".format(this.m_bbb,typeof this.m_bbb),
        "this.m_bbw={0} ({1})\n".format(this.m_bbw,typeof this.m_bbw),
        "this.m_bbh={0} ({1})\n".format(this.m_bbh,typeof this.m_bbh),
        "this.m_width={0} ({1})\n".format(this.m_width,typeof this.m_width),
        "this.m_height={0} ({1})\n".format(this.m_height,typeof this.m_height),
        "ww={0} ({1})\n".format(ww,typeof ww),
        "hh={0} ({1})\n".format(hh,typeof hh)
      ].join(''));
#%)
      //縦横比調整
      //this.ctx.transform(ww/this.m_bbw,0,0,-hh/this.m_bbh,-this.m_bbl,hh+this.m_bbb);

      var scal=Math.min(ww/this.m_bbw,hh/this.m_bbh);
      var x=(ww-scal*this.m_bbw)/2;
      var y=(hh-scal*this.m_bbh)/2;
      this.ctx.transform(scal,0,0,scal,x,y);

      this.ctx.transform(1,0,0,-1,-this.m_bbl,this.m_bbh+this.m_bbb);
    },
    //------------------------------------------------------
    stroke:function(){
      if(this.ctx==null)this.init_context();
      var s=this.gstate;
      var scal=this.getMeanScale();
      this.ctx.strokeStyle=s.color.toHtmlColor();
      this.ctx.lineWidth=scal*s.linewidth;
      this.ctx.lineCap=(CANVAS_LNCAP[s.linecap]||CANVAS_LNCAP[0]);
      this.ctx.lineJoin=(CANVAS_LNJOIN[s.linejoin]||CANVAS_LNJOIN[0]);
      if(s.linejoin==LNJOIN_MITER){
        this.ctx.miterLimit=(s.miterlimit);
      }
      if(s.linedash.length!=0){
        // ■ Canvas には点線がない。自力で実装
        //		bezier 曲線の点は bezier 曲線。bezier で点線を打つ時のパラメータは?
        //		bezier 曲線の式
        //			s+t=1, s>0, t>0
        //			p=s^3 p1 + 3 s^2 t p2 + 3 s t^2 p3 + t^3 p4
        //			dp/dt= 3ss(p2-p1) +6st(p3-p2) +3tt(p4-p3)

        //(s.linedash,scal);
        //(s.linedash.dashoffset*scal);
      }
      // ■ TODO: strokeadjust の指定
      this.output_path();
      this.ctx.stroke();

      // PATH_CHAR
      for(var i=0,iN=s.path.length;i<iN;i++){
        var e=s.path[i];
        if(e[0]==PATH_CHAR){
          s.position=e[1];
          this.fill_text(e[4],e[5],null,e[3],e[2],true);
        }
      }

      s.path.length=0;
      s.position=null;
      //window.log('dbg: '+this.buffer.join(''));
    },
    fill:function(){
      if(this.ctx==null)this.init_context();
      var s=this.gstate;
      this.ctx.fillStyle=s.color.toHtmlColor();
      this.output_path();
      this.ctx.fill();

      // PATH_CHAR
      for(var i=0,iN=s.path.length;i<iN;i++){
        var e=s.path[i];
        if(e[0]==PATH_CHAR){
          s.position=e[1];
          this.fill_text(e[4],e[5],null,e[3],e[2]);
        }
      }

      s.path.length=0;
      s.position=null;
    },
    output_path:function(){
      var path=this.gstate.path;
      var pos=null;
      this.ctx.beginPath();
      for(var i=0;i<path.length;i++){
        var e=path[i];
        switch(e[0]){
          case PATH_LINE:
            if(pos!=e[1])
              this.ctx.moveTo(e[1][0],e[1][1]);
            this.ctx.lineTo(e[2][0],e[2][1]);
            pos=e[2];
            break;
          case PATH_CBEZ:
            if(pos!=e[1])
              this.ctx.moveTo(e[1][0],e[1][1]);
            this.ctx.bezierCurveTo(
              e[2][0],e[2][1],
              e[3][0],e[3][1],
              e[4][0],e[4][1]
            );
            pos=e[4];
            break;
          case PATH_CLOSE:
            this.ctx.closePath();
            break;
        }
      }
    },
    //--------------------------------------------------------------------------
    //	文字列表示
    fill_text:function(text,move,pos,font,ctm,fSTROKE){
      if(this.ctx==null)this.init_context();
      if(font==null)font=this.gstate.font;

      var matrix=ns.AffineA.mul(font.matrix,ctm||this.gstate.CTM);
      var v2c=font.matrix.slice(4,6);
      if(pos instanceof Array){
        v2c[0]+=pos[0];
        v2c[1]+=pos[1];
      }
      v2c=this.rtransf_point(this.gstate.position,v2c);

      //------------------------------------------
      ns.AffineA.idtransformD(v2c,matrix);

      if(fSTROKE){
        var s=this.gstate;
        var scal=this.getMeanScale();
        this.ctx.strokeStyle=s.color.toHtmlColor();
        this.ctx.lineWidth=scal*s.linewidth;
        this.ctx.lineCap=(CANVAS_LNCAP[s.linecap]||CANVAS_LNCAP[0]);
        this.ctx.lineJoin=(CANVAS_LNJOIN[s.linejoin]||CANVAS_LNJOIN[0]);
        if(s.linejoin==LNJOIN_MITER)
          this.ctx.miterLimit=(s.miterlimit);

        if(s.linedash.length!=0){
          // ■ Canvas には点線がない。自力で点線文字輪郭を実装するのは無理では…?
          //(s.linedash,scal);
          //(s.linedash.dashoffset*scal);
        }
      }else{
        this.ctx.fillStyle=this.gstate.color.toHtmlColor();
      }

      this.ctx.save();
      {
        //■■未確認■■
        this.ctx.transform(matrix[0],matrix[1],-matrix[2],-matrix[3],0,0);
        this.ctx.translate(v2c[0],-v2c[1]);

        var fname=font.fontname+',serif';
        this.ctx.font=font.style+' '+(font.bold?'bold ':'')+font.size+'px '+fname;

        // workaround: firefox ではフォントによって italic が使用できない。
        if(font.style=='italic'||font.style=='oblique'){
          if(!this.isItalicSupported(fname,font.style)){
            this.ctx.transform(1.0,0.0,-0.4,1.0,0.0,0.0);
            this.ctx.font='normal '+(font.bold?'bold ':'')+font.size+' '+fname;
          }
        }

        if(fSTROKE)
          this.ctx.strokeText(text,0,0);
        else
          this.ctx.fillText(text,0,0);
      }
      this.ctx.restore();
    },
    stroke_text:function(text,move,pos,font,ctm){
      this.fill_text(text,move,pos,font,ctm,true);
    },
    isItalicSupported:(function(){
      if(!agh.browser.vFx)return function(){return true;};

      var cache={};
      var SIZE=10;
      var ctx;
      return function fxSupportsItalic(fontName,fontStyle){
        var k=fontName+"/"+fontStyle;
        if(k in cache||fontStyle=='normal')return cache[k];

        if(ctx==null){
          var c=document.createElement('canvas');
          c.width =SIZE;
          c.height=SIZE;
          ctx=c.getContext('2d');
          ctx.fillStyle='black';
        }

        ctx.clearRect(0,0,SIZE,SIZE);
        ctx.font='normal '+SIZE+'px '+fontName;
        ctx.fillText("A",0,SIZE);
        var pngNormal=ctx.canvas.toDataURL("image/png");

        ctx.clearRect(0,0,SIZE,SIZE);
        ctx.font=fontStyle+' '+SIZE+'px '+fontName;
        ctx.fillText("A",0,SIZE);
        var pngItalic=ctx.canvas.toDataURL("image/png");

        var result=pngItalic!=pngNormal;
        cache[k]=result;
        return result;
      };
    })(),
    //------------------------------------------------------
    showpage:function(){
      //■既に表示している筈■
      this.ginit();
      this.ctx=null;
    },
    //------------------------------------------------------
    GetResult:function(){
      this.showpage();
      return null; // no html source
    },
    Clear:function(){
    }
  });
