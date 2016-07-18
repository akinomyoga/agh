agh.scripts.register("agh.lang.ps.js",["agh.js","agh.text.js","agh.class.js"],function(){
  agh.Namespace("PostScript",agh);
  var ns=agh.PostScript;
  var nsName='agh.PostScript';

  var MARK_PROC_BEGIN={__xaccess__:true,toString:function(){return '--{--';}};
  var MARK_PROC_END={__xaccess__:true,toString:function(){return '--}--';}};

  //----------------------------------------------------------------------------
  //	オブジェクト
  //----------------------------------------------------------------------------
  var to_ps=function(obj){
    if(obj==null){
      return null;
    }else if(agh.is(obj,Function)){
      var name=obj.ps_name;
      if(!name){
        name=obj.get_name();
        if(name=='')
          name='<anonymous operator>';
        else if(/^ps_/.test(name))
          name=name.slice(3);
      }
      return "--"+name+"--";
    }else if(agh.is(obj.toPs,Function)){
      return obj.toPs();
    }else{
      return ""+obj;
    }
  };
  //----------------------------------------------------------------------------
  ns.PsArray=function(len){
    if(agh.is(len,Array)){
      this.data=len;
      this.length=this.data.length;
    }else{
      this.length=parseInt(len);
      this.data=[];
      for(var i=0;i<len;i++)this.data[i]=ns.PsNull.instance;
    }
    this.offset=0;
    if(this.data.ver==null)this.data.ver=0;
  };
  agh.memcpy(ns.PsArray.prototype,{
    __raccess__:true,
    __waccess__:true,
    __xaccess__:false,
    __packed__:false,
    __funcver__:-1,
    __psget__:function(proc,key){
      var index=parseInt(key);
      if(isNaN(index)||index<0||this.length<=index){
        proc.onerror("rangeerror","array="+this+", key="+key);
        return null;
      }

      return this.data[this.offset+index];
    },
    __psput__:function(proc,key,val){
      if(!this.__waccess__){
        proc.onerror("invalidaccess","!__waccess__");
        return;
      }

      var index=parseInt(key);
      if(isNaN(index)||index<0||this.length<=index){
        proc.onerror("rangeerror","array="+this+", key="+key);
        return;
      }

      //proc.onerror("debug","key="+index+", val="+val);
      this.data[this.offset+index]=val;
      /*
        log(parseInt("--"));
        log(isNaN(parseInt("hello")));
      //*/
    },
    toString:function(){
      return '--<array:'+this.length+'>--';
    },
    toPs:function(){
      var ret=[this.__xaccess__?'{':'['];
      for(var i=0;i<this.length;i++){
        ret.push(to_ps(this.data[this.offset+i]));
      }
      ret.push(this.__xaccess__?'}':']');
      return ret.join(' ');
    },
    //--------------------------------------------------------------------------
    compile_function:function(proc){
      return new ns.Optimizer2(proc).compile_function(this);
    },
    execute_function:function(proc){
      if(this.__funcver__!=this.data.ver)
        this.compile_function(proc);
      this.__function__(proc,this.__funcargs__);
    },
    update_function:function(proc){
      if(this.__funcver__!=this.data.ver)
        this.compile_function(proc);
    }
  });
  //----------------------------------------------------------------------------
  ns.PsName=function(name){
    this.name=name;
    this.__xaccess__=false;
    this.__imediate__=false;
  };
  agh.memcpy(ns.PsName.prototype,{
    toString:function(){
      return this.name;
    },
    toPs:function(){
      if(this.__xaccess__)
        return this.name;
      else
        return '/'+this.name;
    }
  });
  ns.PsName.CreateExecutable=function(name){
    var ret=new ns.PsName(name);
    ret.__xaccess__=true;
    return ret;
  };
  //----------------------------------------------------------------------------
  ns.PsNull=function(){
    this.__xaccess__=false;
  };
  ns.PsNull.instance=new ns.PsNull();
  ns.PsNull.executable=new ns.PsNull();
  ns.PsNull.executable.__xaccess__=true;
  agh.memcpy(ns.PsNull.prototype,{
    toString:function(){return "--<null>--";},
    toPs:function(){return "null";}
  });
  //----------------------------------------------------------------------------
  ns.PsMark=function(){};
  ns.PsMark.instance=new ns.PsMark();
  agh.memcpy(ns.PsMark.prototype,{
    toString:function(){return "--<mark>--";},
    toPs:function(){return "mark";}
  });
  //----------------------------------------------------------------------------
  ns.PsComment=function(text){
    this.text=text;
  };
  //----------------------------------------------------------------------------
  ns.PsString=function PsString(text){
    if(agh.is(text,Array)){
      this.data=text;
    }else{
      this.data=text.toString().toCharArray();
    }
    this.offset=0;
    this.length=text.length;
  };
  agh.memcpy(ns.PsString.prototype,{
    __raccess__:true,
    __waccess__:true,
    __xaccess__:false,
    __psget__:function(proc,key){
      var index=parseInt(key);
      if(isNaN(index)||index<0||this.length<=index){
        proc.onerror("rangeerror","string="+this+", key="+key);
        return null;
      }

      return this.data[this.offset+index];
    },
    __psput__:function(proc,key,val){
      var index=parseInt(key);
      if(isNaN(index)||index<0||this.length<=index){
        proc.onerror("rangeerror","string="+this+", key="+key);
        return;
      }

      var value=parseInt(val);
      if(isNaN(value)){
        proc.onerror("typecheck","operand 3/3 must be integer. value="+val);
        return;
      }

      this.data[this.offset+index]=value;
    },
    toString:function(){
      return String.fromCharArray(this.data).substr(this.offset,this.length);
    },
    toPs:function(){
      return '('+this.toString().replace(/([\(\)])/g,"\\$1")+')';
    }
  });
  //----------------------------------------------------------------------------
  ns.PsDict=function(len){
    this.data={};
    this.length=0;
  };
  agh.memcpy(ns.PsDict.prototype,{
    __waccess__:true,
    __raccess__:true,
    __psget__:function(proc,key){
      key=""+key;
      if(!(key in this.data)){
        proc.onerror("undefined","dict="+this+", key="+key);
        return null;
      }

      return this.data[key];
    },
    __psput__:function(proc,key,val){
      if(!this.__waccess__){
        proc.onerror('invalidaccess',"this dictionary has no waccess.");
        return;
      }

      key=""+key;
      // dictionary は agh.wrap 元は更新しないという想定の下
      if(!(key in this.data))this.length++;

      this.data[key]=val;
    },
    undef:function(proc,key){
      if(!this.__waccess__){
        proc.onerror('invalidaccess',"this dictionary has no waccess.");
        return;
      }

      key=""+key;
      if(key in this.data){
        delete this.data[key];
        this.length--;
      }
    },
    toString:function(){
      return '--<dict:'+this.length+'/'+this.length+'>--';
    },
    toPs:function(){
      return '--<dict:'+this.length+'/'+this.length+'>--';
    },
    toPs2:function(){
      var ret=[];
      ret.push('<<');
      for(var key in this.data){
        var value=this.data[key];
        ret.push('/'+key);
        // ret.push(to_ps(value));
        ret.push(value instanceof ns.PsDict?value.toPs2():to_ps(value));
      }
      ret.push('>>');
      return ret.join(' ');
    },
    update_length:function(){
      /// <summary>
      /// __psput__ を介さずにメンバを追加した場合に呼び出します。
      /// </summary>

      // dictionary は実行中に agh.wrap しないという想定の下
      this.length=agh.ownkeys(this.data).length;
      /*
        var o={a:1,b:2};
        log(o.length);
        log(agh.ownkeys);
        log(agh.ownkeys(o).length);
        log(agh.ownkeys(agh.wrap(o)).length);
        log(agh.keys(o).length);
        log(agh.keys(agh.wrap(o)).length);
      //*/
    },
    clear:function(){
      this.data={};
      this.length=0;
    }
  });
  //----------------------------------------------------------------------------
  ns.PsSave=function(proc){
    this.proc=proc;
    this.gsnap=proc.graphics.save_graphics();
  };
  agh.memcpy(ns.PsSave.prototype,{
    restore:function(proc){
      // check
      if(this.proc==null){
        proc.onerror("invalidrestore","the specified snapshot is already used and disposed.");
        return;
      }
      if(this.proc!=proc){
        proc.onerror("invalidrestore","fatal: the specified snapshot is that of different Processor.");
        return;
      }

      proc.graphics.restore_graphics(this.gsnap);
      this.proc=null;
    },
    toString:function(){
      return '--<save>--';
    },
    toPs:function(){
      return '--<save>--';
    }
  });
  //----------------------------------------------------------------------------
  //	systemdict / NameLookup
  //----------------------------------------------------------------------------
  ns.systemdict=new ns.PsDict();
  ns.systemdict.__waccess__=false;
  ns.systemdict.data.systemdict=ns.systemdict;
  ns.systemdict.register_operator=function(name,func,optimize2){
    ns.systemdict.data[name]=func;
    func.ps_name=name;
    if(optimize2 instanceof Function)
      func.__optimize2__=optimize2;
  };
  // ns.systemdict.define_operators=function(defs){
  //   var keys=agh.ownkeys(defs);
  //   for(var i=0,iN=keys;i<iN;i++){
  //     var ent=defs[keys[i]];
  //     //@@2013-11-06@ operator, __optimize2__ 等を一箇所で定義したい。
  //   }
  // };
  //----------------------------------------------------------------------------
  ns.Scope=function(){
    this.dicts=[];
    this.userdict=new ns.PsDict();
    this.globaldict=new ns.PsDict();
    this.systemdict=new ns.PsDict();

    this.systemdict.data=agh.wrap(ns.systemdict.data,{
      userdict:this.userdict,
      globaldict:this.globaldict
    });
    this.systemdict.length=ns.systemdict.length+2;
    this.push_dict(this.globaldict);
    this.push_dict(this.userdict);
  };
  agh.memcpy(ns.Scope.prototype,{
    get_val:function(proc,key){
      for(var i=this.dicts.length-1;i>=0;i--){
        var d=this.dicts[i].data;
        if(key in d)return d[key];
      }
      /*
      return this.systemdict.__psget__(proc,key);
      /*/
      if(key in this.systemdict.data)
        return this.systemdict.data[key];

      proc.onerror("undefined","key="+key+" @ dictstack");
      return null;
      //*/
    },
    set_val:function(proc,key,value){
      this.dicts[this.dicts.length-1].__psput__(proc,key,value);
    },
    where:function(key){
      for(var i=this.dicts.length-1;i>=0;i--){
        var d=this.dicts[i];
        if(key in d.data)return d;
      }
      if(key in this.systemdict.data)
        return this.systemdict;
      return null;
    },
    push_dict:function(dict){
      this.dicts.push(dict);
    },
    pop_dict:function(proc){
      if(this.dicts.length<=2){
        proc.onerror("dictstackunderflow");
        return;
      }
      return this.dicts.pop();
    },
    top_dict:function(){
      return this.dicts[this.dicts.length-1];
    },
    clear_dict:function(){
      this.dicts.length=2;
    },
    TryGetValue:function(proc,key){
      for(var i=this.dicts.length-1;i>=0;i--){
        var d=this.dicts[i].data;
        if(key in d)return d[key];
      }
      if(key in this.systemdict.data)
        return this.systemdict.data[key];
      return null;
    }
  });
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
        ns.systemdict.data.add.__optimize1__=function(opt){
          var c=opt.countpush();
          if(c>=2){
            var b=opt.stkp.pop()[1];
            var a=opt.stkp.pop()[1];
            opt.stkp.push([OP_PUSH,a+b]);
          }else if(c==1){
            var b=opt.stkp.pop()[1];
            opt.opepush([OP_CODE,"_s[_s.length-1]+="+b+";\n"]);
          }else{
            opt.opepush([OP_FUNC,this]);
          }
        };
        ns.systemdict.data.sub.__optimize1__=function(opt){
          var c=opt.countpush();
          if(c>=2){
            var b=opt.stkp.pop()[1];
            var a=opt.stkp.pop()[1];
            opt.stkp.push([OP_PUSH,a-b]);
          }else if(c==1){
            var b=opt.stkp.pop()[1];
            opt.opepush([OP_CODE,"_s[_s.length-1]-="+b+";\n"]);
          }else{
            opt.opepush([OP_FUNC,this]);
          }
        };
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
        ns.systemdict.data.div.__optimize1__=function(opt){
          var c=opt.countpush();
          if(c>=2){
            var b=opt.stkp.pop()[1];
            var a=opt.stkp.pop()[1];
            opt.stkp.push([OP_PUSH,a/b]);
          }else if(c==1){
            var b=opt.stkp.pop()[1];
            opt.opepush([OP_CODE,"_s[_s.length-1]/="+b+";\n"]);
          }else{
            opt.opepush([OP_FUNC,this]);
          }
        };
        ns.systemdict.data.mod.__optimize1__=function(opt){
          var c=opt.countpush();
          if(c>=2){
            var b=opt.stkp.pop()[1];
            var a=opt.stkp.pop()[1];
            opt.stkp.push([OP_PUSH,a%b]);
          }else if(c==1){
            var b=opt.stkp.pop()[1];
            opt.opepush([OP_CODE,"_s[_s.length-1]%="+b+";\n"]);
          }else{
            opt.opepush([OP_FUNC,this]);
          }
        };
        ns.systemdict.data.neg.__optimize1__=function(opt){
          var c=opt.countpush();
          if(c>=1){
            var a=opt.stkp.pop()[1];
            opt.stkp.push([OP_PUSH,-a]);
          }else{
            opt.opepush([OP_FUNC,this]);
          }
        };
        ns.systemdict.data.abs.__optimize1__=function(opt){
          var c=opt.countpush();
          if(c>=1){
            var a=opt.stkp.pop()[1];
            opt.stkp.push([OP_PUSH,Math.abs(a)]);
          }else{
            opt.opepush([OP_FUNC,this]);
          }
        };

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
        ns.systemdict.data.add.__optimize2__=function(opt){
          var b=opt.stkpop();
          var a=opt.stkpop();
          if(a[0]==OP_PUSH&&b[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,a[1]+b[1]]);
          }else{
            opt.stkpush([OP_EXPR,'('+a[1]+'+'+b[1]+')']);
          }
        };
        ns.systemdict.data.sub.__optimize2__=function(opt){
          var b=opt.stkpop();
          var a=opt.stkpop();
          if(a[0]==OP_PUSH&&b[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,a[1]-b[1]]);
          }else{
            opt.stkpush([OP_EXPR,'('+a[1]+'-'+b[1]+')']);
          }
        };
        ns.systemdict.data.mul.__optimize2__=function(opt){
          var b=opt.stkpop();
          var a=opt.stkpop();
          if(a[0]==OP_PUSH&&b[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,a[1]*b[1]]);
          }else{
            opt.stkpush([OP_EXPR,'('+a[1]+'*'+b[1]+')']);
          }
        };
        ns.systemdict.data.div.__optimize2__=function(opt){
          var b=opt.stkpop();
          var a=opt.stkpop();
          if(a[0]==OP_PUSH&&b[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,a[1]/b[1]]);
          }else{
            opt.stkpush([OP_EXPR,'('+a[1]+'/'+b[1]+')']);
          }
        };
        ns.systemdict.data.mod.__optimize2__=function(opt){
          var b=opt.stkpop();
          var a=opt.stkpop();
          if(a[0]==OP_PUSH&&b[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,a[1]%b[1]]);
          }else{
            opt.stkpush([OP_EXPR,'('+a[1]+'%'+b[1]+')']);
          }
        };
        ns.systemdict.data.neg.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
            opt.stkpush([OP_PUSH,(-a[1])]);
          else
            opt.stkpush([OP_EXPR,'(-'+a[1]+')']);
        };
        ns.systemdict.data.abs.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
            opt.stkpush([OP_PUSH,Math.abs(a[1])]);
          else
            opt.stkpush([OP_EXPR,'Math.abs('+a[1]+')']);
        };
        ns.systemdict.data.sqrt.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
            opt.stkpush([OP_PUSH,Math.sqrt(a[1])]);
          else
            opt.stkpush([OP_EXPR,'Math.sqrt('+a[1]+')']);
        };
        ns.systemdict.data.truncate.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
            opt.stkpush([OP_PUSH,(0|a[1])]);
          else
            opt.stkpush([OP_EXPR,'(0|'+a[1]+')']);
        };
        ns.systemdict.data.floor.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
            opt.stkpush([OP_PUSH,Math.floor(a[1])]);
          else
            opt.stkpush([OP_EXPR,'Math.floor('+a[1]+')']);
        };
        ns.systemdict.data.ceiling.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
            opt.stkpush([OP_PUSH,Math.ceil(a[1])]);
          else
            opt.stkpush([OP_EXPR,'Math.ceil('+a[1]+')']);
        };
        ns.systemdict.data.round.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
            opt.stkpush([OP_PUSH,Math.floor(0.5+a[1])]);
          else
            opt.stkpush([OP_EXPR,'Math.floor(0.5+'+a[1]+')']);
        };
        ns.systemdict.data.cvr.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
            opt.stkpush([OP_PUSH,parseFloat(a[1])]);
          else
            opt.stkpush([OP_EXPR,'parseFloat('+a[1]+')']);
        };
        ns.systemdict.data.cvi.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
            opt.stkpush([OP_PUSH,(0|parseFloat(a[1]))]);
          else
            opt.stkpush([OP_EXPR,'(0|parseFloat('+a[1]+'))']);
        };
        ns.systemdict.data.ln.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
            opt.stkpush([OP_PUSH,Math.log(a[1])]);
          else
            opt.stkpush([OP_EXPR,'Math.log('+a[1]+')']);
        };
        ns.systemdict.data.log.__optimize2__=function(opt){
          var a=opt.stkpop();
          if(a[0]==OP_PUSH)
            opt.stkpush([OP_PUSH,Math.LOG10E*Math.log(a[1])]);
          else
            opt.stkpush([OP_EXPR,'Math.LOG10E*Math.log('+a[1]+')']);
        };
//*/
//#%expand agh::cmd.r|cmd|atan|    .r|expr|Math.atan(DEG2RAD*_X)|
//#%expand agh::cmd.r|cmd|sin|     .r|expr|Math.sin(DEG2RAD*_X)|
//#%expand agh::cmd.r|cmd|cos|     .r|expr|Math.cos(DEG2RAD*_X)|
        ns.systemdict.data.exp.__optimize2__=function(opt){
          var b=opt.stkpop();
          var a=opt.stkpop();
          if(a[0]==OP_PUSH&&b[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,Math.pow(a[1],b[1])]);
          }else{
            opt.stkpush([OP_EXPR,'Math.pow('+a[1]+','+b[1]+')']);
          }
        };
        //++++++++++++++++++++++++++++++++++++++++++++++++++
        // 比較
        //--------------------------------------------------
        ns.systemdict.data.gt.__optimize2__=function(opt){
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
        ns.systemdict.data.ge.__optimize2__=function(opt){
          var wb=opt.stkpop();
          var wa=opt.stkpop();
          if(wa[0]==OP_PUSH&&wb[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,ns.ps_compare(wa[1],wb[1]) >= 0]);
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
              opt.stkpush([OP_EXPR,'('+a+'>='+b+')']);
            else
              opt.stkpush([OP_EXPR,'_a.ns.ps_compare('+a+','+b+')>=0']);
          }
        };
        ns.systemdict.data.lt.__optimize2__=function(opt){
          var wb=opt.stkpop();
          var wa=opt.stkpop();
          if(wa[0]==OP_PUSH&&wb[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,ns.ps_compare(wa[1],wb[1]) < 0]);
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
              opt.stkpush([OP_EXPR,'('+a+'<'+b+')']);
            else
              opt.stkpush([OP_EXPR,'_a.ns.ps_compare('+a+','+b+')<0']);
          }
        };
        ns.systemdict.data.le.__optimize2__=function(opt){
          var wb=opt.stkpop();
          var wa=opt.stkpop();
          if(wa[0]==OP_PUSH&&wb[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,ns.ps_compare(wa[1],wb[1]) <= 0]);
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
              opt.stkpush([OP_EXPR,'('+a+'<='+b+')']);
            else
              opt.stkpush([OP_EXPR,'_a.ns.ps_compare('+a+','+b+')<=0']);
          }
        };
        ns.systemdict.data.eq.__optimize2__=function(opt){
          var wb=opt.stkpop();
          var wa=opt.stkpop();
          if(wa[0]==OP_PUSH&&wb[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,ns.ps_compare(wa[1],wb[1]) == 0]);
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
              opt.stkpush([OP_EXPR,'('+a+'=='+b+')']);
            else
              opt.stkpush([OP_EXPR,'_a.ns.ps_compare('+a+','+b+')==0']);
          }
        };
        ns.systemdict.data.ne.__optimize2__=function(opt){
          var wb=opt.stkpop();
          var wa=opt.stkpop();
          if(wa[0]==OP_PUSH&&wb[0]==OP_PUSH){
            opt.stkpush([OP_PUSH,ns.ps_compare(wa[1],wb[1]) != 0]);
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
              opt.stkpush([OP_EXPR,'('+a+'!='+b+')']);
            else
              opt.stkpush([OP_EXPR,'_a.ns.ps_compare('+a+','+b+')!=0']);
          }
        };
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
  agh.Namespace('Filters',ns);
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //	ファイル
  //----------------------------------------------------------------------------
  ns.PsFile=agh.Class(nsName+".PsFile",null,{
    name:'abstract',
    iC:1,
    iL:1,
    c:null,
    next:function(){return null;},
    close:function(){},
    getPositionDesc:function(){
      return this.name+':'+this.iL+'.'+this.iC;
    }
  });
  ns.PsStringFile=agh.Class(nsName+".PsStringFile",ns.PsFile,{
    constructor:function(name,text){
      this.base();
      if(arguments.length==2){
        this.name=name;
      }else if(arguments.length==1){
        this.name='noname';
        var text=name;
      }

      this.s=text;
      this.l=text.length;
      this.i=-1;
      this.next();
      this.iC=1;
    },
    next:function override(){
      if(++this.i<this.l){
        var fbr=this.c=='\n';
        var c=this.s.charAt(this.i);
        if(c=='\r'&&this.s.charAt(this.i+1)!='\n')c='\n';

        // 行・列番号
        if(fbr){
          this.iL++;
          this.iC=1;
        }else
          this.iC++;

        return this.c=c;
      }else
        return this.c=null;
    },
    close:function override(){
      this.i=text.length;
      this.c=null;
    },
    seek:function(index){
      this.i=index;
      return this.c=index<this.l?this.s.charAt(index):null;
    }
  });
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //	字句解析
  //----------------------------------------------------------------------------
  (function agh_lang_ps_initialize_scanners(){
    var reg_isspace=/[ \t\f\v\b\r\n]/;
    var reg_ispssym=/[^ \t\f\v\b\n\r\<\>\(\)\[\]\{\}\%\/]/;
    var reg_tot=(function(){
      var reg_comment=/\%[^\r\n]*(?:\r?\n|\r|$)/g;
      var reg_imed   =/\/\/[^\s\<\>\(\)\[\]\{\}\%\/]*/g;
      var reg_name   =/\/[^\s\<\>\(\)\[\]\{\}\%\/]*/g;
      var reg_exec   =/\<\<|\>\>|\[|\]/g;
      var reg_mark   =/[\(\)\{\}\<\>]/g;
      var reg_B      =/(?:(?=[\s\<\>\(\)\[\]\{\}\%\/])|$)/g
      var reg_int    =/[-+]?\d+B/g;
      var reg_flt    =/[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?B/g;
      var reg_hex    =/(\d+)\#([\da-zA-Z]+)B/g;
      var reg_tok    =/[^\s\<\>\(\)\[\]\{\}\%\/]+/g;
      var reg_space  =/\s*/g;
      return new RegExp(
        '({0})(({1})|({2})|({3})|({4})|({5})|({6}|{7})|({8})|({9})|\\S)'.format(
          reg_space.source,   // 0  1
          reg_comment.source, // 1  3
          reg_imed.source,    // 2  4
          reg_name.source,    // 3  5
          reg_exec.source,    // 4  6
          reg_mark.source,    // 5  7
          reg_int.source,     // 6  8
          reg_flt.source,     // 7  8
          reg_hex.source,     // 8  9
          reg_tok.source      // 9 12
/*

*/
        ).replace(/B/g,reg_B.source),
        'g'
      );
    })();

    ns.ScannerF=function(file,parent){
      if(agh.is(file,String))
        this.file=new ns.PsStringFile(file);
      else
        this.file=file;

      if(parent!=null)
        this.errstream=function(text){
          parent.errstream(text);
        };

      if(this.file instanceof ns.PsStringFile)
        this.next=this.next4strfile;
    };
    agh.memcpy(ns.ScannerF.prototype,{
      onerror:function(msg){
        this.errstream("("+this.file.name+":"+this.file.iL+"."+this.file.iC+"): "+msg);
      },
      errstream:function(){},
      //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
      next:function(){
        var c=this.file.c;
        // skip whitespaces
        while(c!=null&&reg_isspace.test(c))c=this.file.next();

        this.word='';
        var w_iC=this.file.iC;
        var w_iL=this.file.iL;

        if(c==null){
          return null;
        //-------------------------------------------
        //  Comment
        }else if(c=='%'){
          c=this.file.next();
          while(c!=null&&c!='\n'&&c!='\r'){
            this.word+=c;
            c=this.file.next();
          }
          this.word=new ns.PsComment(this.word);
        //-------------------------------------------
        //  Name
        }else if(c=='/'){
          c=this.file.next();
          var imediate=c=='/';
          if(imediate)
            c=this.file.next();

          while(c!=null&&reg_ispssym.test(c)){
            this.word+=c;
            c=this.file.next();
          }

          this.word=new ns.PsName(this.word);
          if(imediate){
            this.word.__xaccess__=true;
            this.word.__imediate__=true;
          }
        //-------------------------------------------
        //  String
        }else if(c=='('){
          this.file.next();
          this.read_string();
          this.word=new ns.PsString(this.word);
        //-------------------------------------------
        //  Marks
        }else if(c=='{'){
          this.word=MARK_PROC_BEGIN;
          this.file.next();
        }else if(c=='}'){
          this.word=MARK_PROC_END;
          this.file.next();
        }else if(c=='['||c==']'){
          this.word=new ns.PsName(c);
          this.word.__xaccess__=true;
          this.file.next();
        }else if(c=='<'){
          c=this.file.next();
          if(c=='<'){
            this.word=new ns.PsName('<<');
            this.word.__xaccess__=true;
            this.file.next();
          }else if(c=='~'){
            this.onerror("notimplemented: ascii85encoding");
            this.word=new ns.PsString('');
          }else{
            this.read_hexstring();
            this.word=new ns.PsString(this.word);
          }
        }else if(c=='>'){
          this.word=c;
          if(this.file.next()=='>'){
            this.file.next();
            this.word+='>';
          }
          this.word=new ns.PsName(this.word);
          this.word.__xaccess__=true;
        //-------------------------------------------
        //  Tokens
        }else{
          //window.log('dbg: c="'+c+'"');
          while(c!=null&&reg_ispssym.test(c)){
            this.word+=c;
            c=this.file.next();
          }
          //window.log('dbg: token='+this.word);
          //window.log('dbg: c="'+c+'"');
          var m=null;
          if(/^[-+]?\d+$/.test(this.word)){
            this.word=parseInt(this.word);
          }else if(/^[-+]?(\d+(?:\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(this.word)){
            // 符号: [+-]?
            // 数値:  \d+|\d+.|\d+.\d+|.\d+
            // 指数部: [eE][+-]?\d+
            this.word=parseFloat(this.word);
          }else if(m=/^(\d+)\#([\da-zA-Z]+)$/.exec(this.word)){
            this.word=parseInt(m[2],parseInt(m[1]));
          }else{
            this.word=new ns.PsName(this.word);
            this.word.__xaccess__=true;
          }
        }

        this.word.file =this.file.name;
        this.word.iL=w_iL;
        this.word.iC =w_iC;
        return this.word;
      },
      //----------------------------------------------------
      //  文字列読み取り関数
      read_string:function(){
        // assume(this.file.c == "the character next to the (");
        var c=this.file.c;
        var lv=0;
        while(c!=null){
          if(c=='\\'){
            c=this.file.next();
            if(c==null){
              this.word+='\\';
              c=this.file.next();
              return;
            }else if(/[0-7]/.test(c)){
              this.word+=String.fromCharCode(this.read_string_octal3());
              c=this.file.c;
            }else if(/[nrtbf\n]/.test(c)){
              this.word+={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','\n':''}[c];
              c=this.file.next();
            }else{
              this.word+=c;
              c=this.file.next();
            }
          }else{
            if(c=='('){
              lv++;
            }else if(c==')'){
              if(lv--==0){
                c=this.file.next();
                return;
              }
            }

            this.word+=c;
            c=this.file.next();
          }
        }
      },
      read_string_octal3:function(){
        var c=this.file.c;
        var code=0;
        for(var digit=0;digit<3;digit++){
          if(c==null||!/[0-7]/.test(c))break;
          code=code*8+parseInt(c);//this.c.charCodeAt(0)-this.CHARCODE_0;
          c=this.file.next();
        }
        return code;
      },
      read_hexstring:function(){
        var lead=null;
        var c=this.file.c;

        while(true){
          if(c==null){
            this.onerror("syntaxerror: unexpected EOF in a hexadecimal-string literal.");
            c='>';
          }else if(c=='>'){
            if(lead!=null)
              this.word+=String.fromCharCode(parseInt(lead,16))*4; // '0x[lead]0'
            this.file.next();
            return;
          }else if(/[\da-fA-F]/.test(c)){
            if(lead==null){
              lead=c;
            }else{
              this.word+=String.fromCharCode(parseInt(lead+c,16)); // '0x[lead][c]'
              lead=null;
            }
            c=this.file.next();
          }else if(/\s/.test(c)){
            c=this.file.next();
          }else{
            this.onerror("syntaxerror: invalid character '"+c+"' in hexadecimal string.");
            c=this.file.next();
          }
        }
      },
      //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
      next4strfile:function(){
        var m;
        if(this.file.i<this.file.l&&(reg_tot.lastIndex=this.file.i,m=reg_tot.exec(this.file.s))){
          //---------------------------
          // this.file.iC/iL 更新
          var s=m[1];
          for(var i=0;i<s.length;i++){
            var c=s.charAt(i);
            if(c=='\r'){
              c='\n';
              if(s.charAt(i+1)=='\n')i++;
            }

            if(c=='\n'){
              this.file.iL++;
              this.file.iC=1;
            }else{
              this.file.iC++;
            }
          }

          var iC=this.file.iC;
          var iL=this.file.iL;
          this.file.iC+=m[2].length;
          this.file.i=reg_tot.lastIndex;

          //---------------------------
          // 分類
          if(m[8]){
            this.word=parseFloat(m[8]);
          }else if(m[12]){
            this.word=new ns.PsName(m[12]);
            this.word.__xaccess__=true;
          }else if(m[5]){
            this.word=new ns.PsName(m[5].slice(1));
          }else if(m[9]){
            this.word=parseInt(m[11],parseInt(m[10]));
          }else if(m[6]){ // << >> [ ]
            this.word=new ns.PsName(m[6]);
            this.word.__xaccess__=true;
          }else if(m[4]){
            this.word=new ns.PsName(m[4].slice(2));
            this.word.__xaccess__=true;
            this.word.__imediate__=true;
          }else if(m[7]){
            var c=this.file.seek(this.file.i);
            switch(m[7]){
              case '{':
                this.word=MARK_PROC_BEGIN;
                break;
              case '}':
                this.word=MARK_PROC_END;
                break;
              case '(':
                this.word='';
                this.read_string();
                this.word=new ns.PsString(this.word);
                break;
              case '<':
                if(c=='~'){
                  this.onerror("notimplemented: ascii85encoding");
                  this.word=new ns.PsString('');
                }else{
                  this.word='';
                  this.read_hexstring();
                  this.word=new ns.PsString(this.word);
                }
                break;
              case '>':
              case ')':
                this.onerror("syntaxerror: no corresponding open paren for '"+m[7]+"'");
                break;
            }
          }else if(m[3]){
            this.word=new ns.PsComment(m[3].slice(1));
            this.file.iL++;
            this.file.iC=1;
          }else{
            // 必ず 13 で引っかかる筈…
            this.word=new ns.PsComment('%Error: Fatal error in agh.PostScript.ScannerF');
            this.onerror("fatalerror: an invalid character in agh.PostScript.ScannerF");
          }
          //---------------------------
          // 単語位置情報
          this.word.file=this.file.name;
          this.word.iL=iL;
          this.word.iC=iC;
          return this.word;
        }else
          return null;
      }
      //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    });
  })();
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //	Eexec Decryption
  //----------------------------------------------------------------------------
  (function(){
    var MAX_COL=80;
    var N=4;
    var C1=52845;
    var C2=22719;
    ns.Filters.EExecDecode=function EExecDecode(data){
      var o=[];
      var r =55665;
      var n=0;
      var i=0;while(/\s/.test(data.charAt(i)))i++;
      if(/[\da-fA-F]/.test(data.slice(i,N))){
        // hexadecimal
        for(;i<data.length;){
          var cL,cR;
          while(i<data.length&&!/[\da-fA-F]/.test(cL=data.charAt(i++)));
          while(i<data.length&&!/[\da-fA-F]/.test(cR=data.charAt(i++)));
          var b1=parseInt(cL+cR,16);
          var b2=b1^r>>8;
          r=(b1+r)*C1+C2&0xFFFF;
          if(n++>=N)o.push(String.fromCharCode(b2));
        }
      }else{
        // binary
        for(;i<data.length;i++){
          var b1=data.charCodeAt(i)&0xFF;
          var b2=b1^r>>8;
          r=(b1+r)*C1+C2&0xFFFF;
          if(n++>=N)o.push(String.fromCharCode(b2));
        }
      }
      return o.join('');
    };
    ns.Filters.EExecDecoder=agh.Class(nsName+'.Filters.EExecDecoder',ns.PsFile,{
      r :55665,
      fCLOSE:false,
      constructor:function(file){
        this.base();
        if(file instanceof ns.PsFile){
          while(/\s/.test(file.c))file.next();
          this.src=file;
          this.name=file.getPositionDesc()+"|eexec";
          this.initialize();
        }else if(file instanceof ns.PsString){
          var str=file;
          var src=ns.Filters.EExecFilter(file.toString());
          var ret=new ns.PsStringFilter(src);
          ret.name=(str.file?'string.'+str.file+":"+str.iL+"."+str.iC:'string')+"|eexec";
          return ret;
        }
      },
      initialize:function(){
        var f=this.src;

        // peak head fourcc
        var h=f.c;
        for(var i=1;i<N;i++)h+=f.next();
        var i=0,c;
        function next_ch(){
          c=i<N?h.charAt(i++):f.next();
        }
        next_ch();
        //window.log('dbg: head='+h);

        if(/[\da-fA-F]/.test(h)){
          // hexadecimal
          this.nextc=this.nextc_hex;

          // N+1 文字目に移動
          for(var n=0;n<N+1;n++){
            var cL,cR;
            while(c!=null&&!/[\da-fA-F]/.test(c))next_ch();
            var cL=c;next_ch();
            while(c!=null&&!/[\da-fA-F]/.test(c))next_ch();
            var cR=c;next_ch();

            var b1=parseInt(cL+cR,16);
            var b2=b1^this.r>>8;
            this.r=(b1+this.r)*C1+C2&0xFFFF;
            this.c=String.fromCharCode(b2);
          }
        }else{
          // binary
          this.nextc=this.nextc_bin;

          for(var n=0;n<N+1;n++){
            var b1=c.charCodeAt(0)&0xFF;next_ch();
            var b2=b1^this.r>>8;
            this.r=(b1+this.r)*C1+C2&0xFFFF;
            this.c=String.fromCharCode(b2);
          }
        }
      },
      close:function override(){
        this.fCLOSE=true;
      },
      next:function override(){
        if(this.fCLOSE)return null;

        // 改行正規化
        if(this.c=='\n'){
          this.nextc();
          if(this.fCR&&this.c=='\n')this.nextc();
          this.iL++;
          this.iC=1;
        }else{
          this.nextc();
          this.iC++;
        }

        if(this.fCR=this.c=='\r')this.c='\n';
        return this.c;
      },
      nextc_hex:function(){
        var c=this.src.c;
        var cL,cR;
        while(c!=null&&!/[\da-fA-F]/.test(c))c=this.src.next();
        var cL=c;c=this.src.next();
        while(c!=null&&!/[\da-fA-F]/.test(c))c=this.src.next();
        var cR=c;c=this.src.next();
        if(cL!=null&&cR!=null){
          var b1=parseInt(cL+cR,16);
          var b2=b1^this.r>>8;
          this.r=(b1+this.r)*C1+C2&0xFFFF;
          this.c=String.fromCharCode(b2);
        }else{
          this.c=null;
        }
      },
      nextc_bin:function(){
        var c=this.src.c;
        if(c!=null){
          var b1=c.charCodeAt(0)&0xFF;this.src.next();
          var b2=b1^this.r>>8;
          this.r=(b1+this.r)*C1+C2&0xFFFF;
          this.c=String.fromCharCode(b2);
        }else{
          this.c=null;
        }
      }
    });
    ns.Filters.EExecEncode=function EExecEncode(data,fBIN){
      var o=[];
      var r=55665;
      var n=0;
      if(!fBIN){
        // random numbers
        for(var n=0;n<N;n++){
          var hex=(Math.random()*256&0xFF).toString(16);
          o.push(hex.length==1?'0'+hex:hex);
        }
        // hexadecimal encodings
        for(var i=0;i<data.length;){
          var bP=data.charCodeAt(i)&0xFF;
          var bC=bP^r>>8;
          r=(bC+r)*C1+C2&0xFFFF;
          var hex=bC.toString(16);
          o.push(hex.length==1?'0'+hex:hex);
          if(n++%MAX_COL==0)o.push('\n');
        }
      }else{
        // random numbers in [0x80,0xFF]
        for(var n=0;n<N;n++){
          var c=Math.random()*256&0xFF|0x80;
          o.push(String.fromCharCode(c));
        }
        // binary
        for(var i=0;i<data.length;i++){
          var bP=data.charCodeAt(i)&0xFF;
          var bC=bP^r>>8;
          r=(bC+r)*C1+C2&0xFFFF;
          o.push(String.fromCharCode(bC));
        }
      }
      return o.join('');
    };
    ns.Filters.ASCII85Encode=function ASCII85Encode(data){
      var o=[];var n=0;
      for(var i=0;i+3<data.length;i+=4){
        // read
        var t=0;
        for(var j=0;j<4;j++)
          t=t<<8|data.charCodeAt(i+j)&0xFF;

        // write
        if(t==0){
          o.push('z');
          if(n++%MAX_COL==0)o.push('\n');
        }else{
          var cc=[];
          for(var j=4;j>=0;cc[j--]=t%85,t=t/85^0);
          for(var j=0;j<5;j++){
            o.push(String.fromCharCode(33+c[j]));
            if(n++%MAX_COL==0)o.push('\n');
          }
        }
      }

      // 端
      {
        var r=data.length-i;
        var t=0;
        for(var j=0;j<r;j++)t=t<<8|data.charCodeAt(i+j)&0xFF;
        for(;j<4;j++)t<<=8;

        var cc=[];
        for(var j=4;j>=0;cc[j--]=t%85,t=t/85^0);
        for(var j=0;j<=r;j++){
          o.push(String.fromCharCode(33+c[j]));
          if(n++%MAX_COL==0)o.push('\n');
        }
      }

      o.push("~>");
      return o.join('');
    };
  })();

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
  //****************************************************************************
  //	Graphics
  //----------------------------------------------------------------------------
  var PATH_LINE =1;
  var PATH_CBEZ =2;
  var PATH_CLOSE=3;
  var PATH_CHAR =4;

  var LNCAP_BUTT=0;
  var LNCAP_ROUND=1;
  var LNCAP_SQUARE=2;

  var LNJOIN_MITER=0;
  var LNJOIN_ROUND=1;
  var LNJOIN_BEVEL=2;

  //----------------------------------------------------------------------------
  ns.color=function(r,g,b){
    if(arguments.length==3){
      this.r=this.norm_intensity(r);
      this.g=this.norm_intensity(g);
      this.b=this.norm_intensity(b);
    }
  };
  agh.memcpy(ns.color.prototype,{
    r:0,
    g:0,
    b:0,
    norm_intensity:function(value){
      if(value==null)return 0;
      value=parseFloat(value);
      if(value<0)return 0;
      if(value>1)return 1;
      return value;
    },
    intensity_hex:function(value){
      value=0|(value*255+0.5);

      // 例外値
      if(value<0)return '00';
      if(value>255)return 'FF';

      // 整形
      value=value.toString(16).toUpperCase();
      if(value.length==1)value='0'+value;
      return value;
    },
    toHtmlColor:function(){
      return '#'
        +this.intensity_hex(this.r)
        +this.intensity_hex(this.g)
        +this.intensity_hex(this.b);
    },
    toHSV:function(){
      var a=[this.r,this.g,this.b];

      var m=0,v=a[m];
      if(v<a[1])m=1,v=a[1];
      if(v<a[2])m=2,v=a[2];
      var t=a[(m+1)%3];
      var u=a[(m+2)%3];
      var d=v-Math.min(t,u);
      var s=d/v;
      var h=((t-u)/d+2*m)/6;

      return [h,s,v];
    },
    toCMYK:function(){
      var k=Math.min(Math.min(1-this.r,1-this.g),1-this.b);
      var ik=1-k;
      return [1-this.r/ik,1-this.g/ik,1-this.b/ik,k];
    },
    toGray:function(){
      var gr=this.r*0.299+this.g*0.587+this.b*0.114;
      // γ補正
      //gr=gr<0.018?gr*4.5:1.099*Math.pow(gr,0.45)-0.099;
      return gr;
    }
  });
  agh.memcpy(ns.color,{
    DeviceRGB:new ns.PsArray([new ns.PsName('DeviceRGB')]),
    DeviceGray:new ns.PsArray([new ns.PsName('DeviceGray')]),
    DeviceCMYK:new ns.PsArray([new ns.PsName('DeviceCMYK')]),
    fromHSV:function(h,s,v){
      h-=Math.floor(h);h*=6; // h in [0,6)
      var m=h>>1;
      var i=1^h&1;
      var a=[0,0,0];
      a[(m+i)%3]=Math.abs(2*m+1-h);
      a[(m+2)%3]=1;
      return new ns.color(v*(1-s*a[0]),v*(1-s*a[1]),v*(1-s*a[2]));
    },
    fromCMYK:function(c,m,y,k){
      var ik=1-k;
      return new ns.color(ik*(1-c),ik*(1-m),ik*(1-y));
    },
    fromGray:function(gr){
      // γ補正
      //gr=gr<0.0812?gr/4.5:Math.pow((gr+0.099)/1.099,1/0.45);
      return new ns.color(gr,gr,gr);
    }
  });
  //----------------------------------------------------------------------------
  ns.PsGState=function(){
    this.CTM=agh.Array.clone(ns.AffineA.defaultMatrix);
    this.path=[];
    this.clipstack=[];  // to impl

    this.font=ns.PsNullFont.instance;
  };
  agh.memcpy(ns.PsGState.prototype,{
    CTM:[],                 //       array
    position:null,          // const array
    path:[],                //       array
    clippath:null,          // const array : to impl
    clipstack:null,         //       array : to impl
    color:new ns.color(),
    colorspace:ns.color.DeviceGray,
    font:null,
    linewidth:1.0,
    linecap:0,
    linejoin:0,
    miterlimit:10,
    linedash:agh.memcpy([],{dashoffset:0}),  // const array
    strokeadjust:false,      // to impl
    // Device dependent paramters (未実装)
    color_rendering:null,    // to impl
    overprint:false,         // to impl
    black_generation:null,   // to impl
    undercolor_removal:null, // to impl
    transfer:null,           // to impl
    halftone:null,           // to impl
    flatness:null,           // to impl
    smoothness:null,         // to impl
    device:null,             // to impl
    //------------------------------------------------------
    clone:function(){
      var ret=agh.wrap(this,this);
      ret.path=agh.Array.clone(this.path);
      ret.clipstack=agh.Array.clone(this.clipstack);
      ret.CTM=agh.Array.clone(this.CTM);
      return ret;
    },
    toString:function(){return "--<gstate>--";},
    dump:function(){
      var buff=['{'];
      buff.push('  CTM=['+this.CTM+']');
      buff.push('  position=('+this.position+')');
      buff.push('  path=['+this.path+']');
      buff.push('  clippath=['+this.clippath+']');
      buff.push('  clipstack=['+this.clipstack+']');
      buff.push('  color='+this.color.toHtmlColor());
      buff.push('  colorspace='+this.colorspace.toPs()+'');
      buff.push('}');
      return buff.join('\n');
    }
  });
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  ns.GraphicsBase=agh.Class(nsName+'.GraphicsBase',null,{
    constructor:function(){
      this.base();
      this.gstate=new ns.PsGState();
      this.gstack=[];
    },
    m_width:"200px",
    m_height:"200px",
    m_bbl:0,
    m_bbb:0,
    m_bbw:612,
    m_bbh:792,
    SetDisplaySize:function(w,h){
      this.m_width=w;
      this.m_height=h;
    },
    SetBoundingBox:function(l,b,r,t){
      this.m_bbl=l;
      this.m_bbb=b;
      this.m_bbw=r-l;
      this.m_bbh=t-b;
    },
    getMeanScale:function(){
      var A=this.gstate.CTM;
      return Math.sqrt(Math.abs(A[0]*A[3]-A[1]*A[2]));
    },
    //------------------------------------------------------
    // save/restore VM
    save_graphics:function(){
      var gstack_=[];
      for(var i=0;i<this.gstack.length;i++)
        gstack_[i]=this.gstack[i].clone();
      return {gstate:this.gstate.clone(),gstack:gstack_};
    },
    restore_graphics:function(snapshot){
      this.gstate=snapshot.gstate;
      this.gstack=snapshot.gstack;
    },
    //------------------------------------------------------
    ginit:function(){
      this.gstate=new ns.PsGState();
    },
    gsave:function(){
      /*
      //++++++++++++++++++++++++++++++++++++++++++++++++++++
      // ループ内で↓をやるとどんどん wrap が深くなるので×
      this.gstack.push(agh.wrap(this.gstate));
      this.gstate=agh.wrap(this.gstate,{
        path:agh.Array.clone(this.gstate.path),
        clipstack:agh.Array.clone(this.gstate.clipstack)
      });
      //++++++++++++++++++++++++++++++++++++++++++++++++++++
      /*/
      this.gstack.push(this.gstate);
      this.gstate=this.gstate.clone();
      //*/
    },
    grestore:function(){
      this.gstate=this.gstack.pop();
    },
    grestoreall:function(){
      if(this.gstack.length==0)return;
      this.gstate=this.gstack[0];
      this.gstack.length=0;
    },
    applygstate:function(gstate){
      agh.memcpy(gstate,this.gstate);
      gstate.path=agh.Array.clone(this.gstate.path);
      gstate.clipstack=agh.Array.clone(this.gstate.clipstack);
      gstate.CTM=agh.Array.clone(this.gstate.CTM);
    },
    setgstate:function(gstate){
      this.gstate=gstate;
    },
    //------------------------------------------------------
    // 描画設定
    setlinewidth:function(value){
      this.gstate.linewidth=parseFloat(value);
    },
    getlinewidth:function(){
      return this.gstate.linewidth;
    },
    setlinecap:function(value){
      this.gstate.linecap=parseInt(value);
    },
    getlinecap:function(){
      return this.gstate.linecap;
    },
    setlinejoin:function(value){
      this.gstate.linejoin=parseInt(value);
    },
    getlinejoin:function(){
      return this.gstate.linejoin;
    },
    setmiterlimit:function(value){
      this.gstate.miterlimit=parseFloat(value);
    },
    getmiterlimit:function(){
      return this.gstate.miterlimit;
    },
    setstrokeadjust:function(value){
      this.gstate.strokeadjust=!!value;
    },
    getstrokeadjust:function(){
      return this.gstate.strokeadjust;
    },
    setrgbcolor:function(r,g,b){
      this.gstate.color=new ns.color(r,g,b);
      this.gstate.colorspace=ns.color.DeviceRGB;
    },
    getrgbcolor:function(){
      var c=this.gstate.color;
      return [c.r,c.g,c.b];
    },
    sethsbcolor:function(h,s,b){
      this.gstate.color=new ns.color.fromHSV(h,s,b);
      this.gstate.colorspace=ns.color.DeviceRGB;
    },
    gethsbcolor:function(){
      return this.gstate.color.toHSV();
    },
    setcmykcolor:function(c,m,y,k){
      this.gstate.color=new ns.color.fromCMYK(c,m,y,k);
      this.gstate.colorspace=ns.color.DeviceCMYK;
    },
    getcmykcolor:function(){
      return this.gstate.color.toCMYK();
    },
    setgray:function(gr){
      this.gstate.color=ns.color.fromGray(gr);
      this.gstate.colorspace=ns.color.DeviceGray;
    },
    getgray:function(){
      return this.gstate.color.toGray();
    },
    setcolorspace:function(value){
      this.gstate.colorspace=value;
    },
    getcolorspace:function(){
      return this.gstate.colorspace;
    },
    //------------------------------------------------------
    transf_point:function(p){
      var p_=ns.AffineA.transformD(p,this.gstate.CTM);
      return p_;
    },
    rtransf_point:function(b,p){
      var p_=ns.AffineA.dtransformD(p,this.gstate.CTM);
      p_[0]+=b[0];p_[1]+=b[1];
      return p_;
    },
    // パス構築
    newpath:function(){
      this.gstate.path.length=0;
    },
    moveto:function(x,y){
      this.gstate.position=this.transf_point([x,y]);
    },
    rmoveto:function(x,y){
      this.gstate.position=this.rtransf_point(this.gstate.position,[x,y]);
    },
    lineto:function(x,y){
      var s=this.gstate;
      var p1=s.position;
      var p2=this.transf_point([x,y]);
      s.path.push([PATH_LINE,p1,p2]);
      s.position=p2;
    },
    rlineto:function(x,y){
      var s=this.gstate;
      var p1=s.position;
      var p2=this.rtransf_point(s.position,[x,y]);
      s.path.push([PATH_LINE,p1,p2]);
      s.position=p2;
    },
    curveto:function(c1x,c1y,c2x,c2y,x,y){
      var s=this.gstate;
      var p1=s.position;
      var c1=this.transf_point([c1x,c1y]);
      var c2=this.transf_point([c2x,c2y]);
      var p2=this.transf_point([x,y]);
      s.path.push([PATH_CBEZ,p1,c1,c2,p2]);
      s.position=p2;
    },
    rcurveto:function(c1x,c1y,c2x,c2y,x,y){
      var s=this.gstate;
      var p1=s.position;
      var c1=this.rtransf_point(s.position,[c1x,c1y]);
      var c2=this.rtransf_point(s.position,[c2x,c2y]);
      var p2=this.rtransf_point(s.position,[x,y]);
      s.path.push([PATH_CBEZ,p1,c1,c2,p2]);
      s.position=p2;
    },
    closepath:function(){
      this.gstate.path.push([PATH_CLOSE]);
    },
    _:0
  });
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
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
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  // 描画設定
  agh.memcpy(ns.systemdict.data,{
    initgraphics:function initgraphics(proc){
      proc.graphics.ginit();
    },
    gsave:function gsave(proc){
      proc.graphics.gsave();
    },
    grestore:function grestore(proc){
      proc.graphics.grestore();
    },
    grestoreall:function grestoreall(proc){
      proc.graphics.grestoreall();
    },
    currentgstate:function currentgstate(proc){
      var value=proc.stk[proc.stk.length-1];
      if(value instanceof ns.PsGState)
        proc.graphics.applygstate(value);
      else
        proc.onerror("typecheck","gstate object is required.");
    },
    setgstate:function setgstate(proc){
      var value=proc.stk.pop();
      if(value instanceof ns.PsGState)
        proc.graphics.setgstate();
      else
        proc.onerror("typecheck","gstate object is required.");
    },
    save:function save(proc){
      // ■ VM (ns.PsArray の中身など) の保存・復元は難しい
      //    現状では、PsArray の中身などに関しては復元しない実装になっている。
      // ※ save のもう一つの目的である、確保した領域を解放するという事については、
      //    javascript には GarbageCollector が居るので、特別な配慮は要らない。

      proc.stk.push(new ns.PsSave(proc));
    },
    restore:function restore(proc){
      var snap=proc.stk.pop();
      if(!(snap instanceof ns.PsSave)){
        proc.onerror("typecheck","a savetype operand is required.");
        return;
      }

      snap.restore(proc);
    },
    //------------------------------------------------------
    // clippath
    clip:function clip(proc){
      // ■ TODO : NOT IMPLEMENTED
      //    clippath &= path (intersection を取るべき)
      var g=proc.graphics;
      g.gstate.clippath=agh.Array.clone(g.gstate.path);
    },
    clippath:function clippath(proc){
      var g=proc.graphics;
      if(g.gstate.clippath==null){
        g.newpath();
        g.moveto(g.m_bbl,g.m_bbb);
        g.rlineto(g.m_bbw,0);
        g.rlineto(0,g.m_bbh)
        g.rlineto(-g.m_bbw,0);
        g.closepath();
      }else
        g.gstate.path=agh.Array.clone(g.gstate.clippath);
    },
    clipsave:function clipsave(proc){
      var g=proc.graphics;
      g.gstate.clipstack.push(g.gstate.clippath);
    },
    cliprestore:function cliprestore(proc){
      var g=proc.graphics;
      g.gstate.clippath=g.gstate.clipstack.pop();
    },
    // ■ TODO: clipping path を考慮した描画
    // ■ eoclip rectclip
    initclip:function initclip(proc){
      // default clip of the device
      proc.graphics.gstate.clippath=null;
    },
    //------------------------------------------------------
    // 間接
    setlinewidth:function setlinewidth(proc){
      var value=proc.stk.pop();
      proc.graphics.setlinewidth(value);
    },
    currentlinewidth:function currentlinewidth(proc){
      proc.stk.push(proc.graphics.getlinewidth());
    },
    setlinejoin:function setlinejoin(proc){
      var value=proc.stk.pop();
      proc.graphics.setlinejoin(value);
    },
    currentlinejoin:function currentlinejoin(proc){
      proc.stk.push(proc.graphics.getlinejoin());
    },
    setlinecap:function setlinecap(proc){
      var value=proc.stk.pop();
      proc.graphics.setlinecap(value);
    },
    currentlinecap:function currentlinecap(proc){
      proc.stk.push(proc.graphics.getlinecap());
    },
    setmiterlimit:function setmiterlimit(proc){
      var value=proc.stk.pop();
      proc.graphics.setmiterlimit(value);
    },
    currentmiterlimit:function currentmiterlimit(proc){
      proc.stk.push(proc.graphics.getmiterlimit());
    },
    setstrokeadjust:function setstrokeadjust(proc){
      proc.errstream("nosupport: setstrokeadjust");
      var value=proc.stk.pop();
      proc.graphics.setstrokeadjust(value);
    },
    currentstrokeadjust:function currentstrokeadjust(proc){
      proc.stk.push(proc.graphics.getstrokeadjust());
    },
    setrgbcolor:function setrgbcolor(proc){
      var b=proc.stk.pop();
      var g=proc.stk.pop();
      var r=proc.stk.pop();
      proc.graphics.setrgbcolor(r,g,b);
    },
    currentrgbcolor:function currentrgbcolor(proc){
      proc.stk.push.apply(proc.stk,proc.graphics.getrgbcolor());
    },
    setgray:function setgray(proc){
      var gr=proc.stk.pop();
      proc.graphics.setgray(gr);
    },
    currentgray:function currentgray(proc){
      proc.stk.push(proc.graphics.getgray());
    },
    sethsbcolor:function sethsbcolor(proc){
      var b=proc.stk.pop();
      var s=proc.stk.pop();
      var h=proc.stk.pop();
      proc.graphics.sethsbcolor(h,s,b);
    },
    currenthsbcolor:function currenthsbcolor(proc){
      proc.stk.push.apply(proc.stk,proc.graphics.gethsbcolor());
    },
    setcmykcolor:function setcmykcolor(proc){
      var k=proc.stk.pop();
      var y=proc.stk.pop();
      var m=proc.stk.pop();
      var c=proc.stk.pop();
      proc.graphics.setcmykcolor(c,m,y,k);
    },
    currentcmykcolor:function currentcmykcolor(proc){
      proc.stk.push.apply(proc.stk,proc.graphics.getcmykcolor());
    },
    setcolorspace:function setcolorspace(proc){
      var value=proc.stk.pop();
      proc.graphics.setcolorspace(value);
    },
    currentcolorspace:function currentcolorspace(proc){
      proc.stk.push(proc.graphics.getcolorspace());
    },
    // ■ TODO: setcolor currentcolor
    //--------------------------------------------------------------------------
  //# <PsGState 依存>
    setdash:function setdash(proc){
      var ofs=proc.stk.pop();
      var arr=proc.stk.pop();
      if(!(arr instanceof ns.PsArray)){
        proc.onerror("typecheck","operand 1/2 should be an array");
        return;
      }

      var darr=new Array(arr.length);
      for(var i=0;i<arr.length;i++)
        darr[i]=parseFloat(arr.data[arr.offset+i]);
      darr.dashoffset=parseFloat(ofs);
      proc.graphics.gstate.linedash=darr;
    },
    currentdash:function currentdash(proc){
      var linedash=proc.graphics.gstate.linedash;
      proc.stk.push(new ns.PsArray(agh.Array.clone(linedash)));
      proc.stk.push(linedash.offset);
    },
    setflat:function setflat(proc){
      proc.errstream("nosupport: setflat");
      var v=parseFloat(proc.stk.pop());
      if(isNaN(v))return;
      proc.graphics.gstate.flatness=v;
    },
    currentflat:function currentflat(proc){
      proc.stk.push(proc.graphics.gstate.flatness);
    },
    setoverprint:function setoverprint(proc){
      proc.errstream("nosupport: setoverprint");
      var v=!!proc.stk.pop();
      proc.graphics.gstate.overprint=v;
    },
    currentoverprint:function currentoverprint(proc){
      proc.stk.push(proc.graphics.gstate.overprint);
    },
    setsmoothness:function setsmoothness(proc){
      proc.errstream("nosupport: setsmoothness");
      var v=parseFloat(proc.stk.pop());
      if(isNaN(v))return;
      proc.graphics.gstate.smoothness=v;
    },
    currentsmoothness:function currentsmoothness(proc){
      proc.stk.push(proc.graphics.gstate.smoothness);
    }
  //# </PsGState 依存>
  });
  //----------------------------------------------------------------------------
  // 描画
  ns.systemdict.register_operator('newpath',function newpath(proc){
    proc.graphics.newpath();
  },function(opt){
    opt.stk.push([OP_CODE,'proc.graphics.newpath();\n']);
  });
  ns.systemdict.register_operator('closepath',function closepath(proc){
    proc.graphics.closepath();
  },function(opt){
    opt.stk.push([OP_CODE,'proc.graphics.closepath();\n']);
  });
  ns.systemdict.register_operator('fill',function fill(proc){
    proc.graphics.fill();
  },function(opt){
    opt.stk.push([OP_CODE,'proc.graphics.fill();\n']);
  });
  ns.systemdict.register_operator('stroke',function stroke(proc){
    proc.graphics.stroke();
  },function(opt){
    opt.stk.push([OP_CODE,'proc.graphics.stroke();\n']);
  });
  ns.systemdict.register_operator('showpage',function showpage(proc){
    proc.graphics.showpage();
  },function(opt){
    opt.stk.push([OP_CODE,'proc.graphics.showpage();\n']);
  });
  ns.systemdict.register_operator('lineto',function lineto(proc){
    var y=proc.stk.pop();
    var x=proc.stk.pop();
    proc.graphics.lineto(x,y);
  },function(opt){
    var y=opt.stkpop();
    var x=opt.stkpop();
    opt.stk.push([OP_CODE,'proc.graphics.lineto('+opt.operation2code(x)+','+opt.operation2code(y)+');\n']);
  });
  ns.systemdict.register_operator('rlineto',function rlineto(proc){
    var y=proc.stk.pop();
    var x=proc.stk.pop();
    proc.graphics.rlineto(x,y);
  },function(opt){
    var y=opt.stkpop();
    var x=opt.stkpop();
    opt.stk.push([OP_CODE,'proc.graphics.rlineto('+opt.operation2code(x)+','+opt.operation2code(y)+');\n']);
  });
  ns.systemdict.register_operator('moveto',function moveto(proc){
    var y=proc.stk.pop();
    var x=proc.stk.pop();
    proc.graphics.moveto(x,y);
  },function(opt){
    var y=opt.stkpop();
    var x=opt.stkpop();
    opt.stk.push([OP_CODE,'proc.graphics.moveto('+opt.operation2code(x)+','+opt.operation2code(y)+');\n']);
  });
  ns.systemdict.register_operator('rmoveto',function rmoveto(proc){
    var y=proc.stk.pop();
    var x=proc.stk.pop();
    proc.graphics.rmoveto(x,y);
  },function(opt){
    var y=opt.stkpop();
    var x=opt.stkpop();
    opt.stk.push([OP_CODE,'proc.graphics.rmoveto('+opt.operation2code(x)+','+opt.operation2code(y)+');\n']);
  });
  ns.systemdict.register_operator('curveto',function curveto(proc){
    var y=proc.stk.pop();
    var x=proc.stk.pop();
    var c2y=proc.stk.pop();
    var c2x=proc.stk.pop();
    var c1y=proc.stk.pop();
    var c1x=proc.stk.pop();
    proc.graphics.curveto(c1x,c1y,c2x,c2y,x,y);
  },function(opt){
    var y=opt.stkpop();
    var x=opt.stkpop();
    var c2y=opt.stkpop();
    var c2x=opt.stkpop();
    var c1y=opt.stkpop();
    var c1x=opt.stkpop();
    var args=[
      opt.operation2code(c1x),
      opt.operation2code(c1y),
      opt.operation2code(c2x),
      opt.operation2code(c2y),
      opt.operation2code(x),
      opt.operation2code(y)
    ];
    opt.stk.push([OP_CODE,'proc.graphics.curveto('+args.join(',')+');\n']);
  });
  ns.systemdict.register_operator('rcurveto',function rcurveto(proc){
    var y=proc.stk.pop();
    var x=proc.stk.pop();
    var c2y=proc.stk.pop();
    var c2x=proc.stk.pop();
    var c1y=proc.stk.pop();
    var c1x=proc.stk.pop();
    proc.graphics.rcurveto(c1x,c1y,c2x,c2y,x,y);
  },function(opt){
    var y=opt.stkpop();
    var x=opt.stkpop();
    var c2y=opt.stkpop();
    var c2x=opt.stkpop();
    var c1y=opt.stkpop();
    var c1x=opt.stkpop();
    var args=[
      opt.operation2code(c1x),
      opt.operation2code(c1y),
      opt.operation2code(c2x),
      opt.operation2code(c2y),
      opt.operation2code(x),
      opt.operation2code(y)
    ];
    opt.stk.push([OP_CODE,'proc.graphics.rcurveto('+args.join(',')+');\n']);
  });
  agh.memcpy(ns.systemdict.data,{
  //# <PsGState 依存>
    charpath:function charpath(proc){
      var type=proc.stk.pop(); // fill or stroke (not used)
      var text=proc.stk.pop();
      var s=proc.graphics.gstate;
      var font=s.font;

      if(!agh.is(type,Boolean)){
        proc.onerror('typecheck',"operand2/2: a boolean value is expected.");
        return;
      }else if(font==null){
        proc.onerror("invalidfont","font is not set");
        return;
      }

      text=font.Decode(text);
      var smove=font.GetStringMove(text);

      s.path.push([PATH_CHAR,s.position,agh.Array.clone(s.CTM),font,text,smove]);

      var m_=ns.AffineA.dtransform(smove,font.matrix);
      s.position=proc.graphics.rtransf_point(s.position,m_);
    },
    pathbbox:function pathbbox(proc){
      // PostScript Language Reference によると:
      // 1 device space で矩形を計算する
      // 2 user space に矩形を変換する (inverse CTM)
      // 3 2でできた四角形を含む矩形を計算する
      //
      // 基本 moveto は考慮に入れないが、
      // moveto しか path に含まれていない場合はそれを使う。
      // この実装では gstate.position に残っている物を使う。
      var fNULL=true;var m,M;
      var gstate=proc.graphics.gstate;
      function addp(p){
        if(fNULL){
          m=[p[0],p[1]];
          M=[p[0],p[1]];
          fNULL=false;
        }else{
          if(p[0]<m[0])m[0]=p[0];else if(p[0]>M[0])M[0]=p[0];
          if(p[1]<m[1])m[1]=p[1];else if(p[1]>M[1])M[1]=p[1];
        }
      }

      var path=gstate.path;
      var pos=null;
      for(var i=0;i<path.length;i++){
        var e=path[i];
        switch(e[0]){
          case PATH_LINE:
            if(pos!=e[1])addp(e[1]);
            addp(pos=e[2]);
            break;
          case PATH_CBEZ:
            if(!e.__flatten__){
              if(pos!=e[1])addp(e[1]);
              addp(e[2]);
              addp(e[3]);
              addp(pos=e[4]);
            }else{
              // ■TODO
              if(pos!=e[1])addp(e[1]);
              addp(pos=e[4]);
              proc.onerror('notimplemented',"pathbbox for flatten cbez");
            }
            break;
          case PATH_CHAR:
            var pos=e[1];
            var ctm=e[2];
            var font=e[3];

            var matrix=ns.AffineA.mul(font.matrix,ctm);
            var sz=font.GetStringRawSize(e[4]);
            var dx=ns.AffineA.dtransformD([sz[0],0],matrix);
            var dy=ns.AffineA.dtransformD([0,sz[1]],matrix);

            var vtx=font.matrix.slice(4,6);
            ns.AffineA.dtransformD(vtx,ctm);
            vtx[0]+=pos[0];vtx[1]+=pos[1];

            vtx[0]+=dy[0]*0.1;vtx[1]+=dy[1]*0.1;   // 余白補正
            addp(vtx);
            vtx[0]+=dx[0];vtx[1]+=dx[1];
            addp(vtx);
            vtx[0]+=dy[0]*0.65;vtx[1]+=dy[1]*0.65; // 余白補正
            addp(vtx);
            vtx[0]-=dx[0];vtx[1]-=dx[1];
            addp(vtx);

            pos=null;
            break;
        }
      }

      if(fNULL){
        if(gstate.position){
          var p=ns.AffineA.itransform(gstate.position,gstate.CTM);
          proc.stk.push(p[0],p[1],p[0],p[1]);
        }else{
          proc.onerror('nocurrentpoint');
        }
      }else{
        // var ctm=gstate.CTM;
        // ns.AffineA.itransformD(m,ctm);
        // ns.AffineA.itransformD(M,ctm);

        var dx=M[0]-m[0];
        var dy=M[1]-m[1];

        var ictm=ns.AffineA.inv(gstate.CTM);
        ns.AffineA.transformD(m,ictm);
        M[0]=m[0];M[1]=m[1];

        // m += [min(dd0),min(dd1)], M += [max(dd0),max(dd1)]
        //   where dd = (dx? dy?) ictm = (dx?*ictm0 + dy?*ictm2, dx?*ictm1 + dy?*ictm3)
        //         dx? = 0 or dx
        //         dy? = 0 or dy
        var a;
        if((a=dx*ictm[0])>=0)M[0]+=a;else m[0]+=a;
        if((a=dx*ictm[1])>=0)M[1]+=a;else m[1]+=a;
        if((a=dy*ictm[2])>=0)M[0]+=a;else m[0]+=a;
        if((a=dy*ictm[3])>=0)M[1]+=a;else m[1]+=a;
        proc.stk.push(m[0],m[1],M[0],M[1]);
      }
    },
    rectfill:function rectfill(proc){
      var a=proc.stk.pop();
      if(a instanceof ns.PsArray){
        var x=a.data[a.offset];
        var y=a.data[a.offset+1];
        var w=a.data[a.offset+2];
        var h=a.data[a.offset+3];
      }else if(a instanceof ns.PsString){
        // ■ EncodedeNumberString の場合
        proc.onerror('notimplemented',"EncodedNumberString");
        return;
      }else{
        var h=a;
        var w=proc.stk.pop();
        var y=proc.stk.pop();
        var x=proc.stk.pop();
      }

      var g=proc.graphics;
      var p0=g.gstate.position;
      var p1=g.rtransf_point(p0,[x,y]);
      var p2=g.rtransf_point(p0,[x+w,y]);
      var p3=g.rtransf_point(p0,[x+w,y+h]);
      var p4=g.rtransf_point(p0,[x,y+h]);

      var oPath=g.gstate.path;
      g.gstate.path=[
        [PATH_LINE,p1,p2],
        [PATH_LINE,p2,p3],
        [PATH_LINE,p3,p4],
        [PATH_CLOSE]
      ];
      g.fill();
      g.gstate.path=oPath;
      // ■
    },
    rectstroke:function rectstroke(proc){
      var g=proc.graphics;

      // 引数 m=matrix
      var m=proc.stk.pop();
      if(a instanceof ns.PsArray&&a.length==6){
        var a=proc.stk.pop();
        m=ns.AffineA.mulA(m,g.gstate.CTM);
      }else{
        var a=m;
        m=g.gstate.CTM;
      }

      // 引数 矩形
      if(a instanceof ns.PsArray){
        var x=a.data[a.offset];
        var y=a.data[a.offset+1];
        var w=a.data[a.offset+2];
        var h=a.data[a.offset+3];
      }else if(a instanceof ns.PsString){
        // ■ EncodedeNumberString の場合
        proc.onerror('notimplemented',"EncodedNumberString");
        return;
      }else{
        var h=a;
        var w=proc.stk.pop();
        var y=proc.stk.pop();
        var x=proc.stk.pop();
      }

      //window.log("dbg: x={0} y={1} w={2} h={3}".format(x,y,w,h));
      //window.log("dbg: m="+m);
      var p1=ns.AffineA.transformD([x,y],m);
      var p2=ns.AffineA.transformD([x+w,y],m);
      var p3=ns.AffineA.transformD([x+w,y+h],m);
      var p4=ns.AffineA.transformD([x,y+h],m);

      var oPath=g.gstate.path;
      g.gstate.path=[
        [PATH_LINE,p1,p2],
        [PATH_LINE,p2,p3],
        [PATH_LINE,p3,p4],
        [PATH_CLOSE]
      ];
      g.stroke();
      g.gstate.path=oPath;
    }
  //# </PsGState 依存>
  });
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  // 文字列表示
  // ToDo: CIDFont & CMap
  ns.FontMapping={
    Courier:"Courier",
    Helvetica:"Arial",
    Times:"'Times New Roman'",
    'Times-Roman':"'Times New Roman'",
    'Ryumin-Light-H':"'Ryumin-Light-H','Yu Mincho','MS Mincho'",
    'GothicBBB-Medium-H':"'Gothic-Medium-H','Yu Gothic','MeiryoKe_PGothic','Meiryo','MS PGothic'"
  };
  var PS_FONT_SCALE=50;
  ns.PsFont=agh.Class(nsName+'.PsFont',null,{
    bold:false,
    style:'normal',
    filter:null,
    size:PS_FONT_SCALE,
    fontname:"",
    matrix:null,
    constructor:function(arg1,arg2){
      this.base();
      if(agh.is(arg1,String)){
        this.init_fontname(arg1);

        var size=arg2||1;
        this.matrix=[size/PS_FONT_SCALE,0,0,size/PS_FONT_SCALE,0,0];
      }else if(arg1 instanceof ns.PsFont){
        var font=arg1;

        this.bold=font.bold;
        this.style=font.style;
        this.fontname=font.fontname;

        // 線形合成
        if(arg2 instanceof Array){
          ns.AffineA.mulD(font.matrix,this.matrix=arg2);
        }else{
          this.matrix=agh.Array.clone(font.matrix);
          for(var i=0;i<6;i++)
            this.matrix[i]*=arg2;
        }
      }
    },
    init_fontname:function(fontname){
      if(/\-Bold$/.test(fontname)){
        this.bold=true;
        fontname=fontname.slice(0,-5);
      }else if(/\-Oblique$/.test(fontname)){
        this.style='oblique';
        fontname=fontname.slice(0,-8);
      }else if(/\-Italic$/.test(fontname)){
        this.style='italic';
        fontname=fontname.slice(0,-7);
      }else if(/\-BoldOblique$/.test(fontname)){
        this.bold=true;
        this.style='oblique';
        fontname=fontname.slice(0,-12);
      }else if(/\-BoldItalic$/.test(fontname)){
        this.bold=true;
        this.style='italic';
        fontname=fontname.slice(0,-11);
      }

      // ■ Encoding

      if(fontname in ns.FontMapping)
        fontname=ns.FontMapping[fontname];
      this.fontname=fontname;
    },
    GetStringRawSize:(function(){
      var span=document.createElement('span');
      agh.memcpy(span.style,{
        position:'absolute',left:'0px',top:'0px',
        overflow:'hidden',visibility:'hidden',
        fontSize:'100px'
      });

      // document.body 待ち
      var init=false;
      agh.scripts.wait(["event:onload"],function(){
        document.body.appendChild(span);
        init=true;
      });

      return function(text){
        if(!init){
          var w=0;
          for(var i=0;i<text.length;i++)
            if(text.charCodeAt(i)>0xFF)w++;
          return [this.size*(text.length+w)*0.5,this.size];
        }

        span.style.fontFamily=this.fontname;
        span.style.fontWidth=this.bold?'bold':'normal';
        span.style.fontStyle=this.oblique?'oblique':'normal';

        if(agh.browser.vFx){
          span.textContent='xx';
          var w_xx=span.offsetWidth;
          span.textContent='x'+text+'x';
          var w_text=span.offsetWidth;
          var h_text=span.offsetHeight;
          span.textContent='';
        }else{
          span.innerText='xx';
          var w_xx=span.offsetWidth;
          span.innerText='x'+text+'x';
          var w_text=span.offsetWidth;
          var h_text=span.offsetHeight;
          span.innerText='';
        }
        return [this.size*(w_text-w_xx)/100,this.size*h_text/100];
      };
    })(),
    GetStringMove:function(text){
      var ret=this.GetStringRawSize(text);
      ret[1]=0; // 横書き
      return ret;
    },
    Decode:function(text){
      if(this.filter!=null&&text instanceof ns.PsString){
        return this.fitler(text);
      }else{
        return ""+text;
      }
    },
    fillText:function(graphics,text,move,pos){
      graphics.fill_text(text,move,pos,this);
    },
    _:0
  });
  ns.PsNullFont=agh.Class(nsName+'.PsNullFont',ns.PsFont,{
    fontname:'none',
    Decode:function override(text){return "";},
    GetStringRawSize:function override(text){return [0,0];}
  });
  ns.PsNullFont.instance=new ns.PsNullFont();
  //----------------------------------------------------------------------------
  // Type 1 対応試験 2014-12-13
  ns.PsType1Font=agh.Class(nsName+'.PsType1Font',ns.PsFont,{
    constructor:function(dict){
      this.base('Times',1);
      this.m_dict=dict;
      this.m_priv=dict.data.Private;
      this.m_table=dict.data.Encoding.data;
      this.m_glyph=dict.data.CharStrings.data;

      window.log(this.m_dict.toPs2());
    },
    // Decode:function override(text){
    //   window.log("Type1Font#Decode(text): text=("+text+")");
    //   return this.callbase(text);
    // },
    fillText:function override(graphics,text,move,pos){
      window.log("Type1Font#fillText(text): text=("+text+")");
      for(var i=0;i<text.length;i++){
        var name=this.m_table[text.charCodeAt(i)];
        if(!name||!(name instanceof ns.PsName)||name.name==".notdef"){
          // 字送りだけでもする?
          continue;
        }

        var glyph=this.m_glyph[name.name];
      }
      return this.callbase(graphics,text,move,pos);
    }
    //■Decode
    //■GetStringRawSize
    //■GetStringMove
  });
  ns.PsType1Font.createFont=(function(){
    function checkFontDictionaryEntry(proc,fdict,key,type){
      if(!(fdict instanceof ns.PsDict)||!(key in fdict.data)){
        proc.onerror('invalidfont',"definefont(Type 1): missing entry '"+key+"' in the font dictionary.");
        return false;
      }
      if(type&&!(fdict.data[key] instanceof type)){
        proc.onerror('invalidfont',"definefont(Type 1): the entry '"+key+"' has an invalid type.");
        return false;
      }

      return true;
    }

    return function(proc,fdict){
      // check (本来は内部でチェックするべきなのでは?)
      if(!checkFontDictionaryEntry(proc,fdict,'Encoding',ns.PsArray))return;
      if(!checkFontDictionaryEntry(proc,fdict,'FontBBox'))return;
      if(!checkFontDictionaryEntry(proc,fdict,'PaintType'))return;
      if(!checkFontDictionaryEntry(proc,fdict,'CharStrings',ns.PsDict))return;
      if(!checkFontDictionaryEntry(proc,fdict,'Private',ns.PsDict))return;

      var font=new ns.PsType1Font(fdict);
      return font;
    };
  })();
  //----------------------------------------------------------------------------
  agh.memcpy(ns.systemdict.data,{
    findfont:function findfont(proc){
      var name=proc.stk.pop();
      if(name instanceof ns.PsName||name instanceof ns.PsString){
        name=""+name;
        if(name in proc.m_fontDirectory)
          proc.stk.push(proc.m_fontDirectory[name]);
        else
          proc.stk.push(new ns.PsFont(""+name));
      }else
        proc.onerror("typecheck","operand1/1: a fontname is expected");
    },
    setfont:function setfont(proc){
      var font=proc.stk.pop();
      if(!(font instanceof ns.PsFont)){
        proc.onerror("typecheck","operand1/1: a font is expectedmust");
        return;
      }

      proc.graphics.gstate.font=font;
    },
    currentfont:function currentfont(proc){
      proc.stk.push(proc.graphics.gstate.font);
    },
    rootfont:function rootfont(proc){
      proc.stk.push(proc.graphics.gstate.font);
      // ■TODO: 正確には現在のフォントのルートフォント (大抵は自身)
    },
    scalefont:function scalefont(proc){
      var _scal;
      var scal=parseFloat(_scal=proc.stk.pop());
      var font=proc.stk.pop();

      if(isNaN(scal)){
        proc.onerror("typecheck","operand2/2: a number is expected. "+to_ps(_scal));
        return;
      }else if(!(font instanceof ns.PsFont)){
        proc.onerror("typecheck","operand1/2: a font is expected");
        return;
      }

      font=agh.wrap(font);
      font.matrix=agh.Array.clone(font.matrix);
      for(var i=0;i<6;i++)font.matrix[i]*=scal;
      proc.stk.push(font);
    },
    makefont:function makefont(proc){
      var mat=proc.stk.pop();
      var font=proc.stk.pop();

      if(!(mat instanceof ns.PsArray)){
        proc.onerror("typecheck","operand2/2: an array is expected");
        return;
      }else if(!(font instanceof ns.PsFont)){
        proc.onerror("typecheck","operand1/2: a font is expected");
        return;
      }

      if(mat.offset!=0){
        mat=mat.data.slice(mat.offset,mat.offset+6);
      }else{
        mat=agh.Array.clone(mat.data);
      }

      font=agh.wrap(font);
      font.matrix=ns.AffineA.mulD(font.matrix,mat);
      proc.stk.push(font);
    },
    selectfont:function selectfont(proc){
      var scal=parseFloat(proc.stk.pop());
      var name=proc.stk.pop();
      if(isNaN(scal)){
        proc.onerror("typecheck","operand2/2: a number is required");
        return;
      }else if(!(name instanceof ns.PsName||name instanceof ns.PsString)){
        proc.onerror("typecheck","operand1/2: a fontname-key is required");
        return;
      }

      proc.graphics.gstate.font=new ns.PsFont(""+name,scal);
    },
    definefont:function definefont(proc){
      if(proc.stk.length<2){
        proc.onerror('stackunderflow');
        return;
      }
      var fdict=proc.stk.pop();
      var key=proc.stk.pop();

      //■未実装
      var checkEntryFontName="font";
      function checkEntry(key){
        if(key in fdict.data)return true;
        proc.onerror("invalidfont",checkEntryFontName+": "+key+" entry is missing.");
        return false;
      }

      // check FontType, FontMatrix
      if(!(fdict instanceof ns.PsDict&&'FontType' in fdict.data&&'FontMatrix' in fdict.data)){
        if(!(fdict instanceof ns.PsDict))
          proc.onerror("invalidfont","the specified font is not a dictionary.");
        else{
          checkEntry('FontType');
          checkEntry('FontMatrix');
        }
        return;
      }

      var ftype=fdict.data.FontType;
      checkEntryFontName="font(FontType="+ftype+")";

      if(ftype==1){
        var font=ns.PsType1Font.createFont(proc,fdict);
        if(font)
          proc.m_fontDirectory[""+key]=font;
        return;
      }

      // 以下デバグ用
      function p(msg){proc.outstream("impl(definefont): "+msg);}
      p(to_ps(name)+" "+fdict.toPs2());
      p("FontType="+ftype);
      p("FontMatrix="+to_ps(fdict.data.FontMatrix));
      // FontName
      // FontInfo
      // LanguageLevel
      // WMode
      // FID (inserted by definefont, should not be defined previously)

      if('CIDFontType' in fdict.data)
        p("this is a cidfont: CIDFontType="+fdict.data.CIDFontType);
      else
        p("this is not a cidfont.");

      if(ftype==1||ftype==2||ftype==3||ftype==14||ftype==42){
        // base font
        if(!checkEntry('Encoding'))return;
        if(!checkEntry('FontBBox'))return;

        p("Encoding: "+to_ps(fdict.data.Encoding));
        p("FontBBox: "+to_ps(fdict.data.FontBBox));
        // UniqueID
        // XUID

        if(ftype==1){
          if(!checkEntry('PaintType'))return;
          if(!checkEntry('CharStrings'))return;
          if(!checkEntry('Private'))return;
          //■Adobe Type 1 Font Format に対応する必要がある
        }
      }

    },
    // ■TODO: definefont undefinefont composefont
    //   FontDirectory GlobalFontDirectory
    //   findencoding StandardEncoding ISOLatin1Encoding
    //   setcachedevice setcachedevice2 setcharwidth
    //--------------------------------------------------------------------------
    stringwidth:function stringwidth(proc){
      var font=proc.graphics.gstate.font;
      if(font==null){
        proc.onerror("invalidfont","font is not set");
        return;
      }

      var text=font.Decode(proc.stk.pop());
      proc.stk.push.apply(proc.stk,font.GetStringRawSize(text));
    },
    show:function show(proc){
      var font=proc.graphics.gstate.font;
      if(font==null){
        proc.onerror("invalidfont","font is not set");
        return;
      }
      var text=font.Decode(proc.stk.pop());

      var smove=font.GetStringMove(text);
      font.fillText(proc.graphics,text,smove);
      ns.AffineA.dtransformD(smove,font.matrix);
      proc.graphics.rmoveto(smove[0],smove[1]);
    },
    ashow:function ashow(proc){
      var font=proc.graphics.gstate.font;
      if(font==null){
        proc.onerror("invalidfont","font is not set");
        return;
      }
      var text=font.Decode(proc.stk.pop());
      var dy=parseFloat(proc.stk.pop());
      var dx=parseFloat(proc.stk.pop());

      var pos=[0,0];
      for(var i=0;i<text.length;i++){
        var c=text.charAt(i);
        var move=font.GetStringMove(c);
        font.fillText(proc.graphics,c,move,pos);

        ns.AffineA.dtransformD(move,font.matrix);
        pos[0]+=move[0]+dx;
        pos[1]+=move[1]+dy;
      }
      proc.graphics.rmoveto(pos[0],pos[1]);
    },
    widthshow:function widthshow(proc){
      var font=proc.graphics.gstate.font;
      if(font==null){
        proc.onerror("invalidfont","font is not set");
        return;
      }
      var text=font.Decode(proc.stk.pop());
      var ch=proc.stk.pop()|0;
      var dy=parseFloat(proc.stk.pop());
      var dx=parseFloat(proc.stk.pop());

      var pos=[0,0];
      for(var i=0;i<text.length;i++){
        var c=text.charAt(i);
        var move=font.GetStringMove(c);
        font.fillText(proc.graphics,c,move,pos);

        ns.AffineA.dtransformD(move,font.matrix);
        pos[0]+=move[0];
        pos[1]+=move[1];
        if(ch==text.charCodeAt(i)){
          pos[0]+=dx;
          pos[1]+=dy;
        }
      }
      proc.graphics.rmoveto(pos[0],pos[1]);
    },
    awidthshow:function awidthshow(proc){
      var font=proc.graphics.gstate.font;
      if(font==null){
        proc.onerror("invalidfont","font is not set");
        return;
      }
      var text=font.Decode(proc.stk.pop());
      var dy=parseFloat(proc.stk.pop());
      var dx=parseFloat(proc.stk.pop());
      var ch=proc.stk.pop()|0;
      var cy=parseFloat(proc.stk.pop());
      var cx=parseFloat(proc.stk.pop());

      var pos=[0,0];
      for(var i=0;i<text.length;i++){
        var c=text.charAt(i);
        var move=font.GetStringMove(c);
        font.fillText(proc.graphics,c,move,pos);

        ns.AffineA.dtransformD(move,font.matrix);
        pos[0]+=move[0]+dx;
        pos[1]+=move[1]+dy;
        if(ch==text.charCodeAt(i)){
          pos[0]+=cx;
          pos[1]+=cy;
        }
      }
      proc.graphics.rmoveto(pos[0],pos[1]);
    },
    kshow:function kshow(proc){
      var font=proc.graphics.gstate.font;
      if(font==null){
        proc.onerror("invalidfont","font is not set");
        return;
      }
      var text=font.Decode(proc.stk.pop());
      var exec=proc.stk.pop();

      for(var i=0;i<text.length;i++){
        if(i>0){
          proc.stk.push(text.charCodeAt(i-1));
          proc.stk.push(text.charCodeAt(i));
          proc.process(exec);
        }

        var c=text.charAt(i);
        var move=font.GetStringMove(c);
        font.fillText(proc.graphics,c,move);
        ns.AffineA.dtransformD(move,font.matrix);
        proc.graphics.rmoveto(move[0],move[1]);
      }
    },
    cshow:function cshow(proc){
      var font=proc.graphics.gstate.font;
      if(font==null){
        proc.onerror("invalidfont","font is not set");
        return;
      }
      var text=font.Decode(proc.stk.pop());
      var exec=proc.stk.pop();

      for(var i=0;i<text.length;i++){
        var c=text.charAt(i);
        var move=font.GetStringMove(c);
        ns.AffineA.dtransformD(move,font.matrix);

        proc.stk.push(text.charCodeAt(i),move[0],move[1]);
        proc.process(exec);
      }

      proc.graphics.gstate.font=font; // restore
    },
    xyshow:function xyshow(proc){
      var font=proc.graphics.gstate.font;
      if(font==null){
        proc.onerror("invalidfont","font is not set");
        return;
      }
      var arr=proc.stk.pop();
      var text=font.Decode(proc.stk.pop());

      // typecheck
      if(arr instanceof ns.PsArray){
        if(arr.length<2*text.length){
          proc.onerror("rangecheck","operand2/2: an array is too short");
          return;
        }
        arr=arr.data.slice(arr.offset,arr.offset+text.length*2);
      }else if(arr instanceof ns.PsString){
        //■TODO: Encoded Number String に対応
        proc.onerror("notimplemented","operand2/2: encoded number string");
        return;
      }else{
        proc.onerror("typecheck","operand2/2: an array or an encoded number string is expected.");
        return;
      }

      var pos=[0,0];
      for(var i=0;i<text.length;i++){
        var c=text.charAt(i);
        var move=font.GetStringMove(c);
        font.fillText(proc.graphics,c,move,pos);

        pos[0]+=arr[2*i];
        pos[1]+=arr[2*i+1];
      }
      proc.graphics.rmoveto(pos[0],pos[1]);
    },
    yshow:function yshow(proc){
      var font=proc.graphics.gstate.font;
      if(font==null){
        proc.onerror("invalidfont","font is not set");
        return;
      }
      var arr=proc.stk.pop();
      var text=font.Decode(proc.stk.pop());

      // typecheck
      if(arr instanceof ns.PsArray){
        if(arr.length<text.length){
          proc.onerror("rangecheck","operand2/2: an array is too short");
          return;
        }
        arr=arr.data.slice(arr.offset,arr.offset+text.length);
      }else if(arr instanceof ns.PsString){
        //■TODO: Encoded Number String に対応
        proc.onerror("notimplemented","operand2/2: encoded number string");
        return;
      }else{
        proc.onerror("typecheck","operand2/2: an array or an encoded number string is expected.");
        return;
      }

      var pos=[0,0];
      for(var i=0;i<text.length;i++){
        var c=text.charAt(i);
        var move=font.GetStringMove(c);
        font.fillText(proc.graphics,c,move,pos);

        pos[1]+=arr[i];
      }
      proc.graphics.rmoveto(pos[0],pos[1]);
    },
    xshow:function xshow(proc){
      var font=proc.graphics.gstate.font;
      if(font==null){
        proc.onerror("invalidfont","font is not set");
        return;
      }
      var arr=proc.stk.pop();
      var text=font.Decode(proc.stk.pop());

      // typecheck
      if(arr instanceof ns.PsArray){
        if(arr.length<text.length){
          proc.onerror("rangecheck","operand2/2: an array is too short");
          return;
        }
        arr=arr.data.slice(arr.offset,arr.offset+text.length);
      }else if(arr instanceof ns.PsString){
        //■TODO: Encoded Number String に対応
        proc.onerror("notimplemented","operand2/2: encoded number string");
        return;
      }else{
        proc.onerror("typecheck","operand2/2: an array or an encoded number string is expected.");
        return;
      }

      var pos=[0,0];
      for(var i=0;i<text.length;i++){
        var c=text.charAt(i);
        var move=font.GetStringMove(c);
        font.fillText(proc.graphics,c,move,pos);

        pos[0]+=arr[i];
      }
      proc.graphics.rmoveto(pos[0],pos[1]);
    }
  });
  //****************************************************************************
  //	Engine
  //----------------------------------------------------------------------------
  ns.ProcOption=function(){
  };
  agh.memcpy(ns.ProcOption.prototype,{
    MwgAllowAutoBind:false,
    MwgAllowInlining:false,
    SetMwgOptimization:function(flags){
      for(var i=0,iN=flags.length;i<iN;i++){
        switch(flags.charAt(i)){
          case 'b':this.MwgAllowAutoBind=true;break;
          case 'B':this.MwgAllowAutoBind=false;break;
          case 'i':this.MwgAllowInlining=true;break;
          case 'I':this.MwgAllowInlining=false;break;
        }
      }
    }
  });

  ns.Processor=function(info){
    this.stk_wgen=[];
    this.stk=[];
    this.scope=new ns.Scope();
    this.option=new ns.ProcOption();

    this.m_filestk=[];
    this.m_blklv=-1;
    this.m_blkstk=[];

    this.m_stop=false; // exit/stop/quit

    this.m_wstack=[]; // for debug trace

    this.InitGraphics('target' in info?info.target:'svg');
    if('bb' in info&&info.bb instanceof Array){
      this.graphics.SetBoundingBox.apply(this.graphics,info.bb);
    }
    if('size' in info&&info.size instanceof Array){
      this.graphics.SetDisplaySize(info.size[0],info.size[1]);
    }

    // 2014-12-13 font
    this.m_fontDirectory={};
  };
  agh.memcpy(ns.Processor.prototype,{
    wgen:null,
    stk_wgen:null,
    push_wgen:function(wgen){
      if(this.wgen!=null)
        this.stk_wgen.push(this.wgen);
      this.wgen=wgen;
    },
    pop_wgen:function(){
      if(this.stk_wgen.length>0)
        this.wgen=this.stk_wgen.pop();
      else
        this.wgen=null;
    },
    next_word:function(){
      while(this.wgen!=null){
        var w=this.wgen.next();
        if(w!=null)return w;
        this.pop_wgen();
      }
      return null;
    },
    outstream:function(){},
    errstream:function(text){
      this.outstream(text);
    },
    onerror:function(name,desc){
      this.m_stop='stop';
      var buff=['error'];
      for(var i=this.m_wstack.length-1;i>=0;i--){
        var w=this.m_wstack[i];
        if(w instanceof Object&&'iL' in w){
          buff.push('@(')
          buff.push(w.file)
          buff.push(':');
          buff.push(w.iL);
          buff.push('.');
          buff.push(w.iC);
          buff.push(')');
        }else if(agh.is(w,Function)){
          buff.push('@');
          buff.push(to_ps(w));
        }else{
          buff.push('@?'+w);
        }
      }

      buff.push(':');
      buff.push(name);
      if(desc!=null){
        buff.push(': ');
        buff.push(desc);
      }

      this.errstream(buff.join(''));
    },
    //--------------------------------------------
    InitGraphics:function(type){
      if(agh.is(type,String)){
        switch(type.toLowerCase()){
        case "vml":
          this.graphics=new agh.PostScript.GraphicsVml();
          return;
        case "svg":
          this.graphics=new agh.PostScript.GraphicsSvg();
          return;
        }
      }else if(type!=null&&'tagName' in type){
        // HTML 要素 -> canvas
        //alert('dbg: GraphicsCanvas');
        this.graphics=new agh.PostScript.GraphicsCanvas(type);
        return;
      }

      this.errstream("error:InitGraphics(): unrecognized output type '"+type+"'");
    },
    //--------------------------------------------
    reg_comment_bb:new RegExp(
      "^{0}\\%{0}BoundingBox{0}\\:{0}:N{1}:N{1}:N{1}:N"
        .replace(/\:N\b/g,"([-+]?[\\d.]+)")
        .replace(/\{0\}/g,"[ \\t]*")
        .replace(/\{1\}/g,"[ \\t]+")
    ),
    reg_comment_MwgOptimization:new RegExp(
      "^{0}\\%{0}MwgOptimization{0}\\:{0}(\\S+)"
        .replace(/\{0\}/g,"[ \\t]*")
    ),
    /*
    Run:function Run(text){
      this.push_wgen(new ns.ScannerF(text,this));
      //this.scope.push_dict(new ns.PsDict());
      this.m_block_lv=0;
      this.m_block=null;
      var w=null;
      while((w=this.next_word())!=null){
        //window.log(w);
        if(w instanceof ns.PsComment){
          var m=null;
          if(m=this.reg_comment_bb.exec(w.text)){
            this.graphics.SetBoundingBox(
              parseFloat(m[1]),parseFloat(m[2]),
              parseFloat(m[3]),parseFloat(m[4]));
          }
          continue;
        }
        this.process(w);
        if(this.m_stop){
          if(this.m_stop=='exit')this.onerror("invalidexit");
          this.m_stop=false;
          break;
        }
      }
      //this.scope.pop_dict(this);
    },
    //*/
    Run:function Run(text){
      //var scanner=new ns.Scanner(text,this);
      this.m_blklv=-1;
      this.m_blkstk=[];
      this.m_inittime=new Date().getTime();

      this.runfile(text);
      if(this.m_stop){
        if(this.m_stop=='exit')this.onerror("invalidexit");
        this.m_stop=false;
      }

      this.scope.userdict.clear();
      this.option=new ns.ProcOption();
      //window.log(agh.keys(this.scope.systemdict.userdict.data));
      //window.log(this.scope.systemdict.userdict.toPs2());
      //window.log(this.scope.globaldict.toPs2());
      //window.log(this.scope.systemdict.toPs2());
    },
    runfile:function runfile(file){
      var scanner=new ns.ScannerF(file,this);
      this.m_filestk.push(scanner.file);
      var w=null;
      while((w=scanner.next())!=null){
        if(w instanceof ns.PsComment){
          var m=null;
          if(m=this.reg_comment_bb.exec(w.text)){
            this.graphics.SetBoundingBox(
              parseFloat(m[1]),parseFloat(m[2]),
              parseFloat(m[3]),parseFloat(m[4]));
          }else if(m=this.reg_comment_MwgOptimization.exec(w.text)){
            this.option.SetMwgOptimization(m[1]);
          }
          continue;
        }
        this.process(w);
        if(this.m_stop)break;
      }
      this.m_filestk.pop();
    },
    process:function process(w){
      this.m_wstack.push(w);
      if(this.m_blklv<0){
        if(w.__xaccess__){
          if(w instanceof ns.PsName){
            var val=this.scope.get_val(this,w.name);
            if(val!=null)
              this.process(val,w);
          }else if(w instanceof ns.PsArray){
            // dbg
            //* // w.execute_function(this);
              if(w.__funcver__!=w.data.ver)
                w.compile_function(this);
              w.__function__(this,w.__funcargs__);
            /*/
              for(var i=0;i<w.length;i++){
                var w2=w.data[w.offset+i];
                if(w2.__xaccess__&&!(w2 instanceof ns.PsArray)||w2 instanceof Function){
                  this.process(w2);
                  if(this.m_stop)break;
                }else
                  this.stk.push(w2);
              }
            //*/
          }else if(w instanceof ns.PsString){
            var cscan=new ns.ScannerF(w.toString(),this);
            var w2=null;
            while(w2=cscan.next()){
              if(w2 instanceof ns.PsComment)continue;
              this.process(w2);
              if(this.m_stop)break;
            }
          }else if(w==MARK_PROC_BEGIN){
            this.m_blklv=0;
            this.m_blkstk.push([]);
          }else if(w==MARK_PROC_END){
            this.onerror("syntaxerror","unexpected '}'. The corresponding '{' does not exist.");
          }else if(!(w instanceof ns.PsNull)){
            this.stk.push(w);
          }
        }else if(w instanceof Function){
          w(this);
        }else{
          this.stk.push(w);
        }
      }else{
        //---- { } で囲まれている部分は実行せずに、実行可能配列に格納
        if(w==MARK_PROC_BEGIN){
          this.m_blklv++;
          this.m_blkstk.push([]);

          this.m_wstack.pop();return;
        }else if(w==MARK_PROC_END){
          this.m_blklv--;
          var a=new ns.PsArray(this.m_blkstk.pop());
            a.__xaccess__=true;
            a.file=w.file;
            a.iL=w.iL;
            a.iC=w.iC;
            //■TODO: whether a procedure is defaultly packed? device 設定
          w=a;

          if(this.m_blklv<0){
            this.stk.push(w);

            this.m_wstack.pop();return;
          }
        }else if(w.__imediate__){
          var val=this.scope.get_val(this,w.name);
          if(val==null){
            this.onerror("undefined","'"+w.name+"'");
          }else{
            w=val;
          }
        }

        this.m_blkstk[this.m_blklv].push(w);
      }
      this.m_wstack.pop();
    },
    _:0
  });
  //============================================================================
  ns.systemdict.update_length();
  ns.Optimizer.initialize();
  /*

    ■ Clippnig path の実装

  */

});

