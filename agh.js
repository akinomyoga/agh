//******************************************************************************
//
//  Ageha JavaScript Library 3.1                                     - K. Murase
//
//******************************************************************************
// TODO: start,end を使用する物は、IntRange でも指定する事が出来る様に拡張する?
// TODO: http://www.ruby-lang.org/ja/man/html/Array.html
// TODO: http://www.ruby-lang.org/ja/man/html/_C1C8A4DFB9FEA4DFA5AFA5E9A5B9A1BFA5E2A5B8A5E5A1BCA5EBA1BFCEE3B3B0A5AFA5E9A5B9.htm
//------------------------------------------------------------------------------
(function(window) {
  if (typeof window === "object"
     && window.agh instanceof Function
     && window.agh.scripts
     && window.agh.scripts.isready("agh")) return window.agh;
  var THIS_FILE = "agh.js";
  var agh;
//------------------------------------------------------------------------------
/*? API List
 *
 *  @fn agh(obj)
 *    オブジェクト obj の機能を拡張します
 *
 *  @fn agh(obj,type,...)
 *    オブジェクト obj を type で指定された形式に変換します。
 *
 *    @deprecated[mwg-2.0] mwg.dynamic_cast[type](obj,...)
 *
 *  @fn agh.registerAgehaExtension(fun)
 *    agh(obj) の処理関数 fun() を追加します。
 *
 *    @param[in] fun 拡張関数を指定します。 {
 *      @param[in] this 関数 fun 内では、拡張対象 obj は this として参照できます。
 *    }
 *
 *    @deprecated[agh-3.1] agh.__AddExt__(fun)
 *
 *  @fn agh.registerAgehaCast(type,fun)
 *    agh(obj,type,...) の変換関数 fun(...) を追加します。
 *
 *    @param[in] fun 変換関数を指定します。 {
 *      @param[in] this 関数 fun 内では、変換対象 obj は this として参照できます。
 *      @remarks
 *        agh(obj,type) に obj = null が与えられた場合、agh は変換関数を呼び出さずにそのまま null を返します。
 *        agh(obj,type) で obj が既に型 type の場合は、agh は変換関数を呼び出さずにそのまま obj を返します。
 *        従って、this については以下が成立する事に注意して下さい。
 *        assert(this != null && !agh.is(this,type));
 *
 *      @param[in] arguments
 *        残りの引数には agh(obj,type,...) に渡された可変長部分が渡されます。
 *    }
 *
 *    @deprecated[mwg-2.0] mwg.dynamic_cast.__AddClass(type,fun) // fun の形式に変更あり
 *    @deprecated[agh-3.1] agh.__AddCast__(type,fun)
 *
 *  @fn agh.is(obj)
 *    obj が非 null かどうかを判定します。
 *    @return obj が null の時に false を返します。それ以外の場合に true を返します。
 *
 *    @deprecated[mwg-2.0] Object.IsNull(o)
 *
 *  @fn agh.is(obj,type)
 *    obj が type インスタンスである事を確認します。
 *    @remarks
 *      type = Number, String, Boolean に対しては typeof obj == "type" || obj instanceof type などに等価です。
 *      それ以外の場合は obj instanceof type に等価です。
 *
 *    @deprecated[mwg-2.0] mwg.is_type(obj,type)
 *
 *  @class agh.Namespace
 *
 *  @fn agh.Namespace(name,target)
 *    新しい名前空間を target[name] に作成します。
 *    name を省略した場合は自動的に名前を割り振ります。
 *    @return 作成した名前空間の名称を返します。
 *
 *  @fn agh.keys(obj)
 *    @deprecated[agh-3.1] agh.get_keys(obj)
 *
 *  @fn agh.ownkeys(obj)
 *    @deprecated[agh-3.1] agh.get_ownkeys(obj)
 *
 *  @fn agh.memcpy(dst,src,mem)
 *    メンバーのコピーを実行します。
 *    @param[out] dst コピー先のオブジェクトを指定します。null を指定した場合はオブジェクトを新規作成します。
 *    @param[in]  src コピー元のオブジェクトを指定します。
 *    @param[in]  mem コピーするメンバー名を指定します。省略した場合は src の全てのメンバーが dst にコピーされます。
 *    @return dst を返します。dst が null の場合は新しく作成されたオブジェクトを返します。
 *
 *    @deprecated[mwg-2.0] mwg.memcpy (※引数・戻り値変更).
 *    @deprecated[mwg-2.0] mwg.memberwise_clone(obj).
 *      agh.memcpy(null,obj) を使用して下さい。
 *
 *  @fn agh.delegate(obj,func)
 *
 *  @namespace agh.browser
 *
 *  @var agh.browser.vIE
 *    IE version
 *  @var agh.browser.vFx
 *    Firefox version
 *  @var agh.browser.vSf
 *    Safari version
 *  @var agh.browser.vCr
 *    Chrome version
 *  @var agh.browser.vOp
 *    Opera version
 *  @var agh.browser.vTb
 *    Thunderbird version
 *  @var agh.browser.name
 *    ブラウザを表す文字列です。
 *
 *  @var agh.browser.isWk
 *    WebKit か否か
 *  @var agh.browser.isQks
 *    Quarks (後方互換モード) かどうか
 *
 *  @fn agh.browser.select(dict);
 *    @param[in] dict e.g. = {Fx:valueForFirefox, IE:valueForIE, Def:valueDefault}
 *
 *  @fn agh.XMLHttpRequest
 *  @fn agh.addEventListener
 *
 *  @namespace agh.Array
 *  @fn agh.Array.each(arr,func,start,end)
 *  @fn agh.Array.eachR(arr,func,start,end)
 *  @fn agh.Array.map(arr,func,start,end)
 *  @fn agh.Array.filter(arr,func,start,end)
 *  @fn agh.Array.indexOf(arr,func,start,end)
 *  @fn agh.Array.lastIndexOf(arr,func,start,end)
 *  @fn agh.Array.every(arr,func,start,end)
 *  @fn agh.Array.contains(arr,obj,start,end)
 *  @fn agh.Array.remove_if(arr,func,start,end)
 *  @fn agh.Array.remove_ifD(func,start,end)
 *  @fn agh.Array.remove_atD(arr,i)
 *  @fn agh.Array.clone(arr)
 *  @fn agh.Array.first(arr,len)
 *  @fn agh.Array.last(arr,len)
 *  @fn agh.Array.lex_min(arr,start,end)
 *  @fn agh.Array.lex_max(arr,start,end)
 *  @fn agh.Array.max(arr,cmp,start,end)
 *  @fn agh.Array.min(arr,cmp,start,end)
 *  @fn agh.Array.uniqueD(arr,cmp)
 *  @fn agh.Array.unique(arr,cmp)
 *  @fn agh.Array.transpose(arr)
 *    @deprecated[mwg-3.1] Array.transpose(arr)
 *  @fn agh.Array.union(a,b,cmp)
 *    @deprecated[mwg-3.1] Array.union(a,b,cmp)
 *    @deprecated[mwg-2.0] Array#|
 *  @fn agh.Array.intersection(a,b,cmp)
 *    @deprecated[mwg-3.1] Array.intersec(a,b,cmp)
 *    @deprecated[mwg-2.0] Array#&
 *  @fn agh.Array.diff(a,b,cmp)
 *    @deprecated[mwg-3.1] Array.diff(a,b,cmp)
 *    @deprecated[mwg-2.0] Array#-
 *  @fn Array.concat(...)                       // 補完
 *  @fn Array.prototype.lastIndexOf(value,from) // 補完 for IE6
 *
 *
//     ->
//    Array#& -> Array.intersec
//    Array#- -> Array.diff

 *  @var agh.BREAK
 *  @var agh.CONTINUE
 *  - definition for agh(Array.prototype)
 *  - definition for agh(arr)
 *  - definition for agh(obj,Array)
 *
 *  @fn String.prototype.first(length)
 *  @fn String.prototype.last(length)
 *  @fn String.prototype.startsWith(str)
 *  @fn String.prototype.endsWith(str)
 *  @fn String.prototype.$indexOf(pattern,index)
 *  @fn String.prototype.$lastIndexOf(text,index)
 *  @fn String.prototype.trim_l()
 *  @fn String.prototype.trim_r()
 *  @fn String.prototype.trim()
 *  @fn String.prototype.reverse()
 *  @fn String.prototype.insert(index,str)
 *  @fn String.prototype.repeat(len)
 *  @fn String.prototype.$match(regexp,func)
 *  @fn String.prototype.toCharArray()
 *  @fn String.fromCharArray(arr)
 *
 *  @fn String.prototype.tag_bold
 *  @fn String.prototype.tag_italics
 *  @fn String.prototype.tag_fixed
 *  @fn String.prototype.tag_small
 *  @fn String.prototype.tag_blink
 *  @fn String.prototype.tag_strike
 *  @fn String.prototype.tag_sup
 *  @fn String.prototype.tag_sub
 *  @fn String.prototype.tag_color
 *  @fn String.prototype.tag_size
 *  @fn String.prototype.tag_anchor
 *  @fn String.prototype.tag_link
 *  @fn String.prototype.tag_style(style,line,letter)
 *  @fn String.prototype.tag_class(className)
 *
 *  @namespace agh.Text
 *  @fn agh.Text.doubleQuote
 *  @fn agh.Text.Escape(str,type)
 *    @param[in] type "regexp" | "html" | "html-attr" | "xml" | "backslash" | "camel" | "quoted" | "double-quoted"
 *  @fn agh.Text.Unescape
 *    @param[in] type "regexp" | "html" | "backslash" | "camel" | "quoted" | "double-quoted"
 *  @fn agh.Text.ResolveUnicode(code)
 *  @fn agh.Text.ResolveEntity(code)
 *
 *  @namespace agh.Text.Url
 *  @fn agh.Text.Url.Combine:function(a,b);
 *  @fn agh.Text.Url.Directory:function(str);
 *  @fn agh.Text.Url.Parent:function(str);
 *  @fn agh.Text.Url.GetExtension:function(str);
 *  @fn agh.Text.Url.GetFileName:function(str);
 *
 *  - definition for agh(obj,String)
 *  - definition for agh(obj,"HTML")
 *  - definition for agh(obj,"JSON")
 *
 *  @fn Number.prototype.isNaN()
 *  @fn Number.prototype.isFinite()
 *  @var Number.INT_MAX
 *  @var Number.INT_MIN
 *  @var Number.UINT_MAX
 *  @fn Function.prototype.get_name()
 *
 *  @namespace agh.scripts
 *  @fn agh.scripts.wait(files,main)
 *  @fn agh.scripts.register(name,files,main)
 *  @fn agh.scripts.isready(requires)
 *  @fn agh.scripts.load(filename)
 *  @fn agh.scripts.load_js(filename)
 *  @fn agh.scripts.load_css(filename)
 *  @var agh.scripts.AGH_URLBASE
 *  @var agh.scripts.DOCUMENT_HEAD
 *  @var agh.scripts.JGZ_EXTENSION
 */
//------------------------------------------------------------------------------
//  2.0 からの変更点
//    mwg.dynamic_cast[T](x,...)  -> agh(x,T,...)
//    mwg.dynamic_cast[Array](要素1, 要素2, 要素3, ... ) -> new Array(...) または [...]
//    Object.IsNull(o) -> agh.is(o)
//    mwg.is_type      -> agh.is
//    mwg.memcpy : 引数変更 (戻り値: (true/false)→(dst/null))
//    mwg.memberwise_clone(x) -> agh.memcpy(null,x)
//    mwg.browser.isSf -> agh.browser.isWk
//    mwg.browser.is** -> agh.browser.v**
//    mwg.browser.major -> agh.browser.v**
//    mwg.scripts.register/completed -> 統合・仕様変更
//    mwg.scripts.load/require -> 統合
//      require: load に改名
//      load: 戻り値に変更 (一つでも読み込んだか→準備が既に出来ているか)
//    mwg.scripts.wait/add_wait -> 統合・仕様変更
//    Array#min -> Array#lex_min
//    Array#max -> Array#lex_max
//    Array#math_min -> Array#min (引数変更・拡張)
//    Array#math_max -> Array#max (引数変更・拡張)
//    Array#$isEvery -> Array#$every
//    String#* -> String#repeat
//    Number#IsNaN -> Number#isNaN
//------------------------------------------------------------------------------
//******************************************************************************
//    agh 名前空間
//==============================================================================
(function() {
  //--------------------------------------------------------------------------
  // agh(obj, type, params): cast function
  //
  /**
   * @namespace agh
   */
  agh = (function() {
    var cast_table = {};
    var ext = [];
    function agh(obj, type, _params) {
      /// <summary name="agh">
      /// agh ライブラリの基盤となる名前空間です。
      /// 併せて、変換子としての機能を持つ関数でもあります。
      /// </summary>
      /// <param name="obj" type="Object">変換対象のオブジェクトを指定します。</param>
      /// <param name="type">
      /// 変換先の型、又は、変換先のオブジェクトの種類を指定します。
      /// 省略した場合には、obj に対して予め登録された変換または拡張が実施されます。
      /// </param>
      /// <retuns type="Object">変換後のオブジェクトを返します。</returns>
      //------------------------------------------------------------------
      if (arguments.length == 1) {
        // 拡張
        if (obj == null) return null;
        for (var i = ext.length - 1; i >= 0; i--) {
          var r = ext[i].apply(obj);
          if (r != null) return r;
        }
        return obj;
      } else {
        // 変換
        if (obj == null) return null;
        if (agh.is(obj, type)) return obj;
        if (type in cast_table) {
          var args = [];
          for (var i = 2, iM = arguments.length; i < iM; i++)
            args.push(arguments[i]);
          return cast_table[type].apply(obj, args);
        }
        return null;
      }
    };
    agh.registerAgehaCast = function registerAgehaCast(_class, handler) {
      /// <summary>
      /// agh 変換関数による変換を新しく登録します。
      /// </summary>
      /// <param name="_class">変換先のクラスを指定します。</param>
      /// <param name="handler" type="Function" optional="true">
      /// 変換の処理を実行する関数を指定します。
      /// 省略可能です。省略した場合には、単に _class の登録と見做されます。
      /// 関数のシグニチャは obj.handler(_params) になります。
      /// <p>obj は変換対象のオブジェクトであり、
      /// assert(this != null&amp;&amp;!agh.is(this, type));
      /// が保証されます。
      /// null 値の場合は null が返されるので、指定された関数は呼ばれません
      /// 元から指定した型の場合はその儘返されるので、指定された関数は呼ばれません。
      /// </p>
      /// <p>_params は agh 関数の第三引数以降に渡された可変長引数です。</p>
      /// </param>
      var castdef = cast_table[_class];
      if (!castdef) {
        var handlers = [];
        castdef = function() {
          for (var i = handlers.length - 1; i >= 0; i--) {
            try {
              var ret = handlers[i].apply(this, arguments);
              if (ret != null) return ret;
            } catch(e) {}
          }
          return null;
        };

        castdef.AddHandler = function(handler) {
          handlers.push(handler);
        };

        cast_table[_class] = castdef;
      }

      if (handler)
        castdef.AddHandler(handler);
    };
    agh.registerAgehaExtension = function registerAgehaExtension(value) {
      ext.push(value);
    };

    return agh;
  })();
  //--------------------------------------------------------------------------
  // agh.global : global object
  // agh.browser: environment information
  agh.browser = {
    vIE: NaN, vFx: NaN, vSf: NaN, vCr: NaN, vOp: NaN, vNode: NaN,
    name: "Unknown",
    isWk: false,
    isQks: false,
    select: function(dic) {
      return dic[agh.browser.name] || dic.Def;
    }
  };
  if (typeof global === "object" && typeof global.process !== "undefined" && typeof require !== "undefined") {
    // node.js (server side)
    agh.global = global;
    agh.browser.name ="Node";
    agh.browser.vNode = 1;
    try {
      var m = process.version.match(/\d+(?:\.\d+)?/);
      if (m) agh.browser.vNode = parseFloat(m[0]);
    } catch(ex) {}
  } else if (typeof window === "object") {
    // browser (client side)
    agh.global = window;
    agh.browser.isQks = document.compatMode == "BackCompat";

    var ua = "";
    try { ua = window.navigator.userAgent.toString(); } catch(e) {}
    var m = null;
    var index = null;

    if ((m = ua.match(/\b(?:MSIE |Trident\b.*\brv:)(\d+(?:\.\d+)?)/))) {
      // Internet Explorer 11 から MSIE の文字列を削除するとの事。
      // 今迄の駄目な実装と判定されたくないかららしいが勝手すぎる…。
      agh.browser.name = "IE";
      agh.browser.vIE = parseFloat(m[1]);
    } else if ((m = ua.match(/Firefox\/(\d+(?:\.\d+)?)/))) {
      agh.browser.name = "Fx";
      agh.browser.vFx = parseFloat(m[1]);
    } else if ((m = ua.match(/Chrome\/(\d+(?:\.\d+)?)/))) {
      agh.browser.name = "Cr";
      agh.browser.vCr = parseFloat(m[1]);
    } else if ((index = ua.indexOf("Safari")) >= 0) {
      agh.browser.name = "Sf";
      index = ua.indexOf("Version/");
      agh.browser.vSf = index < 0 ? 1 : parseInt(ua.substr(index + 8, 1));
    } else if ((index = ua.indexOf("Opera")) >= 0) {
      agh.browser.name = "Op";
      agh.browser.vOp = parseInt(ua.substr(index + 6));
      if (agh.browser.vOp == 9) {
        index = ua.search(/Version\/\d/);
        if (index >= 0) agh.browser.vOp = parseInt(ua.slice(index + 8));
      }
    } else if ((index = ua.indexOf("Thunderbird")) >= 0) {
      agh.browser.name = "Fx";
      var v = parseFloat(ua.substr(index + 12, 3));
      agh.browser.vFx = v;
      agh.browser.vTb = v;

      //Thunderbird example:
      //  UserAgent: Mozilla/5.0 (Windows NT 5.1; rv:8.0) Gecko/20111105 Thunderbird/8.0
      //  document.compatMode = null
    }

    if ((index = ua.indexOf("AppleWebKit")) >= 0)
      agh.browser.isWk = true;
  } else {
    // Unknown environment
    agh.global = this;
  }
  //==========================================================================
  agh.Namespace = (function() {
    function toString() { return "[object agh.Namespace]"; }

    function Namespace(name, target) {
      /// <summary name="agh.Namespace">
      /// 新しい名前空間を指定したオブジェクトの上に作成します。
      /// </summary>
      /// <param name="name" type="String" optional="true">
      /// 作成する名前空間の名前を指定します。
      /// <p>既に存在していた場合には拡張出来る形に変換します。
      /// 例えば、global.namespace = 0 だった場合には、
      /// global.namespace = new Number(0); とするなど</p>
      /// <p>省略した場合には、
      /// 定義されていない最小の整数を新しい名前空間の名前とします。</p>
      /// </param>
      /// <param name="target" type="Object" optional="true">
      /// 作成先のオブジェクトを指定します。
      /// 省略した場合には global に作成します。
      /// </param>
      /// <returns type="Namespace">
      /// 作成した名前空間オブジェクトを返します。
      /// <del>name を省略した場合は、作成した名前空間の名前を返します。</del>
      /// </returns>

      if (this instanceof Namespace) {
        /// @fn new agh.Namespace(namespaceName);
        ///   指定した名前を持つ名前空間オブジェクトを作成します。

        // new Namespace(name) で呼び出した時
        // (agh.Namespace(name) と呼び出した場合は agh instanceof Namespace == false なので此処には来ない)

        if (name)
          this.namespaceName = name;
        return this;
      }

      // 引数補完
      if (target == null) {
        if (name == null) {
          /// @fn agh.Namespace()
          ///   agh 名前空間上に匿名名前空間を定義します。
          ///   @return 作成した名前空間オブジェクトを返します。
          target = agh;
        } else {
          /// @fn agh.Namespace(namespaceName);
          ///   global オブジェクト上に namespaceName で指定される名前空間を定義します。
          ///   @param[in] namespaceName 名前空間の名称を指定します。
          ///     . を含めた場合、入れ子になった名前空間の区切と解釈します。
          ///   @return 作成した名前空間オブジェクトを返します。
          target = agh.global;
          if (name.indexOf(".") >= 0) {
            var names = name.split('.');
            for (var i = 0, iN = names.length - 1; i < iN; i++)
              target = target[names[i]];
            name = names[names.length - 1];
          }
        }
      }

      if (name == null) {
        /// @fn agh.Namespace(null, target)
        ///   指定したオブジェクト上に匿名名前空間を定義します。
        ///   @param[out] target 匿名名前空間を定義する親オブジェクトを指定します。
        ///   @return 作成した名前空間オブジェクトを返します。
        var i = 0;
        while ((name = '<anonymous-namespace-' + i + '>') in target) i++;
        return target[name] = new Namespace(name);
      }
      /// @fn agh.Namespace(namespaceName, target)
      ///   指定したオブジェクト上に指定した名前で名前空間を定義します。
      ///   @param[in] namespaceName
      ///   @param[in] target 名前空間を登録する親オブジェクトを指定します。
      ///   @return 作成した名前空間オブジェクトを返します。

      switch (typeof target[name]) {
      case "undefined":
        return target[name] = new Namespace(name);
      case "object":
        if (target[name] == null)
          return target[name] = new Namespace(name);
        if (target[name].toString === toString)
          return target[name];
        break;
      case "function": break;
      case "number":  target[name] = new Number(target[name]);  break;
      case "string":  target[name] = new String(target[name]);  break;
      case "boolean": target[name] = new Boolean(target[name]); break;
      default:        return null;
      }
      target[name].namespaceName = name;
      target[name].toString = toString;
      return target[name];
    }

    Namespace.prototype.toString = toString;
    return Namespace;
  })();
  //==========================================================================
  /**
   * 指定したオブジェクトが指定した型のインスタンスかどうかを判定します。
   * 第二引数 type を省略した時には、非 null/undefined かどうかを判定します。
   * @remarks
   * 基本的に Number, String, Boolean 以外の時にはこの関数を使用する必要はない。
   * - Number, String, Boolean の判定は obj && typeof obj.valueOf() === "number" などとできる。
   *   但し、valueOf() を override しているオブジェクトの場合に第二種過誤を起こす。
   * - 関数として呼出可能かどうかは typeof obj === "function" を用いる。
   * - それ以外の場合には obj instanceof Type を用いればよい。
   * @alias agh.is
   * @memberOf agh
   * @param   {Object}    obj   判定対象のオブジェクトを指定します。
   * @param   {Function} [type] 型を指定します。省略した場合には非 null 判定を行います。
   * @returns {Boolean}         判定結果を返します。obj が null の時は常に false です。
   */
  agh.is = function(obj, type) {
    //----------------------------------------------------------------------
    if (obj == null) return false;

    if (!(type instanceof Function)) {
      if (type == null) return obj != null;
      return false;
    }

    if (type === Function) {
      // - Function の場合、obj instanceof Function だけで判定すると、
      //   Function の派生クラスのインスタンス (関数呼出不可) に対しても true になってしまう。
      //   例えば agh.wrap(func) instanceof Function == true である。
      // - 一方で typeof obj == "function" だけで判定すると
      //   古い版の Chrome (少なくとも Cr2-Cr9?) で RegExp インスタンスが関数と判定される。
      //   例えば typeof /rex/ == "function" である。
      //   <a href="http://stackoverflow.com/questions/5054352/why-use-typeof-for-identifying-a-function">javascript - Why use typeof for identifying a function? - Stack Overflow</a>
      //   因みに RegExp は関数として呼び出せるが、関数とは区別したい事が多いので、ここでは false を返す物とする。
      // - Fx で BrowserFeedWriter() など、関数として呼び出せるのに
      //   obj instanceof Function === false な物が存在する。
      //   これは typeof obj === "function" で関数と分かる。
      return typeof obj === "function" && !(obj instanceof RegExp);
    }

    if (obj instanceof type) return true;
    switch (typeof obj) {
    case "number": return type === Number;
    case "string": return type === String;
    case "boolean": return type === Boolean;
    //case "object": case "function": case "unknown":
    default: return false;
    }
  };
  //==========================================================================
  // agh.keys    : enumerable all keys, equiv. to for (... in ...) loop
  // agh.ownkeys : enumerable own keys, equiv. to Object.keys
  function agh_keys(obj) {
    /*?lwiki
     * @fn agh.keys
     *  指定したオブジェクトに含まれる key を配列にして返します。
     *  @param[in] obj 非 null のオブジェクトを指定します。
     *  @return key を格納した配列を返します。
     */
    var keys = [];
    try { for (var key in obj) keys.push(key); } catch(e) {}
    return keys;
  }
  agh.keys = agh_keys;
  if (agh.browser.vIE && agh_keys({toString: function() {}}).length == 0) {
    // IE の場合、toString 等は自分で宣言しても列挙されない
    // Object.prototype.hasOwnProperty は vIE >= 6 で使える。
    if (agh.browser.vIE >= 6) {
      agh.keys = function(obj) {
        var keys = agh_keys(obj);
        if (Object.prototype.hasOwnProperty.call(obj, "toString")) keys.push("toString");
        if (Object.prototype.hasOwnProperty.call(obj, "valueOf")) keys.push("valueOf");
        if (Object.prototype.hasOwnProperty.call(obj, "constructor")) keys.push("constructor");
        return keys;
      };
    }
  }
  if (Object.keys) {
    agh.ownkeys = function(obj) { return Object.keys(obj); };
  } else {
    agh.ownkeys = function(obj) {
      /// <summary>
      /// 指定したオブジェクト自身が持つ key を配列にして返します。
      /// </summary>
      /// <param name="obj" mayBeNull="false">
      /// メンバ一覧を取得したいオブジェクトを指定します。</param>
      /// <returns type="Array" elementType="String">key を格納した配列を返します。</returns>
      //----------------------------------------------------------------------
      if (obj == null) return [];
      var keys = agh.keys(obj);

      // object 以外の対象に対して in を用いると例外が発生する。
      // そこで obj.hasOwnProperty の代わりに
      // Object.prototype.hasOwnProperty.call を用いる事にしたので以下は不要。
      // if (!("hasOwnProperty" in obj)) return keys;

      var ownkeys = [];
      for (var i = 0; i < keys.length; i++)
        if (Object.prototype.hasOwnProperty.call(obj, keys[i]))
          ownkeys.push(keys[i]);
      return ownkeys;
    };
  }
  //==========================================================================
  agh.memcpy = function(dst, src, keys) {
    /// <summary name="agh.memcpy">
    /// メンバ亦は配列の要素をコピーします。
    /// </summary>
    /// <param name="dst" mayBeNull="true">コピー先のオブジェクトを指定します。
    /// 省略した場合、新しい Object インスタンスが使用されます。</param>
    /// <param name="src">コピー元のオブジェクトを指定します。</param>
    /// <param name="keys" type="Array|Number">
    /// 配列で指定する場合には、コピーする key の名前の集合をを指定します。
    /// 整数で指定する場合には、コピーする添え字の上限を指定します。-1 を指定した場合には length を参照します。
    /// オブジェクトで指定する場合には、{コピー先のメンバ名: コピー元のメンバ名, ...} と指定します。
    /// </param>
    /// <returns type="Object" mayBeNull="true">
    /// コピーを完了した場合、コピー先のオブジェクトを返します。
    /// コピーに失敗した場合、null を返します。
    /// </returns>
    //----------------------------------------------------------------------
    if (dst == null) dst = {};
    if (keys == null) keys = agh.keys(src);

    if (keys instanceof Array) {
      for (var i = keys.length - 1; i >= 0; i--) {
        dst[keys[i]] = src[keys[i]];
      }
      return dst;
    } else if (agh.is(keys, Number)) {
      if (keys < 0) keys = src.length;
      for (var i = 0; i < keys; i++) dst[i] = src[i];
      return dst;
    } else if (agh.is(keys, Object)) {
      var k = agh.ownkeys(keys);
      for (var i = 0; i < k.length; i++) {
        var name = k[i];
        dst[name] = src[keys[name]];
      }
      return dst;
    }
    return null;
  };
  //==========================================================================
  function WrappedObject(a) { if (a) agh.memcpy(this, a); };
  agh.wrap = function wrap(b, a) {
    WrappedObject.prototype = b;
    return new WrappedObject(a);
  };
  //==========================================================================
  agh.delegate = function(obj, func) {
    /// <summary name="agh.delegate">
    /// 関数の委譲を行います。つまり、呼び出しの際の this 参照を固定します。
    /// </summary>
    /// <param name="obj">
    /// 関数の所持者を指定します。
    /// 則ち実行時の this ポインタを指定します。
    /// </param>
    /// <param name="func">
    /// 関数を指定します。
    /// 文字列で指定した場合には、この関数を呼び出した際に obj のメンバを検索します。
    /// </param>
    /// <returns type="Function">作成した委譲関数を返します。</returns>
    //----------------------------------------------------------------------
    if (!agh.is(func, Function)) func = obj[func];
    var ret = function() { return func.apply(obj, arguments); };
    ret.toString = function() {
      return "/* [delegated function]\r\n"
      +" * this == " + obj.toString() + ";\r\n"
      +" */\r\n"
      +func.toString();
    };
    return ret;
  };
})();
//******************************************************************************
//    ブラウザ互換性補償
//==============================================================================
(function() {
  // requires agh.browser

  // exports
  if (agh.browser.vNode)
    exports.agh = agh;
  agh.global.agh = agh;
  agh.Namespace("agh", agh.global);

  // XMLHttpRequest
  if (!agh.browser.vNode) {
    // XMLHttpRequest
    if (agh.browser.vIE && agh.global.ActiveXObject) {
      agh.XMLHttpRequest = function() {
        try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch(e) {}
        try { return new ActiveXObject("Microsoft.XMLHTTP"); } catch(e) {}
        return null;
      };
    } else {
      agh.XMLHttpRequest = agh.global.XMLHttpRequest;
    }

    // [OBSOLETE] 削除予定?
    if (!window.XMLHttpRequest)
      window.XMLHttpRequest = agh.XMLHttpRequest;
  }
})();
(function(){
  // agh.addEventListener()

  // IE9 以上には addEventListener が用意されている。
  if(agh.browser.vIE<9){
    // TODO: 大量に要素を作っては削除し、を繰り返すページで致命的
    //       ページ毎ではなく要素毎に解放する様にした方が良い? (やりかた不明)

    // 以下の理由で登録されたハンドラの情報を全て記憶する必要がある
    // 1 修正した handler で addEventListener を登録する為、
    //   removeEventListener の際に対応する handler が必要になる。
    // 2 this, event.currentTarget をハンドラに渡す為
    //   IE の attachEvent では this も event.currentTarget も使えない。
    //   ※srcElement, target はイベントが発生した要素であって現在の要素ではない。
    // 3 window.onunload 時にイベントハンドラを全て detach する
    //   IE6 辺りでメモリリークがあるそうなので。

    var createIndirectHandler;
    function Thunk(target,type,listener,useCapture){
      this.target=target;
      this.type=type;
      this.listener=listener;
      this.useCapture=useCapture;

      this.id=Thunk.instanceCount++;
      this.eventName="on"+type;
      if(agh.is(this.listener,Function))
        this.invoke=this.invokeFunction;
      else if(listener!=null&&agh.is(listener.handleEvent,Function))
        this.invoke=this.invokeEventListener;
      this.handler=createIndirectHandler(this.id);
    }
    agh.memcpy(Thunk,{
      instances:[],
      instanceCount:0,
      getInstance:function(target,type,listener,useCapture){
        for(var i=0,iN=Thunk.instanceCount;i<iN;i++){
          var thunk=Thunk.instances[i];
          if(thunk
             &&target===thunk.target
             &&type===thunk.type
             &&listener===thunk.listener
             &&useCapture===thunk.useCapture)
            return thunk;
        }
        return null;
      },
      clear:function(){
        for(var i=Thunk.instanceCount-1;i>=0;i--){
          var thunk=Thunk.instances[i];
          try {if(thunk)thunk.detach();}catch(ex){}
        }
        Thunk.instanceCount=0;
        Thunk.instances.length=0;
      }
    });
    agh.memcpy(Thunk.prototype,{
      invokeFunction:function(event){
        return this.listener.call(this.target,this.createEventObject(event));
      },
      invokeEventListener:function(event){
        return this.listener.call(this.target,this.createEventObject(event));
      },
      event_preventDefault:function(){this.returnValue=false;},
      event_stopPropagation:function(){this.cancelBubble=true;},
      event_isDefaultPrevented:function(){return !this.returnValue;},
      event_isPropagationStopped:function(){return this.cancelBubble;},
      createEventObject:function(event){
        if(!event)event=window.event;

        // event.type は IE 4.0+ で存在するので代入の必要はない
        // (というか代入しようとすると IE8 で何故かエラーになる)。
        //event.type=this.type;
        event.currentTarget=this.target;
        event.target=event.srcElement;
        event.preventDefault=this.event_preventDefault;
        event.stopPropagation=this.event_stopPropagation;
        event.isDefaultPrevented=this.event_isDefaultPrevented;
        event.isPropagationStopped=this.event_isPropagationStopped;
        return event;
      },
      attach:function(){
        if(this.target.attachEvent(this.eventName,this.handler)){
          Thunk.instances[this.id]=this;
          return true;
        }else
          return false;
      },
      detach:function(){
        // MSDN には成功時に S_OK を返すと書いてあるが常に undefined しか返さない様だ…。
        var ret=this.target.detachEvent(this.eventName,this.handler);
        delete Thunk.instances[this.id];
        return true;
      }
    });

    agh.addEventListener=function addEventListener(target,type,listener,useCapture){
      // 既に登録されている場合は新しく登録しないのが addEventListener の仕様らしい
      // - ref http://www.vividcode.info/js/event/eventListener.xhtml
      // - 実際に試してみると useCapture = true/false でも区別される様だ
      var thunk=Thunk.getInstance(target,type,listener,!!useCapture);
      if(thunk)
        return true;
      else
        return new Thunk(target,type,listener,!!useCapture).attach();
    };
    agh.removeEventListener=function removeEventListener(target,type,listener,useCapture){
      var thunk=Thunk.getInstance(target,type,listener,!!useCapture);
      if(thunk)
        return thunk.detach();
      else
        return false;
    };

    // for IE6 memory leak (1): handler から closure の参照ができない様にする。
    agh.addEventListener.resource=Thunk.instances;
    createIndirectHandler=Function("id","return function(){var thunk=window.agh.addEventListener.resource[id];return thunk.invoke.apply(thunk,arguments);};");

    // for IE6 memory leak (2): window.onunload で全て detach する
    agh.addEventListener(window,"unload",function(){Thunk.clear();},false);
  }else{
    // !!useCapture とするのは useCapture を省略不可能なブラウザがある為。
    agh.addEventListener=function addEventListener(target,eventName,listener,useCapture,aWantsUntrusted){
      return target.addEventListener(eventName,listener,!!useCapture,aWantsUntrusted);
    };
    agh.removeEventListener=function removeEventListener(target,eventName,listener,useCapture,aWantsUntrusted){
      return target.removeEventListener(eventName,listener,!!useCapture,aWantsUntrusted);
    };
  }

})();
//******************************************************************************
//    essential Array.prototype
//==============================================================================
(function() {
  agh.registerAgehaExtension(function() {
    if (this === Array.prototype) {
      // agh(Array.prototype) を呼び出した時に Array.prototype 拡張を行う。
      // どうも for (var i in arr) 等として配列のループを回しているコードが世の中に
      // はある様なので、既定で Array.prototype を汚染するのはやめた。
      // その様なページに agh.js を外部から injection するとページが壊れる。
      if (!array_prototype_extension.extended) {
        array_prototype_extension.extended = true;
        agh.memcpy(Array.prototype, array_prototype_extension);
      }
      return this;
    } else if ('length' in this) {
      // length プロパティを持つオブジェクトを配列に変換する。
      // 例えば arguments だとか getElementsByTagName だとかを対象とする。
      var arr = this instanceof Array ? this : agh.memcpy([], this, 0 | this.length);
      if (array_prototype_extension.extended) return arr;
      return agh.memcpy(arr, array_prototype_extension);
    }
  });
  agh.registerAgehaCast(Array);
  agh.registerAgehaCast(Array, function(obj) {
    if (agh.is(this, String)) {
      var ret = [];
      for (var i = 0; i < this.length; i++) ret[i] = this.substr(i, 1);
      return ret;
    } else if ("length" in this) {
      return agh.memcpy([], this, 0 | this.length);
    }
    return null;
  });

  agh.BREAK = {};
  agh.CONTINUE = {};

  agh.Namespace("Array", agh);
  function modify_index(index, len, defaultValue) {
    if (index == null)
      return defaultValue;

    index = parseInt(index);
    if (isNaN(index)) {
      return defaultValue;
    } else if (index < 0) {
      index += len;
      if (index < 0) index = 0;
      return index;
    } else if (index > len) {
      return len;
    }
    return index;
  }
  function modify_predicator(pred) {
    if (pred instanceof RegExp) {
      return function(txt) {
        pred.lastIndex = 0;
        return pred.test(txt);
      };
    } else if (pred instanceof Function) {
      return pred;
    } else if (pred instanceof Array) {
      return function(val) {
        for (var i = 0, iN = pred.length; i < iN; i++)
          if (val == pred[i]) return true;
        return false;
      };
    } else {
      return function(val) {
        return val == pred;
      };
    }
  }
  agh.memcpy(agh.Array, {
    each: function(arr, func, start, end) {
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);
      for (var i = start; i < end; i++)
        if (func(arr[i], i) === agh.BREAK) break;
    },
    eachR: function(arr, func, start, end) {
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);

      for (var i = end; --i >= start; )
        if (func(arr[i], i) === agh.BREAK) break;
    },
    map: function(arr, func, start, end) {
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);

      var r = arr.slice(0, start);
      for (var i = start; i < end; i++)
        r.push(func(arr[i], i));
      return end < arr.length ? Array.concat(r, arr.slice(end)) : r;
    },
    filter: function(arr, func, start, end) {
      func = modify_predicator(func);
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);

      var r = arr.slice(0, start);
      for (var i = start; i < end; i++)
        if (func(arr[i], i)) r.push(arr[i]);
      return end < arr.length ? Array.concat(r, arr.slice(end)) : r;
    },
    indexOf: function(arr, func, start, end) {
      func = modify_predicator(func);
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);

      for (var i = start; i < end; i++)
        if (func(arr[i], i)) return i;
      return -1;
    },
    lastIndexOf: function(arr, func, start, end) {
      func = modify_predicator(func);
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);

      for (var i = end; --i >= start; )
        if (func(arr[i], i)) return i;
      return -1;
    },
    every: function(arr, func, start, end) {
      func = modify_predicator(func);
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);

      for (var i = start; i < end; i++)
        if (!func(arr[i], i)) return false;
      return true;
    },
    contains: function(arr, obj, start, end) {
      return agh.Array.indexOf(arr, obj, start, end) >= 0;
    },
    remove_if: function(arr, func, start, end) {
      func = modify_predicator(func);
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);

      var ret = arr.slice(0, start);
      for (var i = start; i < end; i++)
        if (!func(arr[i], i)) ret.push(i);
      return end < arr.length ? ret.concat(arr.slice(end)) : ret;
    },
    remove_ifD: function(arr, func, start, end) {
      /// 破壊的 remove
      func = modify_predicator(func);
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);

      var i = start; var w = start;
      for (; i < end; i++) {
        var e = arr[i];
        if (!func(e, i)) arr[w++] = e;
      }
      if (w == i) return arr; // 削除がなかった時

      // 後半を詰める
      while (i < arr.length) arr[w++] = arr[i++];
      arr.length = w;
      return arr;
    },
    remove_atD: function(arr, i) {
      for (i++; i < arr.length; i++) arr[i - 1] = arr[i];
      arr.length--;
      return arr;
    },
    clone: function(arr) {
      // http://la.ma.la/blog/diary_200510062243.htm
      // return Array.apply(null, arr);
      // これは配列要素が多い時に引数の数の制限にかかって死ぬ。

      // http://d.hatena.ne.jp/uupaa/20100116/1263640217
      // return arr.concat();

      // http://jsperf.com/new-array-vs-splice-vs-slice/19
      // 以下が大体一番速い様だ。
      return arr.slice();
    },
    first: function(arr, len) {
      return (len == null) ? arr[0] : arr.slice(0, len);
    },
    last: function(arr, len) {
      return (len == null) ? arr[arr.length - 1] : arr.slice(arr.length - len);
    },
    lex_min: function(arr, start, end) {
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);
      var r = arr.slice(start, end);
      return agh.Array.first(r.sort()); // TODO optimize
    },
    lex_max: function(arr, start, end) {
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);
      var r = arr.slice(start, end);
      return agh.Array.last(r.sort()); // TODO optimize
    },
    max: function(arr, cmp, start, end) {
      if (cmp == null) cmp = function(a, b) { return a - b; };
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);
      var r = arr[start];
      for (var i = start + 1; i < end; i++)
        if (cmp(arr[i], r) > 0) r = arr[i];
      return r;
    },
    min: function(arr, cmp, start, end) {
      if (cmp == null) cmp = function(a, b) { return a - b; };
      start = modify_index(start, arr.length, 0);
      end = modify_index(end, arr.length, arr.length);
      var r = arr[start];
      for (var i = start + 1; i < end; i++)
        if (cmp(arr[i], r) < 0) r = arr[i];
      return r;
    },
    uniqD: function(arr, cmp) {
      /// @fn agh.Array._uniqD
      ///   連続する要素を削除します
      if (arr.length == 0) return arr;

      var lastValue = arr[0];
      if (cmp == null) {
        for (var s = 1, d = 1, sN = arr.length; s < sN; s++)
          if (arr[s] !== lastValue)
            arr[d++] = lastValue = arr[s];
        arr.length = d;
      } else {
        for (var s = 1, d = 1, sN = arr.length; s < sN; s++)
          if (cmp(arr[s], lastValue) !== 0)
            arr[d++] = lastValue = arr[s];
        arr.length = d;
      }
      return arr;
    },
    uniq: function(arr, cmp) {
      /// @fn agh.Array.uniq
      ///   与えられた配列の連続する要素を削除して得られる配列を生成します。
      return agh.Array.uniqD(agh.Array.clone(arr), cmp);
    },
    lex_unique: function(arr) {
      var r = [];
      var d = {};
      for (var i = 0, w = 0, iN = arr.length; i < iN; i++)
        if (!d[arr[i]])
          d[r[w++] = arr[i]] = 1;
      return r;
    },
    uniqueD: function(arr, cmp) {
      var len = arr.length;
      if (len == 0) return arr;

      if (cmp == null)
        arr.sort();
      else
        arr.sort(cmp);

      return agh.Array.uniqD(arr, cmp);
    },
    unique: function(arr, cmp) {
      return agh.Array.uniqueD(agh.Array.clone(arr), cmp);
    }
  });

  var array_prototype_extension = {
    $each: function(func, start, end) {
      return agh.Array.each(this, func, start, end);
    },
    $each_inv: function(func, start, end) {
      return agh.Array.eachR(this, func, start, end);
    },
    $map: function(func, start, end) {
      return agh.Array.map(this, func, start, end);
    },
    $filt: function(func, start, end) {
      return agh.Array.filter(this, func, start, end);
    },
    $indexOf: function(func, start, end) {
      return agh.Array.indexOf(this, func, start, end);
    },
    $lastIndexOf: function(func, start, end) {
      return agh.Array.lastIndexOf(this, func, start, end);
    },
    $every: function(func, start, end) {
      return agh.Array.every(this, func, start, end);
    },
    $contains: function(obj, start, end) {
      return agh.Array.contains(this, obj, start, end);
    },
    $remove: function(func, start, end) {
      return agh.Array.remove_if (this, func, start, end);
    },
    remove$: function(func, start, end) {
      return agh.Array.remove_ifD(this, func, start, end);
    },
    remove_at: function(i) {
      return agh.Array.remove_atD(this, i);
    },
    clone: function() {
      return agh.Array.clone(this);
    },
    first: function(len) {
      return agh.Array.first(this, len);
    },
    last: function(len) {
      return agh.Array.first(this, len);
    },
    lex_min: function(start, end) {
      return agh.Array.lex_min(this, start, end);
    },
    lex_max: function(start, end) {
      return agh.Array.lex_max(this, start, end);
    },
    max: function(cmp, start, end) {
      return agh.Array.max(this, cmp, start, end);
    },
    min: function(cmp, start, end) {
      return agh.Array.min(this, cmp, start, end);
    },
    //--------------------------------------------------
    // 集合演算
    unique: function(cmp) {
      return agh.Array.unique(this, cmp);
    }
  };
  agh.memcpy(agh.Array, {
    transpose: function(arr) {
      // 引数処理
      if (arguments.length > 1) {
        arr = agh(arguments, Array);
      }

      // 転置
      var ret = [];
      var len = agh.Array.max(agh.Array.map(arr, function(a) { return a.length; }));
      for (var i = 0; i < len; i++)
        ret.push(agh.Array.map(arr, function(a) { return a[i]; }));
      return ret;
    },
    //--------------------------------------------------
    //    集合演算
    //--------------------------------------------------
    union: function(a, b, cmp) {
      /// @fn agh.Array.union(a, b, cmp)
      ///   和集合を計算します。a, b の少なくとも何れかに含まれている要素の集合を返します。
      ///   @param[in] a   集合を配列で指定します。
      ///   @param[in] b   集合を配列で指定します。
      ///   @param[in] cmp 要素同士の比較関数を指定します。
      var ret = [];
      a = agh.Array.unique(a, cmp);
      b = agh.Array.unique(b, cmp);
      var ia = 0, ib = 0, la = a.length, lb = b.length;
      for (;;) switch (true) {
      case ia >= la: return ret.concat(b.slice(ib)); // b - a
      case ib >= lb: return ret.concat(a.slice(ia)); // a - b
      case a[ia] > b[ib]: ret.push(b[ib++]); break; // b - a
      case a[ia] < b[ib]: ret.push(a[ia++]); break; // a - b
      case a[ia] == b[ib]: ret.push(a[ia]); ia++; ib++; break; //a & b
      }
    },
    intersection: function(a, b, cmp) {
      /// @fn agh.Array.intersection(a, b, cmp)
      ///   積集合を計算します。a, b の両方に含まれている要素の集合を返します。
      ///   @param[in] a   集合を配列で指定します。
      ///   @param[in] b   集合を配列で指定します。
      ///   @param[in] cmp 要素同士の比較関数を指定します。
      /// ※比較演算子で一意に区別できる場合でなければ正しく動作しない。
      var ret = [];
      a = agh.Array.unique(a, cmp);
      b = agh.Array.unique(b, cmp);
      var ia = 0, ib = 0, iaN = a.length, ibN = b.length;
      if (cmp == null) {
        while (ia < iaN && ib < ibN) {
          if (a[ia] < b[ib])
            ia++;
          else if (b[ib] < a[ia])
            ib++;
          else {
            ret.push(a[ia]);
            ia++; ib++;
          }
        }
      } else {
        while (ia < iaN && ib < ibN) {
          if (cmp(a[ia], b[ib]) < 0)
            ia++;
          else if (cmp(b[ib], a[ia]) < 0)
            ib++;
          else {
            ret.push(a[ia]);
            ia++; ib++;
          }
        }
      }
      return ret;
    },
    difference: function(a, b, cmp) {
      /// @fn agh.Array.difference(a, b, cmp)
      ///   差集合を計算します。a に含まれ b に含まれていない要素の集合を返します。
      ///   @param[in] a   集合を配列で指定します。
      ///   @param[in] b   集合を配列で指定します。
      ///   @param[in] cmp 要素同士の比較関数を指定します。
      var ret = [];
      a = agh.Array.unique(a, cmp);
      b = agh.Array.unique(b, cmp);
      var ia = 0, ib = 0, la = a.length, lb = b.length;
      for (;;) switch (true) {
      case ia >= la: return ret;
      case ib >= lb: return ret.concat(a.slice(ia));
      case a[ia] > b[ib]: ib++; break;
      case a[ia] < b[ib]: ret.push(a[ia++]); break;
      case a[ia] == b[ib]: ia++; ib++; break;
      }
    }
  });
  if (!Array.concat) {
    Array.concat = function() {
      var ret = [];
      return ret.concat.apply(ret, arguments);
    };
  }
  // for IE6
  if (!Array.prototype.lastIndexOf) {
    Array.prototype.lastIndexOf = function(value, from) {
      var i;
      if (arguments.length <= 1) {
        i = this.length - 1;
      } else {
        i = 0 | from;
        if (i < 0) i += this.length;
      }

      for (; i >= 0; i--) if (this[i] === value) return i;
      return -1;
    };
  }
})();
//******************************************************************************
//    String.prototype
//==============================================================================
agh.Namespace("String", agh);
agh.memcpy(String.prototype, {
  first: function(length) {
    /// <returns type="String">部分文字列を返します。</returns>
    return this.substr(0, length == null ? 1 : length);
  },
  last: function(length) {
    /// <returns type="String">部分文字列を返します。</returns>
    return this.slice(length == null ? -1 : -length);
  },
  startsWith: function(str, position) {
    /// <returns type="Boolean">
    /// 文字列が指定した始まり方をしている場合に true を返します。
    /// </returns>
    if (position == null) position = 0;
    if (agh.is(str, String)) {
      return this.length >= str.length && this.substr(position, str.length) == str;
    } else if (agh.is(str, RegExp)) {
      return this.search(str) == position;
    } else if (agh.is(str, Array)) {
      for (var i = 0; i < str.length; i++)
        if (this.startsWith(str[i])) return true;
      return false;
    }
    return false;
  },
  endsWith: function(str, length) {
    /// <returns type="Boolean">
    /// 文字列が指定した終わり方をしている場合に true を返します。
    /// </returns>
    var target = length == null ? this.valueOf() : this.substr(0, length);
    if (agh.is(str, String)) {
      return target.length >= str.length && target.last(str.length) == str;
    } else if (agh.is(str, RegExp)) {
      str = new RegExp("(?:" + str.source + ")$");
      return str.test(target);
    } else if (agh.is(str, Array)) {
      for (var i = 0; i < str.length; i++)
        if (target.endsWith(str[i])) return true;
      return false;
    }
    return false;
  },
  $indexOf: function(pattern, index) {
    /// <returns type="Number" isinteger="true">
    /// 文字列内の指定したパターンに一致する最初の位置を返します。
    /// 一致する部分文字列が見つからない場合には -1 を返します。
    /// </returns>
    if (index == null) index = 0;
    if (agh.is(pattern, String)) {
      return this.indexOf(pattern, index);
    } else if (agh.is(pattern, RegExp)) {
      if (pattern.global) {
        var orig = pattern.lastIndex;
        pattern.lastIndex = index;
        var r = pattern.exec(this);
        var ret = r == null ? -1 : pattern.lastIndex - r[0].length;
        pattern.lastIndex = orig;
        return ret;
      } else if (index == 0) {
        return this.search(pattern);
      } else {
        var r = this.substr(index).search(pattern);
        return r < 0 ? r : index + r;
      }
    } else if (agh.is(pattern, Array)) {
      var r = -1;
      for (var i = 0, iN = pattern.length; i < iN; i++) {
        var a = this.$indexOf(pattern[i], index);
        if (r < 0 || a < r) r = a;
      }
      return r;
    } else return this.indexOf(pattern, index);
  },
  $lastIndexOf: function(text, index) {
    /// <returns type="Number" isinteger="true">
    /// 文字列内の指定したパターンに一致する最後の位置を返します。
    /// 一致する部分文字列が見つからない場合には -1 を返します。
    /// </returns>
    if (agh.is(text, String)) {
      return this.lastIndexOf(text, index);
    } else if (agh.is(text, RegExp)) {
      // 二分探索
      var iT = index + 1;
      var iB = 0;
      for (;;) {
        var iC = (iB + iT) / 2;
        var i = this.$indexOf(text, iC);
        if (i > index) i = -1;

        if (iB == iC) return i;

        if (i < 0) {
          iT = iC;
        } else {
          iB = iC;
        }
      }
    } else if (agh.is(text, Array)) {
      var r = -1;
      for (var i = 0, iN = text.length; i < iN; i++) {
        var a = this.$lastIndexOf(text[i], index);
        if (a > r) r = a;
      }
      return r;
    } else return this.lastIndexOf(text, index);
  },
  trim_l: function() {
    /// <returns type="String">初めの空白を取り除いた部分文字列を返します。</returns>
    return this.replace(/^\s+/, "");
  },
  trim_r: function() {
    /// <returns type="String">終わりの空白を取り除いた部分文字列を返します。</returns>
    return this.replace(/\s+$/, "");
  },
  trim: function() {
    /// <returns type="String">両端の空白を取り除いた部分文字列を返します。</returns>
    return this.replace(/^\s+|\s+$/g, "");
  },
  reverse: function() {
    /// <returns type="String">文字の並びを逆転した文字列を返します。</returns>
    var r = [];
    for (var i = this.length - 1; i >= 0; i--) r.push(this.substr(i, 1));
    return r.join("");
  },
  insert: function(index, str) {
    /// <returns type="String">指定した文字列を挿入した結果を返します。</returns>
    if (this.length == 0) return str;
    if (this.length == index) return this + str; // ← 0 になってしまうので % する前に
    index %= this.length;
    if (index < 0) index += this.length;
    return this.substr(0, index) + str + this.substr(index);
  },
  repeat: function(len) {
    /// <returns type="String">指定された回数だけ繰り返した文字列を返します。</returns>
    if (len <= 0) return "";
    var ret = "";
    var x = this;
    do if (len & 1) ret += x; while ((len >>= 1) >= 1 && (x += x));
    return ret;
  },
  $match: function(regexp, func) {
    regexp = agh(regexp, RegExp);
    if (regexp == null) return;
    var result; regexp.global = false;
    while ((result = regexp.exec(this)))
      if (func(result, RegExp) == agh.BREAK) break;
  },
  toCharArray: function() {
    var ret = new Array(this.length);
    for (var i = 0; i < this.length; i++)
      ret[i] = this.charCodeAt(i);
    return ret;
  }
});
String.fromCharArray = function(arr) {
  return String.fromCharCode.apply(null, arr);
};

//==============================================================================
//    String.prototype Ex
//==============================================================================
agh.memcpy(agh.String, {
  tagStyle: function(html, style, line, letter) {
    if (style == null) return html;

    var s = ""; var obj;
    if (style instanceof String || typeof style === "string")
      s = style;
    else if (style instanceof Object) {
      var buff = [];
      for (var key in style)
        buff.push(key, ":", style[key] || "none", ";");
      s = buff.join("");
    } else
      s = s.toString();

    //■引数の line/letter とは何か (ソースコードの位置を表す数字?)
    //  昔、何かを実装しようとした事は確かだが謎。
    return '<span style="' + agh.Text.Escape(s, "html-attr") + '">' + html + "</span>";
  },
  tagClass: function(html, className) {
    if (className == null)
      return html;
    else if (className instanceof Array)
      className = className.join(" ");
    else
      className = className.toString();

    return '<span class="' + agh.Text.Escape(className, "html-attr") + '">' + html + "</span>";
  },
  tag: function(html, tagName) {
    var tag = null;
    var id = null;
    var className = null;
    var attrs = '';

    while (tagName.length > 0) {
      var m, fNest = false;
      if ((m = /^\s*([a-zA-Z][-_\w]*(?:\:[a-zA-Z][-_\w]*)?)/.exec(tagName))) {
        if (tag === null)
          tag = m[1];
        else
          fNest = true;
      } else if ((m = /^\s*([#\.])(?![:\.\d]|-[-\d])([-_:\.\w]+)/.exec(tagName))) {
        if (m[1] === '#') {
          if (id === null)
            id = m[2];
          else
            fNest = true;
        } else {
          if (className != null)
            className += " " + m[2];
          else
            className = m[2];
          id = m[2];
        }
        tagName = tagName.slice(m[0].length);
      } else if ((m = /^\s*\[\s*((?!\d)[-:\._\w]+)\s*=\s*((?:[^\[\]'"]|'(?:\\.|[^\\'])*'|"(?:\\.|[^\\"])*")*?)\s*\]/.exec(tagName))) {
        var value = m[2].replace(/'(?:\\.|[^\\'])*'|"(?:\\.|[^\\"])*"/g, function($0) {
          return agh.Text.Unescape($0.slice(1, -1), "backslash");
        });
        attrs += ' ' + m[1] + '="' + agh.Text.Escape(value, "html-attr") + '"';
      } else if ((m = /^\s*\>\s*/.exec(tagName))) {
        tagName = tagName.slice(m[0].length);
        fNest = true;
      } else
        break;

      if (fNest) {
        html = agh.String.tag(html, tagName);
        break;
      }

      tagName = tagName.slice(m[0].length);
    }

    if (id)
      attrs += ' id="' + agh.Text.Escape(id, "html-attr") + '"';
    if (className)
      attrs += ' class="' + agh.Text.Escape(className, "html-attr") + '"';
    if (tag == null) tag = 'span';
    return '<' + tag + attrs + '>' + html + '</' + tag + '>';
  }
});
// obsoleted functions
agh.memcpy(String.prototype, String.prototype, {
  tag_bold: "bold",
  tag_italics: "italics",
  tag_fixed: "fixed",
  tag_small: "small",
  tag_blink: "blink",
  tag_strike: "strike",
  tag_sup: "sup",
  tag_sub: "sub",
  tag_color: "fontcolor",
  tag_size: "fontsize",
  tag_anchor: "anchor",
  tag_link: "link"
});
agh.memcpy(String.prototype, {
  tag_style: function(style, line, letter) { return agh.String.tagStyle(this.valueOf(), style, line, letter); },
  tag_class: function(style, line, letter) { return agh.String.tagClass(this.valueOf(), style, line, letter); }
});

//******************************************************************************
//    namespace agh.Text
//==============================================================================
agh.Namespace("Text", agh);
agh.Text.doubleQuote = function(str) {
  return '"' + agh.Text.Escape(str, "double-quoted") + '"';
};
/**
 * @function agh.Text.format(...arg)
 * @function agh.Text.format(table)
 *   文字列を整形します。 
 *
 *   @param arg
 *     文字列に挿入する値を指定します。
 */
agh.Text.format = function(text, table) {
  var args = arguments;
  return text.replace(/(\{\{|\}\})|\{([^\}]+)\}/g, function($0, $1, $2) {
    if ($1 && $1 != '')
      return $1 == '{{' ? '{' : '}';

    // 引数を : で区切る
    var a = $2.replace(/\\.|\:/g, function($0) {
      return $0 == ':' ? '<agh::split>' : $0.substr(1);
    }).split('<agh::split>');

    // obj の取得
    var key = a[0];
    var num = parseInt(key);
    var obj = num.toString() == key ? args[1 + num] : table[key];
    if (obj == null) obj = "null";

    // 変換
    for (var i = 1; i < a.length; i++) {
      if (agh.is(obj, String)) {
        a[i].replace(/(\b[\w0-9_]+\b)(?:\(([^\(\)]*)\))?/, function($0, $1, $2) {
          if (!$2) $2 = "";
          try {
            switch($1) {
            case "escape": obj = agh.Text.Escape(obj,$2); break;
            case "unescape": obj = agh.Text.Unescape(obj, $2); break;
            case "upper": obj = obj.toUpperCase(); break;
            case "lower": obj = obj.toLowerCase(); break;
              //case "trim": case "trim_l": case "trim_r": case "reverse":
            default:
              obj = obj[$1].apply(obj, $2.split(","));
              break;
            }
          } catch(e) {}
          return "";
        });
      } else
        obj = agh(obj, String, a[i]);
      if (obj == null) obj = "null";
    }
    return obj.toString();
  });
};
//==============================================================================
//    agh.Text.Escape
//==============================================================================
agh.Text.Escape = function(str, type) {
  /// <summary>
  /// 文字列を指定した種類の表現からエスケープします。
  /// </summary>
  /// <param name="str" type="String">変換対象の文字列を指定します。</param>
  /// <param name="type" type="String">表現の種類を指定します。
  /// ["regexp", "html", "backslash", "camel", "quoted", "double-quoted"]
  /// の何れかを指定する事が出来ます。</param>
  /// <returns type="String">エスケープした結果を返します。</returns>
  //--------------------------------------------------------------------------
  return arguments.callee[type](str);
};
agh.memcpy(agh.Text.Escape, {
  regexp: function(str) {
    if (str == null) return "";
    if (!agh.is(str, String)) str = str.toString();
    return str.replace(/([\\\[\]\(\)\{\}\?\+\.\|\$\*])/g, "\\$1");
  },
  html: (function() {
    /// <remarks>改行コードの置換に関して
    /// - "<br />\n" や "\n<br />" にして置くとソースを直接見た時に見易いのでは?
    /// 　→これだと Fx や Sf で pre.innerHTML に挿入した際に二回改行されてしまう。
    /// 　　(といって、<br\n/> は嫌だ…)
    /// - IE で単に <br /> に変換していると、二重改行が単一改行になってしまう
    /// 　→仕様がないので、重改行の間に &nbsp; を挿入する。
    /// </remarks>
    var tbl = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      " ": "&nbsp;",
      "'": "&#39;",
      '"': "&quot;",
      '\t': "&nbsp;&nbsp;&nbsp;&nbsp;",
      '\r': "<br />", '\n': "<br />", '\r\n': "<br />"
    };
    var escht = function(str) {
      if (str == null) return "";
      if (!agh.is(str, String)) str = str.toString();
      return str.replace(/\r\n|[\&\<\>'"\t\r\n]| (?!\S)/g, function($0) { return tbl[$0]; });
    };
    return agh.browser.isIE ? function(str) {
      return escht(str).replace(/(\<br \/\>)(?=\1)/g, "<br />&nbsp;");
    } : escht;
  })(),
  "html-attr": (function() {
    var tbl = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      " ": " ",
      "'": "&#39;",
      '"': "&quot;",
      '\t': "    ",
      '\r': "&#10;", '\n': "&#10;", '\r\n': "&#10;"
    };
    return function(str) {
      if (str == null) return "";
      if (!agh.is(str, String)) str = str.toString();
      return str.replace(/\r\n|[\&\<\> '"\t\r\n]/g, function($0) { return tbl[$0]; });
    };
  })(),
  xml: (function() {
    var tbl = {"&": "&amp;", "<": "&lt;", ">": "&gt;"};
    return function(str) {
      if (str == null) return "";
      if (!agh.is(str, String)) str = str.toString();
      return str.replace(/[\&\<\>]/g, function($0) { return tbl[$0]; });
    };
  })(),
  backslash: (function() {
    //TODO: \u**** の形式にも対応
    var esc_table = {
      '\r': '\\r', '\n': '\\n',
      '\v': '\\v', '\t': '\\t',
      '\f': '\\f', '\b': '\\b',
      '\\': '\\\\'
    };
    return function(str) {
      if (str == null) return "";
      if (!agh.is(str, String)) str = str.toString();
      return str.replace(/[\\\n\r\t\v\f\b]/g, function($0) {
        return esc_table[$0];
      });
    };
  })(),
  //http://bmky.net/diary/log/1342.html
  camel: function(str) {
    if (str == null) return "";
    if (!agh.is(str, String)) str = str.toString();
    return str.replace(/-([a-z])/g, function($0, $1) {
      return $1.toUpperCase();
    });
  },
  quoted: function(str) {
    return agh.Text.Escape.backslash(str).replace(/(["'])/g, "\\$1");
  }
});
agh.Text.Escape["double-quoted"] = agh.Text.Escape.quoted;
//==============================================================================
//    agh.Text.Unescape
//==============================================================================
agh.Text.Unescape = function(str, type) {
  /// <summary>
  /// 指定した種類の表現からエスケープを除いて、単純な文字列を取り出します。
  /// </summary>
  /// <param name="str" type="String">指定した種類の表現で表された文字列を指定します。</param>
  /// <param name="type" type="String">表現の種類を指定します。
  /// ["regexp", "html", "backslash", "camel", "quoted", "double-quoted"]
  /// の何れかを指定する事が出来ます。</param>
  /// <returns type="String">エスケープを取り除いた結果を返します。</returns>
  //--------------------------------------------------------------------------
  return arguments.callee[type](str);
};
//------------------------------------------------------------------------------
var resolve_entity = (function() {

  var dict = {
    // lt: "<", gt: ">", amp: "&", nbsp: "\xA0", quot: '"',

    // http://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references (2015-02-01)

    // Basic
    quot: '\u0022', amp: '\u0026', lt: '\u003C', gt: '\u003E', 

    // HTML 2.0
    Agrave: '\u00C0', Aacute: '\u00C1', Acirc: '\u00C2', Atilde: '\u00C3', Auml: '\u00C4', Aring: '\u00C5', AElig: '\u00C6', Ccedil: '\u00C7', 
    Egrave: '\u00C8', Eacute: '\u00C9', Ecirc: '\u00CA', Euml: '\u00CB', Igrave: '\u00CC', Iacute: '\u00CD', Icirc: '\u00CE', Iuml: '\u00CF', 
    ETH: '\u00D0', Ntilde: '\u00D1', Ograve: '\u00D2', Oacute: '\u00D3', Ocirc: '\u00D4', Otilde: '\u00D5', Ouml: '\u00D6', Oslash: '\u00D8', 
    Ugrave: '\u00D9', Uacute: '\u00DA', Ucirc: '\u00DB', Uuml: '\u00DC', Yacute: '\u00DD', THORN: '\u00DE', szlig: '\u00DF', agrave: '\u00E0', 
    aacute: '\u00E1', acirc: '\u00E2', atilde: '\u00E3', auml: '\u00E4', aring: '\u00E5', aelig: '\u00E6', ccedil: '\u00E7', egrave: '\u00E8', 
    eacute: '\u00E9', ecirc: '\u00EA', euml: '\u00EB', igrave: '\u00EC', iacute: '\u00ED', icirc: '\u00EE', iuml: '\u00EF', eth: '\u00F0', 
    ntilde: '\u00F1', ograve: '\u00F2', oacute: '\u00F3', ocirc: '\u00F4', otilde: '\u00F5', ouml: '\u00F6', oslash: '\u00F8', ugrave: '\u00F9', 
    uacute: '\u00FA', ucirc: '\u00FB', uuml: '\u00FC', yacute: '\u00FD', thorn: '\u00FE', yuml: '\u00FF', 

    // HTML 3.2
    nbsp: '\u00A0', iexcl: '\u00A1', cent: '\u00A2', pound: '\u00A3', curren: '\u00A4', yen: '\u00A5', brvbar: '\u00A6', sect: '\u00A7', 
    uml: '\u00A8', copy: '\u00A9', ordf: '\u00AA', laquo: '\u00AB', not: '\u00AC', shy: '\u00AD', reg: '\u00AE', macr: '\u00AF', 
    deg: '\u00B0', plusmn: '\u00B1', sup2: '\u00B2', sup3: '\u00B3', acute: '\u00B4', micro: '\u00B5', para: '\u00B6', middot: '\u00B7', 
    cedil: '\u00B8', sup1: '\u00B9', ordm: '\u00BA', raquo: '\u00BB', frac14: '\u00BC', frac12: '\u00BD', frac34: '\u00BE', iquest: '\u00BF', 
    times: '\u00D7', divide: '\u00F7', 

    // HTML 4.0
    OElig: '\u0152', oelig: '\u0153', Scaron: '\u0160', scaron: '\u0161', Yuml: '\u0178', fnof: '\u0192', circ: '\u02C6', tilde: '\u02DC', 
    Alpha: '\u0391', Beta: '\u0392', Gamma: '\u0393', Delta: '\u0394', Epsilon: '\u0395', Zeta: '\u0396', Eta: '\u0397', Theta: '\u0398', 
    Iota: '\u0399', Kappa: '\u039A', Lambda: '\u039B', Mu: '\u039C', Nu: '\u039D', Xi: '\u039E', Omicron: '\u039F', Pi: '\u03A0', 
    Rho: '\u03A1', Sigma: '\u03A3', Tau: '\u03A4', Upsilon: '\u03A5', Phi: '\u03A6', Chi: '\u03A7', Psi: '\u03A8', Omega: '\u03A9', 
    alpha: '\u03B1', beta: '\u03B2', gamma: '\u03B3', delta: '\u03B4', epsilon: '\u03B5', zeta: '\u03B6', eta: '\u03B7', theta: '\u03B8', 
    iota: '\u03B9', kappa: '\u03BA', lambda: '\u03BB', mu: '\u03BC', nu: '\u03BD', xi: '\u03BE', omicron: '\u03BF', pi: '\u03C0', 
    rho: '\u03C1', sigmaf: '\u03C2', sigma: '\u03C3', tau: '\u03C4', upsilon: '\u03C5', phi: '\u03C6', chi: '\u03C7', psi: '\u03C8', 
    omega: '\u03C9', thetasym: '\u03D1', upsih: '\u03D2', piv: '\u03D6', ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009', zwnj: '\u200C', 
    zwj: '\u200D', lrm: '\u200E', rlm: '\u200F', ndash: '\u2013', mdash: '\u2014', lsquo: '\u2018', rsquo: '\u2019', sbquo: '\u201A', 
    ldquo: '\u201C', rdquo: '\u201D', bdquo: '\u201E', dagger: '\u2020', Dagger: '\u2021', bull: '\u2022', hellip: '\u2026', permil: '\u2030', 
    prime: '\u2032', Prime: '\u2033', lsaquo: '\u2039', rsaquo: '\u203A', oline: '\u203E', frasl: '\u2044', euro: '\u20AC', image: '\u2111', 
    weierp: '\u2118', real: '\u211C', trade: '\u2122', alefsym: '\u2135', larr: '\u2190', uarr: '\u2191', rarr: '\u2192', darr: '\u2193', 
    harr: '\u2194', crarr: '\u21B5', lArr: '\u21D0', uArr: '\u21D1', rArr: '\u21D2', dArr: '\u21D3', hArr: '\u21D4', forall: '\u2200', 
    part: '\u2202', exist: '\u2203', empty: '\u2205', nabla: '\u2207', isin: '\u2208', notin: '\u2209', ni: '\u220B', prod: '\u220F', 
    sum: '\u2211', minus: '\u2212', lowast: '\u2217', radic: '\u221A', prop: '\u221D', infin: '\u221E', ang: '\u2220', and: '\u2227', 
    or: '\u2228', cap: '\u2229', cup: '\u222A', 'int': '\u222B', there4: '\u2234', sim: '\u223C', cong: '\u2245', asymp: '\u2248', 
    ne: '\u2260', equiv: '\u2261', le: '\u2264', ge: '\u2265', sub: '\u2282', sup: '\u2283', nsub: '\u2284', sube: '\u2286', 
    supe: '\u2287', oplus: '\u2295', otimes: '\u2297', perp: '\u22A5', sdot: '\u22C5', lceil: '\u2308', rceil: '\u2309', lfloor: '\u230A', 
    rfloor: '\u230B', lang: '\u2329', rang: '\u232A', loz: '\u25CA', spades: '\u2660', clubs: '\u2663', hearts: '\u2665', diams: '\u2666', 

    // HTML 5.0
    vellip: '\u22EE', 

    // XHTML 1.0
    apos: '\u0027'
  };

  var cache = {};
  var keys = agh.ownkeys(dict);
  for (var i = 0, iN = keys.length; i < iN; i++)
    cache["&" + keys[i] + ";"] = dict[keys[i]];

  if (agh.browser.vNode) {
    return function(name) {
      if (name in cache) return cache[name];

      var m;
      if ((m = (/^&#x([\da-f]+);$|^&#(\d+);$/i).exec(name))) {
        var code = parseInt(m[1] ? "0x" + m[1] : m[2]);
        var text = String.fromCharCode(code);
        cache[name] = text;
        return text;
      }
      return name;
    };
  } else {
    var span = document.createElement("span");
    var innerText = agh.browser.vFx ? "textContent" : "innerText";
    return function(name) {
      /// <summary>エンティティ参照を解決します。</summary>
      /// <param name="name" type="String">エンティティ参照の名前を指定します。
      /// (&amp; 及び ; を含みます。)</param>
      /// <returns type="String">
      /// 指定したエンティティ参照を解決した後の文字列を返します。
      /// </returns>
      //----------------------------------------------------------------------
      if (name in cache) return cache[name];
      span.innerHTML = name;
      return cache[name] = span[innerText];
    };
  }
})();
var resolve_unicode = function($0, code) {
  //return resolve_entity("&#x" + code + ";");
  return agh.Text.ResolveUnicode(code);
};
agh.Text.ResolveUnicode = function(code) {
  /// <returns type="String">指定したコードに対応する文字を含んだ文字列を返します。</returns>
  /// <remarks>
  /// この関数を使用している場所
  /// -# agh.text.color.js - dynamic_cast["HTML"](function)
  /// -# agh.text.js - Number#format - %c
  /// </remarks>
  //--------------------------------------------------------------------------
  //if (agh.is_type(code, Number)) code = code.toString(16);
  //return resolve_entity("&#x" + code + ";");
  if (!agh.is(code, Number)) code = parseInt("0x" + code);
  return String.fromCharCode(code);
}
// agh.text.color.js - EscHtml
agh.Text.ResolveEntity = resolve_entity;
//------------------------------------------------------------------------------
var unescape_backslash_map = {
  '\\r': '\r', '\\t': '\t', '\\n': '\n',
  '\\v': '\v', '\\f': '\f', '\\b': '\b',
  '\\e': '\x1b',
  '\\\\': '\\', '\\"': '"', "\\'": "'"
};
agh.memcpy(agh.Text.Unescape, {
  regexp: function(str) {
    if (str == null) return "";
    if (!agh.is(str, String)) str = str.toString();
    return str
      .replace(/\\([\[\]\(\)\{\}\?\+\.\|\$\*])/g, "$1")
      .replace(/\\\\/g, "\\");
  },
  html: function(str) {
    if (str == null) return "";
    if (!agh.is(str, String)) str = str.toString();
    return str
      //.replace(/\s+/g, " ")
      .replace(/\<br\s*\/?\>/gi, "\n")
      .replace(/\<[\/\w](?:"(?:[^\\\"]|\\.)+\"|'(?:[^\\\']|\\.)'|[^'"\>])*\>/g, '')
      .replace(/\&(?:[\#\w\-]+)\;/g, resolve_entity);
  },
  backslash: function(str) {
    if (str == null) return "";
    if (!agh.is(str, String)) str = str.toString();
    return str.replace(/\\[rtnvfb'"\\]|\\u([\da-f]{1,4})/gi, function($0, $1) {
      return unescape_backslash_map[$0] || String.fromCharCode(parseInt("0x" + $1));
    });
  },
  camel: function(str) {
    if (str == null) return "";
    if (!agh.is(str, String)) str = str.toString();
    return str.replace(/([^A-Z])([A-Z])/g, function($0, $1, $2) {
      return $1 + "-" + $2.toLowerCase();
    });
  }
});
agh.Text.Unescape["quoted"] = agh.Text.Unescape.backslash;
agh.Text.Unescape["double-quoted"] = agh.Text.Unescape.backslash;
//==============================================================================
//    agh.Text.Url
//==============================================================================
agh.Namespace("Url", agh.Text);
agh.memcpy(agh.Text.Url, {
  Combine: function(a, b) {
    a = a.replace(/\\/g, "/");
    b = b.replace(/\\/g, "/");
    if (b.startsWith("http://") || b.startsWith("https://") || b.startsWith("file:///"))
      return b;
    if (!a.endsWith('/')) a += "/";
    while (b.substr(0, 3) == "../") {
      b = b.substr(3);
      a = String.URL.Parent(a);
    }
    if (b == "..") return String.URL.Parent(a);
    if (b.substr(0, 1) == "/") return a + b.substr(1);
    return a + b;
  },
  Directory: function(str) {
    return str.substring(0, str.$lastIndexOf(["\\", "/"]) + 1);
  },
  Parent: function(str) {
    var i = str.$lastIndexOf(["\\", "/"]);
    if (i == str.length - 1) i = str.$lastIndexOf(["\\", "/"], i - 1);
    return str.substring(0, i + 1);
  },
  GetExtension: function(str) {
    var i = str.lastIndexOf(".");
    if (i < 0) return "";
    return str.substring(i + 1);
  },
  GetFileName: function(str) {
    var i = str.$lastIndexOf(["\\", "/"]);
    if (i < 0) return str;
    return str.substring(i + 1);
  }
});
//******************************************************************************
//    Conversion to HTML / JSON
//==============================================================================
(function() {
  agh.registerAgehaCast(String, function() {
    if (arguments.length > 0 && agh.is(this.format, Function)) {
      return this.format.apply(this, arguments);
    }
    return this.toString();
  });
  agh.registerAgehaCast("HTML", function() {
    if (agh.is(this, String)) {
      return agh.Text.Escape(this, "html");
    }
  });
  var agh_ins = "<agh::inspecting>";
  agh.registerAgehaCast("JSON", function() {
    // ☆ は無限ループを避ける為
    switch (true) {
    case this == null:
      return "null";
    case agh.is(this, Array):
      if (this[agh_ins]) return "/* object loop */ null"; // ☆
      var ret = [];
      ret.push('[');
      this[agh_ins] = true; // ☆
      var first = true;
      for (var i = 0, iN = this.length; i < iN; i++) {
        if (first) first = false; else ret.push('.');
        ret.push(agh(this[i], "JSON"));
      }
      delete this[agh_ins]; // ☆
      ret.push(']');
      return ret.join("");
    case agh.is(this, String):
      return agh.Text.doubleQuote(this);
    case agh.is(this, Number):
    case agh.is(this, Function):
    case agh.is(this, RegExp):
    case agh.is(this, Boolean):
      return this.toString();
    case agh.is(this, Date):
      return "new Date(" + agh.Text.doubleQuote(this.toString()) + ")"; // ■
    case agh.is(this, Object):
      if (this[agh_ins]) return "/* object loop */ null"; // ☆
      var ret = [];
      ret.push('{');
      var first = true;
      var keys = agh.ownkeys(this);
      this[agh_ins] = true; // ☆
      var obj = this;
      for (var i = 0, iN = keys.length; i < iN; i++) {
        if (first) first = false; else ret.push(',');
        var key = keys[i];
        ret.push(agh.Text.doubleQuote(key));
        ret.push(':');
        ret.push(agh(obj[key], "JSON"));
      }
      delete this[agh_ins]; // ☆
      ret.push('}');
      return ret.join("");
    }
  });
})();
//******************************************************************************
//      Number
//==============================================================================
agh.memcpy(Number.prototype, {
  isNaN: function() { return isNaN(this); },
  isFinite: function() { return isFinite(this); }
});
agh.memcpy(Number, {
  INT_MAX: 0x7FFFFFFF,
  INT_MIN: -0x80000000,
  UINT_MAX: 0xFFFFFFFF
});
Function.prototype.get_name = function() {
  if (this.name != null) return this.name;
  var src = this.toString();
  src = src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*$/gm, ""); // コメント除去
  var r = src.match(/^\s*(?:[gs]etter\s+)?function\b\s*([\w\$]*)\s*\(/);
  return this.name = r ? r[1] : "";
};
//agh.classes = agh.memcpy(null, window, ["Object", "Math", "Number", "Boolean", "Array", "String", "Function", "RegExp", "Enumerator", "Date"]);
//******************************************************************************
//      script files management
//==============================================================================
(function() {
  agh.scripts = {
    waiting: [],
    files: {},
    wait: function(files, main) {
      /// <summary name="agh.scripts.wait">
      /// 処理と依存ファイル名を登録します。
      /// 依存ファイル名が既に読み込まれていた場合にはその場で実行をします。
      /// 依存ファイル名が未だ読み込まれていない場合には、依存ファイルが読み込まれた時に処理が実行されます。
      /// </summary>
      /// <returns type="Boolean">
      /// その場で処理が実行された場合に true を返します。
      /// 依存ファイルが読み込まれるのを待っている場合に false を返します。
      /// </returns>
      //----------------------------------------------------------------------
      // assert(agh.is(main, Function));
      if (!this.load(files)) {
//#lock(this.waiting)
        this.waiting.push({requires: files, func: main});
//#unlock(this.waiting)
        return false;
      } else {
        main.call(agh);
        return true;
      }
    },
    //============================================================
    //    ファイル初期化
    //============================================================
    register: function(name, files, main) {
      /// <summary>
      /// ライブラリファイルの登録を行います。
      /// 自身のファイル名と、依存ファイル名、及び処理を登録します。
      /// 依存ファイルの準備が出来た時に自動的に処理が実行されます。
      /// </summary>
      //----------------------------------------------------------------------
      // assert(agh.is(main, Function));
      if (this.files[name] == "ready") return;
      this.files[name] = "parsed";

      var isReady = this.load(files);
      if (isReady) {
        this._init_js(name, main);
      } else {
//#lock(this.waiting)
        var self = this;
        this.waiting.push({
          requires: files,
          func: function() { self._init_js(name, main, true); }
        });
//#unlock(this.waiting)
      }
    },
    _init_js: function(name, main, suppress_dowait) {
      try {
        if (main) main.call(agh);
      } catch(e) {
        this.invoke_onerror(main, e);

        var msg = [];
        msg.push("Fatal: ", name, " を初期化中に例外が発生しました\n");
        msg.push("error = ", agh(e, 'JSON'), "\n");
        if (e.stack)
          msg.push("stack = ", e.stack, "\n");
        alert(msg.join(""));
        return;
      }
      this.files[name] = "ready";
      if (!suppress_dowait) this._dowait();
    },
    _dowait: function() {
      /// <summary private="true">
      /// 現在待ち状態にある関数が実行できる状態になったか確認し、
      /// 可能であれば実行します。
      /// </summary>
      //----------------------------------------------------------------------
      for (;;) {
//#lock(this.waiting)
        // waiting の更新
        var w0 = this.waiting;
        var proc_wait = []; // 未だ waiting
        var proc_call = []; // 今回実行する物
        for (var i = 0; i < w0.length; i++) {
          var proc = w0[i];
          if (!this.isready(proc.requires)) {
            proc_wait.push(proc);
          } else {
            proc_call.push(proc.func);
          }
        }
        this.waiting = proc_wait;
//#unlock(this.waiting)

        if (proc_call.length == 0) return;

        // 実行
        for (var i = 0; i < proc_call.length; i++)
          try {
            proc_call[i].call(agh);
          } catch(ex) {
            this.invoke_onerror(proc_call[i], ex);
          }
      }
    },
    onerror: [],
    invoke_onerror: function(source, error) {
      var processed = false;
      for (var i = 0; i < this.onerror.length; i++)
        try {
          var handler = this.onerror[i];
          if (handler(source, error))
            processed = true;
        } catch(ex) {
          agh.global.setTimeout(function() { throw ex; }, 0);
        }
      return processed;
    },
    //==========================================================================
    //    読込
    //==========================================================================
    isready: function(requires) {
      /// <summary name="agh.scripts.isready" private="true">
      /// 指定したファイルが全て読み込まれているかどうかを取得します。
      /// </summary>
      /// <returns type="Boolean">全て読み込まれていた場合には true を返します。
      /// </returns>
      //----------------------------------------------------------------------
      if (requires == null)
        return true;
      if (agh.is(requires, String))
        return requires in this.files && this.files[requires] == "ready";
      if (agh.is(requires, Array)) {
        for (var i = 0; i < requires.length; i++)
          if (!this.isready(requires[i])) return false;
        return true;
      }
      return false;
    },
    load: function(filename) {
      /// <summary name="agh.scripts.load">
      /// 指定したファイルを読み込みます。既に読み込まれている場合には何もしません。
      /// 読み込む対象のファイルとしては、js ファイルの他に css ファイルが可能です。
      /// </summary>
      /// <returns type="Boolean">
      /// 指定したファイルがすべて利用可能であるかどうかを返します。
      /// すべて利用可能の場合に true を返します。
      /// それ以外の場合 (未だロードされていない場合など) に false を返します。
      /// </returns>
      //----------------------------------------------------------------------
      if (arguments.length > 1) filename = agh(arguments, Array);
      if (filename != null) {
        if (filename instanceof Array) {
          // overload(Array)
          //------------------------------------
          for (var i = 0; i < filename.length; i++)
            this.load(filename[i]);
        } else if (typeof filename == "string" || filename instanceof String) {
          // overload(String)
          //------------------------------------
          if (filename == "event:onload")
            return this.isready(filename);
          switch (agh.Text.Url.GetExtension(filename).toLowerCase()) {
          case "css":
            this.load_css(filename);
            break;
          case "js":
          default:
            this.load_js(filename);
            break;
          }
        } else {
          throw new Error("agh.scripts.load: unrecognized load target: " + agh(filename, "JSON") + ".");
        }
      }

      return this.isready(filename);
    }
  };
  if (agh.browser.vNode) {
    agh.memcpy(agh.scripts, {
      load_js: function(filename) {
        //require(agh.scripts.AGH_URLBASE+"/"+filename);
        require("./" + filename);
        this.files[filename] = "ready";
        return true;
      },
      load_css: function() { return true; },
      AGH_URLBASE: __dirname,
      JGZ_EXTENSION: (__filename || "agh.js").replace(/^.*(\.\w+)$/, "$1")
    });
  } else {
    agh.memcpy(agh.scripts, {
      load_js: function(filename) {
        /// <summary name="agh.scripts.load_js" private="true">
        /// 指定したスクリプトファイルを読み込みます。既に読み込まれている場合には何もしません。
        /// </summary>
        /// <returns type="Boolean">
        /// file を load した場合に true を返します。
        /// それ以外の場合に false を返します。
        /// </returns>
        //----------------------------------------------------------------------
        if (agh.Array.contains(["loading", "parsed", "ready"], this.files[filename])) return false;
        this.files[filename] = "loading";
        var script = this.DOCUMENT.createElement("script");
        script.src = this.AGH_URLBASE + filename.slice(0, -3) + this.JGZ_EXTENSION;
        script.charset = "utf-8";
        script.type = "text/javascript";
        this.DOCUMENT_HEAD.appendChild(script);
        return true;
      },
      load_css: function(filename) {
        /// <summary name="agh.scripts.load_css" private="true">
        /// 指定したスタイルシートを読み込みます。既に読み込まれている場合には何もしません。
        /// </summary>
        /// <returns type="Boolean">
        /// file を load した場合に true を返します。
        /// それ以外の場合に false を返します。
        /// </returns>
        //----------------------------------------------------------------------
        if (this.files[filename] == "ready") return false;
        this.files[filename] = "ready";
        var link = this.DOCUMENT.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.charset = "utf-8";
        link.href = agh.scripts.AGH_URLBASE + filename;
        this.DOCUMENT_HEAD.appendChild(link);
        return true;
      },
      AGH_URLBASE: "",
      DOCUMENT: document,
      DOCUMENT_HEAD: document.getElementsByTagName("head")[0],
      JGZ_EXTENSION: ".js"
    });

    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;

      var fname = agh.Text.Url.GetFileName(src);
      var js_ext = ".js";
      if (fname.endsWith(".js.gz")) {
        fname = fname.slice(0, -3);
        js_ext = ".js.gz";
      } else if (fname.endsWith(".jgz")) {
        fname = fname.slice(0, -4) + ".js";
        js_ext = ".jgz";
      } else if (fname.endsWith(".min.js")) {
        fname = fname.slice(0, -7) + ".js";
        js_ext = ".min.js";
      }
      if (fname != THIS_FILE) continue;

      agh.scripts.AGH_URLBASE = agh.Text.Url.Directory(src);
      agh.scripts.JGZ_EXTENSION = js_ext;
      break;
    }
  }
  agh.scripts.files[THIS_FILE] = "parsed";

  if (agh.global.console && agh.global.console.log)
    agh.scripts.onerror.push(function(sender, error) {
      if (error) {
        agh.global.console.log({
          error: error,
          name: error.name,
          message: error.message,
          description: error.description,
          errorCode: error.number & 0xFFFF,
          facilityCode: error.number >> 16 & 0x1FFF,
          lineNumber: error.lineNumber,
          stack: error.stack || "?"
        });
        // agh.global.console.log(error);
        // agh.global.console.log(agh({
        //   error: error,
        //   name: error.name,
        //   message: error.message,
        //   description: error.description,
        //   errorCode: error.number & 0xFFFF,
        //   facilityCode: error.number >> 16 & 0x1FFF,
        //   lineNumber: error.lineNumber,
        //   stack: error.stack || "?"
        // }, 'JSON'));
      }
    });

  /* 以下デバグ */
  // for debugging
  // agh.scripts.onerror.push(function(sender, err) {
  //   alert(agh({
  //     name: err.name,
  //     message: err.message,
  //     description: err.description,
  //     errorCode: err.number & 0xFFFF,
  //     facilityCode: err.number >> 16 & 0x1FFF
  //   }, 'JSON'))
  // });
  if (!agh.browser.vNode) {
    //--------------------------------------------------------------------------
    //  event window.onload
    //--------------------------------------------------------------------------
    if (typeof window === "object") {
      /* DOMContentLoaded は HTML の DOM ツリーが構築完了したとき。
       * load は更にそこから画像などをロードしてレイアウトが決定したとき。
       */
      var loadEventName = agh.browser.vIE < 9 ? 'load' : 'DOMContentLoaded';
      agh.addEventListener(window, loadEventName, function() {
        agh.scripts.files['event:onload'] = 'ready';
        agh.scripts._dowait();
      }, false);
      if (window.readyState == "complete")
        agh.scripts.files['event:onload'] = 'ready';
    }

    //--------------------------------------------------------------------------
    //  window command
    //--------------------------------------------------------------------------
    var window_command = function(cmd) {
      if (cmd == "debug") {
        agh.scripts.wait(["agh.debug.js", "agh.dom.js", "agh.forms.js"], function() {
          // var div = document.createElement("div");
          // div.style.backgroundColor = "#fff";
          // document.body.appendChild(div);
          // div.appendChild(new agh.debug.ObjectTreeNode("window", window).element());

          var f1 = new agh.Forms.Form();
          f1.setPosition(200, 200);
          f1.setSize(400, 300);
          f1.setText("agh.debug");

          var page = new agh.Forms.TabPage();
          page.setDock('fill');
          page.setMargin(6);
          var tab1 = page.addTab("Console");
          var tab2 = page.addTab("HTML Tree");
          var tab3 = page.addTab("DOM Tree");
          page.setSelectedTab(0);
          f1.addControl(page);

          {
            tab1.c_page.m_allowOverwrapMargin = true;

            var c_line = new agh.Forms.Control(document);
            c_line.setHeight(24);
            c_line.setMargin(3);
            c_line.setDock('bottom');
            tab1.c_page.addControl(c_line);
            {
              var proc_run = function() {
                var result;
                try {
                  result = eval(c_text.e_main.value);
                } catch(ex) {
                  result = ex;
                }

                try {
                  //cons.inspect(result);
                  cons._puthtml("").appendChild(agh.debug.createObjectTree("eval", result));
                } catch(ex) { log(ex.stack); }
              };

              var c_run = new agh.Forms.Element(document.createElement("button"));
              agh.dom.setInnerText(c_run.e_main, "Run");
              agh.dom.attach(c_run.e_main, '-agh-click', proc_run);
              c_run.setWidth(64);
              c_run.setDock('right');
              c_line.addControl(c_run);

              var c_text = new agh.Forms.Element(document.createElement("input"));
              c_text.e_main.type = "text";
              c_text.setDock('fill');
              agh.addEventListener(c_text.e_main, 'keypress', function(e) {
                var code = e.charCode || e.which;
                if (code == 13) proc_run();
              });
              c_line.addControl(c_text);
            }

            var c_cons = new agh.Forms.Control(document);
            c_cons.setBorderStyle('inset');
            c_cons.setBackColor("white");
            c_cons.setMargin(3);
            c_cons.setDock('fill');
            c_cons.setScroll();
            var cons = new agh.debug.Console(c_cons.getContentElement());
            tab1.c_page.addControl(c_cons);
          }

          tab2.c_page.setBorderStyle('inset');
          tab2.c_page.setBackColor("white");
          tab2.c_page.setScroll();
          tab2.c_page.getContentElement().appendChild(
            agh.debug.createDomTree(document));

          tab3.c_page.setBorderStyle('inset');
          tab3.c_page.setBackColor("white");
          tab3.c_page.setScroll();
          tab3.c_page.setPadding(3);
          tab3.c_page.getContentElement().appendChild(
            new agh.debug.ObjectTreeNode("window", window).element());

          f1.Show();
        });
      }
    };
    var prompt = "";
    var promptMode = false;
    var originalTitle = document.title;
    var processKey = function(e, _char, _meta, _ctrl) {
      var processed = false;
      if (!promptMode) {
        if (_ctrl && !_meta && (_char == 186 || _char == 58)) {
          // 186 = [colon/star] key in JP, [semicolon/colon] in EN
          processed = true;
          originalTitle = document.title;
          document.title = "[agh.js]$ <";
          prompt = "";
          promptMode = true;
        }
      } else {
        if (_meta || _ctrl) {
          document.title = originalTitle;
          promptMode = false;
        } else {
          processed = true;
          if (_char == 10 || _char == 13) {
            document.title = originalTitle;
            promptMode = false;
            window_command(prompt);
          } else {
            if (_char == 8)
              prompt = prompt.slice(0, -1);
            else
              prompt += String.fromCharCode(_char);
            //if (agh.global.console) console.log(prompt);
            document.title = "[agh.js]$ " + prompt + "<";
          }
        }
      }

      if (processed) {
        if (e.stopPropagation) e.stopPropagation();
        else e.cancelBubble = true;
        if (e.preventDefault) e.preventDefault();
        else e.returnValue = false;
        return false;
      }
    };
    agh.addEventListener(document, "keydown", function(e) {
      var _char = e.charCode || e.keyCode;
      var _meta = (e.modifiers & 1 || e.metaKey || e.altKey);
      var _ctrl = (e.modifiers & 2 || e.ctrlKey);
      if (_meta || _ctrl || _char == 8)
        return processKey(e, _char, _meta, _ctrl);
    });
    agh.addEventListener(document, "keypress", function(e) {
      var _char = e.charCode || e.keyCode;
      var _meta = (e.modifiers & 1 || e.metaKey || e.altKey);
      var _ctrl = (e.modifiers & 2 || e.ctrlKey);
      if (!_meta && !_ctrl)
        return processKey(e, _char, _meta, _ctrl);
    });
  }

})();
//------------------------------------------------------------------------------
  agh.scripts.files[THIS_FILE] = "ready";
  return agh;
})(this);
//------------------------------------------------------------------------------
