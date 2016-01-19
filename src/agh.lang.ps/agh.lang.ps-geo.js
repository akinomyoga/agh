  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //	幾何・座標変換
  //----------------------------------------------------------------------------
  ns.AffineA={
    mul:function(A,B){
      return [
        A[0]*B[0]+A[1]*B[2],
        A[0]*B[1]+A[1]*B[3],
        A[2]*B[0]+A[3]*B[2],
        A[2]*B[1]+A[3]*B[3],
        A[4]*B[0]+A[5]*B[2]+B[4],
        A[4]*B[1]+A[5]*B[3]+B[5]
      ];
    },
    mulR:function(A,B,R){
      //  [ a b 0 ]   [ a b 0 ]   [ aa+bc    ab+bd    0 ]
      //  [ c d 0 ] X [ c d 0 ] = [ ca+dc    cb+dd    0 ]
      //  [ s t 1 ]   [ s t 1 ]   [ sa+tc+1s sb+td+1t 1 ]
      R[0]=A[0]*B[0]+A[1]*B[2];
      R[1]=A[0]*B[1]+A[1]*B[3];
      R[2]=A[2]*B[0]+A[3]*B[2];
      R[3]=A[2]*B[1]+A[3]*B[3];
      R[4]=A[4]*B[0]+A[5]*B[2]+B[4];
      R[5]=A[4]*B[1]+A[5]*B[3]+B[5];
    },
    mulD:function(A,B){
      var b0=A[0]*B[0]+A[1]*B[2];
      var b1=A[0]*B[1]+A[1]*B[3];
      var b2=A[2]*B[0]+A[3]*B[2];
      var b3=A[2]*B[1]+A[3]*B[3];
      var b4=A[4]*B[0]+A[5]*B[2]+B[4];
      var b5=A[4]*B[1]+A[5]*B[3]+B[5];
      B[0]=b0;B[1]=b1;B[2]=b2;
      B[3]=b3;B[4]=b4;B[5]=b5;
      return B;
    },
    mulA:function(A,B){
      var b0=A[0]*B[0]+A[1]*B[2];
      var b1=A[0]*B[1]+A[1]*B[3];
      var b2=A[2]*B[0]+A[3]*B[2];
      var b3=A[2]*B[1]+A[3]*B[3];
      var b4=A[4]*B[0]+A[5]*B[2]+B[4];
      var b5=A[4]*B[1]+A[5]*B[3]+B[5];
      A[0]=b0;A[1]=b1;A[2]=b2;
      A[3]=b3;A[4]=b4;A[5]=b5;
      return A;
    },
    //----------------------------------
    inv:function(A){
      var idet=1.0/(A[0]*A[3]-A[1]*A[2]);
      return [
        A[3]*idet,
        -A[1]*idet,
        -A[2]*idet,
        A[0]*idet,
        (A[2]*A[5]-A[3]*A[4])*idet,
        (A[1]*A[4]-A[0]*A[5])*idet
      ];
    },
    invR:function(A,R){
      var idet=1.0/(A[0]*A[3]-A[1]*A[2]);
      R[0]=A[3]*idet;
      R[1]=-A[1]*idet;
      R[2]=-A[2]*idet;
      R[3]=A[0]*idet;
      R[4]=(A[2]*A[5]-A[3]*A[4])*idet;
      R[5]=(A[1]*A[4]-A[0]*A[5])*idet;
    },
    //----------------------------------
    /*
    translateM:function(dx,dy){
      return [1,0,0,1,dx,dy];
    },
    translate:function(dx,dy,B){
      return [
        B[0],B[1],B[2],B[3],
        B[4]+dx*B[0]+dy*B[2],
        B[5]+dx*B[1]+dy*B[3]
      ];
    },
    //*/
    translateD:function(dx,dy,B){
      B[4]+=dx*B[0]+dy*B[2];
      B[5]+=dx*B[1]+dy*B[3];
    },
    //----------------------------------
    /*
    rotateM:function(degree){
      var radian=degree*(Math.PI/180);
      var c=Math.cos(radian);
      var s=Math.sin(radian);
      return [c,s,-s,c,0,0];
    },
    rotateR:function(degree,B,R){
      var radian=degree*(Math.PI/180);
      var c=Math.cos(radian);
      var s=Math.sin(radian);
      R[0]= c*B[0]+s*B[2];
      R[1]= c*B[1]+s*B[3];
      R[2]=-s*B[0]+c*B[2];
      R[3]=-s*B[1]+c*B[3];
      R[4]=B[4];
      R[5]=B[5];
    },
    //*/
    rotateD:function(degree,B,R){
      var radian=degree*(Math.PI/180);
      var c=Math.cos(radian);
      var s=Math.sin(radian);
      var b0= c*B[0]+s*B[2];
      var b1= c*B[1]+s*B[3];
      var b2=-s*B[0]+c*B[2];
      var b3=-s*B[1]+c*B[3];
      B[0]=b0;B[1]=b1;B[2]=b2;B[3]=b3;
    },
    //----------------------------------
    /*
    scaleM:function(sx,xy){
      return [sx,0,0,sy,0,0];
    },
    scaleR:function(sx,sy,B,R){
      R[0]=sx*B[0];
      R[1]=sx*B[1];
      R[2]=sy*B[2];
      R[3]=sy*B[3];
    },
    //*/
    scaleD:function(sx,sy,B){
      B[0]*=sx;
      B[1]*=sx;
      B[2]*=sy;
      B[3]*=sy;
    },
    //----------------------------------
    identity:[1,0,0,1,0,0],
    defaultMatrix:[1,0,0,1,0,0],
    //----------------------------------
    transformD:function(v,A){
      var x=v[0],y=v[1];
      v[0]=A[0]*x+A[2]*y+A[4];
      v[1]=A[1]*x+A[3]*y+A[5];
      return v;
    },
    dtransformD:function(v,A){
      var x=v[0],y=v[1];
      v[0]=A[0]*x+A[2]*y;
      v[1]=A[1]*x+A[3]*y;
      return v;
    },
    itransformD:function(v,A){
      var x=v[0],y=v[1];
      var idet=1.0/(A[0]*A[3]-A[1]*A[2]);
      var s1=A[2]*A[5]-A[3]*A[4];
      var s2=A[1]*A[4]-A[0]*A[5];
      v[0]=idet*( A[3]*x-A[2]*y+s1);
      v[1]=idet*(-A[1]*x+A[0]*y+s2);
      return v;
    },
    idtransformD:function(v,A){
      var x=v[0],y=v[1];
      var idet=1.0/(A[0]*A[3]-A[1]*A[2]);
      v[0]=idet*( A[3]*x-A[2]*y);
      v[1]=idet*(-A[1]*x+A[0]*y);
      return v;
    },
    //----------------------------------
    dtransform:function(v,A){
      return [
        A[0]*v[0]+A[2]*v[1],
        A[1]*v[0]+A[3]*v[1]
      ];
    },
    itransform:function(v,A){
      var x=v[0],y=v[1];
      var idet=1.0/(A[0]*A[3]-A[1]*A[2]);
      var s1=A[2]*A[5]-A[3]*A[4];
      var s2=A[1]*A[4]-A[0]*A[5];
      return [
        idet*( A[3]*x-A[2]*y+s1),
        idet*(-A[1]*x+A[0]*y+s2)
      ];
    }
  };
  //----------------------------------------------------------------------------
  // 座標変換
  (function(){
  //# <PsGState 依存> ---------------------------------------------------------#
    function create_operator_transf(name,func){
      var op=function(proc){
        var a=proc.stk.pop();
        var x,y;
        if(a instanceof ns.PsArray){
          y=proc.stk.pop();
          x=proc.stk.pop();
          a=a.offset==0?a.data:a.data.slice(a.offset,a.offset+6);
        }else{
          y=a;
          x=proc.stk.pop();
          a=proc.graphics.gstate.CTM;
        }
        
        proc.stk.push.apply(proc.stk,func([x,y],a));
      };
      op.ps_name=name;
      return op;
    }
    
    function create_matrix_operation(ps_name,transf,N,i0,iN){
      // transf(a1,...,aN,matrix) : 変換関数
      // [i0,iN)                  : 行列に対して変更される範囲
      var op=function(proc){
        var a=proc.stk.pop();
        var args=new Array(N);
        var j=N-1;
        
        if(a instanceof ns.PsArray){
          if(!a.__waccess__){
            proc.onerror('typecheck',"operand3/3: no waccess.");
            return;
          }else{
            while(j>=0)args[j--]=proc.stk.pop();
              
            if(a.offset==0){
              args.push(a.data);
              transf.apply(null,args);
            }else{
              var buff=a.data.slice(a.offset,a.offset+6);
              args.push(buff);
              transf.apply(null,args);
              for(var i=i0;i<iN;i++)
                a.data[a.offset+i]=buff[i];
            }
          }
          
          proc.stk.push(a);
        }else{
          args[j--]=a;
          while(j>=0)args[j--]=proc.stk.pop();
          
          args.push(proc.graphics.gstate.CTM);
          transf.apply(null,args);
        }
      };
      op.ps_name=ps_name;
      return op;
    }
    
    function load_matrix(proc,source){
      var r=proc.stk[proc.stk.length-1];
      if(!(r instanceof ns.PsArray)){
        proc.onerror('typecheck',"operand1/1: an array (which is not packed).");
        return;
      }else if(!r.__waccess__){
        proc.onerror('typecheck',"operand1/1: no waccess");
        return;
      }
      
      for(var i=0;i<6;i++)r.data[r.offset+i]=source[i];
    }
    
    agh.memcpy(ns.systemdict.data,{
      currentpoint:function currentpoint(proc){
        var p=proc.graphics.gstate.position;
        var p_=ns.AffineA.itransformD(agh.Array.clone(p),proc.graphics.gstate.CTM);
        proc.stk.push(p_[0],p_[1]);
      },
      //------------------------------------------------------------------------
      transform:create_operator_transf('transform',ns.AffineA.transformD),
      itransform:create_operator_transf('itransform',ns.AffineA.itransformD),
      dtransform:create_operator_transf('dtransform',ns.AffineA.dtransformD),
      ditransform:create_operator_transf('ditransform',ns.AffineA.ditransformD),
      //------------------------------------------------------------------------
      setmatrix:function setmatrix(proc){
        var a=proc.stk.pop();
        if(!(a instanceof ns.PsArray)){
          proc.onerror("typecheck","the 1st operand should be an array.");
          return;
        }
        
        var ctm=proc.graphics.gstate.CTM;
        for(var i=0;i<6;i++)ctm[i]=a.data[a.offset+i];
      },
      concat:function concat(proc){
        var a=proc.stk.pop();
        if(!(a instanceof ns.PsArray)){
          proc.onerror("typecheck","the 1st operand should be an array.");
          return;
        }
        
        a=a.offset==0?a.data:a.data.slice(a.offset,a.offset+6);
        ns.AffineA.mulD(a,proc.graphics.gstate.CTM);
      },
      concatmatrix:function concatmatrix(proc){
        var r=proc.stk.pop();
        var b=proc.stk.pop();
        var a=proc.stk.pop();
        
        // typecheck (arr_mod:rw-)
        if(!(r instanceof ns.PsArray)){
          proc.onerror('typecheck',"operand3/3: an array is required.");
          return;
        }else if(!r.__waccess__){
          proc.onerror('invalidaccess',"operand3/3: no waccess");
          return;
        }else if(!(b instanceof ns.PsArray)){
          proc.onerror('typecheck',"operand2/3: an array is required.");
          return;
        }else if(!(a instanceof ns.PsArray)){
          proc.onerror('typecheck',"operand1/3: an array is required.");
          return;
        }
        
        a=a.offset==0?a.data:a.data.slice(a.offset,a.offset+6);
        b=b.offset==0?b.data:b.data.slice(b.offset,b.offset+6);
        if(r.offset==0){
          ns.AffineA.mulR(a,b,r.data);
        }else{
          var buff=new Array(6);
          ns.AffineA.mulR(a,b,buff);
          for(var i=0;i<6;i++)
            r.data[r.offset+i]=buff[i];
        }
        proc.stk.push(r);
      },
      //------------------------------------------------------------------------
      translate:create_matrix_operation('translate',ns.AffineA.translateD,2,4,6),
      scale    :create_matrix_operation('scale',    ns.AffineA.scaleD    ,2,0,4),
      rotate   :create_matrix_operation('rotate',   ns.AffineA.rotateD   ,1,0,4),
      //------------------------------------------------------------------------
      matrix:function matrix(proc){
        proc.stk.push(new ns.PsArray(agh.Array.clone(ns.AffineA.identity)));
      },
      initmatrix:function initmatrix(proc){
        proc.graphics.gstate.CTM=agh.Array.clone(ns.AffineA.defaultMatrix);
      },
      identmatrix:function identmatrix(proc){
        load_matrix(proc,ns.AffineA.identity);
      },
      defaultmatrix:function defaultmatrix(proc){
        load_matrix(proc,ns.AffineA.defaultMatrix);
      },
      currentmatrix:function currentmatrix(proc){
        load_matrix(proc,proc.graphics.gstate.CTM);
      },
      invertmatrix:function invertmatrix(proc){
        var r=proc.stk.pop();
        var a=proc.stk.pop();
        
        // typecheck (arr_mod:rw-)
        if(!(r instanceof ns.PsArray)){
          proc.onerror('typecheck',"operand2/2: an array is required.");
          return;
        }else if(!r.__waccess__){
          proc.onerror('invalidaccess',"operand2/2: no waccess.");
          return;
        }else if(!(a instanceof ns.PsArray)){
          proc.onerror('typecheck',"operand1/2: an array is required.");
          return;
        }
        
        a=a.offset==0?a.data:a.data.slice(a.offset,a.offset+6);
        if(r.offset==0){
          ns.AffineA.invR(a,r.data);
        }else{
          var buff=new Array(6);
          ns.AffineA.invR(a,buff);
          for(var i=0;i<6;i++)
            r.data[r.offset+i]=buff[i];
        }
        proc.stk.push(r);
      }
    });
  //# </PsGState 依存> --------------------------------------------------------#
  })();
