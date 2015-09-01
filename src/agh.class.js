//******************************************************************************
//
//      MWG 2.0 - class            K. Murase
//
//******************************************************************************
/// <reference path="agh.js"/>
agh.scripts.register("agh.class.js",["agh.js"],function(){
//==============================================================================
agh.Class=function Class(name,base,members){
  /// <summary name="agh.Class">
  /// 他のクラスを継承したクラスを作成します。
  /// </summary>
  /// <param name="base" optional="true">基底クラス (のコンストラクタ) を指定します。</param>
  /// <param name="members">
  ///   prototype に登録するメンバを指定します。
  ///   <p>コンストラクタとして constructor メンバに関数を指定できます ※2。
  ///   省略した場合は既定のコンストラクタが使用されます。</p>
  ///   <p>constructor 以外の override する関数の関数名は override として下さい。※1</p>
  ///   <p>プロパティの getter/setter 関数として登録したい場合には、関数名を getter/setter として下さい。※1</p>
  ///   <p>基底関数 (同名の基底クラスのメンバ関数) を呼び出したい時は、callbase 関数が便利です。</p>
  /// </param>
  /// <returns>新しく作成したクラス (のコンストラクタ) を返します。</returns>
  /// <remarks>※1
  /// 例えば、override という名の関数名で登録する方法として、以下に二例を提示しておきます。
  /// <ul>
  /// <li>agh.Class(className,baseClass,{hoge:function override(){ ... }});</li>
  /// <li>function method(){ ... }
  /// method.name="override";
  /// agh.Class(className,baseClass,{hoge:method});</li>
  /// </ul>
  /// </remarks>
  /// <remarks>※2 constructor を定義する際の注意
  /// 基底クラスの初期化を行う為に constructor 内で this.base(...) を呼び出す様にして下さい。
  /// this.base を呼び出した後は this.base は基底クラスの関数を公開するオブジェクトに置き換えられます。
  /// override した関数などは this.base.func.call(this,...) 等として呼び出す事が可能になります。
  /// </remarks>
  /// <remarks>
  /// ・既存の特別な型 (Boolean, Number, String, Function, RegExp, Array, Date 等) や、
  /// 　ブラウザの提供するオブジェクト (HTMLElement 等) から継承する事は出来ません。
  /// ・基底クラスのコンストラクタが return obj する形式の場合には、対応していません。
  /// ・this.base を通じて基底クラスのメンバを追加・設定する事は出来ません。
  /// 　例: this.base.some_method=function(){};
  /// 　　→this.base には追加されるが、基底クラスのメンバとして追加される訳ではない。
  /// 　例: this.base.member.x=10;
  /// 　　→基底クラスのメンバ member が変更される
  /// </remarks>
  /// <exception>[definition of class 'className': No this.base call in constructor.]
  /// this.base 関数の呼出がコンストラクタ内に無い可能性があります。
  /// 以下の何れかの形式で base 関数を呼び出す様にして下さい。
  /// ・this.base(...);
  /// ・this.base.apply(this,...);
  /// ・this.base.call(this,...);
  /// 別のメソッドから呼び出す場合など、意図的に this.base 呼出を行わない時は、
  /// コメントで
  /// this.init(); /* this.base() はこの中で呼び出される */
  /// 等として誤魔化しておいて下さい。
  /// </exception>
  var newclass=members.constructor;
  if(!agh.is(newclass,Function)||newclass==Object){
    newclass=members.constructor=function(){
      /* constructor is not specified */
      this.base.apply(this,arguments);
    };
  }
  if(!newclass.toString().match(/\bthis\s*\.\s*base\s*(?:\.\s*apply|\.\s*call)?\(/)){
    throw new Error("definition of class '"+name+"': No this.base call in constructor.");
  }
  
  // newclass.base
  //--------------------------------------------
  if(agh.is(base,Function)){
    newclass.base=base;
  }else{
    newclass.base=Object;
    if(!members.hasOwnProperty("toString")){
      members.toString=function override(){
        var name=this.constructor.className;
        if(agh.is(name,String))return "[object "+name+"]";
        return this.callbase();
      };
    }
    agh.memcpy(members,{
      __add:function sealed(name,obj,func){
        /// <summary>
        /// イベントハンドラの登録を行います。
        /// </summary>
        /// <param name="name">登録先のイベント名を指定します。</param>
        /// <param name="obj">func に this 参照として渡すオブジェクトを指定します。</param>
        /// <param name="func">イベントハンドラの関数を指定します。</param>
        if(arguments.length===3&&typeof func==="function"){
          this.__event__.add(name,obj,func);
        }else if(arguments.length===2&&typeof obj==="function"){
          this.__event__.add(name,this,obj);
        }else{
          throw new Error("agh.class ("+newclass.className+"#__add): invalid arguments.");
        }
      },
      __remove:function sealed(name,obj,func){
        /// <summary>
        /// イベントハンドラの登録を解除します。
        /// </summary>
        /// <param name="name">登録先のイベント名を指定します。</param>
        /// <param name="obj">登録時に指定したオブジェクトを指定します。</param>
        /// <param name="func">登録時に指定した関数を指定します。</param>
        this.__event__.remove(name,obj,func);
      },
      __fire:function sealed(name,e){
        /// <summary>
        /// イベントを発火させます。
        /// </summary>
        /// <param name="name">発火させるイベントの名前を指定します。</param>
        /// <param name="e">イベントの詳細を記述するオブジェクトを指定します。</param>
        this.__event__.fire(name,e);
      }
    });
  }
  var base_ctor=newclass.base;
  var base_base=newclass.base.prototype.base;
  var base_proto=newclass.base.prototype;

  // newclass.toString
  //--------------------------------------------
  var original_tostr=newclass.toString();
  newclass.toString=function(){
    return "[class "+name+"]\r\n"+original_tostr;
  };
  newclass.className=name;
  newclass.eventNames=[];
  var eventNames=newclass.eventNames;
  
  // newclass#members
  //--------------------------------------------
  newclass.prototype=agh.wrap(base_proto,members);
  var mc=new agh.Class.MemberCollection(newclass);
  for(var memberName in members)
    mc.initializeMember(memberName);
  mc.setupProperties();

  // for(var k in members){
  //   var mem=members[k];
  //   if(agh.is(mem,Function)){
  //     agh.Class.Method(newclass,k,mem);
  //   }
  // }

  // newclass#base
  //---------------------------------------------------------------------------
  /// @fn newclass#base(...)
  ///   基底クラスのコンストラクタを呼び出します。
  ///   コンストラクタから一回だけ呼び出される事を想定しています。
  ///   呼び出しの後は、後述の this.base オブジェクトに置き換えられます。
  /// @var newclass#base
  ///   this.base(...) 呼出後に基底クラスのメンバにアクセスする為のオブジェクトが設定されます。
  ///   基底クラスのメソッドを this.base.method(...) 等として呼び出す事ができます。
  /// @remarks
  ///   this.base.method() などとして呼び出す事ができるメソッドは、
  ///   クラス生成 (agh.Class 呼出) 時点で基底クラスの prototype に存在するメソッドだけです。
  ///   クラス生成後に基底クラスの prototype に新規追加されたメソッドや、
  ///   インスタンス生成後に動的に追加されたメソッドは含まれません。
  ///   クラス生成後に基底クラスの prototype に新規追加されたメソッドは、以下の様にして呼び出す事ができます。
  ///     this.base.added_method.apply(this,...);
  ///   インスタンス生成後に動的に追加されたメソッドは、単に以下の様に呼び出して下さい。
  ///     this.added_method(...);
  /// @remarks
  ///   this.base.field とすると基底クラスの prototype に定義されたフィールドにアクセスできます。
  ///   但し値の設定をしても、本インスタンスには影響しません。
  ///   (※最近のブラウザでは defineProperty, __defineGetter__, __defineSetter__ でできるかもしれないが、
  ///   IE6 ではどうせ対応できないので、IE6 でも実現できる動作とする。)

  // ※ 継承元の base 関数を上書きする為、
  // 継承元メンバコピーよりも後に newclass.base に追加する。
  newclass.prototype.base=function(){
    this.base=base_base; // 基底クラスの base 関数
    base_ctor.apply(this,arguments);

    this.base=new BaseMethodsDelegator(this,this.base);
    // ※ 多段継承の場合は既に this.base が割り当てられている。
    // → これを this.base.base に設定
    
    // イベントの初期化
    if(!this.__event__)
      this.__event__=new agh.Class.EventTable(this);
  };
  function BaseMethodsDelegator(instance,base){
    /// @class BaseMethodsDelegator
    ///   インスタンスメソッド内から this.base で参照されるオブジェクトを初期化します。
    ///   基底クラスのメソッドを公開します。
    ///   @param[in] instance 基底クラスのメソッドを呼び出す時に使用する this オブジェクトを指定します。
    ///   @param[in] base     this.base.base でアクセスされるオブジェクトを指定します。
    this['[[instance]]']=instance;

    // base が "基底クラスの BaseMethodsDelegator" インスタンスの場合:
    // ※ "基底クラスの BaseMethodsDelegator" != "このクラスの BaseMethodsDelegator"
    //    なので、判定は base instanceof BaseMethodsDelegator では駄目
    if(base&&'[[instance]]' in base)
      this.base=base; // クラスメンバ内から this.base.base でアクセスされる
  }
  BaseMethodsDelegator.prototype=agh.wrap(base_proto);
  BaseMethodsDelegator.prototype.constructor=BaseMethodsDelegator;
  for(var _name in base_proto){
    try{
      var _member=base_proto[_name];
    }catch(ex){
      // prototype (初期化していない) 上で
      // プロパティの getter が呼び出されて例外が発生する事がある。
      continue;
    }

    if(typeof _member==='function'&&!(_member instanceof RegExp))
      with({_name:_name})
        BaseMethodsDelegator.prototype[_name]=function(){
          // base_proto が上書きされているかも知れないので
          // base_proto[_name] で再度メソッドを取得する。
          var _method=base_proto[_name];

          // クラスメソッド内での this.base
          //   this.base.method() と呼び出された時は "この関数の this"
          //   this.base.method.apply(this) で呼び出された時は "この関数の this.base"
          var _base=(this instanceof BaseMethodsDelegator)?this:this.base;
          base_proto[_name].apply(_base['[[instance]]'],arguments);
        };
  }
  //---------------------------------------------------------------------------
  /// @fn newclass#callbase
  ///   newclass のメソッド内から呼び出します。
  ///   呼出元と同名の基底クラスのメソッドを呼び出します。
  newclass.prototype.callbase=function(_params){
    /// <summary>
    /// override している基底関数を実行します。
    /// 基底関数を持つメンバ関数の中から呼び出して下さい。
    /// メンバ関数以外から呼び出した場合や、基底関数が存在しない場合には例外を発生させます。
    /// </summary>
    /// <param name="_params">基底関数に渡す引数を可変長で指定します。</param>
    var _meth=arguments.callee.caller;
    var info=_meth.memberInfo;
    var vf=info&&info.baseMethod;
    
    if(!agh.is(vf,Function)){
      // 基底関数がない時
      if(!agh.is(info.fullName,String))
        throw new Error("Method 'callbase' should be called from a instance method.");
      throw new Error("There is no base-method for the method '"+info.fullName+"'.");
    }
    
    return vf.apply(this,arguments);
  };
  
  return newclass;
};

agh.Class.MemberCollection=(function(){
  function MemberInfo(_class,name,type){
    this.parentClass=_class;
    this.memberType=type;
    this.memberName=name;
    this.fullName=_class.className+"#"+name;
  }

  function FieldInfo(_class,name){
    MemberInfo.call(this,_class,name,'field');
  }
  FieldInfo.prototype=agh.wrap(MemberInfo.prototype);
  FieldInfo.prototype.constructor=FieldInfo;

  function PropertyInfo(_class,name){
    MemberInfo.call(this,_class,name,'property');
    this.get=null;
    this.set=null;
  }
  PropertyInfo.prototype=agh.wrap(MemberInfo.prototype);
  PropertyInfo.prototype.constructor=PropertyInfo;

  function MethodInfo(_class,name){
    MemberInfo.call(this,_class,name,'method');

    this.method=_class.prototype[name];
    this.method.fullName=this.fullName;
    this.baseMethod=null;
    try{
      this.baseMethod=_class.base.prototype[name];
    }catch(ex){/* exception in getter of name? */}

    // 当初 $ を区切として使用していたが、
    //   $ を使うと IE8 で関数名を取得できない事が分かった。
    this.modifiers=this.method.get_name().split('$');
    this.isGetter  =agh.Array.contains(this.modifiers,'getter');
    this.isSetter  =agh.Array.contains(this.modifiers,'setter');
    this.isSealed  =agh.Array.contains(this.modifiers,'sealed');
    this.isEvent   =agh.Array.contains(this.modifiers,'event');
    this.isOverride=agh.Array.contains(this.modifiers,'override');

    this.method.memberInfo=this;
  }
  MethodInfo.prototype=agh.wrap(MemberInfo.prototype);
  MethodInfo.prototype.constructor=MethodInfo;

  function MemberCollection(_class){
    this._class=_class;
    this._base=_class.base.members;
    if(!(this._base instanceof MemberCollection))this._base=null;
    this._data={};
    
    _class.members=this;
  }
  agh.memcpy(MemberCollection.prototype,{
    _createFieldInfo:function(fieldName){
      if(this._data[fieldName] instanceof MemberInfo)
        throw new Error("agh.Class ("+this._class.className+"#"+fieldName+"): the member is already defined");
      else
        return this._data[fieldName]=new FieldInfo(this._class,fieldName);
    },
    _createMethodInfo:function(methodName){
      if(this._data[methodName] instanceof MemberInfo)
        throw new Error("agh.Class ("+this._class.className+"#"+methodName+"): the member is already defined");
      else
        return this._data[methodName]=new MethodInfo(this._class,methodName);
    },
    _createPropertyInfo:function(propertyName){
      if(this._data[propertyName] instanceof PropertyInfo)
        return this._data[propertyName];
      else if(this._data[propertyName] instanceof MemberInfo)
        throw new Error("agh.Class ("+this._class.className+"#prop:"+propertyName+"): the member is already defined");
      else
        return this._data[propertyName]=new PropertyInfo(this._class,propertyName);
    },
    _initializeMethod:function(methodName){
      var info=this._createMethodInfo(methodName);

      // check overriding
      if(methodName!='constructor'&&info.baseMethod){
        if(!info.isOverride)
          throw new Error("agh.Class ("+info.fullName+"): overriding a method "+info.fullName+" without notice.");

        var base_minfo=info.baseMethod.memberInfo;
        if(base_minfo instanceof MethodInfo&&base_minfo.isSealed)
          throw new Error("agh.Class ("+info.fullName+"): overriding a sealed method "+info.fullName+".");
      }

      // register property
      if(info.isGetter||info.isSetter){
        var propertyName=methodName.replace(info.isGetter?/^get_?/:/^set_?/,"");
        if(propertyName===methodName)
          throw new Error("agh.Class ("+info.fullName+"): the member name of getter/setter method should starts with get/set.");

        var pinfo=this._createPropertyInfo(propertyName);
        pinfo[info.isGetter?'get':'set']=info.isSealed?info.method:function(){return this[methodName].apply(this,arguments);};
      }

      // check if is OnEvent
      if(info.isEvent){
        var eventName=methodName.replace(/^[Oo]n/,"");
        if(eventName===methodName)
          throw new Error("agh.Class ("+info.fullName+"): the member name of event method should starts with get/set.");

        this._class.eventNames.push(eventName);
      }

      return info;
    },
    initializeMember:function(name){
      if(name=='constructor')return;

      if(agh.is(this._class.prototype[name],Function))
        return this._initializeMethod(name);
      else
        return this._createFieldInfo(name);
    },
    setupProperties:function(){
      // collect property descriptors
      var descriptors={};
      for(var propertyName in this._data){
        var pinfo;
        if((pinfo=this._data[propertyName]) instanceof PropertyInfo){
          var desc={enumerable:true,configurable:true};
          if(pinfo.get)desc.get=pinfo.get;
          if(pinfo.set)desc.set=pinfo.set;

          // 片方は継承し、片方は override するケース:
          if(this._base&&(!desc.get||!desc.set)){
            var baseProperty=this._base.getMemberInfo(propertyName);
            if(baseProperty instanceof PropertyInfo){
              if(!desc.get&&baseProperty.get)
                desc.get=baseProperty.get;
              if(!desc.set&&baseProperty.set)
                desc.set=baseProperty.set;
            }
          }

          descriptors[propertyName]=desc;
        }
      }

      // register descriptors
      var cls_proto=this._class.prototype;
      if(Object.defineProperties){
        Object.defineProperties(cls_proto,descriptors);
      }else if(Object.defineProperty&&!(agh.browser.vIE<=8)){
        var props=agh.ownkeys(descriptors);
        for(var i=0;i<props.length;i++){
          var propertyName=props[i];
          Object.defineProperty(cls_proto,propertyName,descriptors[propertyName]);
        }
      }else if(cls_proto.__defineGetter__){
        var props=agh.ownkeys(descriptors);
        for(var i=0;i<props.length;i++){
          var propertyName=props[i];
          var desc=descriptors[propertyName];
          if(desc.get)
            cls_proto.__defineGetter__(propertyName,desc.get);
          if(desc.set)
            cls_proto.__defineSetter__(propertyName,desc.set);
        }
      }
    },
    getMemberInfo:function(name){
      if(this._data[name])
        return this._data[name];
      else if(this._base)
        return this._base.getMemberInfo(name);
      else
        return false;
    }
  });

  agh.Class.MemberInfo  =MemberInfo;
  agh.Class.FieldInfo   =FieldInfo;
  agh.Class.PropertyInfo=PropertyInfo;
  agh.Class.MethodInfo  =MethodInfo;
  return MemberCollection;
})();

(function(){
  agh.Class.EventTable=function(sender){
    this.m_sender=sender;
    this.m_table={};
  };
  agh.memcpy(agh.Class.EventTable.prototype,{
    m_sender:null,
    m_table:null,
    add:function(name,obj,func){
      if(!(name in this.m_table))
        this.m_table[name]=[];
      this.m_table[name].push({obj:obj,func:func});
    },
    remove:function(name,obj,func){
      if(!(name in this.m_table))return;
      var arr=this.m_data[name];
      var i=agh.Array.indexOf(arr,function(p){
        return p.obj==obj&&p.func==func;
      });
      if(i<0)return false;
      agh.Array.remove_atD(arr,i);
      return true;
    },
    fire:function(name,e){
      /// <summary>イベントを発火させます。</summary>
      /// <param name="e">
      /// イベントに関する情報を保持するオブジェクトを指定します。
      /// </param>
      if(!(name in this.m_table))return;
      var data=this.m_table[name];
      if(e==null)e={};
      for(var i=0;i<data.length;i++){
        var p=data[i];
        try{
          p.func.call(p.obj,this.m_sender,e);
        }catch(ex){
          try{agh.scripts.invoke_onerror(p.func,ex);}catch(ex){}
        }
      }
      return e;
    }
  });
})();
//==============================================================================
});
//------------------------------------------------------------------------------
