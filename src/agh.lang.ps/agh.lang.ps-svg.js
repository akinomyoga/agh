  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //		SVG Drawing
  //----------------------------------------------------------------------------
  /* mwg.base64.js より抜粋 */
  ns.Base64Encode=(function(){
    var T=agh("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",Array);
    return function base64encode(str){
      var out=new Array(str.length*1.35|0); // ←速度には余り関係ない??
      var io=0;
      var i,iN;
      for(i=0,iN=str.length-2;i<iN;i+=3){
        var c1=str.charCodeAt(i  )&0xff;
        var c2=str.charCodeAt(i+1)&0xff;
        var c3=str.charCodeAt(i+2)&0xff;
        out[io++]=T[c1>>2];
        out[io++]=T[(c1&0x3)<<4|(c2&0xF0)>>4];
        out[io++]=T[(c2&0xF)<<2|(c3&0xC0)>>6];
        out[io++]=T[c3&0x3F];
      }
      
      switch(str.length-i){
        case 1:
          var c1=str.charCodeAt(i  )&0xff;
          out[io++]=T[c1>>2];
          out[io++]=T[(c1&0x3)<<4];
          out[io++]='==';
          break;
        case 2:
          var c1=str.charCodeAt(i  )&0xff;
          var c2=str.charCodeAt(i+1)&0xff;
          out[io++]=T[c1>>2];
          out[io++]=T[(c1&0x3)<<4|(c2&0xF0)>>4];
          out[io++]=T[(c2&0xF)<<2];
          out[io++]='=';
          break;
      }
      
      //++++++++++++++++++++++++++++++++++++++++++++++++++++
      // 速度について
      //----------------------------------------------------
      // Fx Profiling
      // ※ out.push よりも out[io++]= の方が速い
      // ※ 文字列連結 ret+= でも大差ない。
      //++++++++++++++++++++++++++++++++++++++++++++++++++++

      return out.join('');
      // String.fromCharCode.apply(null,巨大配列) → スタックオーバーフロー
    };
    //log(agh.PostScript.Base64Encode("Hello! How are you, today?"));
  })();
  
  var SVG_LNCAP=agh.memcpy(null,VML_LNCAP);
  SVG_LNCAP[LNCAP_BUTT]="butt";
  var SVG_LNJOIN=VML_LNJOIN;
  var SVG_DASHARRAY=function(dash,scal){
    var ret=[];
    for(var i=0;i<dash.length;i++){
      ret.push(dash[i]*scal);
    }
    return ret.join(','); // Firefox はスペース区切だと認識しない。
  };
  
  ns.GraphicsSvg=agh.Class(nsName+'.GraphicsSvg',ns.GraphicsBase,{
    constructor:function(){
      this.base();
      this.buffer=[];
      this.output=[];
    },
    //------------------------------------------------------
    stroke:function(){
      var s=this.gstate;
      var scal=this.getMeanScale();
      this.buffer.push('<path fill="none" stroke="');
      this.buffer.push(s.color.toHtmlColor());
      this.buffer.push('" stroke-width="');
      this.buffer.push(scal*s.linewidth);
      this.buffer.push('" stroke-linecap="');
      this.buffer.push(SVG_LNCAP[s.linecap]||SVG_LNCAP[0]);
      this.buffer.push('" stroke-linejoin="');
      this.buffer.push(SVG_LNJOIN[s.linejoin]||SVG_LNJOIN[0]);
      if(s.linejoin==LNJOIN_MITER){
        this.buffer.push('" stroke-miterlimit="');
        this.buffer.push(s.miterlimit);
      }
      if(s.linedash.length!=0){
        this.buffer.push('" stroke-dasharray="');
        this.buffer.push(SVG_DASHARRAY(s.linedash,scal));
        this.buffer.push('" stroke-dashoffset="');
        this.buffer.push(s.linedash.dashoffset*scal);
      }
      this.buffer.push('" d="');
      this.output_path();
      this.buffer.push('" />\n');
      // ■ TODO: strokeadjust の指定
      
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
      var s=this.gstate;
      this.buffer.push('<path stroke="none" fill="');
      this.buffer.push(s.color.toHtmlColor());
      this.buffer.push('" d="');
      this.output_path();
      this.buffer.push('" />\n');
      
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
      for(var i=0;i<path.length;i++){
        if(i!=0)this.buffer.push(" ");
        
        var e=path[i];
        switch(e[0]){
          case PATH_LINE:
            if(pos!=e[1]){
              this.buffer.push("M ");
              this.buffer.push(e[1][0],' ',e[1][1]);
              this.buffer.push(" ");
            }
            this.buffer.push("L ");
            this.buffer.push(e[2][0],' ',e[2][1]);
            pos=e[2];
            break;
          case PATH_CBEZ:
            if(pos!=e[1]){
              this.buffer.push("M ");
              this.buffer.push(e[1][0],' ',e[1][1]);
              this.buffer.push(" ");
            }
            this.buffer.push("C ");
            this.buffer.push(e[2][0],' ',e[2][1]);
            this.buffer.push(" ");
            this.buffer.push(e[3][0],' ',e[3][1]);
            this.buffer.push(" ");
            this.buffer.push(e[4][0],' ',e[4][1]);
            pos=e[4];
            break;
          case PATH_CLOSE:
            this.buffer.push("z");
            break;
        }
      }
    },
    output_point:function(pt){
      this.buffer.push(pt[0]);
      this.buffer.push(' ');
      this.buffer.push(pt[1]);
    },
    //--------------------------------------------------------------------------
    //	文字列表示
    fill_text:function(text,move,pos,font,ctm,fSTROKE){
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
        this.buffer.push('<text fill="none" stroke="');
        this.buffer.push(s.color.toHtmlColor());
        this.buffer.push('" stroke-width="');
        this.buffer.push(scal*s.linewidth);
        this.buffer.push('" stroke-linecap="');
        this.buffer.push(SVG_LNCAP[s.linecap]||SVG_LNCAP[0]);
        this.buffer.push('" stroke-linejoin="');
        this.buffer.push(SVG_LNJOIN[s.linejoin]||SVG_LNJOIN[0]);
        if(s.linejoin==LNJOIN_MITER){
          this.buffer.push('" stroke-miterlimit="');
          this.buffer.push(s.miterlimit);
        }
        if(s.linedash.length!=0){
          this.buffer.push('" stroke-dasharray="');
          this.buffer.push(SVG_DASHARRAY(s.linedash,scal));
          this.buffer.push('" stroke-dashoffset="');
          this.buffer.push(s.linedash.dashoffset*scal);
        }
      }else{
        this.buffer.push('<text fill="');
      }
      this.buffer.push(this.gstate.color.toHtmlColor());
      this.buffer.push('" x="');
      this.buffer.push(v2c[0]);
      this.buffer.push('" y="');
      this.buffer.push(-v2c[1]);
      this.buffer.push('" transform="matrix(');
        this.buffer.push(matrix[0]);
        this.buffer.push(',');
        this.buffer.push(matrix[1]);
        this.buffer.push(',');
        this.buffer.push(-matrix[2]);
        this.buffer.push(',');
        this.buffer.push(-matrix[3]);
      this.buffer.push(',0,0)" font-family="');
        this.buffer.push(font.fontname);
        this.buffer.push('" font-size="');
        this.buffer.push(font.size);
        this.buffer.push('" font-style="');
        this.buffer.push(font.style);
        this.buffer.push('" font-weight="');
        this.buffer.push(font.bold?"bold":"normal");
      this.buffer.push('">');
      // ■ UTF-8 Encoding
      this.buffer.push(agh.Text.Escape.xml(text));
      this.buffer.push('</text>\n');
    },
    stroke_text:function(text,move,pos,font,ctm){
      this.fill_text(text,move,pos,font,ctm,true);
    },
    //------------------------------------------------------
    showpage:function(){
      if(this.buffer.length==0)return;
      
      var buff=[];
      buff.push('<?xml version="1.0" standalone="no"?>\n');
      buff.push('<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n');
      buff.push('<svg width="');
      buff.push(this.m_width);
      buff.push('" height="');
      buff.push(this.m_height);
      buff.push('" viewBox="');
      buff.push(this.m_bbl);
      buff.push(' ');
      buff.push(-this.m_bbb);
      buff.push(' ');
      buff.push(this.m_bbw);
      buff.push(' ');
      buff.push(this.m_bbh);
      buff.push('" xmlns="http://www.w3.org/2000/svg" version="1.1">\n');
      buff.push('<g transform="matrix(1,0,0,-1,0,');
      buff.push(this.m_bbh);
      buff.push(')">\n');
      buff.push(this.buffer.join(''));
      buff.push('</g></svg>');
      this.buffer.length=0;
      
      var svg_source=buff.join('');
      //log("debug: "+svg_source);
      
      this.output.push('<object width="');
      this.output.push(this.m_width);
      this.output.push('" height="');
      this.output.push(this.m_height);
      this.output.push('" type="image/svg+xml" data="data:image/svg+xml;base64,\n');
      this.output.push(ns.Base64Encode(svg_source).replace(/(.{100})(?!$)/g,"$1\n"));
      //this.output.push(ns.Base64Encode(svg_source).replace(/(.{100})(?!$)/g,function($0,$1){return $1+'\n';})); // ■CHK: 速度
      this.output.push('"></object>');
      // ■TODO: BoundingBox からはみ出ている時の動作を確認する。
      //         はみ出ている部分の所為で、要素の大きさが変わってしまったり
      //         スクロールバーが出てきたりする場合には、
      //         div[$position=relative,$overflow=visible] 等で包んで誤魔化す。
      //   →どうやら、はみ出ている部分はそもそも表示されない様である。
      //     無理矢理表示する方法はあるのかどうか?
      
      this.ginit();
    },
    //------------------------------------------------------
    GetResult:function(){
      this.showpage();
      return this.output.join('');
    },
    Clear:function(){
      this.buffer.length=0;
      this.output.length=0;
    }
  });
