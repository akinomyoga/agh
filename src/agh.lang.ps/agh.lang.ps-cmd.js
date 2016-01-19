  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //	基本オペレータ
  //----------------------------------------------------------------------------
  // 算術
  var RAD2DEG=180/Math.PI;
  var DEG2RAD=Math.PI/180;
  agh.memcpy(ns.systemdict.data,{
    add:function add(proc){
      var a=proc.stk.pop();proc.stk[proc.stk.length-1]+=a;
    },
    sub:function sub(proc){
      var a=proc.stk.pop();proc.stk[proc.stk.length-1]-=a;
    },
    mul:function mul(proc){
      var a=proc.stk.pop();proc.stk[proc.stk.length-1]*=a;
    },
    div:function div(proc){
      var a=proc.stk.pop();proc.stk[proc.stk.length-1]/=a;
    },
    mod:function mod(proc){
      var a=proc.stk.pop();proc.stk[proc.stk.length-1]%=a;
    },
    idiv:function idiv(proc){
      var a=proc.stk.pop();
      var b=proc.stk.pop();
      proc.stk.push(parseInt(b/a));
      //p.Run("3 2 idiv 4 2 idiv -5 2 idiv pstack clear");
    },
    abs:function abs(proc){
      proc.stk.push(Math.abs(proc.stk.pop()));
    },
    neg:function neg(proc){
      proc.stk.push(-proc.stk.pop());
      //proc.stk[proc.stk.length-1]*=-1;
    },
    //----------------------------------
    // ビット演算
    bitshift:function bitshift(proc){
      var s=proc.stk.pop();
      if(s>0){
        proc.stk[proc.stk.length-1]<<=s;
      }else if(s<0){
        proc.stk[proc.stk.length-1]>>=-s;
      }
      //log(15&7);
      //log(15.1&7.1);
      //log(15.1&~6.9);
      //log(15.1^6.9);
    },
    and:function and(proc){
      var a=proc.stk.pop();
      var b=proc.stk.pop();
      if(agh.is(a,Boolean)&&agh.is(b,Boolean))
        proc.stk.push(a&b?true:false);
      else
        proc.stk.push(a&b);
    },
    or:function or(proc){
      var a=proc.stk.pop();
      var b=proc.stk.pop();
      if(agh.is(a,Boolean)&&agh.is(b,Boolean))
        proc.stk.push(a|b?true:false);
      else
        proc.stk.push(a|b);
    },
    xor:function xor(proc){
      var a=proc.stk.pop();
      var b=proc.stk.pop();
      if(agh.is(a,Boolean)&&agh.is(b,Boolean))
        proc.stk.push(a^b?true:false);
      else
        proc.stk.push(a^b);
    },
    not:function not(proc){
      var a=proc.stk.pop();
      if(agh.is(a,Boolean))
        proc.stk.push(!a);
      else
        proc.stk.push(~a);
    },
    //----------------------------------
    // 変換・丸め
    ceiling:function ceiling(proc){
      proc.stk.push(Math.ceil(proc.stk.pop()));
      /*
        log(Math.ceil(3.2)==4.0);
        log(Math.ceil(-4.8)==-4.0);
        log(Math.ceil(99)==99);
      //*/
    },
    floor:function floor(proc){
      proc.stk.push(Math.floor(proc.stk.pop()));
      /*
        log(Math.floor(3.2)==3.0);
        log(Math.floor(-4.8)==-5.0);
        log(Math.floor(99)==99);
      //*/
    },
    truncate:function truncate(proc){
      //proc.stk.push(parseInt(proc.stk.pop()));
      proc.stk.push(0|proc.stk.pop());
      /*
        log(parseInt(3.2)==3.0);
        log(parseInt(-4.8)==-4.0);
        log(parseInt(99)==99);
      //*/
    },
    cvi:function cvi(proc){
      proc.stk.push(0|parseFloat(proc.stk.pop()));
      //proc.stk.push(parseInt(parseFloat(proc.stk.pop())));
      /*
        log(parseInt(parseFloat("3.3E1"))==33);
        log(parseInt(parseFloat("-47.8"))==-47);
        log(parseInt(parseFloat("520.9"))==520);
      //*/
    },
    round:function round(proc){
      proc.stk.push(Math.floor(0.5+proc.stk.pop()));
      /*
        log(Math.floor(3.2+0.5)==3.0);
        log(Math.floor(6.49+0.5)==6.0);
        log(Math.floor(6.5+0.5)==7.0);
        log(Math.floor(6.51+0.5)==7.0);
        log(Math.floor(-4.8+0.5)==-5.0);
        log(Math.floor(-6.49+0.5)==-6.0);
        log(Math.floor(-6.5+0.5)==-6.0);
        log(Math.floor(-6.51+0.5)==-7.0);
        log(Math.floor(99+0.5)==99);
      //*/
    },
    cvr:function cvr(proc){
      proc.stk.push(parseFloat(proc.stk.pop()));
    },
    //----------------------------------
    // 三角関数・指数・対数関数
    atan:function atan(proc){
      var x=proc.stk.pop();
      var y=proc.stk.pop();
      proc.stk.push(RAD2DEG*Math.atan2(y,x));
    },
    sin:function sin(proc){
      proc.stk.push(Math.sin(DEG2RAD*proc.stk.pop()));
    },
    cos:function cos(proc){
      proc.stk.push(Math.cos(DEG2RAD*proc.stk.pop()));
    },
    exp:function exp(proc){
      var ex=proc.stk.pop();
      var bs=proc.stk.pop();
      proc.stk.push(Math.pow(bs,ex));
      // p.Run("9 0.5 exp -9 -1 exp pstack clear");
    },
    sqrt:function sqrt(proc){
      proc.stk.push(Math.sqrt(proc.stk.pop()));
    },
    ln:function ln(proc){
      return proc.stk.push(Math.log(proc.stk.pop()));
    },
    log:function ps_log(proc){
      return proc.stk.push(Math.LOG10E*Math.log(proc.stk.pop()));
    },
    //----------------------------------
    // 比較
    eq:function eq(proc){
      var b=proc.stk.pop();
      var a=proc.stk.pop();
      proc.stk.push(ns.ps_compare(a,b)==0);
    },
    ne:function ne(proc){
      var b=proc.stk.pop();
      var a=proc.stk.pop();
      proc.stk.push(ns.ps_compare(a,b)!=0);
    },
    le:function le(proc){
      var b=proc.stk.pop();
      var a=proc.stk.pop();
      proc.stk.push(ns.ps_compare(a,b)<=0);
    },
    lt:function lt(proc){
      var b=proc.stk.pop();
      var a=proc.stk.pop();
      proc.stk.push(ns.ps_compare(a,b)<0);
    },
    ge:function ge(proc){
      var b=proc.stk.pop();
      var a=proc.stk.pop();
      proc.stk.push(ns.ps_compare(a,b)>=0);
    },
    gt:function gt(proc){
      var b=proc.stk.pop();
      var a=proc.stk.pop();
      proc.stk.push(ns.ps_compare(a,b)>0);
    }
  });
  // GhostScript 拡張
  agh.memcpy(ns.systemdict.data,{
    min:function min(proc){
      proc.errstream('warn: GhostScript extension --min-- is used.');
      proc.stk.push(Math.min(proc.stk.pop(),proc.stk.pop()));
    },
    max:function max(proc){
      proc.errstream('warn: GhostScript extension --max-- is used.');
      proc.stk.push(Math.min(proc.stk.pop(),proc.stk.pop()));
    }
  });
  ns.ps_compare=function ps_compare(a,b){
    if(a==null)return b==null?0:NaN;
    if(b==null)return NaN;
    if(a.constructor!=b.constructor)return NaN;
    
    if(!(typeof a=="number"||a instanceof Number||typeof a=="string"||a instanceof String)){
      if(a instanceof ns.PsName){
        a=a.name;
        b=b.name;
      }else if(a instanceof ns.PsString){
        var a=a.toString();
        var b=b.toString();
      }else if(a instanceof ns.PsNull){
        return 0;
      }else return a===b?0:NaN;
    }
    
    // compare native
    if(a==b)return 0;
    if(a>b)return 1;
    return -1;
  };

  //----------------------------------------------------------------------------
  // スタック
  agh.memcpy(ns.systemdict.data,{
    pop:function pop(proc){
      proc.stk.pop();
      //p.Run("1 2 3 4 5 6 pop pop pstack clear");
    },
    dup:function dup(proc){
      //var obj=proc.stk[proc.stk.length-1];
      //proc.stk.push(obj);
      proc.stk.push(proc.stk[proc.stk.length-1]);
      //p.Run("2011 dup dup pstack clear");
    },
    copy:function copy(proc){
      var stk=proc.stk;
      var count=parseInt(stk.pop());
      for(var i=stk.length-count,iM=stk.length;i<iM;i++)
        stk.push(stk[i]);
      //p.Run("1 2 3 4 5 6 3 copy pstack clear");
    },
    exch:function exch(proc){
      //* // Sf
        var stk=proc.stk;
        var t=stk[stk.length-1];
        stk[stk.length-1]=stk[stk.length-2];
        stk[stk.length-2]=t;
      /*/ // Fx
        var s=proc.stk;
        var b=s.pop();
        var a=s.pop();
        s.push(b,a);
      //*/
      //p.Run("1 2 3 4 5 6 exch pstack clear");
    },
    index:function index(proc){
      var index=proc.stk.pop();
      proc.stk.push(proc.stk[proc.stk.length-1-index]);
      //p.Run("1 2 3 4 5 6 4 index pstack clear");
    },
    roll:function roll(proc){
      var s=proc.stk;
      var del=s.pop();
      var len=s.pop();
      if(del<0)del+=len;
      
#%(
      // 遅い (関数呼出)
      function reverse(arr,begin,end){
        for(end--;begin<end;begin++,end--){
          var t=arr[begin];
          arr[begin]=arr[end];
          arr[end]=t;
        }
      }
      reverse(proc.stk,beg,mid);
      reverse(proc.stk,mid,end);
      reverse(proc.stk,beg,end);
#%)
#%(
      // 遅い (slice は遅い?)
      var b=s.length-len;
      var t=s.slice(b);
      for(var i=0;i<len;i++)s[b+(i+del)%len]=t[i];
#%)
      var end=s.length;
      var mid=end-del;
      var beg=end-len;
      var b,e,t;
      b=beg;e=mid;for(e--;b<e;b++,e--){t=s[b];s[b]=s[e];s[e]=t;}
      b=mid;e=end;for(e--;b<e;b++,e--){t=s[b];s[b]=s[e];s[e]=t;}
      b=beg;e=end;for(e--;b<e;b++,e--){t=s[b];s[b]=s[e];s[e]=t;}
      //p.Run("1 2 3 4 5 6 4 1 roll pstack clear");
    },
    clear:function clear(proc){
      proc.stk.length=0;
    },
    count:function count(proc){
      proc.stk.push(proc.stk.length);
    },
    mark:function mark(proc){
      proc.stk.push(ns.PsMark.instance);
    },
    counttomark:function counttomark(proc){
      var i=proc.stk.lastIndexOf(ns.PsMark.instance);
      if(i<0){
        proc.onerror("unmatchedmark");
        return;
      }
      
      proc.stk.push(proc.stk.length-1-i);
      
      //p.Run("1 mark 1 2 counttomark pstack clear");
    },
    cleartomark:function cleartomark(proc){
      var index=proc.stk.lastIndexOf(ns.PsMark.instance);
      if(index<0){
        proc.onerror("unmatchedmark");
        return;
      }
      
      proc.stk.length=index;
    }
  });
  //----------------------------------------------------------------------------
  // 制御
  agh.memcpy(ns.systemdict.data,{
    exec:function exec(proc){
      proc.process(proc.stk.pop());
    },
    'for':function ps_for(proc){
      var exec=proc.stk.pop();
      var iM=proc.stk.pop();
      var di=proc.stk.pop();
      var i0=proc.stk.pop();
      
      if(!(exec instanceof ns.PsArray)||!exec.__xaccess__){
        proc.onerror('typecheck',"operand4/4: a procedure is expected");
        return;
      }
      
      // exec.update_function
      if(exec.__funcver__!=exec.data.ver)
        exec.compile_function(proc);

      if(di==0){
        for(var i=i0;!proc.m_stop;i+=di){
          proc.stk.push(i);
          exec.__function__(proc,exec.__funcargs__);
        }
      }else if(di*(iM-i0)<0){
        return;
      }else if(di>0){
        for(var i=i0;i<=iM&&!proc.m_stop;i+=di){
          proc.stk.push(i);
          exec.__function__(proc,exec.__funcargs__);
        }
      }else{
        for(var i=i0;i>=iM&&!proc.m_stop;i+=di){
          proc.stk.push(i);
          exec.__function__(proc,exec.__funcargs__);
        }
      }
      
      if(proc.m_stop=='exit')proc.m_stop=false;
    },
    forall:function forall(proc){
      var e=proc.stk.pop();
      var a=proc.stk.pop();
      
      if(!(e instanceof ns.PsArray)||!e.__xaccess__){
        proc.onerror('typecheck',"operand4/4: a procedure is expected");
        return;
      }else if(e.__funcver__!=e.data.ver)
        e.compile_function(proc);
        
      if(a instanceof ns.PsArray||a instanceof ns.PsString){
        for(var i=0;i<a.length;i++){
          proc.stk.push(a.data[a.offset+i]);
          e.__function__(proc,e.__funcargs__);
        }
      }else if(a instanceof ns.PsDict){
        for(var k in a.data){
          proc.stk.push(new ns.PsName(k));
          proc.stk.push(a.data[k]);
          e.__function__(proc,e.__funcargs__);
        }
      }else{
        proc.onerror('typecheck','oprand1/2: an array, string or dictionary is expected');
        return;
      }
    },
    loop:function loop(proc){
      var e=proc.stk.pop();
      
      if(!(e instanceof ns.PsArray)||!e.__xaccess__){
        proc.onerror('typecheck',"operand1/1: a procedure is expected");
        return;
      }else if(e.__funcver__!=e.data.ver)
        e.compile_function(proc);
        
      for(;!proc.m_stop;)
        e.__function__(proc,e.__funcargs__);
      if(proc.m_stop=='exit')
        proc.m_stop=false;
    },
    repeat:function repeat(proc){
      var e=proc.stk.pop();
      var n=proc.stk.pop();
      
      if(!(e instanceof ns.PsArray)||!e.__xaccess__){
        proc.onerror('typecheck',"operand2/2: a procedure is expected");
        return;
      }else if(e.__funcver__!=e.data.ver)
        e.compile_function(proc);
        
      while(n--){
        e.__function__(proc,e.__funcargs__);
        if(proc.m_stop){
          if(proc.m_stop=='exit')proc.m_stop=false;
          break;
        }
      }
    },
    'if':function ps_if(proc){
      var e=proc.stk.pop();
      if(!proc.stk.pop())return;
      
      if(!(e instanceof ns.PsArray)||!e.__xaccess__){
        proc.onerror('typecheck',"operand2/2: a procedure is expected");
        return;
      }else if(e.__funcver__!=e.data.ver)
        e.compile_function(proc);
        
      e.__function__(proc,e.__funcargs__);
    },
    ifelse:function ifelse(proc){
      var f=proc.stk.pop();
      var t=proc.stk.pop();
      var c=proc.stk.pop();
      
      var e=c?t:f;
      if(!(e instanceof ns.PsArray)||!e.__xaccess__){
        proc.onerror('typecheck',"operand"+(c?2:3)+"/3: a procedure is expected");
        return;
      }else if(e.__funcver__!=e.data.ver)
        e.compile_function(proc);
        
      e.__function__(proc,e.__funcargs__);
    },
    stopped:function stopped(proc){
      proc.process(proc.stk.pop());
      if(proc.m_stop){
        if(proc.m_stop=='exit'){
          proc.onerror("invalidexit");
          proc.m_stop=false;
        }else if(proc.m_stop=='stop'){
          proc.m_stop=false;
        }
        proc.stk.push(true);
      }else{
        proc.stk.push(false);
      }
    },
    exit:function exit(proc){proc.m_stop='exit';},
    stop:function stop(proc){proc.m_stop='stop';},
    quit:function quit(proc){proc.m_stop='quit';}
  });
  //----------------------------------------------------------------------------
  // 配列
  agh.memcpy(ns.systemdict.data,{
    '[':function(proc){
      proc.stk.push(ns.PsMark.instance);
    },
    ']':function(proc){
      var index=proc.stk.lastIndexOf(ns.PsMark.instance);
      if(index<0){
        proc.onerror("unmatchedmark");
        return;
      }
      
      var arr=[];
      for(var i=index+1;i<proc.stk.length;i++)
        arr.push(proc.stk[i]);
      
      proc.stk.length=index;
      proc.stk.push(new ns.PsArray(arr));
    },
    packedarray:function packedarray(proc){
      var len=parseInt(proc.stk.pop());
      var index=proc.stk.length-len;
      
      var arr=[];
      for(var i=index;i<proc.stk.length;i++)
        arr.push(proc.stk[i]);
      var obj=new ns.PsArray(arr);
      obj.__packed__=true;
      obj.__waccess__=false;
      
      proc.stk.length=index;
      proc.stk.push(obj);
      //p.Run("1 2 3 4 4 packedarray aload pstack clear");
    },
    array:function array(proc){
      var len=parseInt(proc.stk.pop());
      proc.stk.push(new ns.PsArray(len));
      //p.Run("4 array pstack clear");
    },
    aload:function aload(proc){
      var arr=proc.stk.pop();
      if(arr instanceof ns.PsArray){
        for(var i=0;i<arr.length;i++)
          proc.stk.push(arr.data[i]);
      }
      proc.stk.push(arr);
      //p.Run("1 2 3 4 4 packedarray aload pstack clear");
    },
    astore:function astore(proc){
      var arr=proc.stk.pop();
      
      if(!(arr instanceof ns.PsArray)){
        proc.onerror('typecheck',"operand: an array is expected.");
        return;
      }else if(!arr.__waccess__){
        proc.onerror('invalidaccess',"operand: the array has no waccess.");
        return;
      }else{
        for(var i=arr.length-1;i>=0;i--)
          arr.data[i]=proc.stk.pop();
      }
      
      proc.stk.push(arr);
      //p.Run("1 2 3 4 4 array astore pstack clear");
    },
    string:function string(proc){
      var len=parseInt(proc.stk.pop());
      var arr=new Array(len);
      for(var i=0;i<len;i++)arr[i]=0;
      proc.stk.push(new ns.PsString(arr));
    },
    length:function length(proc){
      proc.stk.push(proc.stk.pop().length);
    },
    getinterval:function getinterval(proc){
      var len=proc.stk.pop();
      var ind=proc.stk.pop();
      var obj=proc.stk.pop();
      
      // create clone
      var ret=null;
      if(obj instanceof ns.PsArray){
        ret=new ns.PsArray(obj.data);
        ret.__packed__=obj.__packed__;
      }else if(obj instanceof ns.PsString){
        ret=new ns.PsString(obj.data);
      }else{
        proc.onerror("typecheck","operand 1/3");
        return;
      }
      
      // set range and push
      if(ind<0||len<0||obj.length<ind+len){
        proc.onerror("typecheck","interval "+ind+"-"+(ind+len)+" from 0-"+obj.length);
        return;
      }
      ret.__raccess__=obj.__raccess__;
      ret.__waccess__=obj.__waccess__;
      ret.__xaccess__=obj.__xaccess__;
      ret.offset=obj.offset+ind;
      ret.length=len;
      proc.stk.push(ret);
    },
    putinterval:function putinterval(proc){
      var src=proc.stk.pop();
      var ind=proc.stk.pop();
      var dst=proc.stk.pop();
      
      // typecheck
      if(dst instanceof ns.PsArray){
        if(!dst.__waccess__){
          proc.onerror("invalidaccess","operand1/3: no __waccess__");
          return;
        }
        
        if(!(src instanceof ns.PsArray)){
          proc.onerror("typecheck","operand 1/3 and operand 2/3 is not compatible.");
          return;
        }
      }else if(dst instanceof ns.PsString){
        if(!(src instanceof ns.PsString)){
          proc.onerror("typecheck","operand 1/3 and operand 2/3 is not compatible.");
          return;
        }
      }else{
        proc.onerror("typecheck","operand 1/3");
        return;
      }
      
      // rangecheck
      if(ind<0){
        proc.onerror("rangecheck","operand 2/3 should not be a negative integer.");
        return;
      }else if(dst.length<ind+src.length){
        proc.onerror("rangecheck","operand 3/3 is too large.");
        return;
      }
    
      for(var i=0;i<src.length;i++)
        dst.data[dst.offset+ind+i]=src.data[src.offset+i];
    },
    'get':function ps_get(proc){
      var key=proc.stk.pop();
      var obj=proc.stk.pop();
      if(!('__psget__' in obj)){
        proc.onerror("typecheck","operand 1/2 must be composite. "+obj);
        return;
      }
      
      proc.stk.push(obj.__psget__(proc,""+key));
    },
    put:function ps_put(proc){
      var val=proc.stk.pop();
      var key=proc.stk.pop();
      var obj=proc.stk.pop();
      if(!('__psput__' in obj)){
        proc.onerror("typecheck","operand 1/3 must be composite. "+obj);
        return;
      }
      
      obj.__psput__(proc,""+key.toString(),val);
    },
    /*
      p.Run("[ 1 2 3 4 5 ] dup 1 3 getinterval dup 1 2011 put pstack clear");
      p.Run("/ar [5 8 2 7 3] def ar 1 [(a) (b) (c)] putinterval ar /st (abc) def st 1 (de) putinterval st pstack clear");
    //*/
    bind:function bind(proc){
      var p=proc.stk[proc.stk.length-1];
      if(p instanceof ns.PsArray){
        // ※ __xaccess__ でなくても bind する。 (GS 準拠)
        // ※ !__waccess__ でも bind を実行する。 (GS 準拠)
        
        for(var i=0;i<p.length;i++){
          var o=p.data[p.offset+i];
          
          /*/
          // Deep Bind (より速くなりそうだけれど仕様逸脱…)
          //++++++++++++++++++++++++++++++++++++++++++++++++
          //while(
          //	o instanceof ns.PsName&&o.__xaccess__
          //	&&(o=proc.scope.TryGetValue(proc,o.name))!=null;
          //);
          //p.data[p.offset+i]=o;
          //++++++++++++++++++++++++++++++++++++++++++++++++
          /*/
          if(
            o instanceof ns.PsName&&o.__xaccess__
            &&(o=proc.scope.TryGetValue(proc,o.name)) instanceof Function
          )p.data[p.offset+i]=o;
          //*/
        }
      }else
        proc.onerror("typecheck","operand 1/1: an array is required.");
    }
  });
  ns.systemdict.data['['].ps_name='[';
  ns.systemdict.data[']'].ps_name=']';
  //----------------------------------------------------------------------------
  // 辞書
  agh.memcpy(ns.systemdict.data,{
    '<<':function(proc){
      proc.stk.push(ns.PsMark.instance);
    },
    '>>':function(proc){
      var index=proc.stk.lastIndexOf(ns.PsMark.instance);
      if(index++<0){
        proc.onerror("unmatchedmark");
        return;
      }
      
      var rest=proc.stk.length-index;
      if(rest%2==1){
        proc.onerror("rangecheck","odd number of objects in dictionary definition.");
        return;
      }
      
      var ret=new ns.PsDict();
      for(var i=index;i<proc.stk.length;i+=2){
        ret.data[proc.stk[i]]=proc.stk[i+1];
        ret.length++;
      }
      
      proc.stk.length=index-1;
      proc.stk.push(ret);
    },
    dict:function dict(proc){
      var n=proc.stk.pop(); // 無視
      proc.stk.push(new ns.PsDict());
    },
    known:function known(proc){
      var key=proc.stk.pop();
      var dict=proc.stk.pop();
      proc.stk.push(key in dict.data);
    },
    undef:function undef(proc){
      var key=proc.stk.pop();
      var dict=proc.stk.pop();
      dict.undef(proc,key);
    }
    /*
      p.Run("<< 1 2 3 4 >> << 1 2 3 >> pstack clear");
      p.Run("<< 1 2 3 4 >> 1 get pstack clear");
      p.Run("<< 1 2 3 4 >> dup 1 undef dup 3 get exch dup 1 known exch dup 3 known exch pstack clear");
    //*/
  });
  ns.systemdict.data['<<'].ps_name='<<';
  ns.systemdict.data['>>'].ps_name='>>';
  //----------------------------------------------------------------------------
  // 型
  agh.memcpy(ns.systemdict.data,{
    'true':function ps_true(proc){
      proc.stk.push(true);
    },
    'false':function ps_false(proc){
      proc.stk.push(false);
    },
    'null':function ps_null(proc){
      proc.stk.push(ns.PsNull.instance);
    },
    type:function type(proc){
      var o=proc.stk.pop();
      var r="unknowntype";
      
      if(agh.is(o,Number)){
        r=o==~~o?'integertype':'realtype';
      }else if(agh.is(o,Boolean)){
        r='booleantype';
      }else if(agh.is(o,Function)){
        r='operatortype';
      }else if(o instanceof ns.PsString){
        r='stringtype';
      }else if(o instanceof ns.PsArray){
        r=o.__packed__?'packedarraytype':'arraytype';
      }else if(o instanceof ns.PsName){
        r='nametype';
      }else if(o instanceof ns.PsDict){
        r='dicttype';
      }else if(o instanceof ns.PsMark){
        r='marktype';
      }else if(o instanceof ns.PsNull){
        r='nulltype';
      }else if(o instanceof ns.PsGState){
        r='gstatetype';
      }else if(o instanceof ns.PsSave){
        r='savetype';
      }else if(o instanceof ns.PsFile){
        r='filetype';
      }
      
      /* TODO: ■■
        conditiontype
        fonttype
        locktype
      //*/
      
      proc.stk.push(ns.PsName.CreateExecutable(r));
    },
    cvn:function cvn(proc){
      var top=proc.stk.pop();
      var name=new ns.PsName(top.toString());
      if('__xaccess__' in top)
        name.__xaccess__=top.__xaccess__;
      proc.stk.push(name);
    },
    cvrs:function cvrs(proc){
      var str=proc.stk.pop();
      var radix=parseInt(proc.stk.pop());
      var value=parseFloat(proc.stk.pop());
      
      var ret="";
      if(radix==10)
        ret=value.toString()
      else{
        value=0|value;
        if(value<0)value=(value+1)+Number.UINT_MAX;
        ret=value.toString(radix).toUpperCase();
      }
      
      if(ret.length>str.length){
        proc.onerror("rangecheck","string buffer is too small.");
        return;
      }
      
      var sub=new ns.PsString(str.data);
      sub.__xaccess__=str.__xaccess__;
      sub.offset=str.offset;
      sub.length=ret.length;
      for(var i=0;i<ret.length;i++)
        sub.data[sub.offset+i]=ret.charCodeAt(i);
      
      proc.stk.push(sub);
      /*
        p.Run("/temp {15 string} def 123 10 temp cvrs -123 10 temp cvrs 123.4 10 temp cvrs pstack clear");
        p.Run("/temp {15 string} def 123 16 temp cvrs -123 16 temp cvrs 123.4 16 temp cvrs pstack clear");
        p.Run("1 1 3 { 10 (Hello) dup 4 1 roll cvrs } for pstack clear");
        p.Run("/t (Hello) def t 123 10 t cvrs 99 10 t cvrs pstack clear");
      //*/
    }
  });
  //----------------------------------------------------------------------------
  // アクセス属性
  agh.memcpy(ns.systemdict.data,{
    cvx:function cvx(proc){
      var top=proc.stk[proc.stk.length-1];
      if(top instanceof Object&&'__xaccess__' in top&&!top.__xaccess__){
        var top=agh.wrap(top);//top.shallow_clone();
        top.__xaccess__=true;
        proc.stk[proc.stk.length-1]=top;
      }
      
      /* TODO: filetype.__xaccess__ etc */
    },
    cvlit:function cvlit(proc){
      var top=proc.stk[proc.stk.length-1];
      if(top instanceof Object&&'__xaccess__' in top&&top.__xaccess__){
        var top=agh.wrap(top);//top.shallow_clone();
        top.__xaccess__=false;
        proc.stk[proc.stk.length-1]=top;
      }
    },
    //--------------------------------------------
    readonly:function readonly(proc){
      var top=proc.stk[proc.stk.length-1];
      if(!(top instanceof Object)||!('__waccess__' in top)){
        proc.onerror('typecheck',"operand1/1: has no access modifiers");
        return;
      }else if(top.__waccess__){
        if(!(top instanceof ns.PsDict))
          proc.stk[proc.stk.length-1]=top=agh.wrap(top);
        top.__waccess__=false; // x は残す
      }
    },
    noaccess:function noaccess(proc){
      var top=proc.stk[proc.stk.length-1];
      if(!(top instanceof Object)||!('__waccess__' in top)){
        proc.onerror('typecheck',"operand1/1: has no access modifiers");
        return;
      }else if(top.__waccess__||top.__raccess__||top.__xaccess__){
        if(!(top instanceof ns.PsDict))
          proc.stk[proc.stk.length-1]=top=agh.wrap(top);
        top.__xaccess__=false;
        top.__waccess__=false;
        top.__raccess__=false;
      }
    },
    executeonly:function executeonly(proc){
      var top=proc.stk[proc.stk.length-1];
      if(!(top instanceof Object)||!('__waccess__' in top)){
        proc.onerror('typecheck',"operand1/1: has no access modifiers");
        return;
      }else if(top instanceof ns.PsDict){
        proc.onerror('typecheck',"operand1/1: dictionary is inherently unexecutable.");
        return;
      }else if(top.__waccess__||top.__raccess__){
        var top=agh.wrap(top);
        top.__waccess__=false;
        top.__raccess__=false;
        proc.stk[proc.stk.length-1]=top;
      }
    },
    //--------------------------------------------
    xcheck:function xcheck(proc){
      var obj=proc.stk.pop();
      proc.stk.push(obj instanceof Object&&!!obj.__xaccess__);
    },
    rcheck:function rcheck(proc){
      var obj=proc.stk.pop();
      proc.stk.push(obj instanceof Object&&!!obj.__raccess__);
    },
    wcheck:function wcheck(proc){
      var obj=proc.stk.pop();
      proc.stk.push(obj instanceof Object&&!!obj.__waccess__);
    }
  });
  //----------------------------------------------------------------------------
  // スコープ・変数
  agh.memcpy(ns.systemdict.data,{
    cleardictstack:function cleardictstack(proc){
      proc.scope.clear_dict();
    },
    countdictstack:function countdictstack(proc){
      proc.stk.push(1+proc.scope.dicts.length);
      // 1 は systemdict の分
    },
    dictstack:function dictstack(proc){
      var arr=proc.stk.pop();
      var dstk=proc.scope.dicts;
      var n_dstk=1+dstk.length;
      if(arr.length<n_dstk){
        // ※ arr.data.length-arr.offset ではなく arr.length が上限
        proc.onerror("rangecheck","operand 1/1 is to small to store dictionaries.");
        return;
      }
      
      var ret=new ns.PsArray(arr.data);
      ret.offset=arr.offset;
      ret.length=n_dstk;
      ret.data[ret.offset]=proc.scope.systemdict;
      for(var i=1;i<n_dstk;i++)
        ret.data[ret.offset+i]=dstk[i-1];
      
      proc.stk.push(ret);
    },
    begin:function begin(proc){
      var dict=proc.stk.pop();
      if(!(dict instanceof ns.PsDict)){
        proc.onerror("typecheck","operand 1/1 must be dictionary. operand 1/1 = "+to_ps(dict));
        return;
      }
      
      proc.scope.push_dict(dict);
    },
    end:function end(proc){
      proc.scope.pop_dict(proc);
    },
    def:function def(proc){
      if(proc.stk.length<2){
        proc.onerror('stackunderflow');
        return;
      }
      var val=proc.stk.pop();
      var key=proc.stk.pop();
      proc.scope.set_val(proc,key,val);
    },
    where:function where(proc){
      var key=proc.stk.pop();
      var dic=proc.scope.where(key);
      if(dic!=null){
        proc.stk.push(dic);
        proc.stk.push(true);
      }else{
        proc.stk.push(false);
      }
    },
    store:function store(proc){
      var val=proc.stk.pop();
      var key=proc.stk.pop();
      var dic=proc.scope.where(key)||proc.scope.top_dict();
      dic.__psput__(proc,key,val);
    },
    load:function load(proc){
      var key=proc.stk.pop();
      var dict=proc.scope.where(key);
      if(dict==null){
        proc.onerror("undefined","'"+key+"'");
        return;
      }
      
      proc.stk.push(dict.data[key]);
    },
    currentdict:function currentdict(proc){
      proc.stk.push(proc.scope.top_dict());
    }
    /*
      p.Run("systemdict /add get systemdict pstack clear");
      p.Run("5 array dup dictstack pstack clear");
      p.Run("/add 10 store pstack clear");
      p.Run("/hi 1234 def hi hi /hi 4321 store hi hi /add where /hi where /world where pstack clear");
      p.Run("/hi 1234 def /hi load /world load pstack clear");
    //*/
  });
  //----------------------------------------------------------------------------
  // ファイル
  agh.memcpy(ns.systemdict.data,{
    currentfile:function currentfile(proc){
      proc.stk.push(proc.m_filestk[proc.m_filestk.length-1]);
    },
    closefile:function closefile(proc){
      var f=proc.stk.pop();
      if(!(f instanceof ns.PsFile)){
        proc.onerror('typeheck',"operand1/1: a file is expected");
        return;
      }
      
      f.close();
    },
    eexec:function eexec(proc){
      var f=proc.stk.pop();
      if(f instanceof ns.PsFile||f instanceof ns.PsString){
        var efile=new ns.Filters.EExecDecoder(f);
      }else{
        proc.onerror('typeheck',"operand1/1: a file is expected");
        return;
      }
      
      // window.log('dbg: eexec efile.c='+efile.c);
      proc.scope.push_dict(proc.scope.systemdict);
      proc.runfile(efile);
      proc.scope.pop_dict();
    },
    readstring:function readstring(proc){
      var s=proc.stk.pop();
      if(!(s instanceof ns.PsString)){
        proc.onerror('typeheck',"operand2/2: a string is expected");
        return;
      }else if(!s.__waccess__){
        proc.onerror('invalidaccess',"operand2/2: no __waccess__");
        return;
      }
      
      var f=proc.stk.pop();
      if(!(f instanceof ns.PsFile)){
        proc.onerror('typeheck',"operand1/2: a file is expected");
        return;
      }
      
      while(f.c!=null&&/\s/.test(f.c))f.next();
      for(var i=0;i<s.length&&f.c!=null;i++){
        s.data[s.offset+i]=f.c.charCodeAt(0);
        f.next();
      }
      
      if(i==s.length){
        proc.stk.push(s);
        proc.stk.push(true);
      }else{
        var ss=new ns.PsString(s.data);
          ss.__raccess__=s.__raccess__;
          ss.__waccess__=s.__waccess__;
          ss.__xaccess__=s.__xaccess__;
          ss.offset=s.offset;
          ss.length=i;
        proc.stk.push(ss);
        proc.stk.push(false);
      }
    }
    // ■TODO: filter
  });
  //----------------------------------------------------------------------------
  // その他
  agh.memcpy(ns.systemdict.data,{
    '=':function(proc){
      var obj=proc.stk.pop();
      proc.outstream(obj);
    },
    '==':function(proc){
      proc.outstream(to_ps(proc.stk.pop()));
    },
    pstack:function pstack(proc){
      proc.outstream(agh.Array.map(proc.stk,to_ps).reverse().join('\n'));
    },
    stack:function stack(proc){
      proc.outstream(proc.stk.reverse().join('\n'));
    },
    usertime:function usertime(proc){
      // 本来は PostScript を実際に処理している task context での経過時間を返す。
      proc.stk.push(new Date().getTime()-proc.m_inittime);
    },
    realtime:function realtime(proc){
      // 起点は何でも良い
      proc.stk.push(new Date().getTime());
    },
    //--------------------------------------------
    // 乱数 (線形合同法)
    srand:function srand(proc){
      proc.m_rrand=0|proc.stk.pop();
    },
    rrand:function rrand(proc){
      proc.stk.push(proc.m_rrand);
    },
    rand:function rrand(proc){
      // C rand (線形合同法)
      proc.stk.push(proc.m_rrand=proc.m_rrand*1103515245+12345&0x7FFFFFFF);
    }
  });
  ns.systemdict.data['='].ps_name='=';
  ns.systemdict.data['=='].ps_name='==';
