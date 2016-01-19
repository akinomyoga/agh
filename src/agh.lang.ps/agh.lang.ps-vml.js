  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //		VML Drawing
  //----------------------------------------------------------------------------
  var VML_LNCAP={};
  VML_LNCAP[LNCAP_BUTT]="flat";
  VML_LNCAP[LNCAP_ROUND]="round";
  VML_LNCAP[LNCAP_SQUARE]="square"
  
  var VML_LNJOIN={};
  VML_LNJOIN[LNJOIN_MITER]="miter";
  VML_LNJOIN[LNJOIN_ROUND]="round";
  VML_LNJOIN[LNJOIN_BEVEL]="bevel";
  
  // 何故か IE VML では十パターンしか使えない様なので、
  // 与えられた dash 行列から近そうなパターンを選択する。
  // アルゴリズムは適当。
  var VML_DASHARRAY=function(dash,width){
    if(dash.length==0)return 'solid';
    
    var l=dash.length;
    var iN=l%2?2*l:l;
    switch(iN){
      case 2:
        var x=dash[0];
        var y=dash[1%l];
        if(x==0)return '1 3';
        if(y==0)return x/width>5?'8 3':'3 1';
        var f=x/y;
        if(f<0.66)return '1 3';
        if(f>1.5)return x/width>5?'8 3':'3 1';
        return x/width>1.6?'4 3':'1 1';
      case 4:
        var m=(dash[1]+dash[3])/2;
        var l,u;
        if(dash[0]>dash[2])
          l=dash[2],u=dash[0];
        else
          l=dash[0],u=dash[2];
          
        if(l/u>0.66)
          return VML_DASHARRAY([(l+u)/2,m],width);
        else if(l/u<0.2)
          return '8 3 1 3';
        else if(m/u<0.5)
          return '3 1 1 1';
        else
          return '4 3 1 3';
      default:
        var u=0; // 最大線分
        var x=0;
        var xx=0;
        var s=0; // 平均間隔
        for(var i=0;i<iN;i+=2){
          var x0=dash[i%l];
          x+=x0;
          xx+=x0*x0;
          if(u<x0)u=x0;
          s+=dash[(i+1)%l];
        }
        iN/=2;
        s/=iN;
        
        // 分散の小さい物はより単純な破線へ
        x/=iN;xx/=iN;
        xx=(xx-x*x)/(x*x); // 相対分散
        var x_=(iN*x-u)/(iN-1);
        if(xx<0.2)
          return VML_DASHARRAY([u,s,(iN*x-u)/(iN-1),s],width);
          
        if(x_/s<0.66)
          return '8 3 1 3 1 3';
        else
          return '3 1 1 1 1 1';
    }

    return ret.join('');
  };
  
  var VML_FIXEDMUL=10000;
  var VML_SHAPE_COORD_WH=100;
  var VML_ATTR_COORD
    ='" style="width:'+VML_SHAPE_COORD_WH+';height:'+VML_SHAPE_COORD_WH
    +';" coordsize="'+(VML_SHAPE_COORD_WH*VML_FIXEDMUL)+' '+(VML_SHAPE_COORD_WH*VML_FIXEDMUL)
    +'" coordorigin="0 0"';
    
  ns.GraphicsVml=agh.Class(nsName+'.GraphicsVml',ns.GraphicsBase,{
    constructor:function(){
      this.base();
      this.buffer=[];
      this.output=[];
    },
    //------------------------------------------------------
    stroke:function(){
      var s=this.gstate;
      var scal=this.getMeanScale();
      this.buffer.push('<vml:shape filled="false" path="');
      this.output_path();
      this.buffer.push(VML_ATTR_COORD);
      this.buffer.push('>\n');
      
      this.buffer.push('<vml:stroke color="');
      this.buffer.push(s.color.toHtmlColor());
      this.buffer.push('" weight="');
      this.buffer.push(s.linewidth*scal*this.s_r+this.s_u);
      this.buffer.push('" endcap="');
      this.buffer.push(VML_LNCAP[s.linecap]||VML_LNCAP[0]);
      this.buffer.push('" joinstyle="');
      this.buffer.push(VML_LNJOIN[s.linejoin]||VML_LNJOIN[0]);
      if(s.linejoin==LNJOIN_MITER){
        this.buffer.push('" miterlimit="');
        this.buffer.push(s.miterlimit);
      }
      if(s.linedash.length!=0){
        this.buffer.push('" dashstyle="');
        this.buffer.push(VML_DASHARRAY(s.linedash,s.linewidth));
        // ■ より正確な dashset
        // ■ dashoffset の指定
      }
      this.buffer.push('" /></vml:shape>\n');
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
    },
    fill:function(){
      var s=this.gstate;
      this.buffer.push('<vml:shape fillcolor="');
      this.buffer.push(s.color.toHtmlColor());
      this.buffer.push('" stroked="false" path="');
      this.output_path();
      this.buffer.push(VML_ATTR_COORD);
      this.buffer.push(' />\n');
      
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
              this.buffer.push("m ");
              this.output_point(e[1]);
              this.buffer.push(" ");
            }
            this.buffer.push("l ");
            this.output_point(pos=e[2]);
            break;
          case PATH_CBEZ:
            if(pos!=e[1]){
              this.buffer.push("m ");
              this.output_point(e[1]);
              this.buffer.push(" ");
            }
            this.buffer.push("c ");
            this.output_point(e[2]);
            this.buffer.push(" ");
            this.output_point(e[3]);
            this.buffer.push(" ");
            this.output_point(pos=e[4]);
            break;
          case PATH_CLOSE:
            this.buffer.push("x");
            break;
        }
      }
    },
    output_point:function(pt){
      this.buffer.push(pt[0]*VML_FIXEDMUL|0);
      this.buffer.push(' ');
      this.buffer.push(pt[1]*VML_FIXEDMUL|0);
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
      // vml 補正
      //------------------------------------------
      // SKEW 補正
      matrix[1]=-matrix[1]; // [Y反転]
      matrix[2]=-matrix[2]; // [Y反転]
      matrix[4]=-VML_SHAPE_COORD_WH*(matrix[0]+matrix[2]-1);
      matrix[5]=-VML_SHAPE_COORD_WH*(matrix[1]+matrix[3]-1);
      v2c[1]=VML_SHAPE_COORD_WH-v2c[1]; // [Y反転]
      ns.AffineA.itransformD(v2c,matrix);  // 並進・回転交換
      v2c[1]=VML_SHAPE_COORD_WH-v2c[1]; // [Y反転]
      // 中心線補正
      v2c[1]+=0.3*font.size;
      //------------------------------------------
      
      if(fSTROKE){
        this.buffer.push('<vml:shape stroked="true" filled="false" strokecolor="');
      }else{
        this.buffer.push('<vml:shape stroked="false" filled="true" strokeweight="0" fillcolor="');
      }
      this.buffer.push(this.gstate.color.toHtmlColor());
      this.buffer.push('" path="m ',v2c[0]*VML_FIXEDMUL|0,' ',v2c[1]*VML_FIXEDMUL|0,' l ',(v2c[0]+move[0])*VML_FIXEDMUL|0,' ',(v2c[1]+move[1])*VML_FIXEDMUL|0);
      this.buffer.push(VML_ATTR_COORD);
      this.buffer.push('>\n');

      if(fSTROKE){
        var s=this.gstate;
        var scal=this.getMeanScale();
        
        // <vml:stroke>
        this.buffer.push(
          '<vml:stroke color="',s.color.toHtmlColor(),
          '" weight="',s.linewidth*scal*this.s_r+this.s_u,
          '" endcap="',VML_LNCAP[s.linecap]||VML_LNCAP[0],
          '" joinstyle="',VML_LNJOIN[s.linejoin]||VML_LNJOIN[0]);
        if(s.linejoin==LNJOIN_MITER){
          this.buffer.push('" miterlimit="');
          this.buffer.push(s.miterlimit);
        }
        if(s.linedash.length!=0){
          this.buffer.push('" dashstyle="');
          this.buffer.push(VML_DASHARRAY(s.linedash,s.linewidth));
        }
        this.buffer.push('" />\n');
      }
      
      this.buffer.push(
        '<vml:skew matrix="',matrix[0],',',matrix[2],',',matrix[1],',',matrix[3],',0,0" on="true" />\n');
      this.buffer.push(
        '<vml:path textpathok="true" />');
      this.buffer.push(
        '<vml:textpath on="true" style="font-family:',font.fontname,
        ';font-size:',font.size*this.s_r+this.s_u,
        ';font-style:',font.style,
        ';font-weight:',font.bold?"bold":"normal",';" string="',text,'" />\n');
      
      this.buffer.push('</vml:shape>\n');
    },
    // 現在は誰も使っていない charpath から呼び出す為にある
    stroke_text:function(text,move,pos,font,ctm){
      this.fill_text(text,move,pos,font,ctm,true);
    },
    //--------------------------------------------------------------------------
    // Stretching : 枠に併せてページを伸縮
    s_w:1,s_h:1,s_l:0,s_t:0,
    s_r:1,s_u:'px',
    update_stretching_rate:(function(){
      /*
      var units={
        ex:pixels[0],
        em:pixels[1],
        cm:pixels[2],
        'in':pixels[3],
        mm:pixels[2]/10,
        pt:pixels[3]/72,
        pc:pixels[3]/6,
        '%':0
      };
      
      // 更新
      agh.scripts.wait(["event:onload"],function(){
        var div1=document.createElement('div');
        agh.memcpy(div1.style,{
          position:'absolute',left:'0',top:'0',width:'2px',height:'2px',
          overflow:'hidden',visibility:'hidden'
        });
        var div2=document.createElement('div');
        agh.memcpy(div2.style,{
          width:'10px',height:'10ex',
          margin:'0',padding:'0'
        });
        div1.appendChild(div2);
        document.body.appendChild(div1);
        var pixels=agh.Array.map(["ex","em","cm","in"],function(unit){
          div2.style.height=10+unit;
          return div2.offsetHeight/10;
        });
        document.body.removeChild(div1);
        
        units={
          ex:pixels[0],
          em:pixels[1],
          cm:pixels[2],
          mm:pixels[2]/10,
          'in':pixels[3],
          pt:pixels[3]/72,
          pc:pixels[3]/6,
          '%':0
        };
      });
      //*/

      var reg_valunit=/([\+\-]?[\d\.]+)(\w*\b|\%)/;
      var unit_abs={
        'pt':1,
        'pc':12,
        'in':72,
        'cm':72/2.54,
        'mm':72/25.4
      };
      return function(){
        var mw=this.m_width.match(reg_valunit)||['200px',200,'px'];
        var mh=this.m_height.match(reg_valunit)||['200px',200,'px'];
        mw[1]=parseFloat(mw[1]);if(isNaN(mw[1]))mw[1]=200;
        mh[1]=parseFloat(mh[1]);if(isNaN(mh[1]))mh[1]=200;
        
        // 単位換算
        if(mw[2]!=mh[2]){
          if(mw[2] in unit_abs&&mh[2] in unit_abs){
            mh[1]*=unit_abs[mh[2]]/unit_abs[mw[2]];
          }else{
            // ■ 未実装
            this.s_w=1;
            this.s_h=1;
            this.s_l=0;
            this.s_t=0;

            this.s_u=mw[2];
            this.s_r=mw[1]/this.m_bbw;
            return;
          }
        }
        
        var w=mw[1]/this.m_bbw;
        var h=mh[1]/this.m_bbh;
        var r=w<h?w:h;
        
        this.s_w=r/w;
        this.s_h=r/h;
        this.s_l=(1-this.s_w)*0.5;
        this.s_t=(1-this.s_h)*0.5;
        
        this.s_u=mw[2];
        this.s_r=r;
        
        //window.log("dbg: {0:%f} {1}",this.s_r,this.s_u);
        //window.log("dbg: {0:%.2f} {1:%.2f}".format(mw[1],mh[1]));
        //window.log("dbg: BB ({0:%.2f}, {1:%.2f}) - ({2:%.2f}, {3:%.2f})".format(
        //	this.m_bbl,this.m_bbb,this.m_bbw,this.m_bbh));
        //window.log("dbg: SS ({0:%.2f}, {1:%.2f}) - ({2:%.2f}, {3:%.2f})".format(
        //	this.s_l,this.s_t,this.s_w,this.s_h));
      }
    })(),
    //*
    SetDisplaySize:function override(w,h){
      this.callbase(w,h);
      this.update_stretching_rate();
    },
    SetBoundingBox:function override(l,b,r,t){
      this.callbase(l,b,r,t);
      this.update_stretching_rate();
    },
    //*/
    //------------------------------------------------------
    showpage:function(){
      if(this.buffer.length==0)return "";
      
      this.output.push('<div style="position:relative;width:');
      this.output.push(this.m_width);
      this.output.push(';height:');
      this.output.push(this.m_height);
      this.output.push(';display:inline-block;overflow:hidden;">\n');
      this.output.push('<vml:group style="position:absolute;left:');
      this.output.push(this.s_l*100);
      this.output.push('%;top:');
      this.output.push(this.s_t*100);
      this.output.push('%;width:');
      this.output.push(this.s_w*100);
      this.output.push('%;height:');
      this.output.push(this.s_h*100);
      this.output.push('%;" coordsize="');
      this.output.push(this.m_bbw);
      this.output.push(' ');
      this.output.push(-this.m_bbh);
      this.output.push('" coordorigin="');
      this.output.push(this.m_bbl);
      this.output.push(' ');
      this.output.push(this.m_bbh+this.m_bbb);
      this.output.push('">\n');
      this.output.push(this.buffer.join(''));
      this.output.push('</vml:group></div>');
      
      //window.log("dbg: l:{0:%.2f};t:{1:%.2f}; w:{2:%.2f};h:{3:%.2f};"
      //	.format(this.s_l,this.s_t,this.s_w,this.s_h));
      
      this.buffer.length=0;
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
