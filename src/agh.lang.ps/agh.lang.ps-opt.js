  // [[ text/javascript;charset=utf-8 ]]
  //----------------------------------------------------------------------------
  //   最適化
  //----------------------------------------------------------------------------
  var OP_PUSH=1;
  var OP_FUNC=2;
  var OP_NAME=3;
  var OP_ESTR=4;
  var OP_EARR=5;
  var OP_CODE=6;
  
  var OP_EXPR=7;
  var OP_VPOP=8;
  (function initialize_optimizer(){

    ns.Optimizer=function(proc){
      this.proc=proc;
    };
    agh.memcpy(ns.Optimizer.prototype,{
      compile_function:function(procedure){
        this.stk=[];
        var stk=this.stk;
        
        //----------------------------------------------------
        //  Construction
        for(var i=0;i<procedure.length;i++){
          var w=procedure.data[procedure.offset+i];
          if(w.__xaccess__&&!(w instanceof ns.PsArray)){
            if(w instanceof ns.PsName){
              if(this.proc.option.MwgAllowAutoBind){
                this.strong_bind(w);
              }else{
                stk.push([OP_NAME,w]);
              }
            }else if(w instanceof ns.PsString){
              stk.push([OP_ESTR,w]);
            }else if(!(w instanceof ns.PsNull)){
              stk.push([OP_PUSH,w]);
            }
          }else if(w instanceof Function){
            stk.push([OP_FUNC,w]);
          }else{
            stk.push([OP_PUSH,w]);
          }
        }
        
        var args=[];
        this.iv=0;
        this.args=args;
        this.optimize();
        
        //----------------------------------------------------
        //  Code Generation
        var stk=this.stk;
        var buff=[];
        var ia=args.length;
        buff.push('var _s=proc.stk;\n');
        for(var i=0;i<stk.length;i++){
          var op=stk[i];
          switch(op[0]){
            case OP_PUSH:
              buff.push('_s.push(_a[',ia++,']');args.push(op[1]);
              while(i+1<stk.length&&stk[i+1][0]==OP_PUSH){
                buff.push(',_a[',ia++,']');args.push(stk[++i][1]);
              }
              buff.push(');\n');
              break;
            case OP_FUNC:
              var f=op[1];
              if(f.__inline__!=null){
                if(!f.__nothrow__){
                  buff.push('proc.m_wstack.push(_a[',ia++,']);\n');args.push(f);
                }
                buff.push(f.__inline__);
                if(!f.__nothrow__){
                  buff.push('proc.m_wstack.pop();\n');
                  buff.push('if(proc.m_stop)return;\n');
                }
              }else{
                buff.push('proc.m_wstack.push(_a[',ia,']);')
                buff.push('_a[',ia++,'](proc);');args.push(f);
                buff.push('proc.m_wstack.pop();');
                buff.push('if(proc.m_stop)return;\n');
              }
              break;
            case OP_NAME:
              //buff.push('proc.m_wstack.push(_a[',ia++,']);');args.push(w);
              buff.push('var v=proc.scope.get_val(proc,_a[',ia++,']);\n');args.push(op[1].name);
              buff.push('if(v!=null)proc.process(v);\n');
              buff.push('if(proc.m_stop)return;\n');
              //buff.push('proc.m_wstack.pop();');
              break;
            case OP_ESTR:
              buff.push('var sc=new ns.ScannerF(_a[',ia++,'].toString(),proc);\n');args.push(op[1]);
              buff.push('var w2=null;\n');
              buff.push('while(w2=sc.next()){\n');
              buff.push('  if(w2 instanceof ',nsName,'.PsComment)continue;\n');
              buff.push('  proc.process(w2);\n');
              buff.push('  if(proc.m_stop)return;\n'); // 配列内列挙の中止
              buff.push('}\n');
              break;
            case OP_EARR:
              buff.push('var f=_a[',ia++,'];');args.push(op[1]);
              buff.push('if(f.__funcver__!=f.data.ver)');
              buff.push('  f.compile_function(proc);');
              buff.push('f.__function__(proc,f.__funcargs__);');
              buff.push('if(proc.m_stop)return;\n');
              break;
            case OP_CODE:
              buff.push(op[1]);
              break;
          }
        }
        
        //----------------------------------------------------
        //  Setup
        procedure.__function__=new Function('proc','_a',buff.join(''));
        procedure.__funcargs__=args;
        procedure.__funcver__=procedure.data.ver;
        
        //window.log("compiled: "+procedure.__function__);
      },
      strong_bind:function(w){
        // assume(w instanceof ns.PsName);
        
        var t=w;
        while(
          w instanceof ns.PsName&&w.__xaccess__
          &&(t=this.proc.scope.TryGetValue(this.proc,w.name))!=null
        )w=t;
        
        if(w.__xaccess__){
          if(w instanceof ns.PsArray){
            this.stk.push([OP_EARR,w]);
          }else if(w instanceof ns.PsString){
            this.stk.push([OP_ESTR,w]);
          }else if(!(w instanceof ns.PsNull)){
            this.stk.push([OP_PUSH,w]);
          }
        }else if(w instanceof Function){
          this.stk.push([OP_FUNC,w]);
        }else{
          this.stk.push([OP_PUSH,w]);
        }
      },
      optimize:function(){
        this.ostk=this.stk;
        this.stk=[];
        this.stkp=[];
        var s=this.ostk;
        var s_=this.stk;
        var sp=this.stkp;
        
        var args=this.args;
        
        for(var i=0;i<s.length;i++){
          var o=s[i];
          if(o[0]==OP_FUNC&&o[1].__optimize1__!=null){
            o[1].__optimize1__(this);
          }else if(o[0]==OP_PUSH){
            sp.push(o);
          }else{
            for(var j=0;j<sp.length;j++)s_.push(sp[j]);
            sp.length=0;
            s_.push(o);
          }
        }
        
        // flush
        for(var j=0;j<sp.length;j++)s_.push(sp[j]);
        sp.length=0;
      },
      opepush:function(ope){
        var sp=this.stkp;
        var s_=this.stk;
        for(var j=0;j<sp.length;j++)s_.push(sp[j]);
        sp.length=0;
        this.stk.push(ope);
      },
      countpush:function(){
        return this.stkp.length;
      }
    });
    agh.memcpy(ns.Optimizer,{
      //ns.systemdict['exch'].__inline__='';
      allow_inlining:function(fun){
        if(fun instanceof Function&&fun.__inline__==null){
          // 条件: context に依存しない事
          // 条件: return を含まない事
          fun.__inline__
            =fun.toString()
            .replace(/\/\*(?:[^\*]|\*[^\/])*\*\/|\/\/[^\r\n]*/g,'')
            .replace(/^\s*function\b\s*(?:[\w_\$]+\s*)\([^\(\)]*\)?\s*\{(?:\s*\n)|\}\s*$/g,'')
            .replace(/\n\s*(?:\n|$)/g,'\n')
            .replace(/\bproc\.stk\b/g,'_s')
            .replace(/\bns\b/g,nsName);
          fun.__nothrow__
            =!/\bproc\.onerror\b/.test(fun.__inline__);
          //window.log("dbg: inlining\n"+fun.__inline__);
        }
      },
      initialize:function(){
        // 数学操作
        // - 四則
        this.allow_inlining(ns.systemdict.data.add);
        this.allow_inlining(ns.systemdict.data.sub);
        this.allow_inlining(ns.systemdict.data.mul);
        this.allow_inlining(ns.systemdict.data.div);
        this.allow_inlining(ns.systemdict.data.idiv);
        this.allow_inlining(ns.systemdict.data.neg);
        // - 関数
        //this.allow_inlining(ns.systemdict.data.atan);
        //this.allow_inlining(ns.systemdict.data.sin);
        //this.allow_inlining(ns.systemdict.data.cos);
        this.allow_inlining(ns.systemdict.data.exp);
        this.allow_inlining(ns.systemdict.data.sqrt);
        this.allow_inlining(ns.systemdict.data.ln);
        this.allow_inlining(ns.systemdict.data.log);
        // - 比較
        this.allow_inlining(ns.systemdict.data.eq);
        this.allow_inlining(ns.systemdict.data.ne);
        this.allow_inlining(ns.systemdict.data.le);
        this.allow_inlining(ns.systemdict.data.lt);
        this.allow_inlining(ns.systemdict.data.ge);
        this.allow_inlining(ns.systemdict.data.gt);

        // スタック操作
        this.allow_inlining(ns.systemdict.data.pop);
        this.allow_inlining(ns.systemdict.data.dup);
        this.allow_inlining(ns.systemdict.data.copy);
        this.allow_inlining(ns.systemdict.data.exch);
        this.allow_inlining(ns.systemdict.data.index);
        this.allow_inlining(ns.systemdict.data.roll);
        this.allow_inlining(ns.systemdict.data.clear);
        this.allow_inlining(ns.systemdict.data.count);
        this.allow_inlining(ns.systemdict.data.mark);

        ns.systemdict.data.roll.__optimize1__=function(opt){
          var c=opt.countpush();
          if(c<2){
            opt.opepush([OP_FUNC,this]);
            return;
          }
          
          var del=opt.stkp.pop()[1];
          var len=opt.stkp.pop()[1];
          if(del<0)del+=len;
          
          var ret=[];
          ret.push('var end=_s.length;\n');
          ret.push('var mid=end-',del,';\n');
          ret.push('var beg=end-',len,';\n');
          ret.push('var b,e,t;\n');
          if(len-del>1)ret.push('b=beg;e=mid;for(e--;b<e;b++,e--){t=_s[b];_s[b]=_s[e];_s[e]=t;}\n');
          if(del>1)ret.push('b=mid;e=end;for(e--;b<e;b++,e--){t=_s[b];_s[b]=_s[e];_s[e]=t;}\n');
          ret.push('b=beg;e=end;for(e--;b<e;b++,e--){t=_s[b];_s[b]=_s[e];_s[e]=t;}\n');
          opt.opepush([OP_CODE,ret.join('')]);
          
          // □ c==1 の場合
          // □ c>=2+len の場合
        };
#%define agh::mul (
        ns.systemdict.data.mul.__optimize1__=function(opt){
          var c=opt.countpush();
          if(c>=2){
            var b=opt.stkp.pop()[1];
            var a=opt.stkp.pop()[1];
            opt.stkp.push([OP_PUSH,a*b]);
          }else if(c==1){
            var b=opt.stkp.pop()[1];
            opt.opepush([OP_CODE,"_s[_s.length-1]*="+b+";\n"]);
          }else{
            opt.opepush([OP_FUNC,this]);
          }
        };
#%)
#%expand agh::mul.r|*|+|.r|mul|add|
#%expand agh::mul.r|*|-|.r|mul|sub|
#%expand agh::mul
#%expand agh::mul.r|*|/|.r|mul|div|
#%expand agh::mul.r|*|%|.r|mul|mod|
#%define agh::cmd (
        ns.systemdict.data.cmd.__optimize1__=function(opt){
          var c=opt.countpush();
          if(c>=1){
            var a=opt.stkp.pop()[1];
            opt.stkp.push([OP_PUSH,expr]);
          }else{
            opt.opepush([OP_FUNC,this]);
          }
        };
#%)
#%expand agh::cmd.r|cmd|neg|.r|expr|-a|
#%expand agh::cmd.r|cmd|abs|.r|expr|Math.abs(a)|

        ns.Optimizer2.initialize();
      }
    });
    //================================================================
    ns.Optimizer2=function(proc){
      this.proc=proc;
    };
    agh.memcpy(ns.Optimizer2.prototype,{
      compile_function:function(procedure){
        //----------------------------------------------------
        //  Construction
        this.stk=[];
        this._s=[];
        this.args=[];
        this.args.ns=ns;
        this.iv=0;
        this.read_array(procedure);
        this.opepush(null);
        
        var stk=this.stk;
        var args=this.args;
        //----------------------------------------------------
        //  Code Generation
        var stk=this.stk;
        var buff=[];
        var ia=args.length;
        buff.push('var _s=proc.stk;\n');
        for(var i=0;i<stk.length;i++){
          var op=stk[i];
          switch(op[0]){
            case OP_EXPR:
            case OP_VPOP:
              for(var j=1;i+j<stk.length&&(stk[i+j][0]==OP_EXPR||stk[i+j][0]==OP_VPOP);j++);
              if(j>=2){
                buff.push('var _n=_s.length;\n');
                var s=0;
                for(var k=0;k<j;k++){
                  if(stk[i][0]==OP_EXPR){
                    buff.push('_s[_n+(',s++,')]=',stk[i++][1],';\n');
                  }else{
                    buff.push('var ',stk[i++][1],'=_s[_n+(',s---1,')];\n');
                  }
                }
                if(s!=0)buff.push('_s.length=_n+(',s,');\n');
                i--; // cancel
              }else if(op[0]==OP_EXPR){
                buff.push('_s.push(',op[1],');\n');
              }else{
                buff.push('var ',op[1],'=_s.pop();\n');
              }
              break;
            case OP_FUNC:
              var f=op[1];
              if(f.__inline__!=null){
                if(!f.__nothrow__){
                  buff.push('proc.m_wstack.push(_a[',ia++,']);\n');args.push(f);
                }
                buff.push(f.__inline__);
                if(!f.__nothrow__){
                  buff.push('proc.m_wstack.pop();\n');
                  buff.push('if(proc.m_stop)return;\n');
                }
              }else{
                // OPTIMIZATION PROFILE
                //window.log("dbg: function call "+to_ps(f));
                
                buff.push('proc.m_wstack.push(_a[',ia,']);')
                buff.push('_a[',ia++,'](proc);');args.push(f);
                buff.push('proc.m_wstack.pop();');
                buff.push('if(proc.m_stop)return;\n');
              }
              break;
            case OP_NAME:
              //buff.push('proc.m_wstack.push(_a[',ia++,']);');args.push(w);
              buff.push('var v=proc.scope.get_val(proc,_a[',ia++,']);');args.push(op[1].name);
              buff.push('if(v!=null)proc.process(v);');
              buff.push('if(proc.m_stop)return;\n');
              //buff.push('proc.m_wstack.pop();');
              break;
            case OP_ESTR:
              buff.push('var sc=new ns.ScannerF(_a[',ia++,'].toString(),proc);\n');args.push(op[1]);
              buff.push('var w2=null;\n');
              buff.push('while(w2=sc.next()){\n');
              buff.push('  if(w2 instanceof ',nsName,'.PsComment)continue;\n');
              buff.push('  proc.process(w2);\n');
              buff.push('  if(proc.m_stop)return;\n'); // 配列内列挙の中止
              buff.push('}\n');
              break;
            case OP_EARR:
              buff.push('var f=_a[',ia++,'];');args.push(op[1]);
              buff.push('if(f.__funcver__!=f.data.ver)');
              buff.push('  f.compile_function(proc);');
              buff.push('f.__function__(proc,f.__funcargs__);');
              buff.push('if(proc.m_stop)return;\n');
              break;
            case OP_CODE:
              buff.push(op[1]);
              break;
            default:
              this.proc.onerror('fatalerror',"unknown optimization item");
              break;
          }
        }
        
        //----------------------------------------------------
        //  Setup
        procedure.__function__=new Function('proc','_a',buff.join(''));
        procedure.__funcargs__=args;
        procedure.__funcver__=procedure.data.ver;
        
        //window.log("compiled: "+procedure.__function__);
      },
      //--------------------------------------------------------------
      read_array:function(procedure){
        for(var i=0;i<procedure.length;i++){
          var w=procedure.data[procedure.offset+i];
          if(w.__xaccess__&&!(w instanceof ns.PsArray)){
            if(w instanceof ns.PsName){
              if(this.proc.option.MwgAllowAutoBind){
                this.strong_bind(w);
              }else{
                this.read_operation([OP_NAME,w]);
              }
            }else if(w instanceof ns.PsString){
              this.read_operation([OP_ESTR,w]);
            }else if(!(w instanceof ns.PsNull)){
              this.read_operation([OP_PUSH,w]);
            }
          }else if(w instanceof Function){
            this.read_operation([OP_FUNC,w]);
          }else{
            this.read_operation([OP_PUSH,w]);
          }
        }
      },
      strong_bind:function(w){
        // assume(w instanceof ns.PsName);
        
        var t=w;
        while(
          w instanceof ns.PsName&&w.__xaccess__
          &&(t=this.proc.scope.TryGetValue(this.proc,w.name))!=null
        )w=t;
        
        if(w.__xaccess__){
          if(w instanceof ns.PsArray){
            if(this.proc.option.MwgAllowInlining&&w.length<=5)
              this.read_array(w);
            else
              this.read_operation([OP_EARR,w]);
          }else if(w instanceof ns.PsString){
            this.read_operation([OP_ESTR,w]);
          }else if(!(w instanceof ns.PsNull)){
            this.read_operation([OP_PUSH,w]);
          }
        }else if(w instanceof Function){
          this.read_operation([OP_FUNC,w]);
        }else{
          this.read_operation([OP_PUSH,w]);
        }
      },
      read_operation:function(o){
        if(o[0]==OP_FUNC&&o[1].__optimize2__!=null){
          o[1].__optimize2__(this);
        }else if(o[0]==OP_PUSH){
          this._s.push(o);
        }else{
          this.opepush(o);
        }
      },
      //--------------------------------------------------------------
      opepush:function(ope){
        // flush_callstack
        var _s=this._s;
        var ops=this.stk;
        for(var i=0;i<_s.length;i++)
          ops.push([OP_EXPR,this.operation2code(_s[i])]);
        _s.length=0;
        
        if(ope)this.stk.push(ope);
      },
      stkpush:function(w){
        this._s.push(w);
      },
      stkpop:function(){
        if(this._s.length)
          return this._s.pop();
        else{
          this.stk.push([OP_VPOP,'_v'+this.iv]);
          return [OP_EXPR,'_v'+this.iv++];
        }
      },
      operation2code:function(o){
        if(o[0]==OP_EXPR||'number'==typeof o[1]||o[1] instanceof Number)
          return o[1];
        else{
          var ret='_a['+this.args.length+']';
          this.args.push(o[1]);
          return ret;
        }
      }
      //--------------------------------------------------------------
    });
    agh.memcpy(ns.Optimizer2,{
      initialize:function(){
      
        //++++++++++++++++++++++++++++++++++++++++++++++++++
        //  算術 (Number しか引数に来ないという前提)
        //--------------------------------------------------
#%define agh::mul (
        ns.systemdict.data.mul.__optimize2__=function(opt){
          var b=opt.stkpop();
          var a=opt.stkpop();
          if(a[0]==OP_PUSH&&b[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,a[1]*b[1]]);
          }else{
            opt.stkpush([OP_EXPR,'('+a[1]+'*'+b[1]+')']);
          }
        };
#%)
#%expand agh::mul.r|*|+|.r|mul|add|
#%expand agh::mul.r|*|-|.r|mul|sub|
#%expand agh::mul
#%expand agh::mul.r|*|/|.r|mul|div|
#%expand agh::mul.r|*|%|.r|mul|mod|
#%define agh::cmd (
        ns.systemdict.data.cmd.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
##%expand (
            opt.stkpush([OP_PUSH,expr]);
##%).r|_X|a[1]|
          else
##%expand (
            opt.stkpush([OP_EXPR,'expr']);
##%).r|_X|'+a[1]+'|
        };
#%)
#%expand agh::cmd.r|cmd|neg|     .r|expr|(-_X)|
#%expand agh::cmd.r|cmd|abs|     .r|expr|Math.abs(_X)|
#%expand agh::cmd.r|cmd|sqrt|    .r|expr|Math.sqrt(_X)|
#%expand agh::cmd.r|cmd|truncate|.r/expr/(0|_X)/
#%expand agh::cmd.r|cmd|floor|   .r|expr|Math.floor(_X)|
#%expand agh::cmd.r|cmd|ceiling| .r|expr|Math.ceil(_X)|
#%expand agh::cmd.r|cmd|round|   .r|expr|Math.floor(0.5+_X)|
#%expand agh::cmd.r|cmd|cvr|     .r/expr/parseFloat(_X)/
#%expand agh::cmd.r|cmd|cvi|     .r/expr/(0|parseFloat(_X))/
#%expand agh::cmd.r|cmd|ln|      .r|expr|Math.log(_X)|
#%expand agh::cmd.r|cmd|log|     .r|expr|Math.LOG10E*Math.log(_X)|
//*/
//#%expand agh::cmd.r|cmd|atan|    .r|expr|Math.atan(DEG2RAD*_X)|
//#%expand agh::cmd.r|cmd|sin|     .r|expr|Math.sin(DEG2RAD*_X)|
//#%expand agh::cmd.r|cmd|cos|     .r|expr|Math.cos(DEG2RAD*_X)|
#%define agh::cmd (
        ns.systemdict.data.cmd.__optimize2__=function(opt){
          var b=opt.stkpop();
          var a=opt.stkpop();
          if(a[0]==OP_PUSH&&b[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,expr1]);
          }else{
            opt.stkpush([OP_EXPR,expr2]);
          }
        };
#%)
#%expand agh::cmd.r|cmd|exp| .r|expr1|Math.pow(a[1],b[1])|   .r|expr2|'Math.pow('+a[1]+','+b[1]+')'|
        //++++++++++++++++++++++++++++++++++++++++++++++++++
        // 比較
        //--------------------------------------------------
#%define agh::cmd (
        ns.systemdict.data.cmd.__optimize2__=function(opt){
          var wb=opt.stkpop();
          var wa=opt.stkpop();
          if(wa[0]==OP_PUSH&&wb[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,ns.ps_compare(wa[1],wb[1]) > 0]);
          }else{
            var isnum_a=agh.is(wa[1],Number);
            var isnum_b=agh.is(wb[1],Number);
            // 型判定
            if(wa[0]==OP_EXPR||isnum_a){
              var a=wa[1];
            }else{
              var a='_a['+opt.args.length+']';
              opt.args.push(wa[1]);
            }
            
            // 型判定
            if(wb[0]==OP_EXPR||isnum_b){
              var b=wb[1];
            }else{
              var b='_a['+opt.args.length+']';
              opt.args.push(wb[1]);
            }
            
            if(isnum_a||isnum_b)
              opt.stkpush([OP_EXPR,'('+a+'>'+b+')']);
            else
              opt.stkpush([OP_EXPR,'_a.ns.ps_compare('+a+','+b+')>0']);
          }
        };
#%)
#%expand agh::cmd.r|cmd|gt| .r|>|>|
#%expand agh::cmd.r|cmd|ge| .r|>|>=|
#%expand agh::cmd.r|cmd|lt| .r|>|<|
#%expand agh::cmd.r|cmd|le| .r|>|<=|
#%expand agh::cmd.r|cmd|eq| .r|>|==|
#%expand agh::cmd.r|cmd|ne| .r|>|!=|
//*/
        //++++++++++++++++++++++++++++++++++++++++++++++++++
        //  スタック操作
        //--------------------------------------------------
        ns.systemdict.data.roll.__optimize2__=function(opt){
          var del=opt.stkpop();
          var len=opt.stkpop();
          
          if(del[0]==OP_PUSH&&len[0]==OP_PUSH){
            var l=len[1];
            var d=del[1];
            if(d<0)d+=l;if(d==0)return;
            var s=l-d;if(s==0)return;
            if(l<=5){
              //window.log("roll: l="+l+" s="+s+" d="+d);
              
              var t=[];
              for(var i=l-1;i>=0;i--)t[i]=opt.stkpop();
              for(var i=0;i<l;i++)opt.stkpush(t[(i+s)%l]);
              return;
            }else if(d==1){
              var ret=[];
              ret.push('var n=_s.length;var t=_s[n-1];');
              ret.push('for(var i=n-1,iL=n-',l,';i>iL;i--)_s[i]=_s[i-1];');
              ret.push('_s[iL]=t;\n');
              opt.opepush([OP_CODE,ret.join('')]);
              return;
            }else if(s==1){
              var ret=[];
              ret.push('var n=_s.length;var t=_s[n-',l,'];');
              ret.push('for(var i=n-',l,',iM=n-1;i<iM;i++)_s[i]=_s[i+1];');
              ret.push('_s[iM]=t;\n');
              opt.opepush([OP_CODE,ret.join('')]);
              return;
            }
          }
          
          //[ reverse^3 ]
          var ret=[];
          
          // --- 回転領域の確定 ---
          ret.push('var end=_s.length;\n');
          if(del[0]==OP_EXPR){
            //window.log("dbg: * E roll");
            ret.push('var del=',del[1],';\n');
            ret.push('var mid=end-(del<0?del+',len[1],':del);\n');
          }else if(del[1]==0){
            //window.log("dbg: * 0 roll");
            return;
          }else if(del[1]>0){
            //window.log("dbg: * + roll");
            ret.push('var mid=end-',del[1],';\n');
          }else if(len[0]==OP_PUSH){
            //window.log("dbg: + - roll");
            del[1]+=len[1];
            ret.push('var mid=end-',del[1],';\n');
          }else{
            //window.log("dbg: E - roll");
            ret.push('var mid=end-(',del[1],'+',len[1],');\n');
          }
          ret.push('var beg=end-',len[1],';\n');
          
          // --- 回転 ---
          ret.push('var b,e,t;\n');
          if(len[0]!=OP_PUSH||del[0]!=OP_PUSH||len[1]-del[1]>1)
            ret.push('b=beg;e=mid;for(e--;b<e;b++,e--){t=_s[b];_s[b]=_s[e];_s[e]=t;}\n');
          if(del[0]!=OP_PUSH||del[1]!=1)
            ret.push('b=mid;e=end;for(e--;b<e;b++,e--){t=_s[b];_s[b]=_s[e];_s[e]=t;}\n');
          ret.push('b=beg;e=end;for(e--;b<e;b++,e--){t=_s[b];_s[b]=_s[e];_s[e]=t;}\n');
          opt.opepush([OP_CODE,ret.join('')]);
        };
        ns.systemdict.data.exch.__optimize2__=function(opt){
          var b=opt.stkpop();
          var a=opt.stkpop();
          opt.stkpush(b);
          opt.stkpush(a);
        };
        ns.systemdict.data.dup.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_EXPR&&!/^_v\d+$/.test(a[1])){
            // atom 以外の場合に、同じ計算を二回以上するのを防ぐ
            var vName='_v'+opt.iv++;
            opt.stk.push([OP_CODE,'var '+vName+'='+a[1]+';\n']);
            opt.stkpush([OP_EXPR,vName]);
            opt.stkpush([OP_EXPR,vName]);
          }else{
            opt.stkpush(a);
            opt.stkpush(a);
          }
        };
        ns.systemdict.data.pop.__optimize2__=function(opt){
          opt.stkpop();
        };
        ns.systemdict.data.index.__optimize2__=function(opt){
          var i=opt.stkpop();
          var index=i[1];
          if(i[0]==OP_PUSH){
            if(index<opt._s.length){
              var iS=opt._s.length-1-index;
              var w=opt._s[iS];
              
              // 共通部分式固定
              if(w[0]==OP_EXPR&&!/^_v\d+$/.test(w[1])){
                var vName='_v'+opt.iv++;
                opt.stk.push([OP_CODE,'var '+vName+'='+w[1]+';\n']);
                var w=[OP_EXPR,vName];
                opt._s[iS]=w;
              }
              
              opt.stkpush(w);
            }else{
              //opt.opepush([OP_CODE,'var _v'+opt.iv+'=_s[_s.length-'+(1+index)+'];\n']);
              opt.stk.push([OP_CODE,'var _v'+opt.iv+'=_s[_s.length-('+(1+index-opt._s.length)+')];\n']);
              opt.stkpush([OP_EXPR,'_v'+opt.iv++]);
            }
          }else{
            opt.opepush([OP_CODE,'var _v'+opt.iv+'=_s[_s.length-1-'+index+'];\n']);
            opt.stkpush([OP_EXPR,'_v'+opt.iv++]);
          }
        };
        //*
        ns.systemdict.data.copy.__optimize2__=function(opt){
          var c=opt.stkpop();
          if(c[0]==OP_PUSH){
            var count=0^c[1];
            if(count<=opt._s.length){
              var _s=opt._s;
              for(var i=_s.length-count,iN=_s.length;i<iN;i++){
                w=_s[i];
                
                // 共通部分式固定
                if(w[0]==OP_EXPR&&!/^_v\d+$/.test(w[1])){
                  var vName='_v'+opt.iv++;
                  opt.stk.push([OP_CODE,'var '+vName+'='+w[1]+';\n']);
                  var w=[OP_EXPR,vName];
                  _s[i]=w;
                }
                
                _s.push(w);
              }
            }else{
              opt.opepush([
                OP_CODE,
                'for(var i=_s.length-'+count+',iN=_s.length;i<iN;i++)_s.push(_s[i]);\n'
              ]);
            }
          }else{
            opt.opepush([
              OP_CODE,
              'for(var i=_s.length-'+c[1]+',iN=_s.length;i<iN;i++)stk.push(stk[i]);\n'
            ]);
          }
        };
        //++++++++++++++++++++++++++++++++++++++++++++++++++++
        //  制御
        //----------------------------------------------------
        function write_array_execution(opt,ret,w,errloc){
          if(w[0]==OP_PUSH){
            if(w[1] instanceof ns.PsArray&&w[1].__xaccess__){
              ret.push('var f=_a[',opt.args.length,'];');opt.args.push(w[1]);
              ret.push('if(f.__funcver__!=f.data.ver)f.compile_function(proc);');
              ret.push('f.__function__(proc,f.__funcargs__);');
              ret.push('if(proc.m_stop)return;\n');
            }else{
              opt.proc.onerror('typecheck',errloc+": a procedure is expected");
              ret.push('this.m_stop="stop";return;\n');
              return;
            }
          }else{
            var ret=[];
            ret.push('var f=',w[1],';\n');
            ret.push('if(!(f instanceof ns.PsArray)||!f.__xaccess__){');
            ret.push('  proc.onerror("typecheck","'+errloc+': a procedure is expected");');
            ret.push('  return;');
            ret.push('}\n');
            ret.push('if(f.__funcver__!=f.data.ver)f.compile_function(proc);');
            ret.push('f.__function__(proc,f.__funcargs__);');
            ret.push('if(proc.m_stop)return;\n');
          }
        }
        ns.systemdict.data.ifelse.__optimize2__=function(opt){
          var f=opt.stkpop();
          var t=opt.stkpop();
          var c=opt.stkpop();
          
          var ret=[];
          if(c[0]==OP_PUSH){
            // 分岐確定
            write_array_execution(opt,ret,c[1]?t:f,"operand"+(c[1]?2:3)+"/3");
          }else{
            ret.push('if(',c[1],'){');
            write_array_execution(opt,ret,t,"operand2/3");
            ret.push('}else{');
            write_array_execution(opt,ret,f,"operand3/3");
            ret.push('}');
          }
          opt.opepush([OP_CODE,ret.join('')]);
        };
        ns.systemdict.data['if'].__optimize2__=function(opt){
          var e=opt.stkpop();
          var c=opt.stkpop();
          
          var ret=[];
          if(c[0]==OP_PUSH){
            if(!c[1])return;
            write_array_execution(opt,ret,e,"operand2/2");
          }else{
            ret.push('if(',c[1],'){');
            write_array_execution(opt,ret,e,"operand2/2");
            ret.push('}');
          }
          opt.opepush([OP_CODE,ret.join('')]);
        };
        //----------------------------------------------------
        // チェック項目
        // ・[OP_EXPR,...] で、評価時刻に依存する式を入れていないか
        // ・
      }
    });
  })();
