//  filename  : agh.lang.tex.js
//  charset   : utf-8
//*****************************************************************************
//
//  Ageha JavaScript Library 3.1 :: LaTeX  Interpreter
//
//                     copyright (c) 2008-2013, K. Murase. All rights reserved.
//
//*****************************************************************************
agh.scripts.register("agh.lang.tex.js", ["agh.js"], function() {
/*===========================================================================*/
  var nsName = "agh.LaTeX";
  //var nsName = "agh.DHTeXML2";
  var ns = agh.Namespace(nsName);

//-----------------------------------------------------------------------------
(function aghtex_include_core_js() { /* main.pp.js: included from core.js */
// -*- mode: js; coding: utf-8 -*- (日本語)
//
// ChangeLog
//
// 2013-09-02, KM,
//   * core.js: 名称変更
// 2012/12/10, KM,
//   * latex.cor.js: 更新
// 2008/04/03, K. Murase,
//   * latex.doc.js (class Document): 作成
//

ns.BaseUrl = agh.scripts.AGH_URLBASE + "latex/";

ns.compatMode
  = (agh.browser.name == "Cr" ? "Sf" : agh.browser.name)
  + (document.compatMode == "CSS1Compat" ? "-std" : document.compatMode == "BackCompat" ? "-qks" : "-std");

ns.InitializeView = function(_window) {
  if (_window == null)
    _window = window;

  var csspath = "latex/latex.sf.css"; // default
  switch (agh.browser.name) {
  case "IE": csspath = "latex/latex.ie.css"; break;
  case "Fx": csspath = "latex/latex.fx.css"; break;
  case "Cr":
  case "Sf": csspath = "latex/latex.sf.css"; break;
  case "Op": csspath = "latex/latex.op.css"; break;
  }

  if (_window.document === agh.scripts.DOCUMENT) {
    agh.scripts.load(csspath);
  } else {
    var head = _window.document.getElementsByTagName("head")[0];
    if (head) {
      var link = _window.document.createElement("link");
      link.rel = "stylesheet";
      link.type = "text/css";
      link.charset = "utf-8";
      link.href = agh.scripts.AGH_URLBASE + csspath;
      head.appendChild(link);
    }
  }

  var eHTML = _window.document.documentElement;
  if (eHTML.getAttribute("xmlns:tex") == null)
    eHTML.setAttribute("xmlns:tex", ns.BaseUrl);
};

ns.InitializeView();

//==============================================================================
//
//  内部グローバル変数
//

agh.Namespace("Modules", ns);
var _Mod = {};
ns.Modules["core"] = _Mod;

//--------------------------------------------------------------------
// Constants

var MACRO_LOOP_THRESH = 128;
var MACRO_NEST_THRESH = 256;
var REG_ISCMDCHAR = /[^!"#$&'()=~|\-\^`{\[;:\]+},.\/<>?_ \n\t\r\v\f\b　\\%0-9]/;
var REG_ISTXTCHAR = /[^!"#$&'()=~|\-\^`{\[;:\]+},.\/<>?_ \n\t\r\v\f\b　\\%*]/;

function texctype_isspace(ch) {
  var c = ch.charCodeAt(0);
  return 0 <= c && c <= 32 || c == 0x3000; // 0x3000: 全角
}
function aghtex_assert(condition, message) {
  if (!condition) throw new Error(message);
}

//◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
//
//            class Scanner4
//
//◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇
// var SCAN_WT_INV = 1; // invalid
// var SCAN_WT_CMD = 2; // command
// var SCAN_WT_LTR = 3; // delimiter
// var SCAN_WT_TXT = 4; // text
// var SCAN_WT_COM = 5; // comment
var SCAN_WT_INV = _Mod.SCAN_WT_INV = "inv"; // invalid (error)
var SCAN_WT_CMD = _Mod.SCAN_WT_CMD = "cmd"; // escapechar+letters
var SCAN_WT_LTR = _Mod.SCAN_WT_LTR = "ltr"; // letter, space
var SCAN_WT_TXT = _Mod.SCAN_WT_TXT = "txt"; // other
var SCAN_WT_COM = _Mod.SCAN_WT_COM = "comment";
ns.Source = function(text) {
  this.text = text;
  this.length = text.length;
  this.index = -1;
  this.ch = null;

  //alert("dbg: len=" + this.length + " txt='" + this.text + "'");
  this.wstart = 0;
  this.wbegin();
};
agh.memcpy(ns.Source.prototype, {
  next: function() {
    this.index++;
    if (this.index < this.length) {
      this.ch = this.text.substr(this.index, 1);
      return true;
    } else {
      this.ch = "EOF"; // ■TODO: "EOF" を別の物に。SCAN_CH_EOF={}; 等。
      return false;
    }
  },
  wbegin: function aghtex_Source_wbegin() {
    this.index = this.wstart;
    if (this.index < this.length) {
      this.ch = this.text.substr(this.index, 1);
      return true;
    } else {
      this.ch = "EOF"; // ■TODO: "EOF" を別の物に。SCAN_CH_EOF={}; 等。
      return false;
    }
  },
  update_wstart: function aghtex_Source_update_start() {
    if (this.wstart != this.index) {
      this.arrloop = null;
      this.wstart = this.index;
    }
    return this.wstart < this.length;
  }
});
//---------------------------------------------------------------------------
ns.Scanner4 = function(text) {
  if (text == null) throw new Error("Scanner4.{ctor}: argument 'text' is null.");

  this.sourceStack = [];
  this.source = new ns.Source(text);

  this.mode = 0;
  this.m_makeatletter = false;

  this.word = null;
  this.wordtype = SCAN_WT_INV;
};
agh.memcpy(ns.Scanner4.prototype, {
  //======================================================================
  // Source
  InsertSource: function(instext) {
    /// <summary>
    /// 現在の単語開始位置に文字列を挿入します。
    /// </summary>
    if (this.source != null) //&& this.source.index < this.source.length) // ■■
      this.sourceStack.push(this.source);
    this.source = new ns.Source(instext);
    this.Next();
  },
  ConsumePartialTxt: function(length) {
    if (this.word.length > length) {
      this.source.wstart += length;
      this.word = this.word.slice(length);
    } else {
      this.Next();
    }
  },
  ClipFirstFromTxt: function() {
    /// <summary>
    /// 現在の txt から初めの一文字だけ取得し、残りは次の読み出しに回します。
    /// </summary>
    /// <condition>wordtype==SCAN_WT_TXT である事が呼び出し条件です。</condition>
    var txt = this.word;
    if (this.word.length > 1) {
      this.source.wstart++;
      this.word = txt.substr(1);
      return txt.substr(0, 1);
    } else {
      this.Next();
      return txt;
    }
  },
  //----------------------------------------------------------------------
  //  ユーザマクロ用の無限ループ判定
  DetectLoop: function(macro_id) {
    if (this.sourceStack.length >= MACRO_NEST_THRESH)
      return true;

    var src = this.source || this.sourceStack;
    var arr = src.arrloop;
    if (arr == null) {
      src.arrloop = [{id: macro_id, count: 1}];
      return false;
    }

    for (var i = 0 , iN = arr.length; i < iN; i++) {
      if (arr[i].id != macro_id) continue;

      if (arr[i].count >= MACRO_LOOP_THRESH)
        return true;

      arr[i].count++;
      return false;
    }

    arr.push({id: macro_id, count: 1});
    return false;
  },
  //======================================================================
  //    語の読み取り
  //======================================================================
  Next: function aghtex_Scanner4_Next() {
    /// <summary>
    /// 現在の読み取り開始位置から単語を読み取ります。
    /// </summary>

    // (高頻度で呼ばれる関数の為、出来るだけ関数を展開して最適化する)
    var src = this.source;

    // <inline-expansion>
    //   original code
    //     if (!src.update_wstart()) src.popSource();
    //     src.wbegin();
    //   inline-expanded code
    if (src.wstart != src.index) {
      src.wstart = src.index;
      src.arrloop = null;
    }
    if (src.index >= src.length) {
      if (this.sourceStack.length > 0) {
        this.source = src = this.sourceStack.pop();
        src.index = src.wstart;
      }

      // トップレベルは末尾でも push され得る。
      if (src.index >= src.length) {
        this.word = "EOF";
        this.wordtype = SCAN_WT_LTR;
        return;
      }
    }
    // </inline-expansion>

    var c = src.text.charCodeAt(src.index);

    if (c < 64 && !(48 <= c && c < 58) && 0 <= c || 91 <= c && c < 97 || 123 <= c && c<127 || c == 0x3000) {
      if (c == 0x5c) {
        if (this.m_makeatletter)
          var reg = /\\(?:[^!"#$&'()=~|\-\^`{\[;:\]+},.\/<>?_ \n\t\r\v\f\b　\\%*\x1F0-9]+\*?|[^*]\*?|\*|$)/g;
        else
          var reg = /\\(?:[^!"#$&'()=~|\-\^`{\[;:\]+},.\/<>?_ \n\t\r\v\f\b　\\%*\x1F0-9@]+\*?|[^*]\*?|\*|$)/g;

        reg.lastIndex = src.index;
        reg.test(src.text);

        this.wordtype = SCAN_WT_CMD;
        this.word = src.text.slice(src.index + 1, reg.lastIndex);
        src.index = reg.lastIndex;
      } else if (c == 0x25) {
        var reg = /\%[^\n]*(?:\n|$)/g;
        reg.lastIndex = src.index;
        reg.test(src.text);

        this.wordtype = SCAN_WT_COM;
        this.word = src.text.slice(src.index + 1, reg.lastIndex);
        src.index = reg.lastIndex;
      } else if (c == 0x1F) {
        // 2014-09-27
        //   US(\x1F) トークンの強制区切
        //   置換した引数 #1 などが前後のトークンとくっつかない様にする為。
        var reg = /\x1F+/g;
        reg.lastIndex = src.index;
        reg.test(src.text);
        src.index = reg.lastIndex;
        this.Next();
      } else if (c == 0x0d) {
        this.word = '\n';
        this.wordtype = SCAN_WT_LTR;
        if (++src.index < src.text.length && src.text.substr(src.index, 1) == '\n')
          src.index++;
      } else {
        // special letters
        this.word = src.text.substr(src.index, 1);
        this.wordtype = SCAN_WT_LTR;
        src.index++;
      }
    } else {
      var reg = /[^!"#$&'()=~|\-\^`{\[;:\]+},.\/<>?_ \n\t\r\f\b　\\%*\x1F]+/g
        reg.lastIndex = src.index;
        reg.test(src.text);

      this.wordtype = SCAN_WT_TXT;
      this.word = src.text.slice(src.index, reg.lastIndex);
      src.index = reg.lastIndex;
    }
  },
  NextRawChar: function() {
    /// <summary>
    /// sourceStack, US(\x1F), CR(\r\n?)正規化 を考慮に入れて強制的に次の文字を取得します。
    /// </summary>
    /// 注意: 単語の読み取り途中でも pop したりするので、この読み取りはキャンセル不可能である。
    ///       つまり直後に必ず scanner.Next 系関数を呼び出さなければならない。
    var src = this.source;
    if (src.wstart != src.index) {
      src.wstart = src.index;
      src.arrloop = null;
    }

    this.wordtype = SCAN_WT_LTR;
    for (;;) {
      if (src.index >= src.length) {
        if (this.sourceStack.length > 0) {
          this.source = src = this.sourceStack.pop();
          src.index = src.wstart;
        }
        if (src.index >= src.length) {
          this.word = null;
          return this.NEXT_EOF;
        }
      }

      this.word = src.text.charAt(src.index++);
      if (this.word != '\x1F') {
        if (this.word == '\r') {
          if (src.index < src.length && src.text.charCodeAt(src.index) == 0x0A) src.index++;
          this.word = '\n';
        }
        return this.NEXT_SUCCESS;
      }
    }
  },
  NextVerbArgument: function() {
    /// @return 0 正常終了, 1 エラー:EOF, 2 エラー:改行
    /// 注意: 単語の読み取り途中でも pop したりするので、この読み取りはキャンセル不可能である。
    ///       つまり直後に必ず scanner.Next 系関数を呼び出さなければならない。

    // NextRawChar の続きとして実装する
    var ret = this.NextRawChar();
    if (ret == this.NEXT_EOF) return ret;
    var chterm = this.word;

    // ※以降は src.index<src.length でなくても OK なコードになっている

    var src = this.source;
    this.word = '';
    this.wordtype = SCAN_WT_TXT;
    var reg = /[^\r\n\x1F]*/g;
    var isTerminatorNL = chterm == '\n';
    var i1 = isTerminatorNL ? -1 : src.text.indexOf(chterm, src.index);
    for (;;) {
      reg.lastIndex = src.index;
      reg.test(src.text);

      if (0 <= i1 && i1 <= reg.lastIndex) {
        this.word += src.text.slice(src.index, i1);
        src.index = i1 + 1;
        return this.NEXT_SUCCESS;
      }

      this.word += src.text.slice(src.index, reg.lastIndex);
      src.index = reg.lastIndex;
      if (src.index < src.length) {
        var chnext = src.text.charCodeAt(src.index++);
        if (chnext != 0x1F) {
          if (isTerminatorNL) {
            if (chnext == 0x0D && src.index < src.length && src.text.charCodeAt(src.index) == 0x0A) src.index++;
            return this.NEXT_SUCCESS;
          } else {
            src.index--;
            return this.NEXT_NEWLINE;
          }
        }
      }

      if (src.index >= src.length) {
        if (this.sourceStack.length > 0) {
          this.source = src = this.sourceStack.pop();
          src.index = src.wstart;
        }
        if (src.index >= src.length) {
          return this.NEXT_EOF;
        }
        i1=isTerminatorNL ? -1 : src.text.indexOf(chterm, src.index);
      }
    }

  },
  NEXT_SUCCESS: 0,
  NEXT_EOF: 1,
  NEXT_NEWLINE: 2,
  //======================================================================
  // 現在の単語
  is: function(type, word) {
    return this.wordtype === type && this.word === word;
  },
  //======================================================================
  // 自己記述
  toString: function() {
    return "[object " + nsName + ".Scanner4]";
  }
});
ns.Scanner = ns.Scanner4;
//◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
//
//            class Context
//
//◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇
ns.ContextFactory = function(factory) {
  this.baseFcts = [];
  this.handlerL = {};  // 制御文字 handler
  this.handlerC = {};  // コマンド handler
  this.handlerE = {};  // 環境開始 handler

  if (factory != null)
    this.AddBaseContext(factory);
};
ns.ContextFactory.toString = function() {
  return "[class " + nsName + ".ContextFactory]";
};
ns.ContextFactory.GetInstance = function(contextName, base) {
  var ret = this[contextName];
  if (!ret) {
    ret = this[contextName] = new ns.ContextFactory(base);
    ret.contextName = contextName;
  }
  return ret;
};
agh.memcpy(ns.ContextFactory.prototype, {
  toString: function() {
    return "[object " + nsName + ".ContextFactory]";
  },
  //======================================================================
  //    Setup
  //======================================================================
  AddBaseContext: function(factory) {
    if (factory instanceof Array) {
      for (var i = 0, iN = factory.length; i < iN; i++)
        this.AddBaseContext(factory[i]);
    } else if (typeof factory == "string" || factory instanceof String) {
      // "Context 名" の場合にはインスタンス生成時に解決
      // Document に対して一つずつ生成される Context
      this.baseFcts.push(factory);
    } else if (factory instanceof ns.ContextFactory) {
      // 本 Context インスタンス化の際に、毎回 base-Context を生成する。
      // 　則ち、同じ ContextFactory から生成された Context でも
      // 異なる base-Context を保持していると言うことになる。
      this.baseFcts.push(factory);
    }
    else {
      // ContextFactory 丈でなく Context を直接指定できるようにするべきか?
      throw new Error("LOGIC_ERROR: Unknown type of ContextFactory-base");
    }
  },
  _instantiateHandler: function(definition) {
    if (typeof definition === "function") {
      return definition;
    } else if (definition instanceof Array) {
      var cmdtype = definition[0];
      var argdef = null;
      var cmddef = definition[1];

      var index;
      if ((index = cmdtype.indexOf(";")) >= 0) {
        argdef = cmdtype.slice(index + 1);
        cmdtype = cmdtype.slice(0, index);
      }

      return new ns.Command2(cmdtype, argdef, cmddef);
    } else {
      throw new Error("LOGIC_ERROR: Unexptected type of command handler!");
    }
  },
  AddLetterHandler: function(letter, definition) {
    definition = this._instantiateHandler(definition);

    if (letter instanceof Array) {
      for (var i = 0; i < letter.length; i++)
        this.handlerL[letter[i]] = definition;
    } else if (typeof letter == "string" || letter instanceof String) {
      if (letter == "EOF") {
        this.handlerL[letter] = definition;
        return;
      }
      for (var i = 0; i < letter.length; i++)
        this.handlerL[letter.substr(i, 1)] = definition;
    }
    else {
      throw new Error("LOGIC_ERROR: AddLetterHandler の第一引数には登録する文字を指定して下さい");
    }
  },
  AddCommandHandler: function(command, definition) {
    this.handlerC[command] = this._instantiateHandler(definition);
  },
  AddEnvironment: function(name, arg) {
    if (arg == null) {
      this.handlerE[name] = null;
    } else if (arg instanceof ns.Environment) {
      this.handlerE[name] = arg;
    } else {
      this.handlerE[name] = new ns.Environment(arg);
    }
  },
  // utility functions for .ctx files
  _DefineCommand: function(addMethod, args) {
    if (args.length === 2) {
      var cmdName = args[0];
      var definition = args[1];
      /// @fn Context#DefineCommand(cmdName, func);
      /// @fn Context#DefineCommand(cmdName, [argdef, body]);
      addMethod.call(this, cmdName, definition);
    } else if (args.length === 1) {
      /// @fn Context#DefineCommand({cmdName:definition,...});
      ///   複数のコマンド定義を行います。
      ///   @param[in] cmdName    コマンド名を指定します。
      ///   @param[in] definition 二つ引数を取るオーバーロードの第二引数に相当します。
      var dict = args[0];
      var keys = agh.ownkeys(dict);
      for (var i = 0; i < keys.length; i++)
        this._DefineCommand(addMethod, [keys[i], dict[keys[i]]]);
    }
  },
  DefineCommand: function() {
    this._DefineCommand(this.AddCommandHandler, arguments);
  },
  DefineLetter: function() {
    this._DefineCommand(this.AddLetterHandler, arguments);
  },
  DefineEnvironment: function() {
    this._DefineCommand(this.AddEnvironment, arguments);
  },
  //======================================================================
  //    Create Context Instance
  //======================================================================
  CreateContext: function(document) {
    var baseCtxs = [];
    for (var i = 0, iN = this.baseFcts.length; i < iN; i++)
      baseCtxs.push(document.context_cast(this.baseFcts[i]));
    var ret = new ns.Context(
      baseCtxs,
      agh.memcpy(null, this.handlerL),
      agh.memcpy(null, this.handlerC), // newcommand 等で変更が加えられるかも知れない為
      agh.memcpy(null, this.handlerE), // newenvironment 等で変更が加えられるかも知れない為
      this.initializer
    );
    if (this.contextName)
      ret.contextName = this.contextName;
    return ret;
  }
});
//◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
ns.Context = function(base_ctxs, handler_l, handler_c, handler_e, initializer) {
  this.baseCtxs = base_ctxs;
  this.handlerL = handler_l||{};  // 制御文字 handler
  this.handlerC = handler_c||{};  // コマンド handler
  this.handlerE = handler_e||{};  // 環境開始 handler
  if (initializer != null)
    this.initializer = initializer;  // 初期化子

  this.userC = {};     // マクロ handler (ユーザ定義コマンド)
  this.dataL = {};     // Length 情報を保持します。
  this.dataV = {};     // コンテキスト変数を保持します。

  // this.text_modifier // 文字列修飾子
  // this.BREAK         // 読み取り終了フラグ

  // Document#Read 関数内で追加されるメンバ
  // this.output
};
ns.Context.toString = function() {
  return "[class " + nsName + ".Context]";
};
agh.memcpy(ns.Context.prototype, ns.ContextFactory.prototype, [
  "AddLetterHandler", "AddCommandHandler", "AddEnvironment", "_instantiateHandler"
]);
agh.memcpy(ns.Context.prototype, {
  //======================================================================
  //  base context manipulation
  AddBaseContext: function(context) {
    if (context instanceof Array) {
      for (var i = 0, iN = context.length; i < iN; i++)
        this.AddBaseContext(context[i]);
    } else if (context instanceof ns.Context) {
      this.baseCtxs.push(context);
    } else {
      throw "Unknown type of ContextFactory-base";
    }
  },
  ContainsBaseContext: function(context) {
    var a = this.baseCtxs;
    for (var i = 0, iN = a.length; i < iN; i++)
      if (a[i] == context) return true;
    return false;
  },
  RemoveBaseContextWithInitializer: function(initializer) {
    var b = this.baseCtxs;
    var a = [];
    for (var i = 0, iN = b.length; i < iN; i++)
      if (b[i].initializer != initializer)
        a.push(b[i]);
    this.baseCtxs = a;
  },
  OverwriteContext: function(context) {
    // [: "context はこの呼び出し以降、変更されない" :]

    // 何でもかんでも AddBaseContext すると、
    // Handlers の探索に時間が掛かる様になってしまうので、
    // 適宜上書きして base context の肥大化を防ぐ。
    // ■ base context 自体の flatten? versioning による管理

    if (context instanceof ns.Context) {
      var s = context.baseCtxs;
      var iN = s.length;
      var d = this.baseCtxs;
      var jN = d.length;

      sloop: for (var i = 0; i < iN; i++) {
        for (var j = 0; j < jN; j++)
          if (s[i] == d[j])
            continue sloop;
        d.push(s[i]);
      }
      agh.memcpy(this.handlerL, context.handlerL);
      agh.memcpy(this.handlerC, context.handlerC);
      agh.memcpy(this.handlerE, context.handlerE);
    }
  },
  //======================================================================
  //  context initialization before reading
  Initialize: function(mainctx) {
    if (mainctx == null) mainctx = this;

    for (var i = 0, iN = this.baseCtxs.length; i < iN; i++) {
      this.baseCtxs[i].Initialize(mainctx);
    }

    if (this.initializer instanceof Function)
      this.initializer(mainctx);
  },
  //======================================================================
  //    識別
  //======================================================================
  toString: function() {
    return "[object " + nsName + ".Context]";
  },
  dbgGetContexts: function() {
    var names = [];
    function rec(ctx) {
      names.push(ctx.contextName || "?");
      for (var i = ctx.baseCtxs.length; --i >= 0; )
        rec(ctx.baseCtxs[i]);
    }
    rec(this);
    return names.join(", ");
  },
  //======================================================================
  //    Handler 索引 (継承を辿ります)
  //======================================================================
  GetLetterHandler: function aghtex_Context_GetLetterHandler(letter) {
    if (letter in this.handlerL) {
      return this.handlerL[letter];
    } else {
      for (var i = this.baseCtxs.length; --i >= 0; ) {
        var r = this.baseCtxs[i].GetLetterHandler(letter);
        if (r != null) return r;
      }
      return null;
    }
  },
  /// <summary>
  /// 指定した名前の command を処理してその結果を出力します。
  /// </summary>
  /// <returns>
  /// 正しく処理出来た場合には結果の html を出力します。
  /// ハンドラが見つからなかった場合には例外を説明する html を出力します。
  /// </returns>
  ReadCommand: function(doc, cmd) {
    // var h = this.GetCommandHandler(doc, cmd)
    //   || function(doc, cmd) {
    //     doc.scanner.Next();
    //     doc.currentCtx.output.error("UnknownCommand", "\\" + cmd);
    //   };
    // h(doc, cmd);
    // doc.skipSpaceAndComment();

    var h = this.GetCommandHandler(doc, cmd);
    if (h) {
      h(doc, cmd);
      //doc.skipSpaceAndComment(); // 20121206
      return !!h.isInsertMacro;
    } else {
      doc.scanner.Next();
      //doc.skipSpaceAndComment(); // 20121206

      doc.currentCtx.output.error(
        "UnknownCommand", {cmd: cmd, contexts: doc.currentCtx.dbgGetContexts()},
        nsName + ".Context.ReadCommand");
    }
  },

  GetCommandHandler: function(doc, cmd) {
    return doc.GetMacroHandler(cmd) || this.GetBuiltinCommandHandler(cmd);
  },
  GetBuiltinCommandHandler: function(cmd) {
    if (cmd in this.handlerC) {
      return this.handlerC[cmd];
    } else {
      for (var i = this.baseCtxs.length; --i >= 0; ) {
        var r = this.baseCtxs[i].GetBuiltinCommandHandler(cmd);
        if (r != null) return r;
      }
      return null;
    }
  },
  GetEnvironment: function(envname) {
    if (envname in this.handlerE) {
      return this.handlerE[envname];
    } else {
      for (var i = this.baseCtxs.length; --i >= 0; ) {
        var r = this.baseCtxs[i].GetEnvironment(envname);
        if (r != null) return r;
      }
      return null;
    }
  },

  GetContextVariable: function(key) {
    return this.dataV[key];
  },
  SetContextVariable: function(key, value) {
    this.dataV[key] = value;
  }
});
//◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
//
//            class Writer
//
//◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇
ns.Writer = function(text) {
  this.buff = [];
  this.postfix = "";
};
agh.memcpy(ns.Writer.prototype, {
  appendText: function(text) {
    this.buff.push(agh.Text.Escape(text, "html"));
  },
  append: function aghtex_Writer_append(html) {
    this.buff.push(html);
  },
  error: function(title, desc, from) {
    this.buff.push(ns.Writer.get_error(title, desc, from));
  },
  clear: function() {
    this.buff = [];
    this.postfix = "";
  },
  appendPre: function(text) {
    var current = this.buff.join('');
    this.buff = [text, current];
  },
  appendPost: function(text) {
    this.postfix = text + this.postfix;
  },
  toHtml: function() {
    var ret = this.buff.join("");
    this.buff = [ret];
    return ret + this.postfix;
  },
  toString: function() {
    return "[object " + nsName + ".Writer]";
  }
});
agh.memcpy(ns.Writer, {
  get_error: (function() {
    /// <summary>
    /// 例外に関する表示メッセージを保持するテーブルです。
    /// </summary>
    _Mod.ErrorMessages = {
      "UnexpectedEOR": [
        "unexpected EOR {0}",
        ["unexpected token {0} has appeared.",
         "the current context should not end with the token {0}.",
         "check the following points:",
         "* if the end of the current context is missing",
         "* if the token {0} is mistakenlly inserted here"].join("\n")],
      "UnknownCommand": [
        "\\{cmd}",
        ["the command '\\{cmd}' is not available in this context.",
         "the current context is [{contexts}].",
         "check the following points:",
         "* if the command is supported in aghtex",
         "* if the spelling of the command is correct",
         "* if the command is supported in the current context."
        ].join("\n")],
      "UnknownEnvironment": [
        "env:{env}",
        ["the environment '{env}' is not available in this context.",
         "the current context is [{contexts}].",
         "check the following points:",
         "* if the environment is supported in aghtex",
         "* if the spelling of the environment is correct",
         "* if the environment is supported in the current context."].join("\n")],
      // "UnexpectedEOR": [
      //   "unexpected EOR {0}",
      //   ["{0} に予期せず出会いました。\r\n",
      //    "現在読み取り中の領域は {0} で終了する物ではありません。\r\n",
      //    "以下の項目に関して確認して下さい\r\n",
      //    "・現在の領域の終了の記述が抜けていないか\r\n",
      //    "・または、誤って {0} を挿入していないか\r\n"].join("\n")],
      // "UnknownCommand": [
      //   "unknown command '\\{cmd}'",
      //   ["コマンド '{cmd}' は現在の context では有効でありません。",
      //    "以下の項目に関して確認して下さい",
      //    "・綴りが間違っていないか",
      //    "・コマンドを使う場所を誤っていないか",
      //    "・コマンドが存在しているか"].join("\n")],
      // "UnknownEnvironment": [
      //   "unknown environment '{env}'",
      //   ["環境 '{env}' は現在の context では有効でありません。",
      //    "以下の項目に関して確認して下さい",
      //    "・綴りが間違っていないか",
      //    "・環境に入る場所を誤っていないか",
      //    "・環境が定義されているか"].join("\n")],
      "aghtex.Document.references.createSectionId.unknownCounter": [
        "unknown counter '{counterName}'",
        "the counter referenced from some sectioning command is not defined."]
    };

    //var newLine = agh.browser.vIE ? "\r\n" : "\n"; // 誰も使っていない
    var messages = _Mod.ErrorMessages;
    return function(title, desc, from) {
      if (title in messages) {
        var v = messages[title];
        if (v instanceof Function) {
          v = v(desc);
          title = v[0];
          desc = v[1];
        } else if (v instanceof Array) {
          if (desc != null) {
            title = agh.Text.format(v[0], desc);
            desc = agh.Text.format(v[1], desc);
          } else {
            title = v[0];
            desc = v[1];
          }
        }
      }
      if (from != null)
        desc = (desc ? desc + "\n  @ " : "  @ ") + from;
      if (title == null) title = "error";

      // construct html
      var attr_title = '';
      if (desc != null && desc != "") {
        var attr_title = ' title="' + agh.Text.Escape(desc, 'html-attr').replace(/\\/g, '&#x5c;') + '"';
        var attr_class = ' class="aghtex-core-msgbox"';
        if (agh.browser.vOp)
          return '<span onclick="alert(this.firstChild.title);"><tex:error' + attr_class + attr_title + '>[' + title + ']</tex:error></span>';
        else
          return '<tex:error' + attr_class + attr_title + ' onclick="alert(this.title);">[' + title + ']</tex:error>';
      } else {
        return '<tex:error>[' + title + ']</tex:error>';
      }
    };
  })()
});
//◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
//
//            class Document
//
//◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇
ns.Document = function(text, context) {
  this.scanner = new ns.Scanner(text);

  this.contexts = {
    "global": ns.ContextFactory["global"].CreateContext(this)
  };
  this.globalCtx = this.context_cast(context || "global");

  this.references = { // references
    lastSection: "",   // lastSection の表示名 (\ref の出力)
    lastSectionId: "", // lastSection の id
    section_ids: {},
    section_xcount: 0,
    createSectionId: function(doc, counterName) {
      var id = null;
      {
        if (counterName != null) {
          var c = doc.GetCounter(counterName);
          if (c != null) {
            id = c.arabic();
            while (c.parent != null) {
              c = c.parent;
              id = c.arabic()+"."+id;
            }
            id = "aghtex-sec-" + id;
            if (this.section_ids[id]) {
              id = id + "x";
              var xcount = 0;
              var idcand = id + xcount;
              while (this.section_ids[idcand = id + xcount]) xcount++;
              id = idcand;
            }
          } else {
            doc.currentCtx.output.error(
              "aghtex.Document.references.createSectionId.unknownCounter",
              {counterName: counterName},
              "doc.references.createSectionId");
          }
        }

        if (id == null)
          id = "aghtex-sec-x" + this.section_xcount++;
      }

      this.section_ids[id] = true;
      this.lastSectionId = id;
      return id;
    },
    displayedText: {},
    label_id_map: {},
    label_page_map: {}
  };
  // refs.displayedText[sec:attention] = "1.2.4";
  // refs.displayedText[eq:firstEquation] = "1";

  // document variables
  this.flags = {};

  // 解析時に使用
  this.currentCtx = null;
  this.ctxStack = [];

  this.option = {};
};
agh.memcpy(ns.Document.prototype, {
  Clone: function() {
    var ret = new ns.Document();
    var keys = agh.ownkeys(this.contexts);
    for (var i = 0, iN = keys.length; i < iN; i++) {
      var key = keys[i];
      ret.contexts[key] = this.contexts[key].Clone();
    }
    // ■TODO 未完成

    return ret;
  },
  toString: function() {
    return "[object " + nsName + ".Document]";
  }
});
agh.memcpy(ns.Document.prototype, {
  context_cast: function(val) {
    if (val instanceof ns.Context) {
      return val;
    } else if (val instanceof ns.ContextFactory) {
      //[instance per call]
      return val.CreateContext(this);
    } else if (typeof val == "string" || val instanceof String) {
      //[single instance]
      if (val in this.contexts) return this.contexts[val];

      if (val == ".") {
        return this.currentCtx;
      } else if (val == "..") {
        var i = this.ctxStack.length - 1;
        return i >= 0 ? this.ctxStack[i] : null;
      }

      var ret = ns.ContextFactory[val].CreateContext(this);
      this.contexts[val] = ret;
      ret.contextName = val;
      return ret;
    } else if (val instanceof Array) {
      var baseCtxs = [];
      for (var i = 0, iN = val.length; i < iN; i++) {
        var c = this.context_cast(val[i]);
        if (c != null) baseCtxs.push(c);
      }
      return new ns.Context(baseCtxs);
    }
    else if (val) {
      throw new Error("LOGIC_ERROR: Document#context_cast ArgumentUnexpectedType");
    }
    return null;
  },
  wrap_context: function(context) {
    if (context == null)
      throw new Error("LOGIC_ERROR: Document#context_cast ArgumentNull");
    if (!(context instanceof ns.Context))
      throw new Error("LOGIC_ERROR: Document#context_cast ArgumentUnexpectedType");
    return new ns.Context([context]);
  }
});
agh.memcpy(ns.Document.prototype, {
  Parse: function() {
    // 初めの単語に移動
    this.scanner.Next();
    var result = this.Read(this.wrap_context(this.globalCtx));
    return this.html = result;
  },
  pushContext: function(newCtx) {
    if (this.currentCtx != null) this.ctxStack.push(this.currentCtx);
    this.currentCtx = newCtx;
  },
  popContext: function() {
    var ret = this.currentCtx;
    this.currentCtx = this.ctxStack.length > 0 ? this.ctxStack.pop() : null;
    return ret;
  },
  skipSpaceAndComment: function() {
    //■二回以上の連続改行を検出 → return true?
    while (this.scanner.wordtype == SCAN_WT_COM || this.scanner.wordtype == SCAN_WT_LTR && texctype_isspace(this.scanner.word))
      this.scanner.Next();
  },
  /// @fn expandMacro
  ///   現在の単語がマクロである場合、それを展開して次の非マクロの単語を取得します。
  expandMacro: function() {
    while (this.scanner.wordtype === SCAN_WT_CMD) {
      var commandName = this.scanner.word;
      var handler = this.GetMacroHandler(commandName);
      if (handler && handler.isUserMacro)
        handler(this, commandName);
      else
        return;
    }
  },
  skipSpaceAndCommentExpandingMacro: function() {
    for (;;) {
      switch (this.scanner.wordtype) {
      case SCAN_WT_COM:
        this.scanner.Next();
        break;
      case SCAN_WT_LTR:
        if (!texctype_isspace(this.scanner.word)) return;
        this.scanner.Next();
        break;
      case SCAN_WT_CMD:
        var commandName = this.scanner.word;
        var handler = this.GetMacroHandler(commandName);
        if (!handler) return;
        handler(this, commandName);
        break;
      default:
        return;
      }
    }
  },
  //======================================================================
  //  Flags:
  //    context に属するのではなく document に直接属する変数。
  //    pushFlags, popFlags を手動で呼び出して階層を作る。
  //----------------------------------------------------------------------
  pushFlags: function() {
    this.flags = agh.wrap(this.flags, {'core/oldflags': this.flags});
  },
  popFlags: function() {
    var parent = this.flags['core/oldflags']
    if (parent != null) this.flags = parent;
  },
  GetDocumentVariable: function(dict, key) {
    var m = this[dict];
    if (!key) return m;
    return m ? m[key] : null;
  },
  SetDocumentVariable: function(dict, key, value) {
    var m = this[dict] || (this[dict] = {});
    m[key] = value;
  },
  //======================================================================
  //  コンテキスト変数検索
  //    GetMacroHandler: マクロハンドラ
  //    GetLengthData:   長さ変数
  //----------------------------------------------------------------------
  internalGetContextVariable: function(dict, key) {
    var ret = this.currentCtx[dict][key];
    if (ret != null) return ret;

    for (var i = this.ctxStack.length - 1; i >= 0; i--) {
      ret = this.ctxStack[i][dict][key];
      if (ret != null) return ret;
    }
    return null;
  },
  internalSetContextVariable: function(dict, key, value) {
    this.currentCtx[dict][key] = value;
  },
  internalReplaceContextVariable: function(dict, key, value) {
    var d = this.currentCtx[dict];
    if (d[key] != null) {
      d[key] = value;
      return true;
    }

    for (var i = this.ctxStack.length - 1; i >= 0; i--) {
      d = this.ctxStack[i][dict];
      if (d[key] != null) {
        d[key] = value;
        return true;
      }
    }

    return false;
  },
  GetContextVariable: function(key) {
    return this.internalGetContextVariable('dataV', key);
  },
  SetContextVariable: function(key, value) {
    this.internalSetContextVariable('dataV', key, value);
  },
  AssignContextVariable: function(key, value) {
    return this.internalReplaceContextVariable('dataV', key, value);
  },
  GetMacroHandler: function(cmd) {
    return this.internalGetContextVariable('userC', cmd);
  },
  SetMacroHandler: function(cmd, handler, isGlobal) {
    if ((isGlobal || this.flags['mod:common/global']) && 0 < this.ctxStack.length)
      this.ctxStack[0].userC[cmd] = handler;
    else {
      //this.internalSetContextVariable('userC', cmd, handler); は以下に等価
      this.currentCtx.userC[cmd] = handler;
    }
  },
  /// <summary>
  /// Context-Stack の中から最も上にある Length を取得します。
  /// </summary>
  GetLengthData: function(name) {
    return this.internalGetContextVariable('dataL', name);
  },
  //======================================================================
  //    読み取り
  //======================================================================
  /// <summary>
  /// 指定した context の元で読み取りを行いその出力結果を返します。
  /// </summary>
  /// <param name="baseContext">読み取りに使用する context の元となる context を指定します。</param>
  Read: function(baseContext) {
    //-----------------------------------------------------------------------
    //-----------------------------------------------------------------------

    var output = new ns.Writer();
    this.pushContext(baseContext);
    this.currentCtx.output = output;
    this.currentCtx.Initialize();
    for (;;) {
      var word = this.scanner.word;
      switch (this.scanner.wordtype) {
        case SCAN_WT_LTR:
          this.ReadLetter(word);
          break;
        case SCAN_WT_CMD:
          this.currentCtx.ReadCommand(this, word);
          break;
        case SCAN_WT_TXT:
          this.ReadText(word);
          break;
        case SCAN_WT_COM:
          this.scanner.Next();
          break;
        default:
        case SCAN_WT_INV:
          output.error("無効な語", "無効な語です。パーサ自体のバグである可能性が高いです。");
          this.currentCtx.BREAK = true;
          break;
      }
      if (this.currentCtx.BREAK) {
        this.currentCtx.BREAK = false;
        break;
      }
    }
    this.popContext();

    return output.toHtml();
  },
  /// <summary>
  /// 指定した名前の command を処理してその結果を返します。
  /// </summary>
  /// <returns>
  /// 正しく処理出来た場合には結果の html を返します。
  /// ハンドラが見つからなかった場合には例外を説明する html を返し、Context を抜ける様に設定します。
  /// </returns>
  ReadLetter: function aghtex_Document_ReadLetter(letter) {
    var lh = this.currentCtx.GetLetterHandler(letter);
    if (lh == null) {
      this.currentCtx.BREAK = true;
      this.currentCtx.output.error("'" + letter + "' に対する文字ハンドラが存在しません");
    } else {
      lh(this, letter);
    }
  },
  /// <summary>
  /// 指定した文字列を出力します。
  /// 必要が在れば、指定した文字列に加工を行います。
  /// </summary>
  ReadText: function aghtex_Document_ReadText(text) {
    var th = this.currentCtx.text_modifier;
    if (th instanceof Function) {
      text = th(this, text);
    } else {
      this.scanner.Next();
    }
    this.currentCtx.output.buff.push(text);
  },
  //======================================================================
  //    引数の取得
  //======================================================================
  ReadArgument: function(type, optional, basectx) {
    switch (type) {
    case "htm":
      return optional
        ? this.GetOptionalArgumentHtml(basectx)
        : this.GetArgumentHtml(basectx);
    case "txt":
      var r = optional ? this.GetOptionalArgumentHtml(basectx):
        this.GetArgumentHtml(basectx);
      return r == null ? null : agh.Text.Unescape(r, "html");
    case "raw":
      return optional
        ? this.GetOptionalArgumentRaw()
        : this.GetArgumentRaw();
    default:
      throw new Error("LOGIC_ERROR: Document#ReadArgument (arg#1): the specified command type is unrecognized.");
    }
    //baseContext.BREAK = true;
    //return this.Read(baseContext);
  },
  //*/
  /// <summary>
  /// 引数を html として取得します。
  /// </summary>
  GetArgumentHtml: function(basectx, direct) {
    var output = new ns.Writer();
    if (!basectx) basectx = this.currentCtx;

    // 一単語
    var stkdepth = this.scanner.sourceStack.length;
    var fmacro = false;
    {
      this.skipSpaceAndComment();
      this.pushContext(this.context_cast(direct ? basectx : [basectx, "sub.argument"]));
      this.currentCtx.output = output;
      this.currentCtx.Initialize();
      this.currentCtx.BREAK = true;
      for (;;) {
      var word = this.scanner.word;
      switch (this.scanner.wordtype) {
        case SCAN_WT_LTR:
          this.ReadLetter(word);
          break;
        case SCAN_WT_CMD: fmacro=
          this.currentCtx.ReadCommand(this, word);
          break;
        case SCAN_WT_TXT:
          this.ReadText(word);
          break;
        case SCAN_WT_COM:
          this.scanner.Next();
          break;
        default:
        case SCAN_WT_INV:
          output.error("無効な語", "無効な語です。パーサ自体のバグである可能性が高いです。");
          this.currentCtx.BREAK = true;
          break;
      }
        if (this.currentCtx.BREAK) {
          this.currentCtx.BREAK = false;
          break;
        }
      }
      this.popContext();
    }

    // InsertSource されたマクロ内容の読み取り
    if (fmacro && this.scanner.sourceStack.length > stkdepth /* 空マクロでない */) {
      var src = this.scanner.source;
      this.pushContext(this.context_cast([basectx]));
      this.currentCtx.output=output;
      this.currentCtx.Initialize();
      for (; src.wstart < src.length; ) {
      var word = this.scanner.word;
      switch (this.scanner.wordtype) {
        case SCAN_WT_LTR:
          this.ReadLetter(word);
          break;
        case SCAN_WT_CMD:
          this.currentCtx.ReadCommand(this, word);
          break;
        case SCAN_WT_TXT:
          this.ReadText(word);
          break;
        case SCAN_WT_COM:
          this.scanner.Next();
          break;
        default:
        case SCAN_WT_INV:
          output.error("無効な語", "無効な語です。パーサ自体のバグである可能性が高いです。");
          this.currentCtx.BREAK = true;
          break;
      }
        if (this.currentCtx.BREAK) {
          this.currentCtx.BREAK = false;
          break;
        }
      }
      this.popContext();
    }

    return output.toHtml();
  },
  /// <summary>
  /// 引数を html に展開せずに取得します。
  /// </summary>
  GetArgumentRaw: function() {
    this.skipSpaceAndComment();
    var ctx = this.context_cast(ns.ContextFactory["sub.argument.raw"]);
    ctx.BREAK = true;
    ctx.rawctx_ebuff = [];
    var result = this.Read(ctx);
    if (ctx.rawctx_ebuff.length)
      this.currentCtx.output.buff.push(ctx.rawctx_ebuff.join(''));
    return result;
  },
  /// <summary>
  /// 任意引数を取得します。
  /// </summary>
  /// <returns>
  /// [] で囲まれた任意引数が見つかった場合に、その引数を html として読み取った結果を返します。
  /// 任意引数が見つからなかった場合には null を返します。
  /// </returns>
  GetOptionalArgumentHtml: function(basectx) {
    this.skipSpaceAndComment();
    if (this.scanner.is(SCAN_WT_LTR, "[")) {
      this.scanner.Next();
      var ctx = this.context_cast([basectx || this.currentCtx, "sub.bracket"]);
      return this.Read(ctx);
    } else {
      return null;
    }
  },
  GetOptionalArgumentRaw: function() {
    this.skipSpaceAndComment();
    if (this.scanner.is(SCAN_WT_LTR, "[")) {
      this.scanner.Next();
      return this.GetArgRUntil(null, SCAN_WT_LTR, "]");
    } else {
      return null;
    }
  },
  GetArgHUntil: function(basectx, untilType, untilWord) {
    this.skipSpaceAndComment();
    var ctx = this.context_cast([basectx || this.currentCtx, "sub.until"]);
    ctx.until_type = untilType;
    ctx.until_word = untilWord;
    return this.Read(ctx);
  },
  GetArgRUntil: function(basectx_dummy, untilType, untilWord) {
    this.skipSpaceAndComment();
    var ctx = this.context_cast(ns.ContextFactory["sub.until.raw"]);
    ctx.until_type = untilType;
    ctx.until_word = untilWord;
    ctx.rawctx_ebuff = [];
    var result = this.Read(ctx);
    if (ctx.rawctx_ebuff.length)
      this.currentCtx.output.buff.push(ctx.rawctx_ebuff.join(''));
    return result;
  },
  //======================================================================
  //    上付・下付の取得
  //======================================================================
  GetSubSup: function() {
    var ret = {sub: null, sup: null};
    for (;;) {
      // ■ "二重改行 == 新しい段落" をも飛ばしてしまう可能性
      // ※ 因みに GetArguments 系では、
      // 　そこに必ず引数がある事が分かっているので
      // 　二重改行を飛ばしても問題ない
      // ・改行の数を数える?
      this.skipSpaceAndComment();

      if (this.scanner.wordtype === SCAN_WT_LTR) {
        if (this.scanner.word == "^") {
          if (ret.sup == null) {
            this.scanner.Next();
            ret.sup = this.GetArgumentHtml();
            continue;
          }
        } else if (this.scanner.word == "_") {
          if (ret.sub == null) {
            this.scanner.Next();
            ret.sub = this.GetArgumentHtml();
            continue;
          }
        }
      }
      break;
    }
    return ret;
  }
});
ns.Document.Classes = {};
ns.Document.Packages = {};
ns.Document.Test = function(text) {
  var doc = new ns.Document(text, "global");
  window.test_doc = doc;
  //doc.SetAlphaMode(true);
  doc.Parse();
  return doc.html;
};

//-----------------------------------------------------------------------------
// ns.Document#ReadDimension

agh.memcpy(_Mod.ErrorMessages, {
  "aghtex.Document.ReadDimension.MissingDimension": [
    "missing dimension",
    "a number followed by a unit or a length/dimen/skip command is expected."],
  "aghtex.Document.ReadDimension.MissingUnit": [
    "missing unit",
    "a unit of the dimension, which may be a unit name or a length/dimen/skip command, is expected."],
  "aghtex.Document.ReadDimension.MissingNumber": [
    "missing number",
    "a unit is specified without any number while reading a dimension."],
  "aghtex.Document.ReadDimension.InvalidUnit": [
    "invalid unit",
    "the unit name of the dimension, '{unit}', is unrecognized."],
  "aghtex.Document.ReadDimension.InvalidDimension": [
    "invalid dimension",
    "a command '\\{cmd}' was given for the unit of the dimension, but the command does not give a valid length/dimen/skip."]
});
function error_missing_dimension(doc) {
  doc.currentCtx.output.error(
    "aghtex.Document.ReadDimension.MissingDimension", null,
    nsName + ".Document#ReadDimension");
}
function error_missing_number(doc) {
  doc.currentCtx.output.error(
    "aghtex.Document.ReadDimension.MissingNumber", null,
    nsName + ".Document#ReadDimension");
}
function error_missing_unit(doc) {
  doc.currentCtx.output.error(
    "aghtex.Document.ReadDimension.MissingUnit", null,
    nsName + ".Document#ReadDimension");
}
function error_invalid_unit(doc, unit) {
  doc.currentCtx.output.error(
    "aghtex.Document.ReadDimension.InvalidUnit", {unit: unit},
    nsName + ".Document#ReadDimension");
}
function error_invalid_dimension(doc, cmd) {
  doc.currentCtx.output.error(
    "aghtex.Document.ReadDimension.InvalidDimension", {cmd: name},
    nsName + ".Document#ReadDimension");
}
ns.Document.prototype.ReadDimension = function() {
  /// 以下の形式の文字列を読み取って ns.Length オブジェクトを返します。
  /// この形式の文字列が読み取れない場合は null を返します。
  ///
  ///   <dimension> :
  ///     - <sign>? <number> 'true'? <unit>
  ///     | <sign>? <number>? <\dimension>
  ///
  ///   <sign> :- '-' | '+'
  ///   <number> :- /[\d.]+/
  ///   <unit> :- /in|bp|cm|mm|pt|pc|sp|dd|cc|n[cd]|em|ex|zw|zh|mu|px/i
  ///

  /* 実装上の注意:
   *
   *   <number> を構成する文字の内、小数点は SCAN_WT_LTR で 1 つずつ読み取られる。
   *   英字は SCAN_WT_TXT でまとめて読み取られる。
   *   <unit> と連続して記述されている場合、<unit> も一緒に読み取られる。
   *   途中でマクロの展開があるときは分断して読み取られる。
   *
   *   <unit> は SCAN_WT_TXT でまとめて読み取られる。
   *   但し、<number> と同様に途中でマクロの展開があると分断して読み取られる。
   */

  var digits = [];
  var trueFlag = false;
  var incompleteUnit = null;

  var mode = 0; // 0: 符号待ち, 1: 数値待ち, 2: 数値読み取り中, 3: 単位待ち, 4: 単位読み取り中
  for (;;) {
    this.expandMacro();
    if (this.scanner.wordtype === SCAN_WT_LTR) {
      if (mode === 0 && /^[-+]$/.test(this.scanner.word)) {
        digits.push(this.scanner.word);
        mode = 1;
        this.scanner.Next();
      } else if (mode <= 2 && /^\.$/.test(this.scanner.word)) {
        digits.push(this.scanner.word);
        mode = 2;
        this.scanner.Next();
      } else if (texctype_isspace(this.scanner.word)) {
        if (mode === 4) {
          error_invalid_unit(this, incompleteUnit);
          return null;
        }

        this.scanner.Next();
        if (mode === 2) mode = 3;
      } else {
        if (mode <= 1)
          error_missing_dimension(this);
        else if (mode <= 3)
          error_missing_unit(this);
        else
          error_invalid_unit(this, incompleteUnit);
        return null;
      }
    } else if (this.scanner.wordtype === SCAN_WT_TXT) {

      // 数字を読み取る
      var m = null;
      if (mode <= 2 && (m = /^\d+/.exec(this.scanner.word))) {
        digits.push(m[0]);
        mode = 2;
        this.scanner.ConsumePartialTxt(m[0].length);
        continue;
      }

      // 単位を読み取る
      if (mode <= 1) {
        error_missing_number(this);
        return null;
      }

      var text = this.scanner.word;
      if (incompleteUnit) text = incompleteUnit + text;

      if (/^true/i.test(text)) {
        trueFlag = true;
        this.scanner.ConsumePartialTxt(4);
        mode = 3;
        continue;
      }

      var m = /^(?:true|in|bp|cm|mm|pt|pc|sp|dd|cc|n[cd]|em|ex|zw|zh|mu|px)/i.exec(text);
      if (!m) {
        if ((m = /^[bcdimnpsz]|(?:t|tr|tru)$/i.exec(text))) {
          // 不完全な単位の場合 (未だ単位 or "true" になる可能性がある)
          incompleteUnit = m[0];
          this.scanner.Next();
          mode = 4;
          continue;
        } else {
          // 既知の単位名にはなりえない場合
          error_invalid_unit(this, text);
          return null;
        }
      }

      var unit = m[0];
      this.scanner.ConsumePartialTxt(m[0].length);
      var value = digits.join("");
      return new ns.Length(value, unit);
    } else if (this.scanner.wordtype === SCAN_WT_CMD) {
      if (mode === 4) {
        error_invalid_unit(this, incompleteUnit);
        return null;
      }

      // ■\dimen123 には未対応
      var name = this.scanner.word;
      var handler = this.currentCtx.GetCommandHandler(this, name);
      if (handler && handler.isDimensionHandler) {
        this.scanner.Next();
        if (mode <= 1) digits.push("1");
        var value = digits.join("");
        var unit = this.GetLengthData(name) || new ns.Length;
        return new ns.Length(value, unit);
      } else {
        error_invalid_dimension(this, name);
        return null;
      }
    } else if (this.scanner.wordtype === SCAN_WT_COM) {
      if (mode === 4) {
        error_invalid_unit(this, incompleteUnit);
        return null;
      }

      this.scanner.Next();
      if (mode === 2) mode = 3;
    } else {
      throw new Error("LOGIC_ERROR: invalid scanner status");
    }
  }
};

//-----------------------------------------------------------------------------
// ns.Document#ReadLength

ns.Document.prototype.ReadLength = function() {
  var dimen = this.ReadDimension();
  if (!dimen) return null;

  var plus = null, minus = null;
  this.skipSpaceAndCommentExpandingMacro();
  if (this.scanner.wordtype == SCAN_WT_TXT && /^plus/.test(this.scanner.word)) {
    this.scanner.ConsumePartialTxt(4);
    var plus = this.ReadDimension();
    if (plus) dimen.plus = plus;
    this.skipSpaceAndCommentExpandingMacro();
  }

  if (this.scanner.wordtype == SCAN_WT_TXT && /^minus/.test(this.scanner.word)) {
    this.scanner.ConsumePartialTxt(5);
    var minus = this.ReadDimension();
    if (minus) dimen.minus = minus;
  }

  return dimen;
};
//◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
//
//            class Command
//
//◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇
ns.Command = function(numOfArg, defaultArg, definition, dynamic) {
  // 読み取り部 初期化
  if (numOfArg > 0) {
    this.argNum = numOfArg;

    if (defaultArg == null) {
      this.defArg = [];
    } else if (defaultArg instanceof Array) {
      this.defArg = defaultArg;
    } else {
      this.defArg = [defaultArg];
    }
  } else {
    this.readArgument = function() {};
  }

  // 書き出し部 選択
  if (definition instanceof Function) {
    this.text = null;
    this.write = definition;
  } else if (typeof definition == "string" || definition instanceof String) {
    this.text = definition;
    if (dynamic) {
      //this.readArgument=this.readArgument_dynamic;
      this.write = this.insertTextDef;
    } else {
      this.write = this.writeTextDef;
    }
  } else {
    throw "Command definition is unknown type.";
  }
  this.text = definition;
};
agh.memcpy(ns.Command.prototype, {
  //======================================================================
  //    読み取り関数
  //======================================================================
  readArgument: function(doc, cmdName) {
    var ret = [cmdName];
    for (var i = 0; i < this.argNum; i++) {
      if (i < this.defArg.length) {
        var v = doc.GetOptionalArgumentHtml();
        ret[i + 1] = v == null ? this.defArg[i] : v;
      } else {
        ret[i + 1] = doc.GetArgumentHtml();
      }
    }
    return ret;
  },
  /*
  readArgument_raw: function(doc, cmdName) {
    var ret = [cmdName];
    for (var i = 0; i < this.argNum; i++) {
      if (i < this.defArg.length) {
        var v = doc.GetOptionalArgumentRaw();
        ret[i + 1] = v == null ? this.defArg[i] : v;
      } else {
        ret[i + 1] = doc.GetArgumentRaw();
      }
    }
    return ret;
  }, //*/
  //======================================================================
  //    書き出し関数
  //======================================================================
  writeTextDef: function(doc, args) {
    var result = this.text;
    if (args) result = result.replace(/#(0?)([1-9]\d*)|##/g, function($0, $1, $2) {
      if ($0==="##") return "#";
      //TODO: <参照:予定4>
      // ※ || を使うと引数が空白 "" の時にも、
      // 引数が見つからなかったかの様な動作をしてしまう。
      var ret = args[$2];
      if (ret == null) ret = $0;
      if ($1 == "0") ret = agh.Text.Unescape(ret, "html");
      return ret;
    });

    doc.currentCtx.output.buff.push(result);
  },
  insertTextDef: function(doc, args) {
    var result = this.text;
    if (args) result = result.replace(/#(0?)([1-9]\d*)|##/g, function($0, $1, $2) {
      if ($0 === "##") return "#";
      //TODO: <参照:予定4>
      var ret = args[$2];
      if (ret == null) ret = $0;
      if ($1 == "0") ret = agh.Text.Unescape(ret, "html");
      return ret;
    });

    // この時点で scanner は次の語に移っているので復元 (再び後で解釈)
    doc.scanner.InsertSource(result);
  },
  //======================================================================
  //    実ハンドラ
  //======================================================================
  GetHandler: function() {
    var command = this;
    return function(doc, cmdName) {
      doc.scanner.Next();
      var args = command.readArgument(doc, cmdName);
      command.write(doc, args);
    };
  }
});
agh.memcpy(ns.Command, {
  parser: (function() {
    // 未だ ContextFactory.global が出来ていないのを誤魔化す為
    ns.ContextFactory["global"] = {CreateContext: function() { return null; }};
    var ret = new ns.Document("", null);
    ret.contexts = {};
    delete ns.ContextFactory["global"];
    return ret;
  })(),
  /// <summary>
  /// 文字列を直接出力する種類の handler を生成します。
  /// 引数を利用しません。再処理を行いません。
  /// </summary>
  CreateRawHandler: function(definition) {
    return function(doc) {
      doc.scanner.Next();
      doc.currentCtx.output.buff.push(definition);
    };
  },
  /// <summary>
  /// 引数を置換して直接出力する種類の handler を生成します。
  /// 再処理は行いません。
  /// </summary>
  CreateLiteralHandler: function(argNum, defArg, definition) {
    if (argNum == 0) return ns.Command.CreateRawHandler(definition);
    return new ns.Command(argNum, defArg, definition, false).GetHandler();
  },
  /// <summary>
  /// 引数を置換して直接出力する種類の handler を生成します。
  /// 再処理は行いません。
  /// </summary>
  CreateStaticHandler: function(argNum, defArg, definition, context) {
    this.parser.scanner = new ns.Scanner(definition);
    this.parser.globalCtx = this.parser.context_cast(["global", context]);
    definition = this.parser.Parse();
    if (argNum == 0) return ns.Command.CreateRawHandler(definition);
    return new ns.Command(argNum, defArg, definition, false).GetHandler();
  },
  /// <summary>
  /// 引数を置換して更に、再解釈を行う種類の handler を生成します。
  /// コマンドを内に含める事が可能です。
  /// </summary>
  CreateDynamicHandler: function(argNum, defArg, definition) {
    return new ns.Command(argNum, defArg, definition, true).GetHandler();
  },
  /// <summary>
  /// 関数で出力を行うハンドラを作成します。
  /// </summary>
  /// <param name="definition">
  /// 出力の処理を行う関数を指定します。
  /// 第一引数に Document を受け取ります。
  /// 第二引数に Array を受け取ります。一番初めの要素 (0 番目) にはコマンド名が格納されています。
  /// 以降 (1 番目以降) には読み取られた TeX 引数が格納されています。
  /// </param>
  CreateFunctionHandler: function(argNum, defArg, definition) {
    return new ns.Command(argNum, defArg, definition, true).GetHandler();
  }
});
//◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
//
//            class Command2
//
//◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇
agh.memcpy(_Mod.ErrorMessages, {
  'aghtex.Command2.MacroInfiniteLoop': [
    "MacroInfiniteLoop",
    "ユーザマクロ '\\{cmdName}' の過剰なネスト、または、無限ループの可能性があります。"],
  'aghtex.Environment.MacroInfiniteLoop': [
    "MacroInfiniteLoop",
    "The nesting of the user defined environement {envname} is too deep or in an infinite loop."],
  'aghtex.Command2.DimensionReader.Garbages': [
    "garbages after dimension",
    "There are unrecognized garbages '{garbage}' after the optional dimension argument."]
});
/* 引き数指定について。
 *
 * #1 ... #2
 *   通常の引き数読み取りを行う。
 *   [...] を指定すると省略可能引き数となる。省略された時の値は ... になる。
 *   フラグ !, @ (既定), > によって読み取った文字列をどう処理するかを選択する。
 *
 * #D, #L
 *   それぞれ <dimension> 及び <length> の引き数を読み取る。
 *   {} で囲まれていることを許す。
 *   [...] を指定すると省略可能引き数となる。
 *   フラグ !, @, > は無視される。
 */
var COMMAND2_REG_ARGDEF = new RegExp(
  // $H = [^\#]*          // 地の文
  // $1 = \[ ... \]       // 省略可能引数
  // $2 = ctx! | ctx> | @ // context+処理方法
  // $3 = 0               // @ (旧形式)
  // $4 = [1-9DL]         // 引数番号 or D = <dimension>, L = <length>
  // $Tc | $Tt | $Tl      // 後続のコマンド/文字列/記号
  agh.Text.format(
    "([^\\#]*)\\#({0})?({1})?(0)?([1-9DL])(?:\\\\({2}+|.)|({3}+)|([^#\\\\]))?",
    /\[(?:[^\]]*|\{[^\{\}]*\})\]/.source,
    /[^\!\>\#]*[\!\>]|\@/.source,
    REG_ISCMDCHAR.source,
    REG_ISTXTCHAR.source), "g");

var COMMAND2_READTYPE = {
  "@": "raw",
  ">": "htm",
  "!": "txt"
};
var COMMAND2_PARSER = (function() {
  // 未だ ContextFactory.global が出来ていないのを誤魔化す為
  ns.ContextFactory["global"] = {CreateContext: function() { return null; }};
  var ret = new ns.Document("", null);
  ret.contexts = {};
  delete ns.ContextFactory["global"];
  return ret;
})();
ns.Command2 = function(type, argdef, definition) {
  var argreaders = ns.Command2.CreateArgReaders(argdef, type);
  switch (type.first(2)) {
  case "s":
    if (argreaders == null) {
      var self = function(doc, cmdName) {
        doc.scanner.Next();
        var ins = definition;
        doc.scanner.InsertSource(ins);
      };
      self.isInsertMacro = true;
      return self;
    } else {
      var self = function(doc, cmdName) {
        doc.scanner.Next();
        var ins = argreaders.apply_read_args(definition, doc, cmdName, false);
        doc.scanner.InsertSource(ins);
      };
      self.isInsertMacro = true;
      return self;
    }
  case "m": // \def, ユーザマクロ (循環検出機能付き)
    if (argreaders == null) {
      var self = function(doc, cmdName) {
        doc.scanner.Next();
        if (doc.scanner.DetectLoop(self)) {
          doc.currentCtx.output.error('aghtex.Command2.MacroInfiniteLoop', {cmdName: cmdName}, '\\' + cmdName + ' (user macro)');
          return;
        }
        var ins = definition;
        doc.scanner.InsertSource(ins)
      };
      self.isInsertMacro = true;
      self.isUserMacro = true;
      return self;
    } else {
      var self = function(doc, cmdName) {
        doc.scanner.Next();
        if (doc.scanner.DetectLoop(self)) {
          doc.currentCtx.output.error('aghtex.Command2.MacroInfiniteLoop', {cmdName: cmdName}, '\\' + cmdName + ' (user macro)');
          return;
        }
        var ins = argreaders.apply_read_args(definition, doc, cmdName, false);
        doc.scanner.InsertSource(ins);
      };
      self.isInsertMacro = true;
      self.isUserMacro = true;
      return self;
    }
  case "s>":
    definition = ns.Command2.preproc_definition(definition, type.length > 2 ? type.substr(2) : null);
    /* FALL-THROUGH */
  case "s@":
  case "m@": // \edef,
    if (argreaders == null) {
      return function(doc) {
        doc.scanner.Next();
        doc.currentCtx.output.buff.push(definition);
      };
    } else {
      return function(doc, cmdName) {
        doc.scanner.Next();
        var result = argreaders.apply_read_args(definition, doc, cmdName, true);
        doc.currentCtx.output.buff.push(result);
      };
    }
  case "f":
    if (argreaders == null) {
      return function(doc, cmdName) {
        doc.scanner.Next();
        definition(doc, [cmdName]);
      };
    } else {
      return function(doc, cmdName) {
        doc.scanner.Next();
        var args = argreaders.read(doc, cmdName);
        definition(doc, args);
      };
    }
  case "fA": // argreaders を自分で呼び出したい場合。
    if (argreaders == null)
      argreaders = {read: function(doc, cmdName) { return [cmdName]; }};
    return function(doc, cmdName) {
      doc.scanner.Next();
      definition(doc, cmdName, argreaders);
    };
  case "f@":
    return definition;
//#debug
  default: throw Error("Command2#ctor InvalidArgument! The specified type of a command '" + type + "'is unknown.");
//#end debug
  }
};
agh.memcpy(ns.Command2, {
  /// <summary>
  /// 定義時にマクロ展開処理を実行します。
  /// </summary>
  preproc_definition: function(definition, context) {
    var parser = COMMAND2_PARSER;
    parser.scanner = new ns.Scanner(definition);
    parser.globalCtx = parser.context_cast(["global", context]);
    return parser.Parse();
  },
  /// <summary>
  /// 引数の読み取り方を記述する文字列から、
  /// 引数の読み取り関数の配列を作成します。
  /// </summary>
  /// <returns>
  /// 一つの引数について一つの関数を生成し、引数の順番に配列に格納して返します。
  /// 引数がない場合には null を返します。
  /// </returns>
  CreateArgReaders: function(argdef, type) {
    if (argdef == null || argdef == "") return null;

    var readers = [];
    argdef = argdef.replace(COMMAND2_REG_ARGDEF, function($A, $H, $1, $2, $3, $4, $Tc, $Tt, $Tl) {
      // データの整理
      var optional = $1 != null && $1 != "";
      var defvalue = optional ? $1.slice(1, -1) : null;
      if ($2 == null || $2 == "") $2="@";
      var readtype = COMMAND2_READTYPE[$2.last()];
      var context = $2.length > 1 ? $2.substring(0, $2.length - 1) : null;
      var htescape = $3 == "0";
      var arg_num = $4; // 数字の場合は意味を持たない (引き数番号は現れた順に割り当てられるので)

      // \edef の場合は raw 読み取り (#1) は禁止。
      // 代わりに htm 読み取り (#>1) を強制する。
      if (type == "m@" && readtype == "raw") readtype = "htm";

      var until_type = null;
      var until_word = null;
      if ($Tc != null && $Tc != "") {
        until_type = SCAN_WT_CMD;
        until_word = $Tc;
      } else if ($Tt != null && $Tt != "") {
        until_type = SCAN_WT_TXT;
        until_word = $Tt;
      } else if ($Tl != null && $Tl != "") {
        until_type = SCAN_WT_LTR;
        until_word = $Tl;
      }

      var prefix_checker = null;
      if ($H != null && $H != "")
        prefix_checker = ns.Command2.CreatePrefixChecker($H);

      if (arg_num === "D" || arg_num === "L") {
        // #D, #L
        var reader = arg_num === "L" ? 'ReadLength' : 'ReadDimension';
        var ar = function Command2ArgReadDimension(doc, cmdName) {
          if (prefix_checker != null && !prefix_checker(doc, cmdName))
            return doc.currentCtx.output.error('?');

          var dimen = null, garbage = null;
          if (optional) {
            // #[defvalue]D

            doc.skipSpaceAndComment();
            if (doc.scanner.is(SCAN_WT_LTR, '[')) {
              // 引き数が指定されているときは、それを読み取る。
              doc.scanner.Next();
            } else if (defvalue !== "") {
              // 引き数が指定されていないときは、
              // その場で defvalue を解析する為に InsertSource する。
              doc.scanner.InsertSource(defvalue + ']');
            } else {
              // 既定の引き数が空なら ns.Length として null を返す。
              return null;
            }

            dimen = doc[reader]();
            garbage = doc.GetArgRUntil(null, SCAN_WT_LTR, ']').trim();
          } else {
            doc.skipSpaceAndComment();
            if (doc.scanner.is(SCAN_WT_LTR, '{')) {
              // {} に囲まれて <dimension> がある場合
              doc.scanner.Next();
              dimen = doc[reader]();
              doc.scanner.InsertSource('{');
              garbage = doc.GetArgumentRaw().replace(/^\{|\}$/g, "").trim();
            } else {
              // 裸で <dimension> がある場合
              dimen = doc[reader]();
            }
          }

          if (garbage && garbage.length) {
            doc.currentCtx.output.error(
              'aghtex.Command2.DimensionReader.Garbages',
              {garbage: garbage}, nsName + 'Command2.ArgumentReader(#[...]D)');
          }
          return dimen;
        };
      } else if (until_type == null) {
        // 一引数読み取り関数の定義
        var ar = function Command2ArgRead(doc, cmdName) {
          if (prefix_checker == null || prefix_checker(doc, cmdName)) {
            var arg = doc.ReadArgument(readtype, optional, context);
            if (optional && arg == null) arg = defvalue;
            if (htescape) arg = agh.Text.Unescape(arg, "html");
            return arg;
          } else {
            return doc.currentCtx.output.error('?');
          }
        };
      } else {
        var htescape = $3 == "0" || $2.last() == "!";
        var GetArg = readtype == "raw" ? "GetArgRUntil" : "GetArgHUntil";
        var ar = function Command2ArgUntil(doc, cmdName) {
          if (prefix_checker == null || prefix_checker(doc, cmdName)) {
            var arg = doc[GetArg](context, until_type, until_word);
            if (optional && (arg == "" || arg == null)) arg = defvalue;
            if (htescape) arg = agh.Text.Unescape(arg, "html");
            return arg;
          } else {
            return doc.currentCtx.output.error('?');
          }
        };
      }

      readers.push(ar);
      return "";
    });
//      if (argdef.length != 0) 読み取られなかった物が存在。エラー。■
//      if (argdef.length != 0)
//        alert("argdef_not_processed_part = "+argdef);

    if (readers.length ==0 ) return null;

    // 全引数読み取り関数を設定
    readers.read = this.readers_read;
    readers.apply_read_args = this.readers_apply_read_args;
    readers.apply_args = this.readers_apply_args;
    return readers;
  },
  CreatePrefixChecker: function(head) {
    // 概要:
    //   引数の前に存在するトークン列を読み取る関数を生成します。
    //
    // 引数 head:
    //   引数の前に存在するトークン列を文字列で指定します。中に含まれる空白及
    //   びコメントは無視され、それ以外の単語がトークン列として扱われます。
    //
    // 戻り値:
    //   head が空文字列または空白・コメントしか含まない場合 null を返します。
    //   head が 1 つ以上の有効なトークンを含む場合、関数 [function(doc,
    //   cmdName)] を返します。この関数は doc の現在位置に head と同様のトー
    //   クン列が存在する事を確認し、トークン列の末端に現在位置を移動し、true
    //   を返します。トークン列の一致に失敗した場合、一番最初の一致しないトー
    //   クンの先頭に doc の現在位置を移動して、false を返します。
    //
    // 例:
    //   例えば \def\mycmd[#1]#2{} で定義されたコマンド \mycmd を読み取る時、
    //   #1 の読み取りの前に "[" を読み取る動作が必要です。
    //   "[" を読み取る為の関数を初期化する為に、
    //   \mycmd 生成時に CreatePrefixChecker("[") が呼び出されます。
    if (head == null || head == "") return null;

    var precedingTokens = [];

    var s = new ns.Scanner(head);
    wloop: for (s.Next(); ; s.Next()) {
      switch (s.wordtype) {
      case SCAN_WT_COM:
        break;
      case SCAN_WT_LTR:
        if (s.word == 'EOF')
          break wloop;
        else if (texctype_isspace(s.word))
          break;
        /* FALLTHROUGH */
      case SCAN_WT_TXT:
      case SCAN_WT_CMD:
        precedingTokens.push({word: s.word, wordtype: s.wordtype});
        break;
      default:
      case SCAN_WT_INV:
        throw new Error("LOGIC_ERROR: CreatePrefixChecker: invalid Scanner status");
      }
    }

    if (precedingTokens.length == 0) return null;

    return function(doc, cmdName) {
      for (var i = 0, iN = precedingTokens.length; i < iN; i++) {
        var tok = precedingTokens[i];
        doc.skipSpaceAndComment();
        if (tok.wordtype == doc.scanner.wordtype && tok.word == doc.scanner.word) {
          doc.scanner.Next();
        } else {
          doc.currentCtx.output.error("UnexpectedToken", "\\" + cmdName + ": token{wordtype='" + tok.wordtype + "',word='" + tok.word + "'} is anticipated.");
          return false;
        }
      }
      return true;
    };
  },
  //************************************************************************
  /// *** CreateArgReaders 戻り値に設定されるメソッドです ***
  /// <summary>
  /// 全引数の読み取りを実行します。
  /// </summary>
  readers_read: function(doc, cmdName) {
    var args = [cmdName];
    for (var i = 0; i < this.length; i++) {
      args.push(this[i](doc, cmdName));
    }
    return args;
  },
  /// *** CreateArgReaders 戻り値に設定されるメソッドです ***
  readers_apply_args: function(text, args, isHtml) {
    return text.replace(/#(0?)([1-9])|##/g, function($0, $1, $2) {
      if ($0 === "##") return "#";
      var ret = args[$2];
      if (ret == null) ret = $0;
      if ($1 == "0") ret = agh.Text.Unescape(ret, "html");
      if (!isHtml) ret = "\x1F" + ret + "\x1F"; // トークン強制区切 (see ns.Scanner)
      return ret;
    });
  },
  /// *** CreateArgReaders 戻り値に設定されるメソッドです ***
  /// <summary>
  /// 全引数の読み取りを実行し、指定された text の置換を行います。
  /// </summary>
  readers_apply_read_args: function(text, doc, cmdName, isHtml) {
    // return this.readers_apply_args(text, this.read(doc, cmdName)); に等価
    var args = [cmdName];
    for (var i = 0; i < this.length; i++) {
      args.push(this[i](doc, cmdName));
    }
    return text.replace(/#(0?)([1-9])|##/g, function($0, $1, $2) {
      if ($0 === "##") return "#";
      var ret = args[$2];
      if (ret == null) ret = $0;
      if ($1 == "0") ret = agh.Text.Unescape(ret, "html");
      if (!isHtml) ret = "\x1F" + ret + "\x1F"; // トークン強制区切 (see ns.Scanner)
      return ret;
    });
  }
  //************************************************************************
});
//◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
//
//            class Environment
//
//◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇
/// <summary>
/// TeX の環境を表現するクラスです。
/// </summary>
/// <param name="createParams">
///   Environment 構築に必要な情報を保持している Object を指定します。
///   <member name="context">
///     Environment の内容を読み取るのに使用する Context の雛形を指定します。
///   </member>
///   <member name="prologue">
///     Environment に入る前の処理を記述する関数を指定します。省略可能です。
///     第一引数に Document を受け取ります。第二引数に Environment の内容を読み取る際に使用する Context を受け取ります。
///   </member>
///   <member name="epilogue">
///     無事に処理を終えた後の処理を記述する関数を指定します。省略可能です。
///     第一引数に Document を受け取ります。第二引数に Environment の内容を読み取る際に使用した Context を受け取ります。
///   </member>
///   <member name="cacther">
///     Environment の内容を読み取っている際に領域終了例外で抜けた場合の処理を記述する関数を指定します。省略可能です。
///     第一引数に Document を受け取ります。第二引数に Environment の内容を読み取る際に使用した Context を受け取ります。
///   </member>
///   <member name="suppressOutput">
///     context で読み取った内容を出力しない場合に true を指定します。
///     読み取った内容は epilogue/catcher で受け取った Context ctx の ctx.output.toHtml() を通して取得出来ます。
///   </member>
/// </param>
ns.Environment = function(createParams) {
  this.context;   // 実際の読み取りに利用する context
  //this.prologue;  // 事前の処理
  //this.epilogue;  // 無事に終了した場合の処理
  //this.catcher;   // エラーで終了した場合の処理
  agh.memcpy(this, createParams);
};
agh.memcpy(ns.Environment.prototype, {
  suppressOutput: false,
  prologue: function() {},
  epilogue: function() {},
  catcher: function(doc, ctx) { this.epilogue(doc, ctx); },
  /// <summary>
  /// 環境に入る準備、環境内での出力、環境から出た後の始末を実行します。
  /// 出力結果は現在の context に書き込みます。
  /// </summary>
  Process: function(doc, ENVNAME) {
    var ctx = doc.context_cast(["global", "sub.env", this.context]);

    // setup context and read under the context
    var loc_err = false;
    ctx.AddCommandHandler("end", function(doc) {
      doc.scanner.Next();
      var env = doc.GetArgumentRaw().trim();
      if (ENVNAME == env) {
        doc.currentCtx.BREAK = true;
      } else {
        env = "\\end{" + env + "}";
        doc.currentCtx.output.error("UnexpectedEOR", env);
        doc.scanner.InsertSource(env);
        doc.currentCtx.BREAK = true;

        // 外のローカル変数
        loc_err = true;
      }
    });

    // process preparing
    this.prologue(doc, ctx);

    // process main
    var result = doc.Read(ctx);
    if (!this.suppressOutput)
      doc.currentCtx.output.buff.push(result);

    // process terminating
    if (loc_err) {
      this.catcher(doc, ctx);
    } else {
      this.epilogue(doc, ctx);
    }
  }
});
//--------------------------------------------------------------------------
agh.memcpy(ns.Environment, {
  split_definition: function(definition) {
    var i = definition.indexOf("#0");
    if (i < 0) {
      return {
        prologue: "{" + definition,
        epilogue: "}"
      };
    } else {
      return {
        prologue: definition.slice(0, i),
        epilogue: definition.slice(i + 2)
      };
    }
  },
  Create: function(type, argdef, definition, context) {
    switch (type.first(2)) {
      case "s":
      case "m":
        var def = this.split_definition(definition);
        return this.CreateDynamicEnvironment(type, argdef, def.prologue, def.epilogue, context);
      case "s>":
        definition = ns.Command2.preproc_definition(definition, type.length > 2 ? type.substr(2) : null);
        /* FALL-THROUGH */
      case "s@":
        var def = this.split_definition(definition);
        return this.CreateLiteralEnvironment(argdef, def.prologue, def.epilogue, context);
  //#debug
      default: throw Error("Environment#Create InvalidArgument! The specified type of environment is unknown.");
  //#end debug
    }
  },
  CreateLiteralEnvironment: function(argdef, prologue_str, epilogue_str, context) {
    var readers = ns.Command2.CreateArgReaders(argdef);
    if (readers == null) {
      return new ns.Environment({
        prologue: function(doc, ctx) {
          doc.currentCtx.output.buff.push(prologue_str);
        },
        epilogue: function(doc) {
          doc.currentCtx.output.buff.push(epilogue_str);
        },
        catcher: function(doc, ctx) {
          this.epilogue(doc, ctx);
        },
        context: context
      });
    } else {
      return new ns.Environment({
        prologue: function(doc, ctx) {
          // "[environment]" に意味はない (cmdName の代わり)
          ctx.ENVARGS = readers.read(doc, "[environment]");
          var htm = readers.apply_args(prologue_str, ctx.ENVARGS, true);
          doc.currentCtx.output.buff.push(htm);
        },
        epilogue: function(doc, ctx) {
          var htm = readers.apply_args(epilogue_str, ctx.ENVARGS, true);
          doc.currentCtx.output.buff.push(htm);
        },
        catcher: function(doc, ctx) {
          this.epilogue(doc, ctx);
        },
        context: context
      });
    }
  },
  CreateDynamicEnvironment: function(type, argdef, prologue_def, epilogue_def) {
    var readers = ns.Command2.CreateArgReaders(argdef);

    function Process2(doc, ENVNAME) {
      var ctx = doc.context_cast(ns.ContextFactory["sub.env.raw"]); // 新規作成
      ctx.ENVNAME = ENVNAME;
      ctx.ERRORED = false;

      // process preparing
      this.prologue(doc, ctx);

      // process main
      if (!ctx.ERRORED) {
        ctx.rawctx_ebuff = [];
        ctx.ENVCONTENT = doc.Read(ctx);
        if (ctx.rawctx_ebuff.length)
          doc.currentCtx.output.buff.push(ctx.rawctx_ebuff.join(''));
      }

      // process termination
      if (ctx.ERRORED) {
        this.catcher(doc, ctx);
      } else {
        this.epilogue(doc, ctx);
      }
    }

    var env = null;
    var fCheckInfiniteLoop = type == "m";
    function CheckInfiniteLoop(doc, ctx) {
      if (doc.scanner.DetectLoop(env)) {
        doc.currentCtx.output.error(
          'aghtex.Environment.MacroInfiniteLoop', {envname: ctx.ENVNAME},
          '\\begin{' + ctx.ENVNAME + '} (user environment) @ aghtex.Environment.CreateDynamicEnvironment');
        return false;
      }
      return true;
    }

    if (readers == null) {
      env = new ns.Environment({
        prologue: function(doc, ctx) {
          if (fCheckInfiniteLoop)
            if (!CheckInfiniteLoop(doc, ctx)) {
              ctx.ERRORED = true;
              return;
            }
        },
        epilogue: function(doc, ctx) {
          var result = '{' + prologue_def + ctx.ENVCONTENT + epilogue_def + '}';
          doc.scanner.InsertSource(result);
        },
        catcher: function(doc, ctx) {
          this.epilogue(doc, ctx);
        },
        Process: Process2
      });
    } else {
      env = new ns.Environment({
        prologue: function(doc, ctx) {
          if (fCheckInfiniteLoop)
            if (!CheckInfiniteLoop(doc, ctx)) {
              ctx.ERRORED = true;
              return;
            }

          // "[environment]" に意味はない (cmdName の代わり)
          ctx.ENVARGS = readers.read(doc, "\\begin{" + ctx.ENVNAME + "}");
        },
        epilogue: function(doc, ctx) {
          var prologueTex = readers.apply_args(prologue_def, ctx.ENVARGS, false);
          //var epilogueTex = readers.apply_args(epilogue_def, ctx.ENVARGS, false);
          var epilogueTex = epilogue_def; // 実は end 側では引数は使えない
          doc.scanner.InsertSource('{' + prologueTex + ctx.ENVCONTENT + epilogueTex + '}');
        },
        catcher: function(doc, ctx) {
          this.epilogue(doc, ctx);
        },
        Process: Process2
      });
    }
    return env;
  }
});
//◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
})();


//-----------------------------------------------------------------------------
(function _aghtex_include_base_js() { /* main.pp.js: included from .gen/base.js */
// -*- mode:js -*-

/**
 *  mod_math
 *
 *  @section 公開オブジェクト
 *    ※以下 mod_base = ns.Modules["mod:base"] とする。
 *
 *    @fn mod_base.OutputStretchBracketTd(output,text,rowspan)
 *    @fn mod_base.GetStretchImageTd(imageUrl,rowspan,alternativeText);
 *
 *    @fn mod_base["cmd:relax"]
 */

var _Mod = ns.Modules["mod:base"] = {};

var mod_core = ns.Modules["core"];
agh.memcpy(mod_core.ErrorMessages, {
  'mod:base.BasicHandlers.MissingArgumentEof': [
    'missing argument',"missing argument:\r\n Source script ended before argument appears.\r\n引数が来る前にソースが尽きました。引数を挿入して下さい。"],
  'mod:base.BasicHandlers.MissingArgument': [
    'missing argument',"missing argument:\r\n {term} has appeared before argument.\r\n引数が来る前に {termJP} が来ました。引数を挿入するか、{termJP} の位置を変更するかして下さい。"],
  'mod:base.cmd:left.NotSupportedSymbol': ["\\left argument","指定した引数 '{ch}' は有効な伸縮括弧ではありません。"],
  // 'mod:base.cmd:verb.MissingPunctuation': [
  //   "\\verb missing punct",
  //   "\\verb の開始・終端を指定する文字として記号が必要です。\r\n使用例: \\verb|\\LaTeX|."],
  'mod:base.cmd:verb.UnexpectedEOL': [
    "\\verb UnexpectedEndOfLine", "an argument of \\verb command cannot contain CR/LF."]
});

//================================================================
//      制御文字 / コマンドハンドラ
//================================================================
var LH_IGNORE_EXIT_ERROR = function(doc,letter) {
  doc.currentCtx.output.error("UnexpectedEOR", letter);
  doc.scanner.Next();
};
var LH_EXIT_WITH_ERROR = function(doc,letter) {
  doc.currentCtx.output.error("UnexpectedEOR", letter);
  doc.currentCtx.BREAK = true;
};
var LH_EXIT = function(doc, letter) {
  doc.scanner.Next();
  doc.currentCtx.BREAK = true;
};
var LH_RAW = function(doc, letter) {
  doc.currentCtx.output.buff.push(letter);
  doc.scanner.Next();
};
var LH_ESCAPE_HTML = function(doc, letter) {
  doc.currentCtx.output.appendText(letter);
  doc.scanner.Next();
};
//----------------------------------------------------------------
var CH_IGNORE_EXIT_ERROR = function(doc, letter) {
  doc.currentCtx.output.error("UnexpectedEOR", "\\" + letter);
  doc.scanner.Next();
};
var CH_EXIT_WITH_ERROR = function(doc, letter) {
  doc.currentCtx.output.error("UnexpectedEOR", "\\" + letter);
  doc.currentCtx.BREAK = true;
};
var CH_EXIT = LH_EXIT;
var CH_RAW = function(doc, letter) {
  doc.currentCtx.output.buff.push('\\', letter);
  doc.scanner.Next();
};
_Mod["cmd:relax"] = function(doc, cmdName) { doc.scanner.Next(); };
/*
var CH_ESCAPE_HTML = function(doc, letter) {
  doc.currentCtx.output.appendText("\\"+letter);
  doc.scanner.Next();
};
//*/

// 数式環境では roman alphabets, digits をタグ付けする。
// 以下はタグ付けに使う為の正規表現および置換子。
var reg_math_text_modifier = /([a-z]+)|([A-Z]+)|[0-9]+/g;
var rep_math_text_modifier = function($0, $1, $2) {
  if ($1) {
    return '<tex:f class="aghtex-alpha aghtex-alpha-lower">' + $0 + '</tex:f>';
  } else if ($2) {
    return '<tex:f class="aghtex-alpha aghtex-alpha-upper">' + $0 + '</tex:f>';
  } else {
    return '<tex:f class="aghtex-digit">' + $0 + '</tex:f>';
  }
};

//================================================================

ns.ContextFactory.prototype.rawctx_CreateContext = function(doc) {
  // 処理せずにソースを読み取る context の為
  var ctx = new ns.Context(
    [],
    agh.memcpy(null, this.handlerL),
    agh.memcpy(null, this.handlerC),
    null,
    this.initializer
  );
  ctx.GetLetterHandler = function rawctx_GetLetterHandler(letter) {
    return this.handlerL[letter] || LH_RAW;
  };
  ctx.ReadCommand = function rawctx_ReadCommand(doc, cmd) {
    (this.handlerC[cmd] || CH_RAW)(doc, cmd);
  };
  return ctx;
};

//================================================================
//      Contexts
//================================================================
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
//
//            context global
//
//☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("global");
  var _CtxName="global";
  _Ctx.AddLetterHandler("EOF", function(doc) { doc.currentCtx.BREAK = true; });
  _Ctx.AddLetterHandler("!\"#$'()=~|-^`{[;:]+,./&<>?_*", LH_RAW);
  _Ctx.AddLetterHandler("&<>", LH_ESCAPE_HTML);
  _Ctx.AddLetterHandler("\b\t\n\v\f\r 　", LH_RAW);
  _Ctx.DefineLetter({"\0\x01\x02\x03\x04\x05\x06\x07\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f":['f@',function(doc,cmdName){
    doc.scanner.Next();
    doc.currentCtx.output.buff.push(' ');
  }]});

  _Ctx.AddCommandHandler('makeatletter', function(doc, cmdName) {
    doc.scanner.m_makeatletter = true;
    doc.scanner.Next();
  });
  _Ctx.AddCommandHandler('makeatother', function(doc, cmdName) {
    doc.scanner.m_makeatletter = false;
    doc.scanner.Next();
  });

  //------------------------------------------------------------
  //    領域終了
  //------------------------------------------------------------
  _Ctx.AddLetterHandler("}", LH_IGNORE_EXIT_ERROR);
  //_Ctx.AddLetterHandler("]", LH_IGNORE_EXIT_ERROR);
  _Ctx.AddCommandHandler("end", CH_IGNORE_EXIT_ERROR);
  //------------------------------------------------------------
  //    領域開始
  //------------------------------------------------------------
  _Ctx.AddLetterHandler("{", function(doc) {
    doc.scanner.Next();
    var ctx = doc.context_cast([doc.currentCtx, "sub.braced"]);
    doc.currentCtx.output.buff.push(doc.Read(ctx));
  });
  _Ctx.AddCommandHandler("begin", function(doc) {
    doc.scanner.Next();
    var env = doc.GetArgumentRaw().trim();

    // 環境名→環境
    var environment = doc.currentCtx.GetEnvironment(env);
    if (environment != null) {
      environment.Process(doc, env);
      return;
    }

    // 環境が見つからなかった場合
    //---------------------------
    if (doc.currentCtx.GetCommandHandler(doc, env) != null) {
      // 先頭にコマンドを配した代替環境
      doc.scanner.InsertSource("\\" + env + " ");
    } else {
      // 代替用のコマンドも見つからなかった場合
      doc.currentCtx.output.error(
        "UnknownEnvironment", {env: env, contexts: doc.currentCtx.dbgGetContexts()},
        "\\begin{" + env + "}");
    }

    var ctx = doc.context_cast([doc.currentCtx, "sub.env"]);
    ctx.ENVNAME = env;
    doc.currentCtx.output.buff.push(doc.Read(ctx));
  });
};
/// <summary>
///  {} で囲まれた sub-block を読み取ります。
/// </summary>
/// <condition>{ の次の語から始めて下さい。</condition>
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("sub.braced");
  var _CtxName="sub.braced";
  //_Ctx.AddLetterHandler("]", LH_EXIT_WITH_ERROR);
  _Ctx.AddLetterHandler("}", LH_EXIT);
  _Ctx.AddLetterHandler("EOF", LH_EXIT_WITH_ERROR);

  _Ctx.AddCommandHandler("right", CH_EXIT_WITH_ERROR);
  _Ctx.AddCommandHandler("end", CH_EXIT_WITH_ERROR);
};
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
//
//            context 引数関連
//
//☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆
var LH_MISARG_EOF = function(doc, letter) {
  doc.currentCtx.output.error('mod:base.BasicHandlers.MissingArgumentEof', null, 'mod:base.ltr:EOF');
  doc.currentCtx.BREAK = true;
};
var LH_MISARG_BRACE = function(doc, letter) {
  doc.currentCtx.output.error('mod:base.BasicHandlers.MissingArgument', {term: "'}'", term: "'}'"}, 'mod:base.ltr:\'}\'');
  doc.currentCtx.BREAK = true;
};
var CH_MISARG_RIGHT = function(doc, cmd) {
  doc.currentCtx.output.error('mod:base.BasicHandlers.MissingArgument', {term: "\\right command", term: "\\right コマンド"}, 'mod:base.cmd:right');
  doc.currentCtx.BREAK = true;
};
var CH_MISARG_END = function(doc, cmd) {
  doc.currentCtx.output.error('mod:base.BasicHandlers.MissingArgument', {term: "\\end command", term: "\\end コマンド"}, 'mod:base.cmd:end');
  doc.currentCtx.BREAK = true;
};

// "raw" 読み取り用: sub.argument.raw, sub.until.raw, sub.env.raw
function LHR_EXIT_WITH_ERROR(doc, letter) {
  var msg = ns.Writer.get_error("UnexpectedEOR", letter);
  (doc.currentCtx.rawctx_ebuff || doc.currentCtx.output.buff).push(msg);
  doc.currentCtx.BREAK = true;
}
function LHR_MISARG_BRACE(doc, letter) {
  var msg = ns.Writer.get_error('mod:base.BasicHandlers.MissingArgument', {term: "'}'", term: "'}'"}, 'mod:base.ltr:\'}\'');
  (doc.currentCtx.rawctx_ebuff || doc.currentCtx.output.buff).push(msg);
  doc.currentCtx.BREAK = true;
};


//----------------------------------------------------------------
/// <condition>
/// 直前に skipSpaceAndComment() を実行して下さい。
/// これを実行しないと、空白が引数になったり、
/// 或いは引数が空文字列になったりする可能性があります。
/// </condition>
(function() {
  new function(){
    var _Ctx=ns.ContextFactory.GetInstance("sub.argument");
    var _CtxName="sub.argument";
    _Ctx.key = "initialized:sub.argument"; // with(context)
    _Ctx.initializer = function(mainctx) {
      // filter
      //------------------------------
      // ・sub.argument から直接派生した時だけ
      // ・未だ sub.argument で初期化していない時だけ
      if (mainctx[_Ctx.key] || !mainctx.ContainsBaseContext(this)) return;
      mainctx[_Ctx.key] = true;

      // text_modifier 付け替え
      //------------------------------
      // ※ mode.math の方が先に初期化されている必要あり
      //   ( "mode.math を sub.argument が上書きする形の ctx 継承" なら OK)
      mainctx[_Ctx.key + ":orig.txtmod"] = mainctx.text_modifier;
      if (mainctx["initialized:mode.math"]) {
        mainctx.text_modifier = function(doc, text) {
          var word = doc.scanner.ClipFirstFromTxt();
          return word.replace(reg_math_text_modifier, rep_math_text_modifier);
        };
      } else {
        mainctx.text_modifier = function(doc, text) {
          return doc.scanner.ClipFirstFromTxt();
        };
      }
    };
    //--------------------------------------------
    // {} で囲まれた引数の場合
    //--------------------------------------------
    // 1. "一回だけ読み取る mode" を脱す
    // 2. sub.brace に見せかけ
    _Ctx.AddLetterHandler("{", function(doc, letter) {
      doc.scanner.Next();
      var ctx = doc.currentCtx;
      ctx.BREAK = false;

      // sub.brace に見せかけ
      //------------------------------
      // sub.argument を base から削除

      ctx.RemoveBaseContextWithInitializer(_Ctx.initializer);
      ctx.AddBaseContext(doc.context_cast("sub.braced"));

      // TextHandler 復元
      // ■ sub.argument 処理後に更に別のハンドラに置き換えられた場合には問題が生ずる
      ctx.text_modifier = ctx[_Ctx.key + ":orig.txtmod"];
    });
    _Ctx.AddLetterHandler("EOF", LH_MISARG_EOF);
    _Ctx.AddLetterHandler("}", LH_MISARG_BRACE);
    _Ctx.AddCommandHandler("right", CH_MISARG_RIGHT);
    _Ctx.AddCommandHandler("end", CH_MISARG_END);
  }
})();
//----------------------------------------------------------------
/// <summary>
/// sub.argument.raw Context の動作
/// コマンド類はその儘読み取ります。
/// コメントは消します。
/// </summary>
/// <condition>内側に他の context を持つことは想定していません。</condition>
/// <condition>他の context と同時に継承して使用されることは想定していません。</condition>
///
/// ★引数終了条件について
///   初めの文字が "{" 以外の場合は、引数として一単語だけ読み取って終了します。
///   初めの文字が "{" の場合は "{", "}" 組の数を数え
///   最初の "{" に対応する "}" が見つかった時に引数の読み取りを終了します。
///   ※Document#Read(ctx) が実行される前に
///     ctx.BREAK = true が設定されている事が想定されています。
///   ※直前に skipSpaceAndComment() を実行して下さい。
///     実行しない場合は、空白またはコメントが一単語として認識されます。
///
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("sub.argument.raw");
  var _CtxName="sub.argument.raw";
  _Ctx.key = "initialized:sub.argument.raw"; // with(context)
  _Ctx.initializer = function(mainctx) {
    if (mainctx[_Ctx.key]) return;
    mainctx[_Ctx.key] = true;
    mainctx.BRACE_LEVEL = 0;

    //2014-01-28 ■これで正しい(副作用がない)か不明■
    //mainctx[_Ctx.key + ":orig.txtmod"] = mainctx.text_modifier;
    mainctx.text_modifier = function(doc, text) {
      return doc.scanner.ClipFirstFromTxt();
    };
  };
  _Ctx.CreateContext = _Ctx.rawctx_CreateContext;
  _Ctx.DefineLetter({
    '{': function(doc, letter) {
      if (doc.currentCtx.BRACE_LEVEL++ == 0) {
        doc.currentCtx.BREAK = false;
      } else {
        doc.currentCtx.output.buff.push(letter);
      }
      doc.scanner.Next();
    },
    '}': function(doc, letter) {
      if (--doc.currentCtx.BRACE_LEVEL == 0) {
        doc.currentCtx.BREAK = true;
      } else {
        doc.currentCtx.output.buff.push(letter);
      }
      doc.scanner.Next();
    },
    'EOF': function(doc, letter) {
      if (doc.currentCtx.BRACE_LEVEL == 0) {
        LHR_MISARG_BRACE(doc, letter);
      } else {
        LHR_EXIT_WITH_ERROR(doc, letter);
      }
    }
  });
};
//----------------------------------------------------------------
/// <summary>
/// "sub.env.raw" Context の動作:
/// コマンド類はその儘読み取ります。
/// コメントは消します。
/// 括弧の数、及び、\begin-\end の数を数えます。
/// </summary>
/// <condition>直前に skipSpaceAndComment() を実行して下さい。</condition>
/// <condition>内側に他の context を持つことは想定していません。</condition>
/// <condition>他の context と同時に継承して使用されることは想定していません。</condition>
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("sub.env.raw");
  var _CtxName="sub.env.raw";
  _Ctx.key = "initialized:sub.env.raw"; // with(context)
  _Ctx.initializer = function(mainctx) {
    if (mainctx[_Ctx.key]) return;
    mainctx[_Ctx.key] = true;
    mainctx.BRACE_STACK = [];
  };
  _Ctx.CreateContext = _Ctx.rawctx_CreateContext;
  //--------------------------------------------
  _Ctx.AddLetterHandler('{', function(doc, letter) {
    doc.currentCtx.BRACE_STACK.push(0);
    doc.currentCtx.output.buff.push(letter);
    doc.scanner.Next();
  });
  _Ctx.AddLetterHandler('}', function(doc, letter) {
    var ctx = doc.currentCtx;
    var buff = ctx.output.buff;
    while (ctx.BRACE_STACK.length > 0) {
      // 0 が出るまでスタックを取り出す
      // 例: { \begin{hoge}\begin{hage} }
      // 　この場合は、最後の } に対応する始まりは { と見做し、
      // 　間の \begin たちは終わりを書き忘れていると解釈する。
      if (0 == ctx.BRACE_STACK.pop()) {
        buff.push(letter);
        doc.scanner.Next();
        return;
      }
    }

    // 対応する始まりの括弧がない場合:
    // この直前で環境が終了していると解釈する。
    ctx.BREAK = true;
  });
  _Ctx.AddLetterHandler('EOF', function(doc, letter) {
    if (doc.currentCtx.BRACE_LEVEL == 0) {
      LHR_MISARG_EOF(doc, letter);
    } else {
      LHR_EXIT_WITH_ERROR(doc, letter);
    }
  });
  _Ctx.DefineCommand({"begin":['f;#@1',function(doc,argv){
    var envname = argv[1].trim();
    doc.currentCtx.BRACE_STACK.push(envname);
    doc.currentCtx.output.buff.push('\\begin{', envname, '}');
  }]});
  _Ctx.DefineCommand({"end":['f;#@1',function(doc,argv){
    var ctx = doc.currentCtx;
    var envname = argv[1].trim();
    while (ctx.BRACE_STACK.length > 0) {
      // envname が出るまでスタックを取り出す
      if (envname == ctx.BRACE_STACK.pop()) {
        ctx.output.buff.push('\\end{', envname, '}');
        return;
      }
    }

    // 対応する始まりの begin がない場合:
    // 　自身の envname と一致するならばこの end を環境の終了と見做す。
    // 　一致していなければ、この直前で環境が不正終了していると見做す。
    if (ctx.ENVNAME == envname) {
      ctx.BREAK = true;
    } else {
      envname = "\\end{" + envname + "}";
      doc.scanner.InsertSource(envname);
      ctx.ERRORED = true;
      LHR_EXIT_WITH_ERROR(doc, envname);
    }
  }]});
};
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
//
//            context [Until]
//
//☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆
(function() {
  new function(){
    var _Ctx=ns.ContextFactory.GetInstance("sub.until");
    var _CtxName="sub.until";
    _Ctx.key = "initialized:sub.until"; // with(context)
    _Ctx.initializer = function(mainctx) {
      // filter
      //------------------------------
      // ・sub.until から直接派生した時だけ
      // ・未だ sub.argument で初期化していない時だけ
      if (mainctx[_Ctx.key] || !mainctx.ContainsBaseContext(this)) return;
      mainctx[_Ctx.key] = true;

      // 終了条件の設定
      _Ctx.set_Terminator(mainctx, mainctx.until_type, mainctx.until_word);
    };

    /// <summary>
    /// sub.until の終了条件を設定します。
    /// </summary>
    _Ctx.set_Terminator = function(ctx, type, word) { // with(context)
      switch (type) {
      case mod_core.SCAN_WT_LTR: ctx.AddLetterHandler(word, LH_EXIT); break;
      case mod_core.SCAN_WT_CMD: ctx.AddCommandHandler(word, CH_EXIT); break;
      case mod_core.SCAN_WT_TXT:
        ctx.text_modifier = function(doc, text) {
          doc.scanner.Next();
          doc.currentCtx.BREAK = true;
          return "";
        };
        break;
//#debug
      case null: case "":
        throw new Error("sub.until/set_Terminator: 'until-type' is not specified!");
      default:
        throw new Error("sub.until/set_Terminator: Unknown 'until-type'! until_type=" + type);
//#end debug
      }
    };

    _Ctx.AddLetterHandler("}", LH_EXIT_WITH_ERROR);
    _Ctx.AddLetterHandler("EOF", LH_EXIT_WITH_ERROR);
    _Ctx.AddCommandHandler("right", CH_EXIT_WITH_ERROR);
    _Ctx.AddCommandHandler("end", CH_EXIT_WITH_ERROR);
  };
})();
//----------------------------------------------------------------
/// <summary>
/// 引数などをそのまま読み取る為の文脈です。
/// </summary>
/// <param name="Context#until_type">継承末端の文脈に指定して、終了条件の種類を示します。</param>
/// <param name="Context#until_word">継承末端の文脈に指定して、終了条件の定義を行います。</param>
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("sub.until.raw");
  var _CtxName="sub.until.raw";
  _Ctx.key = "initialized:sub.until.raw"; // with(context)
  _Ctx.initializer = function(mainctx) {
    if (mainctx[_Ctx.key]) return;
    mainctx[_Ctx.key] = true;
    mainctx.BRACE_LEVEL = 0;

    // 終了条件の設定
    _Ctx.set_Terminator(mainctx, mainctx.until_type, mainctx.until_word);
  };

  /// <summary>
  /// sub.until の終了条件を設定します。
  /// </summary>
  _Ctx.set_Terminator = function(ctx, type, word) { // with(context)
    switch (type) {
      case mod_core.SCAN_WT_LTR:
        if (word == "}") {
          ctx.AddLetterHandler(word, function(doc, letter) {
            if (doc.currentCtx.BRACE_LEVEL == 0) {
              LH_EXIT(doc, letter);
            } else {
              doc.currentCtx.BRACE_LEVEL--;
              doc.currentCtx.output.buff.push(letter);
              doc.scanner.Next();
            }
          });
        } else {
          ctx.AddLetterHandler(word, function(doc, letter) {
            (doc.currentCtx.BRACE_LEVEL == 0 ? LH_EXIT : LH_RAW)(doc, letter);
          });
        }
        break;
      case mod_core.SCAN_WT_CMD:
        ctx.AddCommandHandler(word, function(doc, letter) {
          (doc.currentCtx.BRACE_LEVEL == 0 ? CH_EXIT : CH_RAW)(doc, letter);
        });
        break;
      case mod_core.SCAN_WT_TXT:
        ctx.text_modifier = function(doc, text) {
          doc.scanner.Next();
          if (doc.currentCtx.BRACE_LEVEL == 0 && text == word) {
            doc.currentCtx.BREAK = true;
            return "";
          } else return text;
        };
        break;
//#debug
      case null: case "":
        throw new Error("sub.until.raw/set_Terminator: 'until-type' is not specified!");
      default:
        throw new Error("sub.until.raw/set_Terminator: Unknown 'until-type'! until_type=" + type);
//#end debug
    }
  };
  //--------------------------------------------
  _Ctx.CreateContext = _Ctx.rawctx_CreateContext;
  _Ctx.DefineLetter({
    '{': function(doc, letter) {
      doc.currentCtx.BRACE_LEVEL++;
      doc.currentCtx.output.buff.push(letter);
      doc.scanner.Next();
    }, '}': function(doc, letter) {
      if (doc.currentCtx.BRACE_LEVEL == 0) {
        LHR_EXIT_WITH_ERROR(doc, letter);
      } else {
        doc.currentCtx.BRACE_LEVEL--;
        doc.currentCtx.output.buff.push(letter);
        doc.scanner.Next();
      }
    }, 'EOF': LHR_EXIT_WITH_ERROR
  });
};
//----------------------------------------------------------------
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("sub.until.]");
  var _CtxName="sub.until.]";
  _Ctx.AddLetterHandler("]", LH_EXIT);

  _Ctx.AddLetterHandler("}", LH_EXIT_WITH_ERROR);
  _Ctx.AddLetterHandler("EOF", LH_EXIT_WITH_ERROR);
  _Ctx.AddCommandHandler("right", CH_EXIT_WITH_ERROR);
  _Ctx.AddCommandHandler("end", CH_EXIT_WITH_ERROR);
};
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
//
//            context [sub]
//
//☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆
/// <summary>
/// [] で囲まれた sub-block を読み取ります。
/// </summary>
/// <condition>[ の次の語から始めて下さい。</condition>
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("sub.bracket");
  var _CtxName="sub.bracket";
  _Ctx.AddLetterHandler("]", LH_EXIT);

  _Ctx.AddLetterHandler("}", LH_EXIT_WITH_ERROR);
  _Ctx.AddLetterHandler("EOF", LH_EXIT_WITH_ERROR);
  _Ctx.AddCommandHandler("right", CH_EXIT_WITH_ERROR);
  _Ctx.AddCommandHandler("end", CH_EXIT_WITH_ERROR);
};
//----------------------------------------------------------------
/// <summary>
/// \begin \end で囲まれた sub-block を読み取ります。
/// </summary>
/// <condition>
/// \begin の次の語から始めて下さい。
/// </condition>
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("sub.env");
  var _CtxName="sub.env";
  //_Ctx.AddLetterHandler("]", LH_EXIT_WITH_ERROR);
  _Ctx.AddLetterHandler("}", LH_EXIT_WITH_ERROR);
  _Ctx.AddLetterHandler("EOF", LH_EXIT_WITH_ERROR);
  //_Ctx.AddCommandHandler("end", CH_EXIT_WITH_ERROR);
  //------------------------------------------------------------
  //    暫定ハンドラ (未知の環境用)
  //      latex.ctor.js ns.Environment 参照
  //------------------------------------------------------------
  _Ctx.AddCommandHandler("end", function(doc) {
    doc.scanner.Next();
    var env = doc.GetArgumentRaw().trim();
    if (doc.currentCtx.ENVNAME == env) {
      doc.currentCtx.BREAK = true;
    } else {
      env = "\\end{" + env + "}";
      doc.currentCtx.output.error("UnexpectedEOR", env);
      doc.scanner.InsertSource(env);
      doc.currentCtx.BREAK = true;

      // only for [ns.Environment#Process]
      //loc_err = true;
    }
  });
};
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
//
//            context Math
//
//☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("mode.math","global");
  var _CtxName="mode.math";
  _Ctx.key = "initialized:mode.math"; // with(context)
  _Ctx.initializer = function(mainctx) {
    if (mainctx[_Ctx.key]) return;
    mainctx[_Ctx.key] = true;

    mainctx.text_modifier = function(doc, text) {
      doc.scanner.Next();
      return text.replace(reg_math_text_modifier, rep_math_text_modifier);
    };
  };

  // 無効化
  _Ctx.AddEnvironment("document", null);
  //============================================================
  //    \left ～ \right
  //============================================================
  var stretchImg = (function() {
    var stretchSvgHead = '<svg class="aghtex-css-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 1024" preserveAspectRatio="none"><g transform="matrix(1 0 0 -1 0 768)"><path fill="currentColor" d="';
    var stretchSvgTail = '" /></g></svg>';
    var stretchSvgPath = {
      lparen: 'M124 256c0 -242 204 -387 388 -492l-43 -20c-142 77 -469 234 -469 512s327 435 469 512l43 -20c-184 -105 -388 -250 -388 -492z',
      rparen: 'M388 256c0 242 -204 387 -388 492l43 20c142 -77 469 -234 469 -512s-327 -435 -469 -512l-43 20c184 105 388 250 388 492z',
      lbrace: 'M0 256c0 4 3 7 5 8c107 21 185 59 207 108v281c39 92 254 115 291 115c5 0 9 -2 9 -9s-4 -9 -9 -9c-34 0 -171 -28 -208 -97v-281c-35 -74 -154 -100 -248 -116'
        + 'c94 -16 213 -42 248 -116v-281c37 -69 174 -97 208 -97c5 0 9 -2 9 -9s-4 -9 -9 -9c-37 0 -252 23 -291 115v281c-22 49 -100 87 -207 108c-2 1 -5 4 -5 8z',
      rbrace:'M512 256c0 -4 -3 -7 -5 -8c-107 -21 -185 -59 -207 -108v-281c-39 -92 -254 -115 -291 -115c-5 0 -9 2 -9 9s4 9 9 9c34 0 171 28 208 97v281c35 74 154 100 248 116'
        + 'c-94 16 -213 42 -248 116v281c-37 69 -174 97 -208 97c-5 0 -9 2 -9 9s4 9 9 9c37 0 252 -23 291 -115v-281c22 -49 100 -87 207 -108c2 -1 5 -4 5 -8z',
      langle: 'M0 256c169 195 434 500 434 500c8 11 30 12 41 12c21 0 37 -9 37 -19c0 -2 0 -5 -2 -8l-416 -485l416 -485c2 -3 2 -6 2 -8c0 -10 -16 -19 -37 -19c-11 0 -33 1 -41 12c0 0 -265 305 -434 500z',
      rangle: 'M512 256c-169 -195 -434 -500 -434 -500c-8 -11 -30 -12 -41 -12c-21 0 -37 9 -37 19c0 2 0 5 2 8l416 485l-416 485c-2 3 -2 6 -2 8c0 10 16 19 37 19c11 0 33 -1 41 -12c0 0 265 -305 434 -500z',
      sqrt: 'M0 27l130 112l120 -239l237 868h25v-40l-266 -981l-164 327l-75 -66z'
    };

    switch (ns.compatMode) {
    case "IE-qks":
    case "Fx-qks":
      return function(imgsrc, width, alt) {
        width = width.toString() + "ex";
        return '<td class="aghtex-css-td aghtex-stretch" rowspan="2" style="height:0px!important;"><img src="' + ns.BaseUrl + imgsrc + '" alt="' + alt + '" style="width:' + width + ';height:100%;"/></td>';
      };
    case "IE-std":
      if (agh.browser.vIE<8) {
        ns.expression_height = function(elem) {
          var tr = elem.parentElement.parentElement;
          var table = tr.parentElement.parentElement;
          return (table.clientHeight-4) + "px";
        };
        return function(imgsrc, width, alt) {
          width = width.toString() + "ex";
          var style = 'width:' + width + ';height:expression(' + ns.namespaceName + '.expression_height(this));';
          //var style = 'width:' + width + ';height:expression(this.parentElement.parentElement.parentElement.parentElement.clientHeight-4);';
          return '<td class="aghtex-css-td aghtex-stretch" rowspan="2" style="height:0px!important;"><img src="' + ns.BaseUrl + imgsrc + '" alt="' + alt + '" style="' + style + '"/></td>';
        };
      } else {
        return function(imgsrc, width, alt) {
          width = width.toString() + "ex";
          var style = 'width:' + width + ';'
          return '<td class="aghtex-css-td aghtex-vstretch" rowspan="2" style="' + style + '"><img class="aghtex-stretch-img" src="' + ns.BaseUrl + imgsrc + '" alt="' + alt + '" style="' + style + '"/></td>';
        };
      }
    case "Fx-std":
      return function(imgsrc, width, alt, className) {
        if (className in stretchSvgPath) {
          // .svg を用いた表示
          var svg = stretchSvgHead + stretchSvgPath[className] + stretchSvgTail;
          return '<td rowspan="2" class="aghtex-css-td aghtex-stretch-svg aghtex-stretch-svg-' + className + '">' + svg + '</td>';
        } else {
          // 旧来の .png を用いた表示
          width = width.toString() + "ex";
          //return '<td rowspan="2" style="width:' + width + ';background-image:url(' + ns.BaseUrl + imgsrc + ');-moz-background-size:100%;"></td>';
          return '<td rowspan="2" class="aghtex-css-td aghtex-stretch" style="height:100%!important;"><img src="' + ns.BaseUrl + imgsrc + '" alt="' + alt + '" style="width:' + width + ';height:100%;"/></td>';
        }
      };
    case "Sf-qks":
    case "Sf-std":
      return function(imgsrc, width, alt, className) {
        if (className in stretchSvgPath) {
          var svg = stretchSvgHead + stretchSvgPath[className] + stretchSvgTail;
          return '<td rowspan="2" class="aghtex-css-td aghtex-stretch-svg aghtex-stretch-svg-' + className + '">' + svg + '</td>';
        } else {
          width = (width * 0.8).toString() + "ex";
          if (className)
            return '<td rowspan="2" class="aghtex-css-td aghtex-stretch-bg aghtex-stretch-bg-' + className + '"></td>';
          else
            return '<td rowspan="2" class="aghtex-css-td aghtex-stretch-bg" style="width:' + width + '!important;background-image:url(' + ns.BaseUrl + imgsrc + ')!important;"></td>';
        }
      };
    case "Op-qks":
    case "Op-std":
      return function(imgsrc, width, alt) {
        width = (width * 0.8).toString() + "ex";
        return '<td rowspan="2" class="aghtex-css-td aghtex-stretch" style="width:' + width + '!important;background-image:url(' + ns.BaseUrl + imgsrc + ')!important;"></td>';
      };
    default:
      return function(imgsrc, width, alt) {
        width = (width * 0.8).toString() + "ex";
        return '<td rowspan="2" class="aghtex-css-td aghtex-stretch" style="width:' + width + '!important;background-image:url(' + ns.BaseUrl + imgsrc + ')!important;background-size:100% 100%!important;"></td>';
      };
    }
  })();
  function stretchTd(className, content) {
    if (content == null) content = '&nbsp;';
    return '<td rowspan="2" class="aghtex-css-td ' + className + '">' + content + '</td>';
  }
  //------------------------------------------------------------
  _Mod.GetStretchImageTd = stretchImg;

  _Mod.OutputStretchBracketTd = (function() {

    var bracket_dict = {
      // 括弧
      "(": stretchImg("stretch_lparen.png", 1.0, "(", 'lparen'),
      ")": stretchImg("stretch_rparen.png", 1.0, ")", 'rparen'),
      "{": stretchImg("stretch_lbrace.png", 1.2, "{", 'lbrace'),
      "}": stretchImg("stretch_rbrace.png", 1.2, "}", 'rbrace'),
      "[": stretchTd('aghtex-left-kaku'),
      "]": stretchTd('aghtex-right-kaku'),
      "〈": stretchImg("stretch_langle.png", 1, "〈", 'langle'),
      "〉": stretchImg("stretch_rangle.png", 1, "〉", 'rangle'),

      // 拡張
      "〔": stretchImg("paren5l.png", 1, "〔"),
      "〕": stretchImg("paren5r.png", 1, "〕"),

      // 共通
      "|": agh.browser.vIE ? stretchTd('aghtex-left-pipe') :
        stretchTd('aghtex-left-pipe', ""),
      "∥": agh.browser.vIE ? stretchTd('aghtex-left-vert') :
        stretchTd('aghtex-left-vert', ""),

      // ceiling / floor
      "\u2308": stretchTd('aghtex-left-ceil'), //
      "\uF0E9": stretchTd('aghtex-left-ceil'), // Symbol Font
      "\u00E9": stretchTd('aghtex-left-ceil'), // Symbol Font
      "\u230A": stretchTd('aghtex-left-flor'), //
      "\uF0EB": stretchTd('aghtex-left-flor'), // Symbol Font
      "\u00EB": stretchTd('aghtex-left-flor'), // Symbol Font
      "\u2309": stretchTd('aghtex-right-ceil'), //
      "\uF0F9": stretchTd('aghtex-right-ceil'), // Symbol Font
      "\u00F9": stretchTd('aghtex-right-ceil'), // Symbol Font
      "\u230B": stretchTd('aghtex-right-flor'), //
      "\uF0FB": stretchTd('aghtex-right-flor'), // Symbol Font
      "\u00FB": stretchTd('aghtex-right-flor'), // Symbol Font
      //"<tex:f>&#xF0E9;</tex:f>": stretchTd('aghtex-left-ceil'),
      //"<tex:f>&#xE9;</tex:f>": stretchTd('aghtex-left-ceil'),
      //"<tex:f>&#xF0EB;</tex:f>": stretchTd('aghtex-left-flor'),
      //"<tex:f>&#xEB;</tex:f>": stretchTd('aghtex-left-flor'),
      //"<tex:f>&#xF0F9;</tex:f>": stretchTd('aghtex-right-ceil'),
      //"<tex:f>&#xF9;</tex:f>": stretchTd('aghtex-right-ceil'),
      //"<tex:f>&#xF0FB;</tex:f>": stretchTd('aghtex-right-flor'),
      //"<tex:f>&#xFB;</tex:f>": stretchTd('aghtex-right-flor'),

      // arrows
      "↑"    : stretchImg("stretch_uarr.png",   1.2, "↑"),
      "↓"    : stretchImg("stretch_darr.png",   1.2, "↓"),
      "\u2195": stretchImg("stretch_udarr.png",  1.2, "&#x2195;"),
      "\u21D1": stretchImg("stretch_uarr2.png",  1.2, "&#x21D1;"),
      "\u21D3": stretchImg("stretch_darr2.png",  1.2, "&#x21D3;"),
      "\u21D5": stretchImg("stretch_udarr2.png", 1.2, "&#x21D5;"),
      "/"     : stretchImg("stretch_slash.png",  1.2, "/"),
      "\\"    : stretchImg("stretch_bslash.png", 1.2, "\\"),

      ".": ""
    };

    return function _OutputStretchBracketTd(output, content, rowspan) {
      var buff = output.buff;
      var c = agh.Text.Unescape(content, "html");
      if (c != ".") {
        if (c in bracket_dict) {
          if (rowspan == 2)
            buff.push(bracket_dict[c]);
          else
            buff.push(bracket_dict[c].replace(/\browspan="2"/, 'rowspan="' + rowspan + '"'));
          return true;
        } else {
          buff.push('<td rowspan="', rowspan, '" class="aghtex-css-td">');
          output.error('mod:base.cmd:left.NotSupportedSymbol', {ch: c}, 'mod:base.OutputStretchBracketTd');
          buff.push(content, '</td>');
          return false;
        }
      }
      return true;
    };
  })();

  _Mod.OutputBracketedContent = function(output, content, ltr1, ltr2, sbsp1, sbsp2) {
    //==== 補助変数 ==========================
    var buff = output.buff;
    var bottom_row = "";
    function proc_subsup(sbsp) {
      if (sbsp == null) return;
      switch ((sbsp.sup ? 1 : 0) + (sbsp.sub ? 2 : 0)) {
        case 1: // 上付
          buff.push('<td rowspan="2" class="aghtex-css-td aghtex-cmdleft-cell-sup aghtex-tag-script"><tex:i class="aghtex-cmdleft-sup">', sbsp.sup, '</tex:i></td>');
          break;
        case 2: // 下付
          buff.push('<td rowspan="2" class="aghtex-css-td aghtex-cmdleft-cell-sub aghtex-tag-script"><tex:i class="aghtex-cmdleft-sub">', sbsp.sub, '</tex:i></td>');
          break;
        case 3: // 両方
          buff.push('<td class="aghtex-css-td aghtex-cmdleft-cell-sup aghtex-tag-script"><tex:i class="aghtex-cmdleft-sup">', sbsp.sup, '</tex:i></td>');
          bottom_row += '<td class="aghtex-css-td aghtex-cmdleft-cell-sub aghtex-tag-script"><tex:i class="aghtex-cmdleft-sub">' + sbsp.sub + '</tex:i></td>';
          break;
      }
    }
    //========================================

    //-- [prologue]
    if (agh.browser.vFx)
      // Fx では border-collapse:collapse; にすると border-bottom/right が表示されない
      // 代わりに cellSpacing="0px" を利用
      buff.push('<table class="aghtex-css-table-inline aghtex-cmdleft-table" cellSpacing="0px"><tbody><tr class="aghtex-css-tr aghtex-cmdleft-row">');
    else if (agh.browser.vSf)
      // Sf5 では CSS2.1 table{vertical-align:baseline;} に対応していない (Cr では OK なのに。。)
      buff.push('<table class="aghtex-css-table-inline aghtex-cmdleft-table aghtex-cmdleft-table-sf"><tbody><tr class="aghtex-css-tr aghtex-cmdleft-row">');
    else
      buff.push('<table class="aghtex-css-table-inline aghtex-cmdleft-table"><tbody><tr class="aghtex-css-tr aghtex-cmdleft-row">');

    _Mod.OutputStretchBracketTd(output, ltr1, 2);
    proc_subsup(sbsp1);

    //-- [content]
    buff.push('<td class="aghtex-css-td aghtex-cmdleft-cell" rowspan="2"><tex:i class="aghtex-cmdleft-tmargin"></tex:i>');

    if (agh.is(content, Function))
      content(output);
    else
      buff.push(content);

    //-- [epilogue]
    buff.push('<tex:i class="aghtex-cmdleft-bmargin"></tex:i></td>');

    _Mod.OutputStretchBracketTd(output, ltr2, 2);
    proc_subsup(sbsp2);

    //-- [レイアウト用の二行目がある時]
    if (bottom_row != "")
      buff.push('</tr><tr class="aghtex-css-tr">', bottom_row);

    buff.push('</tr></tbody></table>');
  };

  _Ctx.AddCommandHandler("left", function(doc) {
    var output = doc.currentCtx.output;
    doc.scanner.Next();
    var ltr1 = doc.GetArgumentHtml();
    var sbsp1 = doc.GetSubSup();

    var ltr2 = null, sbsp2 = null;
    // setup context and read under the context
    var ctx = doc.wrap_context(doc.currentCtx);
    ctx.AddCommandHandler("right", function(doc) {
      doc.scanner.Next();
      ltr2 = doc.GetArgumentHtml();
      sbsp2 = doc.GetSubSup();
      doc.currentCtx.BREAK = true;
    });
    var coantent = doc.Read(ctx);

    _Mod.OutputBracketedContent(output, content, ltr1, ltr2, sbsp1, sbsp2);
  });
  _Ctx.AddCommandHandler("right", CH_EXIT_WITH_ERROR);
};
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
//
//            context Paragraph
//
//☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆
var CTX_MATHENV=["global", "sub.env", "mode.math"];
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("mode.para","global");
  var _CtxName="mode.para";
  // 無効化
  _Ctx.AddEnvironment("document", null);
  //============================================================
  //    $ ～ $
  //============================================================
  _Ctx.AddLetterHandler("$", function(doc) {
    doc.scanner.Next();
    var buff = doc.currentCtx.output.buff;

    //-- prologue
    buff.push('<tex:math>');

    // setup context and read under the context
    var ctx = doc.context_cast(CTX_MATHENV);
    ctx.AddLetterHandler("$", function(doc) {
      doc.scanner.Next();
      doc.currentCtx.BREAK = true;
    });
    buff.push(doc.Read(ctx));

    //-- epilogue
    buff.push('</tex:math>');
  });
  //============================================================
  //    commands
  //============================================================
  _Ctx.AddCommandHandler("verb", function(doc) {
    var output = doc.currentCtx.output;
    var ret = doc.scanner.NextVerbArgument();
    output.buff.push('<tex:f class="aghtex-texttt">', agh.Text.Escape(doc.scanner.word, "html"), '</tex:f>');
    if (ret == doc.scanner.NEXT_EOF) {
      output.error('UnexpectedEOR', 'EOF', 'mod:base.cmd:verb');
    } else if (ret == doc.scanner.NEXT_NEWLINE) {
      output.error('mod:base.cmd:verb.UnexpectedEOL', null, 'mod:base.cmd:verb');
    }
    doc.scanner.Next();
  });
  _Ctx.AddCommandHandler("verb*", function(doc) {
    var output = doc.currentCtx.output;
    var ret = doc.scanner.NextVerbArgument();
    output.buff.push('<tex:f class="aghtex-texttt">', agh.Text.Escape(doc.scanner.word.replace(/ /g, '\u2423'), "html"), '</tex:f>');
    if (ret == doc.scanner.NEXT_EOF) {
      output.error('UnexpectedEOR', 'EOF', 'mod:base.cmd:verb');
    } else if (ret == doc.scanner.NEXT_NEWLINE) {
      output.error('mod:base.cmd:verb.UnexpectedEOL', null, 'mod:base.cmd:verb');
    }
    doc.scanner.Next();
  });
  //============================================================
  //    environments
  //============================================================
};

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("mode.lr","mode.para");
  var _CtxName="mode.lr";
  _Ctx.DefineCommand({'\\':['s@','']});
};

})();
//-----------------------------------------------------------------------------
(function _aghtex_include_mod_counter_js() { /* main.pp.js: included from .gen/mod_counter.js */
// -*- mode: js -*-
//◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
//
//						class Counter
//
//◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇◇

agh.memcpy(ns.Modules["core"].ErrorMessages, {
  "mod:counter.cmd:alpha.CounterOutOfRange": [
    "CounterOutOfRange",
    "counter \\alpha:\n"
      + "counter の値は 1 から 26 までの整数でなければなりません。"],
  "mod:counter.cmd:roman.CounterOutOfRange": [
    "CounterOutOfRange",
    "counter \\roman:\n"
      + "counter の値が大きすぎてローマ数字で表現する事が出来ません。"],
  "mod:counter.cmd:fnsymbol.CounterOutOfRange": [
    "CounterOutOfRange",
    "counter {name}:\n"
      + "\\fnsymbol は 1 以上 9 以下の counter にしか使えません。"],
  "mod:counter.cmd:fnsymbol.UnknownCounter": [
    "UnknownCounter '{name}'",
    "指定された名前の counter は見つかりませんでした。"]
});

var _modkey = 'mod:counter';
var _Mod = ns.Modules[_modkey] = {};

var roman1, roman5, Roman1, Roman5;
(function() {
  function ov(html) { return '<tex:i class="aghtex-counter-ov">' + html + '</tex:i>'; }
  function ovv(html) { return '<tex:i class="aghtex-counter-ovv">' + html + '</tex:i>'; }
  roman1 = ["i", "x", "c", "m", ov("x"), ov("c"), ov("m"), ovv("x"), ovv("c"), ovv("m")];
  roman5 = ["v", "l", "d", ov("v"), ov("l"), ov("d"), ovv("v"), ovv("l"), ovv("d")];
  Roman1 = ["I", "X", "C", "M", ov("X"), ov("C"), ov("M"), ovv("X"), ovv("C"), ovv("M")];
  Roman5 = ["V", "L", "D", ov("V"), ov("L"), ov("D"), ovv("V"), ovv("L"), ovv("D")];
})();

/// <summary>
/// カウンタを表現します。
/// </summary>
/// <param name="counterName">新しく作成する Counter の名前を指定します。</param>
/// <param name="parentCounter">親となる counter を指定します。</param>
ns.Counter = function(counterName, parentCounter) {
  this.name = counterName;
  this.val = 0;
  this.parent = parentCounter;
  this.child = [];
  if (parentCounter != null)
    parentCounter.child.push(this);
};
agh.memcpy(ns.Counter.prototype, {
  Set: function(val) {
    this.val = parseInt(val);
  },
  Add: function(val) {
    val = parseInt(val);
    if (isNaN(val)) val = 1;
    this.val += val;
  },
  Step: function() {
    this.val++;
    for (var i = 0, iN = this.child.length; i < iN; i++)
      this.child[i].Clear()
  },
  Clear: function() {
    this.val = 0;
    for (var i = 0, iN = this.child.length; i < iN; i++)
      this.child[i].Clear()
  },
  alpha: function() {
    if (this.val < 1 || 26 < this.val)
      return ns.Writer.get_error(
        "mod:counter.cmd:alpha.CounterOutOfRange",
        null, "Counter#alpha (mod:counter)");
    else
      return "abcdefghijklmnopqrstuvwxyz".substr(this.val - 1, 1);
  },
  Alpha: function() {
    if (this.val < 1 || 26 < this.val)
      return ns.Writer.get_error(
        "mod:counter.cmd:alpha.CounterOutOfRange",
        null, "Counter#Alpha (mod:counter)");
    else
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".substr(this.val - 1, 1);
  },
  arabic: function() {
    return this.val.toString();
  },
  roman_internal: function(rm1, rm5) {
    if (this.val < 0 || 4999999999 < this.val)
      return ns.Writer.get_error(
        "mod:counter.cmd:roman.CounterOutOfRange",
        null, "Counter#roman (mod:counter)");
    if (this.val == 0) return 'nulla';

    var x = this.val.toString();
    var r = [];
    for (var i = x.length - 1; i >= 0; i--) {
      switch (x.substr(x.length - 1 - i, 1)) {
      case "0": break;
      case "1": r.push(rm1[i]); break;
      case "2": r.push(rm1[i], rm1[i]); break;
      case "3": r.push(rm1[i], rm1[i], rm1[i]); break;
      case "4": r.push(rm1[i], rm5[i]); break;
      case "5": r.push(rm5[i]); break;
      case "6": r.push(rm5[i], rm1[i]); break;
      case "7": r.push(rm5[i], rm1[i], rm1[i]); break;
      case "8": r.push(rm5[i], rm1[i], rm1[i], rm1[i]); break;
      case "9": r.push(rm1[i], rm1[i + 1]); break;
      }
    }
    return r.join("");
  },
  roman: function() {
    return this.roman_internal(roman1, roman5);
  },
  Roman: function() {
    return this.roman_internal(Roman1, Roman5);
  },
  fnsymbol: function() {
    switch (this.val) {
    case 1: return "*";
    case 2: return "<tex:fcent>†</tex:fcent>";
    case 3: return "<tex:fcent>‡</tex:fcent>";
    case 4: return "§";
    case 5: return "¶";
    case 6: return "∥"; //&#8741;
    case 7: return "**";
    case 8: return "<tex:fcent>††</tex:fcent>";
    case 9: return "<tex:fcent>‡‡</tex:fcent>";
    default:
      return ns.Writer.get_error(
        "mod:counter.cmd:fnsymbol.CounterOutOfRange",
        {name: this.name}, "Counter#fnsymbol (mod:counter)");
    }
  },
  value: function() {
    return this.value.toString();
  },
  //----------------------------------------------------------------
  //		他
  //----------------------------------------------------------------
  toString: function() {
    return "[object " + ns.namespaceName + ".Counter]";
  }
});

agh.memcpy(ns.Document.prototype, {
  GetCounter: function(name) {
    if (name != null) {
      var counters = this[_modkey] || (this[_modkey] = {});

      name = name.trim();
      var counter = counters[name];
      if (counter == null)
        this.currentCtx.output.error(
          "mod:counter.cmd:fnsymbol.UnknownCounter",
          {name: name}, "Document#GetCounter (mod:counter)");
      return counter;
    } else {
      return null;
    }
  },
  NewCounter: function(name, parent) {
    var counters = this[_modkey] || (this[_modkey] = {});

    if (typeof parent == "string" || parent instanceof String)
      parent = this.GetCounter(parent);
    counters[name] = new ns.Counter(name, parent);
  }
});

agh.memcpy(_Mod, {
  stepcounter: function(doc, name) {
    var counter = doc.GetCounter(name);
    if (counter != null) counter.Step();
  },
  arabic: function(doc, name) {
    var counter = doc.GetCounter(name);
    return counter == null ? "" : counter.arabic();
  },
  alph: function(doc, name) {
    var counter = doc.GetCounter(name);
    return counter == null ? "" : counter.alph();
  },
  Alph: function(doc, name) {
    var counter = doc.GetCounter(name);
    return counter == null ? "" : counter.Alph();
  },
  roman: function(doc, name) {
    var counter = doc.GetCounter(name);
    return counter == null ? "" : counter.roman();
  },
  Roman: function(doc, name) {
    var counter = doc.GetCounter(name);
    return counter == null ? "" : counter.Roman();
  },
  fnsymbol: function(doc, name) {
    var counter = doc.GetCounter(name);
    return counter == null ? "" : counter.fnsymbol();
  },
  value: function(doc, name) {
    var counter = doc.GetCounter(name);
    return counter == null ? "" : counter.value();
  }
});

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("global");
  var _CtxName="global";
  _Ctx.DefineCommand({"newcounter":['f;#!1#[]!2',function(doc,argv){
    var name = argv[1];
    var parent = argv[2];
    if (parent && parent != "")
      doc.NewCounter(name, parent);
    else
      doc.NewCounter(name);
  }]});
  _Ctx.AddCommandHandler("addtocounter",ns.Command.CreateFunctionHandler(2,null,function(DOC,ARGS){
    var counter = DOC.GetCounter(ARGS[1]);
    if (counter != null) counter.Add(ARGS[2]);
  }));
  _Ctx.AddCommandHandler("setcounter",ns.Command.CreateFunctionHandler(2,null,function(DOC,ARGS){
    var counter = DOC.GetCounter(ARGS[1]);
    if (counter != null) counter.Set(ARGS[2]);
  }));
  _Ctx.AddCommandHandler("stepcounter",ns.Command.CreateFunctionHandler(1,null,function(DOC,ARGS){
    var counter = DOC.GetCounter(ARGS[1]);
    if (counter != null) counter.Step();
  }));

  // counter 表示
  _Ctx.AddCommandHandler("arabic",ns.Command.CreateFunctionHandler(1,null,function(DOC,ARGS){
    var counter = DOC.GetCounter(ARGS[1]);
    if (counter != null) DOC.currentCtx.output.buff.push(counter.arabic());
  }));
  _Ctx.AddCommandHandler("alph",ns.Command.CreateFunctionHandler(1,null,function(DOC,ARGS){
    var counter = DOC.GetCounter(ARGS[1]);
    if (counter != null) DOC.currentCtx.output.buff.push(counter.alpha());
  }));
  _Ctx.AddCommandHandler("Alph",ns.Command.CreateFunctionHandler(1,null,function(DOC,ARGS){
    var counter = DOC.GetCounter(ARGS[1]);
    if (counter != null) DOC.currentCtx.output.buff.push(counter.Alpha());
  }));
  _Ctx.AddCommandHandler("roman",ns.Command.CreateFunctionHandler(1,null,function(DOC,ARGS){
    var counter = DOC.GetCounter(ARGS[1]);
    if (counter != null) DOC.currentCtx.output.buff.push(counter.roman());
  }));
  _Ctx.AddCommandHandler("Roman",ns.Command.CreateFunctionHandler(1,null,function(DOC,ARGS){
    var counter = DOC.GetCounter(ARGS[1]);
    if (counter != null) DOC.currentCtx.output.buff.push(counter.Roman());
  }));
  _Ctx.AddCommandHandler("fnsymbol",ns.Command.CreateFunctionHandler(1,null,function(DOC,ARGS){
    var counter = DOC.GetCounter(ARGS[1]);
    if (counter != null) DOC.currentCtx.output.buff.push(counter.fnsymbol());
  }));
  _Ctx.AddCommandHandler("value",ns.Command.CreateFunctionHandler(1,null,function(DOC,ARGS){
    var counter = DOC.GetCounter(ARGS[1]);
    if (counter != null) DOC.currentCtx.output.buff.push(counter.value());
  }));
}

})();
//-----------------------------------------------------------------------------
(function _aghtex_include_mod_length_js() { /* main.pp.js: included from .gen/mod_length.js */
// -*- mode: js -*-

var mod_core = ns.Modules["core"];
var _Mod = ns.Modules["mod:length"] = {};

agh.memcpy(ns.Modules["core"].ErrorMessages, {
  'mod:length.InvalidLengthName': [
    "InvalidLengthName", "The name '{name}' is not a valid name for lengths. The length name should have a command form."],
  'mod:lentgh.InvalidCommandArgument': [
    "InvalidCommandArgument", "The specified argument '{value}' does not have a command form."],
  'mod:lentgh.UnrecognizedLengthName': [
    "{value}", "The specified name '{value}' does not name a length/dimension/skip."],
  'mod:length.cmd:the.UnknownRegister': [
    '\\the{value}', "The name '{value}' does not name any of registers, such as count/dimension/skip/etc."]
});

/* 注意: 利用できる単位については以下でハードコーディングされている事に注意する。
 * 単位を追加するためにはこれらも一緒に更新する必要がある。
 *
 *   - このファイルに含まれる正規表現
 *   - core.js:ns.Document.prototype.ReadDimension の正規表現
 */
var UNITDATA = {
  // reference: http://tex.stackexchange.com/questions/41370/what-are-the-possible-dimensions-sizes-units-latex-understands

  // inches
  "in": {mm: 25.4  , outunit: "in"},
  bp: {mm: 25.4 / 72 , outunit: "in"}, // 72 bp (big point) = 1 in

  // meters
  cm: {mm: 10      , outunit: "cm"},
  mm: {mm: 1       , outunit: "mm"}, // 10 mm := 1 cm

  // points
  pt: {mm: 0.3515  , outunit: "pt"},
  pc: {mm: 4.218   , outunit: "pc"}, // pc (pica) := 0.166 in, 12 pc = 1 pt,
  sp: {mm: 5.363e-6, outunit: "pt"}, // 65536 sp (scaled point) = 1 pt

  // didot points
  dd: {mm: 0.37597 , outunit: "mm"}, // 1 dd (didot point) = 15625/41559 mm
  cc: {mm: 4.51166 , outunit: "mm"}, // 1 cc (cicero) = 12 dd
  nd: {mm: 0.375   , outunit: "mm"}, // 1 nd (new didot) = 0.375 mm
  nc: {mm: 4.5     , outunit: "mm"}, // 1 nc (new cicero) = 12 nd = 4.5 mm

  // letter sizes
  ex: {mm: 1.8     , outunit: "ex"},
  em: {mm: 3.2     , outunit: "em"}, // 1 ex ~ 9/16 em?
  zw: {mm: 3.2     , outunit: "em"}, // 全角幅
  zh: {mm: 3.2     , outunit: "em"}, // 全角高さ
  mu: {mm: 3.2/18  , outunit: "em"}, // 18 mu (math unit) = 1 em

  // display pixels
  px: {
    mm: 25.4 / (agh.browser.vIE ? screen.deviceXDPI : 96),
    outunit: "px"
  }
};

ns.Length = function(value, unit) {
  if (value) {
    if (value instanceof ns.Length) {
      this.val = value.val;
      this.unit = value.unit;
      if (value.plus instanceof ns.Length)
        this.plus = new ns.Length(value.plus);
      if (value.minus instanceof ns.Length)
        this.minus = new ns.Length(value.minus);
      return;
    }

    value = this.parseNumber(value);
    if (unit instanceof ns.Length) {
      // 例: new ns.Length(0.5, textwidth);
      this.val = unit.val * value;
      this.unit = unit.unit;
      if (unit.plus instanceof ns.Length)
        this.plus = new ns.Length(value, unit.plus);
      if (unit.minus instanceof ns.Length)
        this.minus = new ns.Length(value, unit.plus);
    } else {
      // 例: new ns.Length(2.0, "cm");
      this.val = value;
      this.unit = this.parseUnit(unit || "pt");
    }
  } else {
    // 例: new ns.Length;
    this.val = 0;
    this.unit = "in";
  }
};
agh.memcpy(ns.Length, {
  // 将来的には GetLengthArgument か何かの関数で使用するつもり(現在は使用されていない)
  ParseDimension: function(text) {
    /// <summary>
    /// 指定した文字列から length を読み取ります。
    /// </summary>
    /// <returns>
    /// 読み取った情報を元に作成した Length インスタンスを返します。
    /// src_index に、指定した文字列の何処まで読み取ったかの情報を格納します。
    /// </returns>
    var m = text.match(/^\s*([\-+]?)\s*([\d\.]+)\s*(in|bp|cm|mm|pt|pc|sp|dd|cc|n[cd]|em|ex|zw|zh|mu|px)/i);
    if (!m) return null;
    var value = parseFloat(m[1] + m[2]);
    if (isNaN(value)) value = 0;
    var unit = m[3].toLowerCase();
    var index = m[0].length;

    var ret = new ns.Length();
    ret.val = value;
    ret.unit = unit;
    ret.src_index = index;
    return ret;
  }
});
agh.memcpy(ns.Length.prototype, {
  parseNumber: function(text) {
    var ret = parseFloat(text);
    if (isNaN(ret)) return 0;
    return ret;
  },
  parseUnit: function(text) {
    var a = text.match(/(?:in|bp|cm|mm|pt|pc|sp|dd|cc|n[cd]|em|ex|zw|zh|mu|px)\b/i);
    return a != null ? a[0].toLowerCase() : "px";
  },
  changeUnit: function(number, beforeUnit, afterUnit) {
    if (beforeUnit == afterUnit) return number;
    var beforeData = UNITDATA[beforeUnit] || UNITDATA["pt"];
    var afterData = UNITDATA[afterUnit] || UNITDATA["pt"];
    return number * beforeData.mm / afterData.mm;
  },
  toString: function(showStretch) {
    var data = UNITDATA[this.unit] || UNITDATA["pt"];
    var outunit = data.outunit;
    var body = this.changeUnit(this.val, this.unit, outunit).toString() + outunit;
    if (showStretch) {
      if (this.plus instanceof ns.Length && this.plus.val != 0)
        body += " plus " + this.plus.toString(false);
      if (this.minus instanceof ns.Length && this.minus.val != 0)
        body += " minus " + this.minus.toString(false);
    }
    return body;
  },
  addValue: function(arg, subtracts) {
    if (arg == null) return;

    var n = 0, u = "px";
    if (arg instanceof ns.Length) {
      if (arg.plus instanceof ns.Length) {
        if (this.plus instanceof ns.Length)
          this.plus.addValue(arg.plus);
        else
          this.plus = new ns.Length(arg.plus);
      }
      if (arg.minus instanceof ns.Length) {
        if (this.minus instanceof ns.Length)
          this.minus.addValue(arg.minus);
        else
          this.minus = new ns.Length(arg.minus);
      }
      n = arg.val;
      u = arg.unit;
    } else {
      arg = arg.toString();
      n = this.parseNumber(arg);
      u = this.parseUnit(arg);
    }
    var delta = this.changeUnit(n, u, this.unit);
    if (subtracts)
      this.val -= delta;
    else
      this.val += delta;
  },
  subtractValue: function(arg) { // currently unused
    this.addValue(arg, true);
  },
  setValue: function(arg) {
    if (arg == null) return;

    if (arg instanceof ns.Length) {
      this.val = arg.val;
      this.unit = arg.unit;
      this.plus = arg.plus;
      this.minus = arg.minus;
    } else {
      arg = arg.toString();
      this.val = this.parseNumber(arg);
      this.unit = this.parseUnit(arg);
      this.plus = null;
      this.minus = null;
    }
  }
});
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("global");
  var _CtxName="global";
  //=========================================================================
  //    関数達
  //=========================================================================

  function CreateLengthHandler(readMethodName) {
    var result = new ns.Command2("f", null, function(doc, args) {
      var name = args[0];
      doc.skipSpaceAndComment();
      if (doc.scanner.is(mod_core.SCAN_WT_LTR, "=")) {
        doc.scanner.Next();
        // setLength mode
        var dimen = doc[readMethodName]();
        if (dimen) setLength(doc, name, dimen);
      } else {
        // output value mode (拡張)
        doc.currentCtx.output.buff.push((doc.GetLengthData(name) || "0in").toString());
      }
    });
    result.isDimensionHandler = true;
    return result;
  }
  var dimensionHandler = CreateLengthHandler('ReadDimension');
  var lengthHandler = CreateLengthHandler('ReadLength');

  agh.memcpy(ns.Document.prototype, {
    NewLength: function(name) {
      // グローバルに定義
      this.SetMacroHandler(name, lengthHandler, /* isGlobal= */ true);
    },
    NewDimension: function(name) {
      // グローバルに定義
      this.SetMacroHandler(name, dimensionHandler, /* isGlobal= */ true);
    }
  });

  function setLength(doc, name, value) {
    if (!(name in doc.currentCtx.dataL))
      doc.currentCtx.dataL[name] = new ns.Length();
    doc.currentCtx.dataL[name].setValue(value);
  }

  function addToLength(doc, name, value) {
    if (!(name in doc.currentCtx.dataL)) {
      doc.currentCtx.dataL[name] = new ns.Length();
      var parent = doc.GetLengthData(name);
      if (parent != null) doc.currentCtx.dataL[name].setValue(parent);
    }
    doc.currentCtx.dataL[name].addValue(value);
  }

  //=========================================================================
  //    コマンドの定義
  //=========================================================================

  function getNewLengthName(doc, argv) {
    var arg = argv[1].trim();
    if (!arg.startsWith('\\')) {
      doc.currentCtx.output.error('mod:length.InvalidLengthName', {name: arg}, "\\" + argv[0] + " (mod:length)");
      return null;
    }
    return arg.substr(1);
  }

  function getLengthName(doc, argv) {
    var arg = argv[1].trim();
    if (!arg.startsWith('\\')) {
      doc.currentCtx.output.error('mod:lentgh.InvalidCommandArgument', {value: arg}, "\\" + argv[0] + " (mod:length)");
      return null;
    }
    var name = arg.slice(1);
    var handler = doc.currentCtx.GetCommandHandler(doc, name);
    if (!handler || !handler.isDimensionHandler) {
      doc.currentCtx.output.error('mod:lentgh.UnrecognizedLengthName', {value: arg}, "\\" + argv[0] + " (mod:length)");
      return null;
    }
    return name;
  }

  /// @fn measureHtml(html)
  ///   指定した HTML を表示したときの width, height (baseline から上の高さ),
  ///   depth (baseline から下の高さ) を計算します。
  function measureHtml(html) {
    var scale = 100;

    var factory = document.createElement("div");
    var buff = [];
    buff.push('<tex:i style="position: absolute; z-index: -1; visibility: hidden; display: block; white-space: nowrap; vertical-align: baseline">');
    buff.push('<tex:i style="display: inline-block; vertical-align: baseline; width: 1em; height: 1px;"></tex:i>');
    buff.push('<tex:i style="display: inline-block; vertical-align: baseline;">', html, '</tex:i>');
    buff.push('</tex:i>');
    factory.innerHTML = buff.join("");
    var container = factory.firstChild;
    var mark = container.firstChild;
    var span = mark.nextSibling;

    document.body.appendChild(container);
    var em = mark.offsetWidth;
    var width  = (span.offsetWidth) / em;
    var height = (mark.offsetTop + 1) / em;
    var depth  = (span.offsetHeight - mark.offsetTop - 1) / em;

    if (em < scale) {
      /* font-size で拡大して高精度で決定する。
       *
       *   但し、等比拡大になっているときのみにする。
       *   内部で 1cm や 3mm などの絶対指定が含まれる場合、
       *   font-size でスケールしないので、font-size
       *   を変えて拡大して計測すると誤った結果になるため。
       */
      container.style.fontSize = scale + 'px';
      var e1 = mark.offsetWidth;
      var w1 = (span.offsetWidth) / e1;
      var h1 = (mark.offsetTop + 1) / e1;
      var d1 = (span.offsetHeight - mark.offsetTop - 1) / e1;
      if (Math.abs(w1 - width ) < 1 / em + 1 / e1) width  = w1;
      if (Math.abs(h1 - height) < 1 / em + 1 / e1) height = h1;
      if (Math.abs(d1 - depth ) < 1 / em + 1 / e1) depth  = d1;
    }

    document.body.removeChild(container);

    return {width: width, height: height, depth: depth};
  }

  _Ctx.DefineCommand({
    newdimen: ['f;#@1', function(doc, argv) {
      var lname = getNewLengthName(doc, argv);
      if (lname == null) return;
      doc.NewDimension(lname);
    }],
    newlength: ['f;#@1', function(doc, argv) {
      var lname = getNewLengthName(doc, argv);
      if (lname == null) return;
      doc.NewLength(lname);
    }],
    setlength: ['f;#@1#L', function(doc, argv) {
      if (argv[2] == null) return;
      var name = getLengthName(doc, argv);
      if (name) setLength(doc, name, argv[2]);
    }],
    addtolength: ['f;#@1#L', function(doc, argv) {
      if (argv[2] == null) return;
      var name = getLengthName(doc, argv);
      if (name) addToLength(doc, name, argv[2]);
    }],
    settowidth: ['f;#@1#>2', function(doc, argv) {
      var name = getLengthName(doc, argv);
      if (name == null) return;
      var metric = measureHtml(argv[2]);
      if (metric.width > 0) setLength(doc, name, new ns.Length(metric.width, 'em'));
    }],
    settoheight: ['f;#@1#>2', function(doc, argv) {
      var name = getLengthName(doc, argv);
      if (name == null) return;
      var metric = measureHtml(argv[2]);
      if (metric.height > 0) setLength(doc, name, new ns.Length(metric.height, 'em'));
    }],
    settodepth: ['f;#@1#>2', function(doc, argv) {
      var name = getLengthName(doc, argv);
      if (name == null) return;
      var metric = measureHtml(argv[2]);
      if (metric.depth > 0) setLength(doc, name, new ns.Length(metric.depth, 'em'));
    }],
    the: ['f;#@1', function(doc, argv) {
      argv[1] = argv[1].trim();
      if (!argv[1].startsWith('\\')) {
        doc.currentCtx.output.error('mod:lentgh.InvalidCommandArgument', {value: argv[1]}, "\\the (mod:length)");
        return;
      }

      var name = argv[1].slice(1);
      var handler = doc.currentCtx.GetCommandHandler(doc, name);
      if (handler) {
        if (handler.isDimensionHandler) {
          var data = doc.GetLengthData(name);

          // Note: join 時に文字列にされるとは言え、
          //   toString() で現在の値を固定する必要がある。
          doc.currentCtx.output.buff.push(data.toString(true));
          return;
        }
        // ToDo: \count など。
      }

      doc.currentCtx.output.error('mod:length.cmd:the.UnknownRegister', {value: argv[1]}, "\\the (mod:length)");
    }]
  });
}

})();

//-----------------------------------------------------------------------------
(function _aghtex_include_mod_common_js() { /* main.pp.js: included from .gen/mod_common.js */
// -*- mode: js; coding: utf-8 -*- (日本語)

/**
 *  mod_common
 *
 *    \begin{document}
 *    \documentclass, \documentstyle
 *    \usepackage
 *    \newcommand, \renewcommand, \let, \def, \gdef, \edef, \xdef, \global
 *
 *    \hspace, \hspace*, \vspace, \vspace*
 *    \ , \enskip, \/, \quad, \qquad, \phantom, \hphantom, \vphantom
 *    \hfill, \dotfill, \hrulefill
 *    \{, \}, \&, \%, \_, \$
 *    \P, \S, \dag, \ddag, \pounds, \copyright,
 *    \aa, \AA, \ae, \AE, \l, \L, \oe, \OE, \SS, \ss, \o, \O
 *    \TeX, \LaTeX, \LaTeXe
 *    \overline, \underline
 *    \textbar, \textemdash, \textendash, \textexclamdown, \textbullet,
 *    \textperiodcentered, \textquestiondown,
 *    \textquotedblleft, \textquotedblright, \textquoteleft, \textquoteright,
 *    \textregistered, \textvisiblespace, \texttrademark,
 *    \copyright, \lq, \rq,
 *
 *    \mbox, \string
 *    \aghtex@htag → \aghtexInternalHTag [改名]
 *
 *    not implemeneted: \special
 *
 *  @section 公開オブジェクト
 *    ※以下 mod_common = ns.Modules["mod:common"] とする。
 *    @fn mod_common.CreateCommandTagFollowing(tagName [, endTag])
 */

var mod_core = ns.Modules["core"];
var mod_base = ns.Modules["mod:base"];

agh.memcpy(mod_core.ErrorMessages, {
  'mod:common.cmd:newcommand.InvalidCommandName': [
    "\\newcommand InvalidCommandName",
    "the command name '{cmd}'is invalid. The name of the new command should have the form of '\\commandname'."],
  'mod:common.cmd:newcommand.InvalidNumberOfParams': [
    "\\newcommand InvalidNumberOfParams",
    "the second argument '{nparam}' should be an integer to specify the number of parameters of the new command/environemt."],
  // 'mod:common.cmd:newcommand.AlreadyDefined': [
  //   "\\newcommand AlreadyDefined",
  //   "the command '{cmd}'is already defined. if you want to overwrite the existing command, use \\renewcommand instead."],
  'mod:common.cmd:newcommand.AlreadyDefined': [
    "\\newcommand AlreadyDefined",
    "the specified command/environment '{cmd}' has already been defined somewhere\n"
      + "\\newcommand cannot override the existing commands/environments\n"
      + "you can override the existing commands with \\renewcommand, or the environments with \\renewenvironment"],
  'mod:common.cmd:renewcommand.NotYetDefined': [
    "{cmd}",
    "The specified command/environment '{cmd}' has not yet been defined anywhere. "
      + "\\renewcommand/\\renewenvironment should override existing commands/environments."
      + "You can declare new commands with \\newcommand, or new environments with \\newenvironment."],
  "mod:common.cmd:string.EndOfDocument": [
    '\\string EndOfDocument',
    "reached the end of document. An argument of \\string cannot be read."],
  'mod:common.cmd:framebox.UnknownAlignment': [
    'UnknownAlignment',
    "unknown alignment '{align}' in the second argument of the \\framebox"],
  'mod:common.cmd:special.NotImplemented': [
    "\\special","\\special{{{arg}}} is used, but not yet supported."],
  'mod:common.cmd:documentclass.UnknownClass': ["cls:{cls}","The document class named '{cls}' is not registered. Instead, the document class 'article' will be used."],
  'mod:common.cmd:documentclass.MultipleDocumentClasses': ["\\documentclass","\\documentclass cannot be specified twice.\n  @ \\documentclass"],
  'mod:common.cmd:usepackage.UnknownPackage': ["pkg:{pkg}","{pkg} という名前の package は登録されていません。"],
  'mod:common.cmd:usepackage.PackageException': [
    "pkg:{pkg} error","package '{pkg}' の初期化中に例外が発生しました。\r\n例外説明: {message}\r\n詳細に関しては aghtex 版 package の作成者に問い合わせて下さい。"],
  'mod:common.cmd:let.InvalidCommandName': ["\\let#1 invalid","'{cmd}' is not a valid command name."],
  'mod:common.cmd:let.UnknownCommand': ["\\let#2 undefined","A definition of the second argument, '\\{cmd}', cannot be found."],
  'mod:common.cmd:def.InvalidCommandName': ["\\{defcmd} InvalidCommandName","{cmdname} は不適切なコマンド名です。\r\n新しいコマンドの名前は \\commandname の形式で指定して下さい。"],
  'mod:common.cmd:hbox.MissingContent': ["\\hbox","the content of \\hbox, which should begin with '{', is missing."]
});

var _Mod = ns.Modules["mod:common"] = {};
_Mod.CreateCommandTagFollowing = function(htBegin, htEnd) {
  return ns.Command2('f', null, function(doc, argv) {
    var output = doc.currentCtx.output;
    output.buff.push(htBegin);
    output.appendPost(htEnd);
  });
};

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("global");
  var _CtxName="global";
  var CTXV_FOOTNOTE = 'mod_ref/footnote';
  _Ctx.AddEnvironment("document", {
    prologue: function(doc, ctx) {
      ctx.SetContextVariable(CTXV_FOOTNOTE, new ns.Writer());
    },
    epilogue: function(doc, ctx) {
      ns.Modules["mod:ref"].WriteFootnote(doc.currentCtx.output, ctx);
    },
    context: "mode.para"
  });

  // \documentclass
  _Ctx.DefineCommand({"documentclass":['f;#[]1#2',function(doc,argv){
    var opt = argv[1].trim();
    var cls = argv[2].trim();
    var ch = ns.Document.Classes[cls];
    if (ch == null) {
      doc.currentCtx.output.error('mod:common.cmd:documentclass.UnknownClass', {cls: cls}, 'mod:common.cmd:documentclass');
      ch = ns.Document.Classes["default"]; // default
      if (ch == null) return;
    }
    ch(doc, opt, cls);

    doc.currentCtx.AddCommandHandler("documentclass", function(doc) {
      doc.scanner.Next();
      doc.currentCtx.output.error('mod:common.cmd:documentclass.MultipleDocumentClasses', null, 'mod:common.cmd:documentclass');
    });
  }]});
  _Ctx.AddCommandHandler("documentstyle", _Ctx.handlerC["documentclass"]); // For older version of TeX

  _Ctx.DefineCommand({"usepackage":['f;#[]@1#@2',function(doc,argv){
    var opt = argv[1];
    var pkgs = argv[2].split(',');
    for (var i = 0, iN = pkgs.length; i < iN; i++) {
      var pkg = pkgs[i].trim();
      var handler = ns.Document.Packages[pkg];
      if (handler == null) {
        doc.currentCtx.output.error('mod:common.cmd:usepackage.UnknownPackage', {pkg: pkg}, 'mod:common.cmd:usepackage');
        continue;
      }

      // package 初期化
      try {
        handler(doc, opt, pkg);
      } catch(e) {
        var message = e == null ? "?" : (typeof e == "object") && ("message" in e) ? e.message : e.toString();
        doc.currentCtx.output.error('mod:common.cmd:usepackage.PackageException', {pkg: pkg, message: message}, 'mod:common.cmd:usepackage');
      }
    }
  }]});

  // \newcommmand, \renewcommand
  //----------------------------------------------------------------
  function getExistingCommandHandler(doc, name) {
    return doc.currentCtx.GetCommandHandler(doc, name) ||
      doc.context_cast("mode.para").GetCommandHandler(doc, name) ||
      doc.context_cast("mode.math").GetCommandHandler(doc, name);
  }

  _Ctx.DefineCommand({"newcommand":['f;#1#[0]!2#[\\@mwgnoarg]3#4',function(doc,argv){
    // コマンド名
    var name=argv[1].trim();
    if (name.substr(0, 1) != "\\") {
      doc.currentCtx.output.error(
        'mod:common.cmd:newcommand.InvalidCommandName', {cmd: name},
        '\\newcommand @ mod:common');
      return;
    } else
      name = name.substr(1);

    // 引数の数
    var argN = 0;
    try {
      argN = parseInt(argv[2]);
    } catch(e) {
      doc.currentCtx.output.error(
        'mod:common.cmd:newcommand.InvalidNumberOfParams', {nparam: argv[2]},
        '\\newcommand @ mod:common');
      return;
    }

    // 既定の引数
    var optional = argv[3];
    var arg_def = "";
    if (argN > 0) {
      if (optional != "\\@mwgnoarg") {
        arg_def = "#[" + optional + "]1";
      } else {
        arg_def = "#1";
      }

      for (var i = 2; i <= argN; i++)
        arg_def += "#" + i;
    }

    // 定義内容
    var def = argv[4];

    // コマンドの上書きをできないようにする
    switch (argv[0]) {
    case "newcommand":
      if (doc.currentCtx.GetCommandHandler(doc,name) != null) {
        doc.currentCtx.output.error(
          'mod:common.cmd:newcommand.AlreadyDefined', {cmd: name},
          '\\newcommand @ mod:common');
        return;
      }
      break;
    case "renewcommand":
      if (getExistingCommandHandler(doc,name) == null) {
        doc.currentCtx.output.error(
          'mod:common.cmd:renewcommand.NotYetDefined',{cmd: '\\' + name},
          '\\renewcommand @ mod:common');
        return;
      }
      break;
    case "providecommand":
      if (getExistingCommandHandler(doc,name) != null) return;
      break;
    }

    doc.SetMacroHandler(name, new ns.Command2("m", arg_def, def));
  }]});

  _Ctx.AddCommandHandler("renewcommand", _Ctx.handlerC["newcommand"]);
  _Ctx.AddCommandHandler("providecommand", _Ctx.handlerC["newcommand"]);

  _Ctx.DefineCommand({"let":['f;#1#2',function(doc,argv){
    var cmd1 = argv[1].trim();
    if (cmd1.substr(0, 1) != '\\') {
      doc.currentCtx.output.error('mod:common.cmd:let.InvalidCommandName', {cmd: cmd1}, 'mod:common.cmd:let');
      return;
    }
    cmd1 = cmd1.slice(1);

    var cmd2 = argv[2].trim();
    if (cmd2 == '=')
      cmd2 = doc.ReadArgument('raw', false, null).trim();
    if (cmd2.substr(0, 1) == '\\') {
      cmd2 = cmd2.slice(1);

      var h = getExistingCommandHandler(doc, cmd2);
      if (h == null) {
        doc.currentCtx.output.error('mod:common.cmd:let.UnknownCommand', {cmd: cmd2}, 'mod:common.cmd:let');
        return;
      }

      doc.SetMacroHandler(cmd1, h);
    } else {
      doc.SetMacroHandler(cmd1, new ns.Command2("m", null, cmd2));
    }
  }]});

  function getCommandName(doc, argv) {
    var name = argv[1].trim();
    if (name.substr(0, 1) != "\\") {
      doc.currentCtx.output.error('mod:common.cmd:def.InvalidCommandName', {defcmd: argv[0], cmdname: name}, 'mod:common.cmd:' + argv[0]);
      return null;
    } else
      name = name.substr(1);
    return name;
  }

  function cmd_def(doc, argv, isGlobal) {
    var name = getCommandName(doc, argv);
    if (name == null) return;

    doc.SetMacroHandler(name, new ns.Command2("m", argv[2], argv[3]), isGlobal);
  }
  function cmd_edef(doc, argv, isGlobal) {
    var name = getCommandName(doc, argv);
    if (name == null) return;

    doc.SetMacroHandler(name, new ns.Command2("m@", argv[2], argv[3]), isGlobal);
  }
  _Ctx.DefineCommand({"def":['f;#1#2{#3}',function(doc,argv){ cmd_def(doc, argv, false); }]});
  _Ctx.DefineCommand({"gdef":['f;#1#2{#3}',function(doc,argv){ cmd_def(doc, argv, true ); }]});
  _Ctx.DefineCommand({"edef":['f;#1#2{#>3}',function(doc,argv){ cmd_edef(doc, argv, false); }]});
  _Ctx.DefineCommand({"xdef":['f;#1#2{#>3}',function(doc,argv){ cmd_edef(doc, argv, true ); }]});

  // マクログローバル定義
  _Ctx.DefineCommand({"global":['f',function(doc,argv){
    doc.pushFlags();
    doc.flags['mod:common/global'] = true; // \let, \def, \edef, etc
    //■TODO: \count, \countdef

    // 続くコマンドを引数として読み取り
    doc.currentCtx.output.buff.push(
      doc.GetArgumentHtml(doc.currentCtx, true));

    doc.popFlags();
  }]});

  _Ctx.DefineCommand({"newenvironment":['f;#!1#[]!2#[\\agh@noarg]3#4#5',function(doc,argv){
    var envname = argv[1];

    // 引数の数
    var nparam = 0;
    if (argv[2] != "") {
      try {
        nparam = parseInt(argv[2]);
      } catch(e) {
        doc.currentCtx.output.error(
          'mod:common.cmd:newcommand.InvalidNumberOfParams', {nparam: argv[2]},
          '\\newenvironment @ mod:common');
        return;
      }
    }

    var argdef = '';
    if (nparam > 0) {
      argdef += argv[3] == '\\agh@noarg' ? '#1' : '#[]1';
      for (var i = 1; i < nparam; i++)
        argdef += '#' + (i + 1);
    }

    var definition = argv[4] + '#0' + argv[5];

    // 上書き確認

    switch (argv[0]) {
    case "newenvironment":
      if (doc.currentCtx.GetEnvironment(envname) != null) {
        doc.currentCtx.output.error(
          'mod:common.cmd:newcommand.AlreadyDefined', {cmd: envname},
          '\\newenvironment @ mod:common');
        return;
      }
      break;
    case "renewenvironment":
      if (doc.currentCtx.GetEnvironment(envname) == null) {
        doc.currentCtx.output.error(
          'mod:common.cmd:newcommand.NotYetDefined', {cmd: envname},
          '\\renewenvironment @ mod:common');
        return;
      }
      break;
    }

    if (argv[0] != "renewenvironment" && doc.currentCtx.GetEnvironment(envname) != null) {
      doc.currentCtx.output.error(
        'mod:common.cmd:newcommand.AlreadyDefined', {cmd: envname},
        '\\newenvironment @ mod:common');
      return;
    }

    // 全体に適用される。現在のスコープ内だけで使える様にするべきか?
    doc.context_cast("global").AddEnvironment(envname, ns.Environment.CreateDynamicEnvironment('m', argdef, argv[4], argv[5], null));
  }]});
  _Ctx.AddCommandHandler("renewenvironment", _Ctx.handlerC["newenvironment"]);

  //---------------------------------------------------------------------------

  _Ctx.DefineCommand({
    relax: mod_base["cmd:relax"]
  });

  //---------------------------------------------------------------------------
  // 空白・改行

  _Ctx.DefineCommand({"hspace":['s@;#D','<tex:i style="padding-right:#1;"></tex:i>']});
  _Ctx.DefineCommand({"hspace*":['s@;#D','<tex:i style="padding-right:#1;"></tex:i>']});
  _Ctx.DefineCommand({"vspace":['s@;#D','<p class="aghtex-vspace" style="font-size:#1">&nbsp;</p>']});
  _Ctx.DefineCommand({"vspace*":['s@;#D','<p class="aghtex-vspace" style="font-size:#1">&nbsp;</p>']});

  _Ctx.DefineCommand({"enspace":['s>','\\hspace{0.5em}']}); // from plain-TeX, kerning

  _Ctx.DefineCommand({" ":['s@','&nbsp;']});
  _Ctx.DefineCommand({"enskip":['s@','&nbsp;']});
  _Ctx.DefineCommand({"/":['s@','<tex:i class="aghtex-hspace-slash"></tex:i>']});
  _Ctx.DefineCommand({"quad":['s@','<tex:i class="aghtex-hspace-quad"></tex:i>']});
  _Ctx.DefineCommand({"qquad":['s@','<tex:i class="aghtex-hspace-qquad"></tex:i>']});
  _Ctx.DefineCommand({"phantom":['s@;#>1','<tex:i class="aghtex-phantom">#1</tex:i>']});
  _Ctx.DefineCommand({"hphantom":['s@;#>1','<tex:i class="aghtex-hphantom">#1</tex:i>']});
  _Ctx.DefineCommand({"vphantom":['f;#[]!1#>2',function(doc,argv){
    var className = 'aghtex-vphantom';
    switch (argv[1]) {
    case 't': className = 'aghtex-vphantom-top';    break;
    case 'b': className = 'aghtex-vphantom-bottom'; break;
    case 'm': className = 'aghtex-vphantom-middle'; break;
    case '': break;
    default:
      doc.currentCtx.output.error('mod:common.cmd:vphantom.UnrecogizedAlign', null, '\\vphantom (mod:common)');
      break;
    }
    doc.currentCtx.output.buff.push(
      '<tex:i class="', className, '"><tex:i class="aghtex-vphantom-inner">', argv[2], '</tex:i></tex:i>');
  }]});

  _Ctx.DefineCommand({"hfill":['s@','<tex:i class="aghtex-hfill"></tex:i>']});
  _Ctx.DefineCommand({"dotfill":['s@','<tex:i class="aghtex-hfill-dot"></tex:i>']});
  _Ctx.DefineCommand({"hrulefill":['s@','<tex:i class="aghtex-hfill-rule"></tex:i>']});

  // 特殊記号
  _Ctx.DefineCommand({"{":['s@',"{"]});
  _Ctx.DefineCommand({"}":['s@',"}"]});
  _Ctx.DefineCommand({"&":['s@',"&amp;"]});
  _Ctx.DefineCommand({"%":['s@',"%"]});
  _Ctx.DefineCommand({"_":['s@',"_"]});
  _Ctx.DefineCommand({"$":['s@',"$"]});
  _Ctx.DefineCommand({"#":['s@',"#"]});

  // その他の記号
  _Ctx.DefineCommand({"P":['s@','¶']});
  _Ctx.DefineCommand({"S":['s@','§']});
  _Ctx.DefineCommand({"dag":['s@','<tex:fcent>†</tex:fcent>']});
  _Ctx.DefineCommand({"ddag":['s@','<tex:fcent>‡</tex:fcent>']});
  _Ctx.DefineCommand({"pounds":['s@','<tex:fcent><i>￡</i></tex:fcent>']});
  _Ctx.DefineCommand({"copyright":['s@','&#xa9;']});
  _Ctx.DefineCommand({"aa":['s@','&#xE5;']});  // å
  _Ctx.DefineCommand({"AA":['s@','&#xC5;']});  // Å
  _Ctx.DefineCommand({"ae":['s@','&#xE6;']});  // æ
  _Ctx.DefineCommand({"AE":['s@','&#xC6;']});  // Æ
  _Ctx.DefineCommand({"l":['s@','&#x142;']}); // ł
  _Ctx.DefineCommand({"L":['s@','&#x141;']}); // Ł
  _Ctx.DefineCommand({"oe":['s@','&#x153;']}); // œ
  _Ctx.DefineCommand({"OE":['s@','&#x152;']}); // Œ
  _Ctx.DefineCommand({"SS":['s@','&#xDF;']});  // ß
  _Ctx.DefineCommand({"ss":['s@','&#xDF;']});  // ß
  _Ctx.DefineCommand({"o":['s@','&#xF8;']});  // ø
  _Ctx.DefineCommand({"O":['s@','&#xD8;']});  // Ø

  // TeX
  _Ctx.DefineCommand({"TeX":['s@','<tex:TeX>T<span>E</span>X</tex:TeX>']});
  _Ctx.DefineCommand({"LaTeX":['s@','<tex:La>L<span>A</span></tex:La><tex:TeX>T<span>E</span>X</tex:TeX>']});
  _Ctx.DefineCommand({"LaTeXe":['s@','<tex:La>L<span>A</span></tex:La><tex:TeX>T<span>E</span>X</tex:TeX>2<span style=\'vertical-align:-10%;\'>ε</span>']});

  // 特別な文字
  _Ctx.DefineCommand({"copyright":['s@','<tex:f class="aghtex-textrm">©</tex:f>']}); // u00A9

  // \text/math... 記号
  //   元々 text-mode 用だが、期せずして math-mode でも表示できる物。
  //   正しく表示できない \text... 記号は mod_para.ctx で定義。
  _Ctx.DefineCommand({"textregistered":['s@','<tex:f class="aghtex-textrm">®</tex:f>']}); // u00AE
  _Ctx.DefineCommand({"texttrademark":['s@','<tex:f class="aghtex-textrm">™</tex:f>']}); // u2122
  _Ctx.DefineCommand({"textvisiblespace":['s@','<tex:f class="aghtex-textmr">␣</tex:f>']}); // u2423 (■ XP IE6 では表示できない)
  _Ctx.DefineCommand({"textcopyright":['s@','&copy;']});
  _Ctx.DefineCommand({"textellipsis":['s@','<tex:f lang="en">…</tex:f>']});
  _Ctx.DefineCommand({"textless":['s@','&lt;']});
  _Ctx.DefineCommand({"textgreater":['s@','&gt;']});
  _Ctx.DefineCommand({"textunderscore":['s@','_']});
  _Ctx.DefineCommand({"textordfeminine":['s@','&#x00aa;']});
  _Ctx.DefineCommand({"textordmasculine":['s@','&#x00ba;']});
  _Ctx.DefineCommand({"mathunderscore":['s@','<tex:f class="aghtex-symb-mincho">_</tex:f>']});

  _Ctx.DefineCommand({"lq":['s@',"`"]});
  _Ctx.DefineCommand({"rq":['s@',"'"]});

  // 書式
  _Ctx.DefineCommand({"overline":['s@;#>1','<tex:i class="aghtex-overline">#1</tex:i>']});
  _Ctx.DefineCommand({"underline":['s@;#>1','<tex:i class="aghtex-underline">#1</tex:i>']});

  //---------------------------------------------------------------------------
  // \mbox
  _Ctx.DefineCommand({"mbox":['s@;#mode.lr>1','<tex:i class="aghtex-hbox">#1</tex:i>']});
  _Ctx.DefineCommand({"fbox":['s@;#mode.lr>1','<tex:i class="aghtex-hbox aghtex-hbox-fbox">#1</tex:i>']});
  _Ctx.DefineCommand({"frame":['s@;#mode.lr>1','<tex:i class="aghtex-hbox aghtex-hbox-frame">#1</tex:i>']});
  _Ctx.DefineCommand({"framebox":['f;#[]!1#[c]!2#mode.lr>3',function(doc,argv){
    // #L1 (dimen)
    if (argv[1] != "") {
      var align = {l: 'left', r: 'right', c: 'center'}[argv[2]];
      if (align == null) {
        doc.currentCtx.output.error('mod:common.cmd:framebox.UnknownAlignment', {align: argv[2]}, '\\framebox (mod:common)');
        align = center;
      }

      doc.currentCtx.output.buff.push(
        '<tex:i class="aghtex-hbox aghtex-hbox-frame" style="width:',
        agh.Text.Escape(argv[1], "html-attr"),
        ';text-align:', align, '">', argv[3], '</tex:i>');
    } else
      doc.currentCtx.output.buff.push('<tex:i class="aghtex-hbox aghtex-hbox-frame">', argv[3], '</tex:i>');
  }]});
  // TODO \makebox
  // TODO \parbox

  _Ctx.DefineCommand({
    hbox: ['f', function(doc, argv){
      // 以下の二つの形式の内の何れか ({} は必要である)。
      //   \hbox { content }
      //   \hbox to dimension { content }

      /*
       * 制限: この実装では to がマクロで分断されている場合には対応していない。
       * 例えば、\def\O{o} \hbox t\O 1cm {content} は to をひとまとまりとして認識できない。
       */

      var buff = doc.currentCtx.output.buff;

      // \hbox の次の単語が to のとき、dimension を読み取って幅とする。
      var dimen = null;
      doc.skipSpaceAndCommentExpandingMacro();
      if (doc.scanner.wordtype === mod_core.SCAN_WT_TXT && /^to/.test(doc.scanner.word)) {
        if (doc.scanner.word === "to")
          doc.scanner.Next();
        else
          doc.scanner.word = doc.scanner.word.slice(2);
        dimen = doc.ReadDimension();
        doc.skipSpaceAndCommentExpandingMacro();
      }
      if (dimen)
        buff.push('<tex:i class="aghtex-hbox aghtex-hbox-width" style="margin-right: ', dimen.toString(), ';">');
      else
        buff.push('<tex:i class="aghtex-hbox">');

      if (!doc.scanner.is(mod_core.SCAN_WT_LTR, "{")) {
        doc.currentCtx.output.error('mod:common.cmd:hbox.MissingContent', null, '\\hbox (mod:common)');
      } else {
        var content = doc.GetArgumentHtml("mode.lr");
        buff.push(content);
      }

      buff.push('</tex:i>');
    }],

    string: ['f', function(doc, argv) {
      doc.skipSpaceAndComment();

      var text = "";
      switch (doc.scanner.wordtype) {
      case mod_core.SCAN_WT_CMD:
        text = "\\" + doc.scanner.word;
        doc.scanner.Next();
        break;
      case mod_core.SCAN_WT_LTR:
        text = doc.scanner.word;
        doc.scanner.Next();
        break;
      case mod_core.SCAN_WT_TXT:
        text = doc.scanner.ClipFirstFromTxt();
        break;
      case mod_core.SCAN_WT_LTR:
        if (doc.scanner.word !== "EOF") {
          text = doc.scanner.word;
          doc.scanner.Next();
          break;
        }
        /* FALL-THROUGH */
      default:
        doc.currentCtx.output.error(
          "mod:common.cmd:string.EndOfDocument",
          null, "\\string (mod:common/global)");
        return;
      }

      doc.currentCtx.output.buff.push(agh.Text.Escape(text, 'html'));
    }]
  });

  _Ctx.DefineCommand({"special":['f;#1',function(doc,argv){
    doc.currentCtx.output.error('mod:common.cmd:special.NotImplemented', {arg: argv[1]}, "\\special (mod:common)");
  }]});

  //---------------------------------------------------------------------------

  _Ctx.DefineCommand({"aghtexInternalHTag":['f;[#!1]#>2',function(doc,argv){
    var buff = doc.currentCtx.output.buff;

    var tag = 'tex:i';
    var cls = null;
    argv[1].replace(/^(\w[\-:_\w]*)?(?:\.([\-:_\w]+))?/, function($0, $1, $2) {
      if ($1 != null && $1 != "" && $1.toLowerCase() != 'script')
        tag = $1;
      if ($2 != null && $2 != "")
        cls = $2;
    });
    var content = argv[2];

    buff.push('<', tag);
    if (cls != null && cls.length>0) {
      buff.push(' class="', cls, '">');
    } else {
      buff.push('>');
    }
    buff.push(content, '</', tag, '>');
  }]});
}

})();
//-----------------------------------------------------------------------------
(function _aghtex_include_mod_math_js() { /* main.pp.js: included from .gen/mod_math.js */
// -*- mode:js;coding:utf-8 -*- (日本語)

/**
 *  mod_math
 *
 *  @section 公開オブジェクト
 *    ※以下 mod_math = ns.Modules["mod:math"] とする。
 *
 *    @fn mod_math.CreateCommandOverStretch({commandName, imageSrc, svg});
 *    @fn mod_math.CreateCommandUnderStretch({commandName, imageSrc, svg});
 *    @fn mod_math.CreateCommandSummation(content);
 *    @fn mod_math.CreateAccentCommandQksB(height,htSymbol);
 *    @fn mod_math.CreateAccentCommand(type,htsymb,ismath);
 *    @fn mod_math.OutputOverbrace(buff,content,image,undertxt)
 *    @fn mod_math.OutputUnderbrace(buff,content,image,undertxt)
 *    @fn mod_math.OutputSupSubScripts(buff, sup, sub)
 */

var mod_core = ns.Modules["core"];
var mod_base = ns.Modules["mod:base"];
var mod_common = ns.Modules["mod:common"];
var _Mod = ns.Modules["mod:math"] = {};

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("mode.math");
  var _CtxName="mode.math";

  //---------------------------------------------------------------
  // 数式スタイル

  _Mod.MATHSTYLE_DISPLAY = 0;
  _Mod.MATHSTYLE_TEXT    = 1;
  _Mod.MATHSTYLE_SCRIPT  = 2;
  _Mod.MATHSTYLE_SCRIPT2 = 3;
  _Mod.GetMathStyle = function mod_math_GetMathStyle(doc) {
    return doc.GetContextVariable('mathstyle');
  };

  _Ctx.DefineCommand({"displaystyle":['f',function(doc,argv){
    doc.SetContextVariable("mathstyle", _Mod.MATHSTYLE_DISPLAY);
  }]});
  _Ctx.DefineCommand({"textstyle":['f',function(doc,argv){
    doc.SetContextVariable("mathstyle", _Mod.MATHSTYLE_TEXT);
  }]});
  _Ctx.DefineCommand({"scriptstyle":['f',function(doc,argv){
    doc.SetContextVariable("mathstyle", _Mod.MATHSTYLE_SCRIPT);

    var output = doc.currentCtx.output;
    output.buff.push('<tex:fsize class="aghtex-default"><tex:fsize class="aghtex-script">');
    output.appendPost('</tex:fsize></tex:fsize>');
  }]});
  _Ctx.DefineCommand({"scriptscriptstyle":['f',function(doc,argv){
    doc.SetContextVariable("mathstyle", _Mod.MATHSTYLE_SCRIPT2);

    var output=doc.currentCtx.output;
    output.buff.push('<tex:fsize class="aghtex-default"><tex:fsize class="aghtex-scriptscript">');
    output.appendPost('</tex:fsize></tex:fsize>');
  }]});

  //---------------------------------------------------------------
  //    字体
  //---------------------------------------------------------------

  _Ctx.DefineCommand({
    bf : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-mathbf">' , '</tex:f>'),
    it : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-mathit">' , '</tex:f>'),
    rm : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-mathrm">' , '</tex:f>'),
    sf : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-mathsf">' , '</tex:f>'),
    tt : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-mathtt">' , '</tex:f>'),
    cal: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-mathcal">', '</tex:f>'),

    // - 以下は数式モードでは効果無し。
    mc          : mod_base["cmd:relax"],
    gt          : mod_base["cmd:relax"],
    normalfont  : mod_base["cmd:relax"],
    tiny        : mod_base["cmd:relax"],
    scriptsize  : mod_base["cmd:relax"],
    footnotesize: mod_base["cmd:relax"],
    small       : mod_base["cmd:relax"],
    normalsize  : mod_base["cmd:relax"],
    large       : mod_base["cmd:relax"],
    Large       : mod_base["cmd:relax"],
    LARGE       : mod_base["cmd:relax"],
    huge        : mod_base["cmd:relax"],
    Huge        : mod_base["cmd:relax"],

    // - 以下は文章モードに移行して評価
    text  : ['s@;#mode.para>1', '<tex:f class="aghtex-textrm">#1</tex:f>'], // 文章モードはデフォルトで roman で良いか?
    textrm: ['s@;#mode.para>1', '<tex:f class="aghtex-textrm">#1</tex:f>'],
    textsf: ['s@;#mode.para>1', '<tex:f class="aghtex-textsf">#1</tex:f>'],
    texttt: ['s@;#mode.para>1', '<tex:f class="aghtex-texttt">#1</tex:f>'],
    textmc: ['s@;#mode.para>1', '<tex:f class="aghtex-textrm">#1</tex:f>'],
    textgt: ['s@;#mode.para>1', '<tex:f class="aghtex-textgt">#1</tex:f>'],
    textmd: ['s@;#mode.para>1', '<tex:f class="aghtex-textmd">#1</tex:f>'],
    textbf: ['s@;#mode.para>1', '<tex:f class="aghtex-textbf">#1</tex:f>'],
    textup: ['s@;#mode.para>1', '<tex:f class="aghtex-textup">#1</tex:f>'],
    textit: ['s@;#mode.para>1', '<tex:f class="aghtex-textit">#1</tex:f>'],
    textsc: ['s@;#mode.para>1', '<tex:f class="aghtex-textsc">#1</tex:f>'],
    textsl: ['s@;#mode.para>1', '<tex:f class="aghtex-textsl">#1</tex:f>'],

    mathbf    : ['s@;#>1', '<tex:f class="aghtex-mathbf">#1</tex:f>'],
    mathit    : ['s@;#>1', '<tex:f class="aghtex-mathit">#1</tex:f>'],
    mathrm    : ['s@;#>1', '<tex:f class="aghtex-mathrm">#1</tex:f>'],
    mathsf    : ['s@;#>1', '<tex:f class="aghtex-mathsf">#1</tex:f>'],
    mathtt    : ['s@;#>1', '<tex:f class="aghtex-mathtt">#1</tex:f>'],
    mathnormal: ['s@;#>1', '<tex:f class="aghtex-mathit">#1</tex:f>'],
    mathcal   : ['s@;#>1', '<tex:f class="aghtex-mathcal">#1</tex:f>'],

  });

  // 括弧の大きさ

  var create_big_delimiter_with_supsub = function(size, lmr) {
    return ns.Command2("f", "#>1", function(doc, args) {
      var sbsp = doc.GetSubSup();

      // 上付き・下付きがある時は右側の空白は無効にする。
      if (sbsp.sup || sbsp.sub) {
        switch (lmr) {
        case 'bigr': lmr = null; break;
        case 'bigm': lmr = 'bigl'; break;
        }
      }

      var buff = doc.currentCtx.output.buff;
      if (lmr) buff.push('<tex:i class="aghtex-', lmr, '">');
      buff.push('<tex:i class="aghtex-', size, '">', args[1], '</tex:i>');
      if (lmr) buff.push('</tex:i>');
      _Mod.OutputSupSubScripts(doc, sbsp.sup, sbsp.sub, size);
    });
  };

  _Ctx.DefineCommand({
    big  : create_big_delimiter_with_supsub('big1', null),
    Big  : create_big_delimiter_with_supsub('big2', null),
    bigg : create_big_delimiter_with_supsub('big3', null),
    Bigg : create_big_delimiter_with_supsub('big4', null),
    bigl : create_big_delimiter_with_supsub('big1', 'bigl'),
    Bigl : create_big_delimiter_with_supsub('big2', 'bigl'),
    biggl: create_big_delimiter_with_supsub('big3', 'bigl'),
    Biggl: create_big_delimiter_with_supsub('big4', 'bigl'),
    bigr : create_big_delimiter_with_supsub('big1', 'bigr'),
    Bigr : create_big_delimiter_with_supsub('big2', 'bigr'),
    biggr: create_big_delimiter_with_supsub('big3', 'bigr'),
    Biggr: create_big_delimiter_with_supsub('big4', 'bigr'),
    bigm : create_big_delimiter_with_supsub('big1', 'bigm'),
    Bigm : create_big_delimiter_with_supsub('big2', 'bigm'),
    biggm: create_big_delimiter_with_supsub('big3', 'bigm'),
    Biggm: create_big_delimiter_with_supsub('big4', 'bigm')
  });

  //---------------------------------------------------------------
  //    特殊文字
  //---------------------------------------------------------------

  // 空白は出力しない
  _Ctx.DefineLetter({' \b\t\v\r\n\f':['s@',""]});

  // 調整付の通常文字
  _Ctx.DefineLetter({"+":['s@','<tex:f class="aghtex-binop aghtex-symb-gothic">＋</tex:f>']});
  _Ctx.DefineLetter({"-":['s@','<tex:f class="aghtex-binop aghtex-symb-gothic">－</tex:f>']});
  _Ctx.DefineLetter({"=":['s@','<tex:f class="aghtex-binop aghtex-symb-gothic">＝</tex:f>']});
  _Ctx.DefineLetter({"/":['s@','<tex:f class="aghtex-binop aghtex-symb-gothic aghtex-big-variant">/</tex:f>']});

  // 数式フォントで再定義
  _Ctx.DefineLetter({'[':['s@','<tex:f class="aghtex-lbrace aghtex-symb-gothic aghtex-big-variant">[</tex:f>']});
  _Ctx.DefineLetter({']':['s@','<tex:f class="aghtex-rbrace aghtex-symb-gothic aghtex-big-variant">]</tex:f>']});
  _Ctx.DefineLetter({'(':['s@','<tex:f class="aghtex-lbrace aghtex-symb-gothic aghtex-big-variant">(</tex:f>']});
  _Ctx.DefineLetter({')':['s@','<tex:f class="aghtex-rbrace aghtex-symb-gothic aghtex-big-variant">)</tex:f>']});
  _Ctx.DefineCommand({"{":['s@','<tex:f class="aghtex-lbrace aghtex-symb-gothic aghtex-big-variant">{</tex:f>']});
  _Ctx.DefineCommand({"}":['s@','<tex:f class="aghtex-rbrace aghtex-symb-gothic aghtex-big-variant">}</tex:f>']});
  _Ctx.DefineCommand({"&":['s@','<tex:f class="aghtex-symb-gothic">&amp;</tex:f>']});
  _Ctx.DefineCommand({"%":['s@','<tex:f class="aghtex-symb-gothic">%</tex:f>']});
  _Ctx.DefineCommand({"_":['s@','<tex:f class="aghtex-symb-gothic">_</tex:f>']});
  _Ctx.DefineCommand({"$":['s@','<tex:f class="aghtex-symb-gothic">$</tex:f>']});
  _Ctx.DefineCommand({"#":['s@','<tex:f class="aghtex-symb-gothic">#</tex:f>']});
  _Ctx.DefineCommand({"P":['s@','<tex:f class="aghtex-symb-gothic">¶</tex:f>']}); // paragraph
  _Ctx.DefineCommand({"S":['s@','<tex:f class="aghtex-symb-gothic">§</tex:f>']}); // section
  _Ctx.DefineCommand({"dag":['s@','<tex:f class="aghtex-symb-cent">†</tex:f>']}); // dagger
  _Ctx.DefineCommand({"ddag":['s@','<tex:f class="aghtex-symb-cent">‡</tex:f>']}); // ddagger

  _Ctx.DefineLetter({">":['s@','<tex:f class="aghtex-binop aghtex-symb-roman">&gt;</tex:f>']});
  _Ctx.DefineLetter({"<":['s@','<tex:f class="aghtex-binop aghtex-symb-roman">&lt;</tex:f>']});
  _Ctx.DefineLetter({"|":['s@','<tex:f class="aghtex-symb-gothic">|</tex:f>']});
  _Ctx.DefineLetter({":":['f@',function(doc,cmdName){
    doc.scanner.Next();
    if (doc.scanner.is(mod_core.SCAN_WT_LTR,"=")) {
      //doc.currentCtx.output.buff.push('<tex:f class="aghtex-binop aghtex-symb-gothic">:＝</tex:f>');
      doc.currentCtx.output.buff.push('<tex:f class="aghtex-binop aghtex-symb-gothic">&#x2254;</tex:f>');
      doc.scanner.Next();
    } else {
      doc.currentCtx.output.buff.push(":");
    }
  }]});
  _Ctx.DefineLetter({",":['s@','<tex:f class="aghtex-symb-roman aghtex-comma">,</tex:f>']});
  _Ctx.DefineLetter({".":['f@',function(doc,cmdName){
    var html = cmdName;
    doc.scanner.Next();
    if (doc.scanner.wordtype == mod_core.SCAN_WT_LTR && " \b\t\v\r\n\f".indexOf(doc.scanner.word) >= 0) {
      html='<tex:f class="aghtex-comma">'+html+'</tex:f>';
      doc.scanner.Next();
    }
    doc.currentCtx.output.buff.push(html);
  }]});

  // 空白
  _Ctx.DefineCommand({",":['s>',"\\hspace{0.4ex}"]});  // \hspace{1\thinmuskip}
  _Ctx.DefineCommand({":":['s>',"\\hspace{0.53ex}"]}); // \hspace{1\medmuskip}
  _Ctx.DefineCommand({">":['s>',"\\hspace{0.60ex}"]}); // \hspace{1\medmuskip}
  _Ctx.DefineCommand({";":['s>',"\\hspace{0.67ex}"]}); // \hspace{1\thickmuskip}
  _Ctx.DefineLetter({"~":['s>',"\\hspace{1ex}"]});
  if (agh.browser.vIE < 7) {
    _Ctx.DefineCommand({"!":['s@','<tex:i class="aghtex-negative-space-ie6">&nbsp;&nbsp;</tex:i>&nbsp;']});
  } else {
    _Ctx.DefineCommand({"!":['s@','<tex:i class="aghtex-negative-space"></tex:i>']});
  }

  _Ctx.DefineCommand({"allowbreak":['s@','<tex:i class="aghtex-latex-allowbreak"></tex:i>']});

  // letter

  if (agh.browser.vIE <= 6 || ns.compatMode == "IE-qks") {
    _Ctx.DefineLetter({"^":['s@;#>1','<tex:i class="aghtex-sup aghtex-tag-script"><tex:i class="aghtex-sup-nest">#1</tex:i></tex:i>']});
    _Ctx.DefineLetter({"_":['s@;#>1','<tex:i class="aghtex-sub aghtex-tag-script">#1</tex:i>']});
    var output_supsub_scripts = function(doc, sup, sub, size) {
      var buff = doc.currentCtx.output.buff;
      if (sub !== null) {
        var cls = size ? ' aghtex-sub-' + size : '';
        buff.push('<tex:i class="aghtex-sub', cls, ' aghtex-tag-script">', sub, '</tex:i>');
      } else if (sup !== null) {
        var cls = size ? ' aghtex-sup-' + size : '';
        buff.push('<tex:i class="aghtex-sup', cls, ' aghtex-tag-script"><tex:i class="aghtex-sup-nest">', sup, '</tex:i></tex:i>');
      }
    };
  } else {
    var output_supsub_scripts = function(doc, sup, sub, size) {
      var buff = doc.currentCtx.output.buff;
      if (sup === null || sub === null) {
        if (sub !== null) {
          var cls = size ? ' aghtex-sub-' + size : '';
          buff.push('<tex:i class="aghtex-sub', cls, ' aghtex-tag-script">', sub, '</tex:i>');
        } else if (sup !== null) {
          var cls = size ? ' aghtex-sup-' + size : '';
          buff.push('<tex:i class="aghtex-sup', cls, ' aghtex-tag-script"><tex:i class="aghtex-sup-nest">', sup, '</tex:i></tex:i>');
        }
        return;
      }

      var cls = size ? ' aghtex-supsub-' + size : '';
      if (!_Mod.GetMathStyle(doc))
        buff.push(
          '<tex:i class="aghtex-supsub', cls, ' aghtex-tag-script">',
          '<tex:i class="aghtex-supsub-u">', sup, '</tex:i>',
          '<tex:i class="aghtex-supsub-d">', sub, '</tex:i></tex:i>');
      else
        buff.push(
          '<tex:i class="aghtex-supsub', cls, ' aghtex-supsub-textstyle aghtex-tag-script">',
          '<tex:i class="aghtex-supsub-u"><tex:i>', sup, '</tex:i></tex:i>',
          '<tex:i class="aghtex-supsub-d"><tex:i>', sub, '</tex:i></tex:i></tex:i>');
    };
    _Ctx.DefineLetter({"^":['f;#>1',function(doc,argv){
      doc.skipSpaceAndComment();
      var sub = null;
      if (doc.scanner.is(mod_core.SCAN_WT_LTR, "_")) {
        doc.scanner.Next();
        sub = doc.GetArgumentHtml();
      }
      output_supsub_scripts(doc, argv[1], sub);
    }]});
    _Ctx.DefineLetter({"_":['f;#>1',function(doc,argv){
      doc.skipSpaceAndComment();
      var sup = null;
      if (doc.scanner.is(mod_core.SCAN_WT_LTR, "^")) {
        doc.scanner.Next();
        sup = doc.GetArgumentHtml();
      }
      output_supsub_scripts(doc, sup, argv[1]);
    }]});
  }
  _Mod.OutputSupSubScripts = output_supsub_scripts;

  // プライム
  // _Ctx.DefineLetter({"'":['s@','<tex:f class="aghtex-textrm">\'</tex:f>']});
  var prime_handler = function(doc) {
    doc.scanner.Next();
    if (!doc.scanner.is(mod_core.SCAN_WT_LTR, "'") && !doc.scanner.is(mod_core.SCAN_WT_CMD, "rq")) {
      doc.currentCtx.output.buff.push('<tex:f class="aghtex-textrm">′</tex:f>');
      return;
    }

    doc.scanner.Next();
    if (!doc.scanner.is(mod_core.SCAN_WT_LTR, "'") && !doc.scanner.is(mod_core.SCAN_WT_CMD, "rq")) {
      doc.currentCtx.output.buff.push('<tex:f class="aghtex-textrm">″</tex:f>');
      return;
    }

    doc.scanner.Next();
    doc.currentCtx.output.buff.push('<tex:f class="aghtex-textrm">‴</tex:f>');
  };
  _Ctx.AddLetterHandler("'", prime_handler);
  _Ctx.AddCommandHandler("rq", prime_handler);

  //---------------------------------------------------------------
  //    他
  //---------------------------------------------------------------
  var HT_SQRT_STRETCH_IMAGE = mod_base.GetStretchImageTd("stretch_sqrt.png", 2, "√", 'sqrt');
  _Ctx.DefineCommand({"sqrt":['f;#[]>1#>2',function(doc,argv){
    var buff = doc.currentCtx.output.buff;
    buff.push('<table class="aghtex-css-table-inline aghtex-sqrt-table" cellpadding="0"><tbody><tr class="aghtex-css-tr" style="height:0px!important;">');
    if (argv[1].length > 0)
      buff.push('<td class="aghtex-css-td aghtex-sqrt-index-cell aghtex-tag-script"><tex:i class="aghtex-sqrt-index">', argv[1], '</tex:i></td>');
    buff.push(HT_SQRT_STRETCH_IMAGE, '<td class="aghtex-css-td aghtex-sqrt-body">', argv[2], '</td>');
    buff.push('</tr></tbody></table>');
  }]});

  //---------------------------------------------------------------------------
  // \underbrace, \overbrace

  var GenerateHtmlUndertextImage = (function() {
    switch (ns.compatMode) {
      case "IE-qks":
      case "Fx-qks":
        return function(imgsrc, height, alt) {
          height = height.toString() + "ex";
          return '<td class="aghtex-css-td aghtex-underbrace-cell-i" style="width:0px!important;"><img src="' + ns.BaseUrl + imgsrc + '" alt="' + alt + '" style="height:' + height + ';width:100%;"/></td>';
        };
      case "IE-std":
        ns.expression_width = function(elem) {
          var tr = elem.parentElement.parentElement;
          var table = tr.parentElement.parentElement;
          return (table.clientWidth - 4) + "px";
        };
        return function(imgsrc, height, alt) {
          height = height.toString() + "ex";
          var style = 'height:' + height + ';width:expression(' + ns.namespaceName + '.expression_width(this));';
          //var style = 'height:' + height + ';width:expression(this.parentElement.parentElement.parentElement.parentElement.clientHeight-4);';
          return '<td class="aghtex-css-td aghtex-underbrace-cell-i" style="width:0px!important;"><img src="' + ns.BaseUrl + imgsrc + '" alt="' + alt + '" style="' + style + '"/></td>';
        };
      case "Fx-std":
        return function(imgsrc, height, alt) {
          height = height.toString() + "ex";
          //return '<td class="aghtex-css-td" style="height:' + height + '!important;background-image:url('+ns.BaseUrl+imgsrc+')!important;-moz-background-size:100%!important;"></td>';
          return '<td class="aghtex-css-td aghtex-underbrace-cell-i" style="width:100%!important;"><img src="' + ns.BaseUrl + imgsrc + '" alt="' + alt + '" style="height:' + height + ';width:100%;"/></td>';
        };
      case "Sf-qks": case "Sf-std": // css による switching あり
      case "Op-qks": case "Op-std": // css による switching あり
        return function(imgsrc, height, alt) {
          height = height.toString() + "ex";
          return '<td class="aghtex-css-td aghtex-underbrace-cell-i" style="height:' + height + '!important;background-image:url(' + ns.BaseUrl + imgsrc + ')!important;"></td>';
        };
      default:
        return function(imgsrc,height,alt) {
          height = height.toString() + "ex";
          return '<td class="aghtex-css-td aghtex-underbrace-cell-i" style="height:' + height + '!important;background-image:url(' + ns.BaseUrl + imgsrc + ')!important;background-size:100% 100%!important;"></td>';
        };
    }
  })();

  // image を指定する時は、IE/Sf では画像要素で、それ以外では <td> 要素でなければならない。
  function output_underbrace(buff, content, image, undertxt) {
    if (agh.browser.vIE || agh.browser.vSf) {
      if (agh.browser.vIE) {
        if (undertxt)
          buff.push('<tex:i class="aghtex-underbrace-vphantom2">&nbsp;</tex:i><tex:i class="aghtex-underbrace">');
        else
          buff.push('<tex:i class="aghtex-underbrace-vphantom1">&nbsp;</tex:i><tex:i class="aghtex-underbrace">');
      } else {
        buff.push('<tex:i class="aghtex-underbrace" style="padding-bottom:', undertxt ? 2.6 : 1, 'ex">');
      }
      buff.push(content);
      if (image)
        buff.push('<tex:i class="aghtex-underbrace-i">', image, '</tex:i>');
      if (undertxt)
        buff.push('<tex:i class="aghtex-underbrace-i"><tex:ud>', undertxt, '</tex:ud></tex:i>');
      buff.push('</tex:i>');
    } else {
      // image ~ <td>
      buff.push('<table class="aghtex-css-table-inline aghtex-underbrace-table"><tbody>');
      buff.push('<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-underbrace-cell-b">', content, '</td></tr>');
      if (image)
        buff.push('<tr class="aghtex-css-tr">', image, '</tr>');
      if (undertxt)
        buff.push('<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-underbrace-cell-t">', undertxt, '</td></tr>');
      buff.push('</tbody></table>');
    }
  }
  function output_overbrace(buff, content, image, overtext, className) {
    buff.push('<tex:i class="aghtex-overbrace');
    if (className) buff.push(' ', className);
    buff.push('">');
    if (overtext)
      buff.push('<tex:i class="aghtex-overbrace-t"><tex:i class="aghtex-overbrace-u">', overtext, '</tex:i></tex:i>');
    if (image)
      buff.push('<tex:i class="aghtex-overbrace-i">', image, '</tex:i>');
    buff.push('<tex:i class="aghtex-overbrace-b">', content, '</tex:i></tex:i>');
  }
  _Mod.OutputUnderbrace = output_underbrace;
  _Mod.OutputOverbrace = output_overbrace;

  _Mod.CreateCommandOverStretch = function(info) {
    var className = 'aghtex-overbrace-' + info.commandName;
    var image;
    if (info.svg && /^(Sf|Fx)-/.test(ns.compatMode))
      image = info.svg;
    else
      image = '<img alt="\\' + info.commandName + '" class="aghtex-overbrace" src="' + ns.BaseUrl + info.imageSrc + '" />';

    return new ns.Command2("f", "#>1", function(doc, argv) {
      var text = null;
      if (info.overText) {
        doc.skipSpaceAndComment();
        if (doc.scanner.is(mod_core.SCAN_WT_LTR, "^")) {
          doc.scanner.Next();
          text = doc.GetArgumentHtml();
        }
      }
      var buff = doc.currentCtx.output.buff;
      output_overbrace(buff, argv[1], image, text, className);
    });
  };
  _Mod.CreateCommandUnderStretch = function(info) {
    var image;
    if (agh.browser.vIE || agh.browser.vSf)
      image = '<img alt="\\' + info.commandName + '" class="aghtex-underbrace" src="' + ns.BaseUrl + info.imageSrc + '" />';
    else if (info.svg && /^(Sf|Fx)-/.test(ns.compatMode))
      image = '<td class="aghtex-css-td aghtex-underbrace-cell-svg">' + info.svg + '</td>';
    else
      image = GenerateHtmlUndertextImage(info.imageSrc, 1, '\\' + info.commandName);

    return new ns.Command2("f", "#>1", function(doc, argv) {
      var text = null;
      if (info.underText) {
        doc.skipSpaceAndComment();
        if (doc.scanner.is(mod_core.SCAN_WT_LTR, "_")) {
          doc.scanner.Next();
          text = doc.GetArgumentHtml();
        }
      }
      var buff = doc.currentCtx.output.buff;
      output_underbrace(buff, argv[1], image, text);
    });
  };

  var generateSvgSource = function(svg) {
    return '<svg class="aghtex-css-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + svg.width + ' ' + svg.height + '" preserveAspectRatio="none">'
      + '<g transform="matrix(1 0 0 -1 0 768)"><path fill="currentColor" d="' + svg.path + '" /></g></svg>';
  };
  _Mod["svg:stretch_underbrace"] = generateSvgSource({
    width: 2048, height: 1024,
    path: "M1024 -256c-8 0 -14 6 -16 10c-42 214 -118 370 -216 414h-562c-184 78 -230 508 -230 582"
      + "c0 10 4 18 18 18s18 -8 18 -18c0 -68 56 -342 194 -416h562c148 -70 200 -308 232 -496"
      + "c32 188 84 426 232 496h562c138 74 194 348 194 416c0 10 4 18 18 18s18 -8 18 -18"
      + "c0 -74 -46 -504 -230 -582h-562c-98 -44 -174 -200 -216 -414c-2 -4 -8 -10 -16 -10z"
  });
  _Mod["svg:stretch_overbrace"] = generateSvgSource({
    width: 2048, height: 1024,
    path: "M1024 768c8 0 14 -6 16 -10c42 -214 118 -370 216 -414h562c184 -78 230 -508 230 -582"
      + "c0 -10 -4 -18 -18 -18s-18 8 -18 18c0 68 -56 342 -194 416h-562c-148 70 -200 308 -232 496"
      + "c-32 -188 -84 -426 -232 -496h-562c-138 -74 -194 -348 -194 -416c0 -10 -4 -18 -18 -18s-18 8 -18 18"
      + "c0 74 46 504 230 582h562c98 44 174 200 216 414c2 4 8 10 16 10z"
  });
  _Mod["svg:stretch_hat"] = generateSvgSource({
    width: 2048, height: 1024,
    path: "M9 -256l-9 122l1024 902l1024 -898l-9 -126l-1015 727z"
  });
  _Mod["svg:stretch_tilde"] = generateSvgSource({
    width: 2140, height: 1024,
    path: "M0 -90c246 470 488 858 720 858h1c313 -3 435 -737 739 -740h1c264 0 559 550 669 736"
      + "l10 -172c-340 -613 -539 -848 -725 -848h-2c-320 3 -424 751 -735 752c-176 0 -422 -306 -668 -749z"
  });
  _Mod["svg:stretch_rarr"] = generateSvgSource({
    width: 2048, height: 1024,
    path: "M-0 256c0 34 8 85 18 85l1887 -4c-69 92 -110 295 -126 365c-1 6 -2 12 -2 18c0 25 12 48 25 48"
      + "c12 0 20 -1 31 -48c25 -105 28 -136 63 -223c32 -79 90 -161 144 -216c6 -6 8 -12 8 -25s-2 -19 -8 -25"
      + "c-54 -55 -112 -136 -144 -215c-35 -87 -38 -118 -63 -223c-11 -47 -19 -48 -31 -48c-13 0 -25 22 -25 47"
      + "c0 6 1 12 2 18c16 70 57 274 126 366l-1887 -4c-10 0 -18 50 -18 84z"
  });
  _Mod["svg:stretch_larr"] = generateSvgSource({
    width: 2048, height: 1024,
    path: "M2048 256c0 -34 -8 -84 -18 -84l-1887 4c69 -92 110 -296 126 -366c1 -6 2 -12 2 -18"
      + "c0 -25 -12 -47 -25 -47c-12 0 -20 1 -31 48c-25 105 -28 136 -63 223c-32 79 -90 160 -144 215"
      + "c-6 6 -8 12 -8 25s2 19 8 25c54 55 112 137 144 216c35 87 38 118 63 223c11 47 19 48 31 48"
      + "c13 0 25 -23 25 -48c0 -6 -1 -12 -2 -18c-16 -70 -57 -273 -126 -365l1887 4c10 0 18 -51 18 -85z"
  });
  _Mod["svg:stretch_lrarr"] = generateSvgSource({
    width: 2048, height: 1024,
    path: "M144 174c69 -92 109 -294 125 -364c1 -6 2 -12 2 -18c0 -25 -12 -47 -25 -47c-12 0 -20 1 -31 48"
      + "c-25 105 -28 136 -63 223c-32 79 -90 160 -144 215c-6 6 -8 12 -8 25s2 19 8 25c54 55 112 137 144 216"
      + "c35 87 38 118 63 223c11 47 19 48 31 48c13 0 25 -23 25 -48c0 -6 -1 -12 -2 -18c-16 -70 -57 -273 -126 -365"
      + "h1762c-69 92 -110 295 -126 365c-1 6 -2 12 -2 18c0 25 12 48 25 48c12 0 20 -1 31 -48c25 -105 28 -136 63 -223"
      + "c32 -79 90 -161 144 -216c6 -6 8 -12 8 -25s-2 -19 -8 -25c-54 -55 -112 -136 -144 -215"
      + "c-35 -87 -38 -118 -63 -223c-11 -47 -19 -48 -31 -48c-13 0 -25 22 -25 47c0 6 1 12 2 18c16 70 57 274 126 366z"
  });

  _Ctx.DefineCommand({
    underbrace: _Mod.CreateCommandUnderStretch({commandName: "underbrace", imageSrc: "stretch_underbrace.png", svg: _Mod["svg:stretch_underbrace"], underText: true}),
    overbrace: _Mod.CreateCommandOverStretch({commandName: "overbrace", imageSrc: "stretch_overbrace.png", svg: _Mod["svg:stretch_overbrace"], overText: true}),
    widehat: _Mod.CreateCommandOverStretch({commandName: "widehat", imageSrc: "stretch_widehat.png", svg: _Mod["svg:stretch_hat"]}),
    widetilde: _Mod.CreateCommandOverStretch({commandName: "widetilde", imageSrc: "stretch_widetilde.png", svg: _Mod["svg:stretch_tilde"]}),
    overrightarrow: _Mod.CreateCommandOverStretch({commandName: "overrightarrow", imageSrc: "stretch_rarr.png", svg: _Mod["svg:stretch_rarr"]}),
    overleftarrow: _Mod.CreateCommandOverStretch({commandName: "overleftarrow", imageSrc: "stretch_larr.png", svg: _Mod["svg:stretch_larr"]})
  });

  //---------------------------------------------------------------
  //    分数 / atop
  //---------------------------------------------------------------
  if (agh.browser.vIE <= 8 || ns.compatMode == "IE-qks") {
    _Ctx.DefineCommand({
      frac: ['s@;#>1#>2',
             '<table class="aghtex-css-table-inline aghtex-frac-ie6-table" cellspacing="0"><tbody>'
             + '<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-frac-ie6-num">#1</td></tr>'
             + '<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-frac-ie6-den">#2</td></tr>'
             + '</tbody></table>']
    });
    _Ctx.DefineCommand({"over":['f',function(doc,argv){
      var output = doc.currentCtx.output;
      var former = output.toHtml();
      output.clear();
      output.buff.push('<table class="aghtex-css-table-inline aghtex-frac-ie6-table" cellspacing="0"><tbody>');
      output.buff.push('<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-frac-ie6-num">', former, '</td></tr>');
      output.buff.push('<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-frac-ie6-den">');
      output.appendPost('</td></tr></tbody></table>');
    }]});
  } else {
    function cmd_frac(doc, argv) {
      var buff = doc.currentCtx.output.buff;
      if (argv[0] == 'dfrac' || argv[0] != 'tfrac' && !_Mod.GetMathStyle(doc))
        buff.push('<tex:frac2><tex:num>', argv[1], '</tex:num><tex:den>', argv[2], '</tex:den></tex:frac2>');
      else
        buff.push(
          '<tex:frac2 class="aghtex-tag-script"><tex:num><tex:i>', argv[1],
          '</tex:i></tex:num><tex:den><tex:i>', argv[2],
          '</tex:i></tex:den></tex:frac2>');
    }
    _Mod["cmd:frac"] = cmd_frac;

    _Ctx.DefineCommand({"frac":['f;#>1#>2',function(doc,argv){ cmd_frac(doc,argv); }]});
    _Ctx.DefineCommand({"over":['f',function(doc,argv){
      var output = doc.currentCtx.output;
      var former = output.toHtml();
      output.clear();
      output.buff.push('<tex:frac2><tex:num>', former, '</tex:num><tex:den>');
      output.appendPost('</tex:den></tex:frac2>');
    }]});
  }

  function Atop(output, left, right, bar) {
    var former = output.toHtml();
    output.clear();

    var buff = output.buff;
    buff.push('<table class="aghtex-css-table-inline aghtex-genfrac-table" cellspacing="0"><tbody><tr class="aghtex-css-tr" style="height:0px!important;">');
    if (left)
      mod_base.OutputStretchBracketTd(output, left, 2);

    buff.push('<td align="center" class="aghtex-css-td ', bar ? 'aghtex-genfrac-numerator' : 'aghtex-genfrac-center', '"');
    buff.push('>', former, '</td>');

    if (right)
      mod_base.OutputStretchBracketTd(output, right, 2);
    buff.push('</tr><tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-genfrac-center">');
    output.appendPost('</td></tr></tbody></table>');
  }
  _Ctx.DefineCommand({"atopwithdelims":['f;#!1#!2',function(doc,argv){
    Atop(doc.currentCtx.output, argv[1], argv[2]);
  }]});
  _Ctx.DefineCommand({"atop":['f',function(doc,argv){
    Atop(doc.currentCtx.output, null, null);
  }]});
  _Ctx.DefineCommand({"choose":['f',function(doc,argv){
    Atop(doc.currentCtx.output, "(", ")");
  }]});
  _Ctx.DefineCommand({"brack":['f',function(doc,argv){
    Atop(doc.currentCtx.output, "[", "]");
  }]});
  _Ctx.DefineCommand({"brace":['f',function(doc,argv){
    Atop(doc.currentCtx.output, "{", "}");
  }]});
  _Ctx.DefineCommand({"above":['f@',function(doc,cmdName){
    Atop(doc.currentCtx.output, null, null, true);
    // ■ GetLengthArgument で線の太さを読み取り
  }]});
  _Ctx.DefineCommand({"abovewithdelims":['f;#!1#!2',function(doc,argv){
    Atop(doc.currentCtx.output, argv[1], argv[2], true);
    // ■ GetLengthArgument で線の太さを読み取り
  }]});
  //---------------------------------------------------------------
  //    総和 / mathop
  //---------------------------------------------------------------
  _Ctx.DefineCommand({"mathop":['f;#>1',function(doc,argv){
    var buff = doc.currentCtx.output.buff;
    var sbsp = doc.GetSubSup();
    var sub = sbsp.sub, sup = sbsp.sup, text = argv[1];
    if (sub == null && sup == null) {
      buff.push('<tex:i class="aghtex-mathop">', text, '</tex:i>');
    } else if (!_Mod.GetMathStyle(doc)) {
      buff.push('<tex:i class="aghtex-mathop">');
      if (agh.browser.vIE < 8 || ns.compatMode == "IE-qks") {
        // Note: inline-table は IE 8 以降
        buff.push('<tex:i class="aghtex-mathop-ie6container">');
        buff.push('<tex:i class="aghtex-mathop-sup aghtex-tag-script">', sup || '&nbsp;', '</tex:i>');
        buff.push(text);
        buff.push('<tex:i class="aghtex-mathop-sub aghtex-tag-script">', sub || '&nbsp;', '</tex:i>');
        buff.push('</tex:i>')
      } else {
        if (sub !== null)
          buff.push('<tex:i class="aghtex-mathop-subcontainer">');

        if (sup !== null) {
          buff.push('<tex:i class="aghtex-mathop-supcontainer">');
          buff.push('<tex:i class="aghtex-mathop-sup aghtex-tag-script">', sup, '</tex:i>');
          buff.push(text);
          buff.push('</tex:i>');
        } else {
          buff.push('<tex:i class="aghtex-mathop-text">', text, '</tex:i>');
        }

        if (sub !== null)
          buff.push('<tex:i class="aghtex-mathop-sub aghtex-tag-script">', sub, '</tex:i></tex:i>');
      }
      buff.push('</tex:i>');
    } else {
      buff.push('<tex:i class="aghtex-mathop">', text);
      _Mod.OutputSupSubScripts(doc, sup, sub);
      buff.push('</tex:i>');
    }
  }]});

  _Ctx.DefineCommand({"sum@":['f;#>1',function(doc,argv){
    var buff = doc.currentCtx.output.buff;
    var sbsp = doc.GetSubSup();
    if (sbsp.sub == null && sbsp.sup == null) {
      buff.push("<tex:sum>", argv[1], "</tex:sum>");
    } else {
      buff.push(
        '<tex:sum2><tex:sum2u class="aghtex-tag-script">', sbsp.sup || '&nbsp;',
        '</tex:sum2u><tex:sum2m>', argv[1],
        '</tex:sum2m><tex:sum2d class="aghtex-tag-script">', sbsp.sub || '&nbsp;',
        '</tex:sum2d></tex:sum2>');
    }
  }]});

  _Mod.CreateCommandSummation = (function InitCreateCommandSummation() {
    var _ht_strut = '<tex:i class="aghtex-sum-strut">&nbsp;</tex:i>'
    var ht_table_beg = '<table class="aghtex-css-table-inline aghtex-sum-table"><tbody><tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-sum-m-cell"><tex:i class="aghtex-sum-m">';
    var ht_table_mid = '</tex:i></td></tr><tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-sum-d-cell"><tex:i class="aghtex-sum-d aghtex-tag-script">' + _ht_strut;
    var ht_table_end = _ht_strut + '</tex:i></td></tr></tbody></table>';
    var ht_sum_begin = '<tex:i class="aghtex-sum">';

    var fWA = false;
    if (agh.browser.vSf || agh.browser.vIE && (agh.browser.vIE < 8 || ns.compatMode == 'IE-qks')) {
      // WorkAround - 'CSS2.1 table{vertical-align:baseline;}'
      var fWA = true;
      var ht_sum_beginWA = ht_sum_begin.replace('"aghtex-sum"','"aghtex-sum aghtex-sum-WA1"');
      ht_table_beg = ht_table_beg.replace('"aghtex-sum-table"', '"aghtex-sum-table aghtex-sum-table--WA1"');
      if (agh.browser.vIE) {
        // 何故か、空文字列がないと vertical-align:-0.02 した分だけ、Σの下端が切れてしまう。
        ht_table_mid = ht_table_mid.replace('</tex:i>', '</tex:i>\n');
      }
    }

    return function CreateCommandSummation(content) {
      return new ns.Command2("f", "", function(doc, argv) {
        var buff = doc.currentCtx.output.buff;
        if (!_Mod.GetMathStyle(doc)) {
          var sbsp = doc.GetSubSup();
          var fI = false;

          if (fWA && sbsp.sub != null) {
            fI = true;
            buff.push(ht_sum_beginWA);
          } else { // } else if (sbsp.sup!=null) {
            fI = true;
            buff.push(ht_sum_begin);
          }

          if (sbsp.sup != null) {
            buff.push('<tex:i class="aghtex-sum-u aghtex-tag-script">',sbsp.sup,'</tex:i>');
          }
          if (sbsp.sub != null) {
            buff.push(ht_table_beg,content,ht_table_mid,sbsp.sub,ht_table_end);
          } else {
            buff.push('<tex:i class="aghtex-sum-m1"><tex:i class="aghtex-sum-m2">', content, '</tex:i></tex:i>');
          }

          if (fI)
            buff.push('</tex:i>');
        } else {
          buff.push('<tex:f class="aghtex-symb-mincho">', content, '</tex:f>');
        }
      });
    };
  })();
  _Ctx.AddCommandHandler("sum", _Mod.CreateCommandSummation('&#x2211;'));
  _Ctx.AddCommandHandler("prod", _Mod.CreateCommandSummation('&#x220f;'));
  _Ctx.AddCommandHandler("coprod", _Mod.CreateCommandSummation('&#x2210;'));
  _Ctx.AddCommandHandler("bigcap", _Mod.CreateCommandSummation('&#x22C2;'));
  _Ctx.AddCommandHandler("bigcup", _Mod.CreateCommandSummation('&#x22C3;'));
  _Ctx.AddCommandHandler("bigvee", _Mod.CreateCommandSummation('&#x22C1;'));
  _Ctx.AddCommandHandler("bigwedge", _Mod.CreateCommandSummation('&#x22C0;'));
  _Ctx.AddCommandHandler("bigodot", _Mod.CreateCommandSummation('&#x2A00;'));
  _Ctx.AddCommandHandler("bigoplus", _Mod.CreateCommandSummation('&#x2A01;'));
  _Ctx.AddCommandHandler("bigotimes", _Mod.CreateCommandSummation('&#x2A02;'));
  _Ctx.AddCommandHandler("biguplus", _Mod.CreateCommandSummation('&#x2A04;'));

  //---------------------------------------------------------------
  //    積分
  //---------------------------------------------------------------
  function cmd_int(doc, ch) {
    var output = doc.currentCtx.output;
    var buff = output.buff;

    // content
    if (!_Mod.GetMathStyle(doc)) {
      // 普通の (大きな) 積分記号
      buff.push('<tex:f class="aghtex-int">',ch,'</tex:f>');

      var sbsp = doc.GetSubSup();
      switch ((sbsp.sub ? 1 : 0) + (sbsp.sup ? 2 : 0)) {
      case 1:
        buff.push('<tex:i class="aghtex-sub aghtex-sub-int">', sbsp.sub, '</tex:i>');
        break;
      case 2:
        buff.push('<tex:i class="aghtex-sup aghtex-sup-int">', sbsp.sup, '</tex:i>');
        break;
      case 3:
        buff.push(
          '<table class="aghtex-css-table-inline aghtex-int-table"><tbody>',
          '<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-int-cell-sup aghtex-tag-script"><tex:i class="aghtex-int-sup">', sbsp.sup, '</tex:i></td></tr>',
          '<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-int-cell-sub aghtex-tag-script"><tex:i class="aghtex-int-sub">', sbsp.sub, '</tex:i></td></tr>',
          '</tbody></table>');
        break;
      }
    } else {
      // 小さな積分記号
      buff.push('<tex:f class="aghtex-symb-mincho">', ch, '</tex:f>');
    }
  }
  _Ctx.DefineCommand({"int":['f',function(doc,argv){ cmd_int(doc,'∫'); }]});
  _Ctx.DefineCommand({"oint":['f',function(doc,argv){ cmd_int(doc,'∮'); }]});
  _Mod["cmd:int"] = cmd_int;
}

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("mode.math");
  var _CtxName="mode.math";
  //---------------------------------------------------------------
  //  アクセント・重ね記号・積み重ね記号
  //---------------------------------------------------------------

  if (ns.compatMode == "IE-qks" || agh.browser.vIE < 8) {
    _Ctx.DefineCommand({"not":['s@;#>1','<tex:lap><tex:m>/</tex:m><tex:m>#1</tex:m></tex:lap>']});
  } else {
    _Ctx.DefineCommand({"not":['s@;#>1','<tex:i class="aghtex-accent">#1<tex:i class="aghtex-accent-container"><tex:i class="aghtex-accent-symbol-over">/</tex:i></tex:i></tex:i>']});
  }

  (function() {
    function is_single_lower(html) {
      var text = agh.Text.Unescape(html, "html");
      return /^[acegijmnopqrsuvwxyzαγεηικμνοπρστυφχψω\u0131＝－]*$/.test(text);
    }
    function is_slanted(html,ismath) {
      if (ismath)
        return !(/^<tex:f class="aghtex-math(?:rm|sf|tt|bf|frak)">/.test(html));
      else
        return false;
    }
    function is_slanted_fullheight(html, ismath) {
      // \mathrm
      if (!is_slanted(html, ismath)) return false;

      // 中身が複数文字ある場合
      var text = agh.Text.Unescape(html, "html");
      if (text.length != 1) return false;

      if (/<tex:f class="aghtex-greek">[βδζθλξΑ-Ω]<\/tex:f>/.test(html)) {
        // \beta, \varGamma, etc.
        return true;
      }

      return /[bdfhkltA-Z∂]/.test(text);
    }
    function is_tailed(html) {
      var text = agh.Text.Unescape(html, "html");
      if (text.length != 1) return false;
      return "gjpqy".indexOf(text) >= 0;
    }

    _Ctx.DefineCommand('stackrel', ['f;#>1#>2', function(doc, argv) {
      var suffix = is_single_lower(argv[2]) ? "-lower" : "";
      var buff = doc.currentCtx.output.buff;
      if (ns.compatMode == "IE-qks" || agh.browser.vIE < 8) {
        buff.push(
          '<tex:i class="aghtex-ie6stackrel">',
          '<tex:i class="aghtex-ie6stackrel-top', suffix, '">', argv[1], '</tex:i>',
          '<tex:i class="aghtex-ie6stackrel-body">', argv[2], '</tex:i></tex:i>');
      } else {
        buff.push(
          '<tex:i class="aghtex-stackrel', suffix, '">',
          '<tex:i class="aghtex-stackrel-top', suffix, '">',
          argv[1], '</tex:i>', argv[2], '</tex:i>');
      }
    }]);

    // 2012/12/25 17:47:56
    _Mod.CreateAccentCommand = function(type, htsymb, ismath) {
      var cls_container = 'aghtex-accent-container aghtex-accent-container-' + type;
      if (agh.browser.vSf)
        cls_container += ' aghtex-accent-sf aghtex-accent-sf-' + type;

      var ht1 = '<tex:i class="aghtex-accent aghtex-accent-' + type + '">';
      var ht2 = '<tex:i class="' + cls_container + '"><tex:i class="aghtex-accent-symbol-';
      var ht3 = '">' + htsymb + '</tex:i></tex:i></tex:i>';

      if (type == 'low') {
        return ns.Command2("f", "#>1", function(doc, argv) {
          var content = argv[1];
          var t = type;
          if (content.length == 0)
            content = '&nbsp;';
          else if (is_tailed(content))
            t += "T";

          var buff = doc.currentCtx.output.buff;
          buff.push(ht1, content, ht2, t, ht3);
        });
      } else {
        return ns.Command2("f", "#>1", function(doc, argv) {
          var content = argv[1].trim();
          var t = type;
          if (content.length === 0)
            content = '&nbsp;';
          else if (is_single_lower(content)) {
            if (is_slanted(content, ismath))
              t += "L"; // 数式小文字
            else
              t += "S"; // 直立体小文字
          } else if (is_slanted_fullheight(content,ismath))
            t += "U"; // 数式大文字

          var buff = doc.currentCtx.output.buff;
          buff.push(ht1, content, ht2, t, ht3);
        });
      }
    };

    _Ctx.DefineCommand({
      acute: _Mod.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x00B4;</tex:f>', true), // &#x02CA;
      bar  : _Mod.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x00AF;</tex:f>', true), // &#x02C9;
      breve: _Mod.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02D8;</tex:f>', true),
      check: _Mod.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02C7;</tex:f>', true),
      dot  : _Mod.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02D9;</tex:f>', true),
      ddot : _Mod.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x00A8;</tex:f>', true),
      grave: _Mod.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02CB;</tex:f>', true),
      hat  : _Mod.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02C6;</tex:f>', true),
      tilde: _Mod.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02DC;</tex:f>', true),
      vec  : _Mod.CreateAccentCommand('vec', '<tex:f class="aghtex-syma-mincho">&#x2192;</tex:f>', true)
    });

    if (ns.compatMode == "IE-qks" || agh.browser.vIE < 8) {
      _Mod.CreateAccentCommandQksB = function(height, htSymbol) {
        var TAG_L = '<tex:lap><tex:m style="top:';
        var TAG_M = 'ex;">' + htSymbol + '</tex:m><tex:m>';
        var TAG_R = '</tex:m></tex:lap>';

        var style_top = -height; // for IE
        return new ns.Command2("f", "#>1", function(doc, argv) {
          var t = style_top;
          if (is_tailed(argv[1])) t += 0.4;
          t = 0.01 * Math.round(t * 100);

          var buff = doc.currentCtx.output.buff;
          buff.push(TAG_L, t, TAG_M, argv[1], TAG_R);
        });
      };
    }

  })();
}

})();
//-----------------------------------------------------------------------------
(function _aghtex_include_texsym_js() { /* main.pp.js: included from .gen/texsym.js */
// -*- mode: js -*-
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("mode.math");
  var _CtxName="mode.math";

  _Ctx.DefineCommand({
    // 二項演算子
    mp      : ['s@', '<tex:f class="aghtex-binop aghtex-symb-meiryo">&#x2213;</tex:f>'],
    pm      : ['s@', '<tex:f class="aghtex-binop aghtex-symb-meiryo">±</tex:f>'],
    setminus: ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2216;</tex:f>'], // ※短形式は \smallsetminus
    ast     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2217;</tex:f>'],
    star    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22C6;</tex:f>'],
    diamond : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22C4;</tex:f>'],
    circ    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2218;</tex:f>'],
    bullet  : ['s@', '<tex:f class="aghtex-binop aghtex-symb-meiryo">&#x2022;</tex:f>'], // u0221
    cap     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">&#x2229;</tex:f>'],
    cup     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">&#x222a;</tex:f>'],
    uplus   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x228E;</tex:f>'],
    times   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">×</tex:f>'],
    div     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">÷</tex:f>'],
    dagger  : ['s@', '<tex:f class="aghtex-binop aghtex-symb-roman">†</tex:f>'],
    ddagger : ['s@', '<tex:f class="aghtex-binop aghtex-symb-roman">‡</tex:f>'],
    sqcap   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2293;</tex:f>'],
    sqcup   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2294;</tex:f>'],
    vee     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2228;</tex:f>'],
    wedge   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2227;</tex:f>'],
    amalg   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2210;</tex:f>'],
    wr      : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2240;</tex:f>'],
    odot    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2299;</tex:f>'],
    oplus   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-meiryo">&#x2295;</tex:f>'],
    ominus  : ['s@', '<tex:f class="aghtex-binop aghtex-symb-meiryo">&#x2296;</tex:f>'],
    otimes  : ['s@', '<tex:f class="aghtex-binop aghtex-symb-meiryo">&#x2297;</tex:f>'],
    oslash  : ['s@', '<tex:f class="aghtex-binop aghtex-symb-meiryo">&#x2298;</tex:f>'],
    triangleleft   : ['s@', '<tex:f class="aghtex-symb-mincho aghtex-size-small1">&#x22B2;</tex:f>'],
    triangleright  : ['s@', '<tex:f class="aghtex-symb-mincho aghtex-size-small1">&#x22B3;</tex:f>'],
    bigtriangleup  : ['s@', '<tex:f class="aghtex-syma-mincho">△</tex:f>'], // u25b3
    bigtriangledown: ['s@', '<tex:f class="aghtex-syma-mincho">▽</tex:f>'], // u25bd
    bigcirc        : ['s@', '<tex:f class="aghtex-syma-mincho">○</tex:f>'], // u25cb

    // 二項関係
    le:        ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≤</tex:f>'],
    ge:        ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≥</tex:f>'],
    leq:       ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≤</tex:f>'],
    geq:       ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≥</tex:f>'],
    prec:      ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≺</tex:f>'],
    succ:      ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≻</tex:f>'],
    prec:      ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≺</tex:f>'],
    succeq:    ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2AB0;</tex:f>'],
    preceq:    ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2AAF;</tex:f>'],
    ll:        ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">≪</tex:f>'],
    gg:        ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">≫</tex:f>'],
    'in':      ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">∈</tex:f>'],
    ni:        ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">∋</tex:f>'],
    owns:      ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">∋</tex:f>'],
    notin:     ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">∉</tex:f>'],
    propto:    ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">∝</tex:f>'],
    ne:        ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≠</tex:f>'],
    neq:       ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≠</tex:f>'],
    equiv:     ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≡</tex:f>'],
    sim:       ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">∼</tex:f>'],
    simeq:     ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≃</tex:f>'],
    bowtie:    ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22C8;</tex:f>'],
    subset:    ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">⊂</tex:f>'],
    supset:    ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">⊃</tex:f>'],
    subseteq:  ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">⊆</tex:f>'],
    supseteq:  ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">⊇</tex:f>'],
    sqsubseteq:['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊑</tex:f>'],
    sqsupseteq:['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊒</tex:f>'],
    vdash:     ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊢</tex:f>'],
    dashv:     ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊣</tex:f>'],
    models:    ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊨</tex:f>'],
    perp:      ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊥</tex:f>'],
    doteq:     ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≐</tex:f>'],
    cong:      ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≅</tex:f>'],
    approx:    ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≈</tex:f>'],
    asymp:     ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≍</tex:f>'],
    mid:       ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">|</tex:f>'],
    parallel:  ['s@', '<tex:f class="aghtex-binop aghtex-symb-roman">&#x2225;</tex:f>'], // ∥‖
    smile:     ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⌣</tex:f>'],
    frown:     ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⌢</tex:f>'],

    // ギリシャ文字
    alpha:     ['s@', '<tex:f class="aghtex-greek">α</tex:f>'],
    beta:      ['s@', '<tex:f class="aghtex-greek">β</tex:f>'],
    gamma:     ['s@', '<tex:f class="aghtex-greek">γ</tex:f>'],
    delta:     ['s@', '<tex:f class="aghtex-greek">δ</tex:f>'],
    epsilon:   ['s@', '<tex:f class="aghtex-greek">&#x03F5;</tex:f>'],
    zeta:      ['s@', '<tex:f class="aghtex-greek">ζ</tex:f>'],
    eta:       ['s@', '<tex:f class="aghtex-greek">η</tex:f>'],
    theta:     ['s@', '<tex:f class="aghtex-greek">θ</tex:f>'],
    iota:      ['s@', '<tex:f class="aghtex-greek">ι</tex:f>'],
    kappa:     ['s@', '<tex:f class="aghtex-greek">κ</tex:f>'],
    lambda:    ['s@', '<tex:f class="aghtex-greek">λ</tex:f>'],
    mu:        ['s@', '<tex:f class="aghtex-greek">μ</tex:f>'],
    nu:        ['s@', '<tex:f class="aghtex-greek">ν</tex:f>'],
    xi:        ['s@', '<tex:f class="aghtex-greek">ξ</tex:f>'],
    pi:        ['s@', '<tex:f class="aghtex-greek">π</tex:f>'],
    rho:       ['s@', '<tex:f class="aghtex-greek">ρ</tex:f>'],
    sigma:     ['s@', '<tex:f class="aghtex-greek">σ</tex:f>'],
    tau:       ['s@', '<tex:f class="aghtex-greek">τ</tex:f>'],
    upsilon:   ['s@', '<tex:f class="aghtex-greek">υ</tex:f>'],
    phi:       ['s@', '<tex:f class="aghtex-greek">&#x03D5;</tex:f>'],
    chi:       ['s@', '<tex:f class="aghtex-greek">χ</tex:f>'],
    psi:       ['s@', '<tex:f class="aghtex-greek">ψ</tex:f>'],
    omega:     ['s@', '<tex:f class="aghtex-greek">ω</tex:f>'],
    Gamma:     ['s@', '<tex:f class="aghtex-symb-mincho">Γ</tex:f>'],
    Delta:     ['s@', '<tex:f class="aghtex-symb-mincho">Δ</tex:f>'],
    Theta:     ['s@', '<tex:f class="aghtex-symb-mincho">Θ</tex:f>'],
    Lambda:    ['s@', '<tex:f class="aghtex-symb-mincho">Λ</tex:f>'],
    Xi:        ['s@', '<tex:f class="aghtex-symb-mincho">Ξ</tex:f>'],
    Pi:        ['s@', '<tex:f class="aghtex-symb-mincho">Π</tex:f>'],
    Sigma:     ['s@', '<tex:f class="aghtex-symb-mincho">Σ</tex:f>'],
    Upsilon:   ['s@', '<tex:f class="aghtex-symb-mincho">&#x03D2;</tex:f>'],
    Phi:       ['s@', '<tex:f class="aghtex-symb-mincho">Φ</tex:f>'],
    Psi:       ['s@', '<tex:f class="aghtex-symb-mincho">Ψ</tex:f>'],
    Omega:     ['s@', '<tex:f class="aghtex-symb-mincho">Ω</tex:f>'],
    varGamma:  ['s@', '<tex:f class="aghtex-greek">Γ</tex:f>'],
    varDelta:  ['s@', '<tex:f class="aghtex-greek">Δ</tex:f>'],
    varTheta:  ['s@', '<tex:f class="aghtex-greek">Θ</tex:f>'],
    varLambda: ['s@', '<tex:f class="aghtex-greek">Λ</tex:f>'],
    varXi:     ['s@', '<tex:f class="aghtex-greek">Ξ</tex:f>'],
    varPi:     ['s@', '<tex:f class="aghtex-greek">Π</tex:f>'],
    varSigma:  ['s@', '<tex:f class="aghtex-greek">Σ</tex:f>'],
    varUpsilon:['s@', '<tex:f class="aghtex-greek">&#x03D2;</tex:f>'],
    varPhi:    ['s@', '<tex:f class="aghtex-greek">Φ</tex:f>'],
    varPsi:    ['s@', '<tex:f class="aghtex-greek">Ψ</tex:f>'],
    varOmega:  ['s@', '<tex:f class="aghtex-greek">Ω</tex:f>'],

    varepsilon:['s@', '<tex:f class="aghtex-greek">ε</tex:f>'],
    varphi:    ['s@', '<tex:f class="aghtex-greek">φ</tex:f>'],
    vartheta:  ['s@', '<tex:f class="aghtex-greek">&#x03D1;</tex:f>'],
    varpi:     ['s@', '<tex:f class="aghtex-greek">&#x03D6;</tex:f>'],
    varrho:    ['s@', '<tex:f class="aghtex-greek">&#x03F1;</tex:f>'],
    varsigma:  ['s@', '<tex:f class="aghtex-greek">&#x03C2;</tex:f>'],

    // 括弧
    lceil        : ['s@', '<tex:f class="aghtex-lbrace aghtex-symb-gothic aghtex-big-variant">&#x2308;</tex:f>'],
    rceil        : ['s@', '<tex:f class="aghtex-rbrace aghtex-symb-gothic aghtex-big-variant">&#x2309;</tex:f>'],
    lfloor       : ['s@', '<tex:f class="aghtex-lbrace aghtex-symb-gothic aghtex-big-variant">&#x230A;</tex:f>'],
    rfloor       : ['s@', '<tex:f class="aghtex-rbrace aghtex-symb-gothic aghtex-big-variant">&#x230B;</tex:f>'],
    langle       : ['s@', '<tex:f class="aghtex-lbrace aghtex-symb-gothic aghtex-big-variant">〈</tex:f>'], // u3008=cjklangle (c.f. u27e8=bra, u2329=lpointing langle; 対応フォント稀少)
    rangle       : ['s@', '<tex:f class="aghtex-rbrace aghtex-symb-gothic aghtex-big-variant">〉</tex:f>'], // u3009=cjkrangle (c.f. u27e9=ket, u232a=rpointing rangle; 対応フォント稀少)
    '|'          : ['s@', '<tex:f class="aghtex-mbrace aghtex-symb-roman">&#x2225;</tex:f>'], // 平行
    vert         : ['s@', '<tex:f class="aghtex-mbrace aghtex-symb-gothic">|</tex:f>'],
    Vert         : ['s@', '<tex:f class="aghtex-mbrace aghtex-symb-roman">&#x2225;</tex:f>'],
    lbrace       : ['s@', '<tex:f class="aghtex-lbrace aghtex-symb-mincho">{</tex:f>'],
    rbrace       : ['s@', '<tex:f class="aghtex-rbrace aghtex-symb-mincho">}</tex:f>'],

    // \math... 記号 (\mathunderscore は mod_common.ctx で定義)
    mathellipsis : ['s@', '<tex:f class="aghtex-symb-roman">&#x2026;</tex:f>'],
    mathparagraph: ['s@', '<tex:f class="aghtex-symb-roman">&#x00b6;</tex:f>'],
    mathdollar   : ['s@', '<tex:f class="aghtex-symb-roman">$</tex:f>'],
    mathsection  : ['s@', '<tex:f class="aghtex-symb-roman">&#x00a7;</tex:f>'],
    mathsterling : ['s@', '<tex:f class="aghtex-symb-roman">&#x00a3;</tex:f>'],

    // 点
    cdot              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">・</tex:f>'],
    ldots             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-roman">&#x2026;</tex:f>'],
    cdots             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22EF;</tex:f>'],
    vdots             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22EE;</tex:f>'],
    ddots             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22F1;</tex:f>'],

    // 矢印
    gets              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">←</tex:f>'],
    to                : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">→</tex:f>'],
    uparrow           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">↑</tex:f>'],
    downarrow         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">↓</tex:f>'],
    leftarrow         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">←</tex:f>'],
    rightarrow        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">→</tex:f>'],
    nwarrow           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2196;</tex:f>'],
    nearrow           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2197;</tex:f>'],
    searrow           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2198;</tex:f>'],
    swarrow           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2199;</tex:f>'],
    leftrightarrow    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2194;</tex:f>'],
    updownarrow       : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2195;</tex:f>'],
    Leftarrow         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21D0;</tex:f>'],
    Rightarrow        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⇒</tex:f>'],
    Leftrightarrow    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⇔</tex:f>'],
    Uparrow           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21D1;</tex:f>'],
    Downarrow         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21D3;</tex:f>'],
    Updownarrow       : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21D5;</tex:f>'],
    longleftarrow     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x27F5;</tex:f>'],
    longrightarrow    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x27F6;</tex:f>'],
    longleftrightarrow: ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x27F7;</tex:f>'],
    Longleftarrow     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x27F8;</tex:f>'],
    Longrightarrow    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x27F9;</tex:f>'],
    Longleftrightarrow: ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x27FA;</tex:f>'],
    longmapsto        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x27FC;</tex:f>'],
    hookrightarrow    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">↪</tex:f>'],
    hookleftarrow     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">↩</tex:f>'],
    leftharpoonup     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">↼</tex:f>'],
    leftharpoondown   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">↽</tex:f>'],
    rightharpoonup    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⇀</tex:f>'],
    rightharpoondown  : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⇁</tex:f>'],
    rightleftharpoons : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⇌</tex:f>'],
    mapsto            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">↦</tex:f>'],

    // 文字列記号
    sin    : ['s>mode.math', "\\mathrm{sin}"],
    cos    : ['s>mode.math', "\\mathrm{cos}"],
    tan    : ['s>mode.math', "\\mathrm{tan}"],
    cot    : ['s>mode.math', "\\mathrm{cot}"],
    sec    : ['s>mode.math', "\\mathrm{sec}"],
    csc    : ['s>mode.math', "\\mathrm{csc}"],
    arcsin : ['s>mode.math', "\\mathrm{arcsin}"],
    arccos : ['s>mode.math', "\\mathrm{arccos}"],
    arctan : ['s>mode.math', "\\mathrm{arctan}"],
    sinh   : ['s>mode.math', "\\mathrm{sinh}"],
    cosh   : ['s>mode.math', "\\mathrm{cosh}"],
    tanh   : ['s>mode.math', "\\mathrm{tanh}"],
    coth   : ['s>mode.math', "\\mathrm{coth}"],
    exp    : ['s>mode.math', "\\mathrm{exp}"],
    log    : ['s>mode.math', "\\mathrm{log}"],
    ln     : ['s>mode.math', "\\mathrm{ln}"],
    ker    : ['s>mode.math', "\\mathrm{ker}"],
    lg     : ['s>mode.math', "\\mathrm{lg}"],
    hom    : ['s>mode.math', "\\mathrm{hom}"],
    dim    : ['s>mode.math', "\\mathrm{dim}"],
    deg    : ['s>mode.math', "\\mathrm{deg}"],
    arg    : ['s>mode.math', "\\mathrm{arg}"],

    max    : ['s', "\\mathop\\mathrm{max}"],
    min    : ['s', "\\mathop\\mathrm{min}"],
    sup    : ['s', "\\mathop\\mathrm{sup}"],
    inf    : ['s', "\\mathop\\mathrm{inf}"],
    lim    : ['s', "\\mathop\\mathrm{lim}"],
    liminf : ['s', "\\mathop\\mathrm{lim inf}"],
    limsup : ['s', "\\mathop\\mathrm{lim sup}"],
    det    : ['s', "\\mathop\\mathrm{det}"],
    Pr     : ['s', "\\mathop\\mathrm{Pr}"],
    gcd    : ['s', "\\mathop\\mathrm{gcd}"],

    // その他の記号
    nabla       : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2207;</tex:f>'], // @"∇";
    partial     : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2202;</tex:f>'], // ∂
    hbar        : ['s@', '<tex:f class="aghtex-symb-mincho">&#x0127;</tex:f>'], // hbar
    aleph       : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2135;</tex:f>'], // @'<tex:f class="aghtex-textrm" style="font-size:150%;">&#x5d0;</tex:f>';
    imath       : ['s@', '<tex:f class="aghtex-symb-mincho">&#x0131;</tex:f>'],
    jmath       : ['s@', '<tex:f class="aghtex-symb-mincho">&#x0237;</tex:f>'],
    ell         : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2113;</tex:f>'],
    wp          : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2118;</tex:f>'], // @'<tex:f class="aghtex-textsy">&#xC3;</tex:f>';
    Re          : ['s@', '<tex:f class="aghtex-symb-mincho">&#x211C;</tex:f>'], // @'<tex:f class="aghtex-textsy">&#xC2;</tex:f>';
    Im          : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2111;</tex:f>'], // @'<tex:f class="aghtex-textsy">&#xC1;</tex:f>';
    infty       : ['s@', '<tex:f class="aghtex-symb-mincho">∞</tex:f>'],
    smallint    : ['s@', '<tex:f class="aghtex-symb-mincho">∫</tex:f>'],
    prime       : ['s@', '<tex:f class="aghtex-symb-roman">&#x2032;</tex:f>'], // 大きな prime (⇔ <tex:f class="aghtex-textrm">&#x0027;</tex:f> は上付の小さい物)
    emptyset    : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2205;</tex:f>'], // ■platex では 0 slash (cmsy9 にある) を出力する。
    surd        : ['s@', '<tex:f class="aghtex-symb-mincho">&#x221A;</tex:f>'], // '<tex:f class="aghtex-mathrm" lang="en">√</tex:f>';
    top         : ['s@', '<tex:f class="aghtex-symb-mincho">&#x22A4;</tex:f>'],
    bot         : ['s@', '<tex:f class="aghtex-symb-gothic">⊥</tex:f>'], // u22a5
    angle       : ['s@', '<tex:f class="aghtex-symb-gothic">∠</tex:f>'], // u2220
    triangle    : ['s@', '<tex:f class="aghtex-syma-mincho">△</tex:f>'], // u25b3
    backslash   : ['s@', '<tex:f class="aghtex-symb-cent aghtex-big-variant">\\</tex:f>'], // u005c
    forall      : ['s@', '<tex:f class="aghtex-symb-gothic">∀</tex:f>'], // u2200
    exists      : ['s@', '<tex:f class="aghtex-symb-gothic">∃</tex:f>'], // u2203
    neg         : ['s@', '<tex:f class="aghtex-symb-gothic">&#x00ac;</tex:f>'], // 全角=uffe2
    lnot        : ['s@', '<tex:f class="aghtex-symb-gothic">&#x00ac;</tex:f>'], // 全角=uffe2
    diamondsuit : ['s@', '<tex:f class="aghtex-symb-gothic">&#x25ca;</tex:f>'],
    heartsuit   : ['s@', '<tex:f class="aghtex-symb-gothic">&#x2661;</tex:f>'],
    clubsuit    : ['s@', '<tex:f class="aghtex-symb-gothic">&#x2663;</tex:f>'],
    spadesuit   : ['s@', '<tex:f class="aghtex-symb-gothic">&#x2660;</tex:f>'],
    flat        : ['s@', '<tex:f class="aghtex-symb-gothic">&#x266d;</tex:f>'],
    natural     : ['s@', '<tex:f class="aghtex-symb-mincho">&#x266e;</tex:f>'],
    sharp       : ['s@', '<tex:f class="aghtex-symb-gothic">&#x266f;</tex:f>'],
    lor         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">∨</tex:f>'], // u2228
    land        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-gothic">∧</tex:f>'] // u2227
  });
}

})();
//-----------------------------------------------------------------------------
(function _aghtex_include_mod_para_js() { /* main.pp.js: included from .gen/mod_para.js */
// -*- mode: js; coding: utf-8 -*- (日本語)

var mod_common = ns.Modules["mod:common"];
var mod_math = ns.Modules["mod:math"];
var mod_core = ns.Modules["core"];
agh.memcpy(mod_core.ErrorMessages, {
  'mod:para.cmd:newtheorem.AlreadyDefined': [
    '\\newtheorem AlreadyDefined',
    'the theorem "{name}" was already defined.'],
  'mod:para.cmd:newtheorem.UndefinedTheorem': [
    'UndefinedTheorem',
    '\\newtheorem: the specified number-sharing theorem "{refthm}" is not defined.']
});

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("mode.para");
  var _CtxName="mode.para";
  _Ctx.DefineCommand({"@":['s>',"\\hspace{1.2ex}"]});

  _Ctx.DefineCommand({",":['s>','\\hspace{0.1667em}']});
  _Ctx.DefineCommand({"thinspace":['s>','\\hspace{0.1667em}']});
  if (agh.browser.vIE < 7) {
    _Ctx.DefineCommand({"negthinspace":['s@','<tex:i class="aghtex-negative-space-ie6">&nbsp;&nbsp;</tex:i>&nbsp;']});
  } else {
    _Ctx.DefineCommand({"negthinspace":['s@','<tex:i class="aghtex-negative-space"></tex:i>']});
  }

  _Ctx.DefineCommand({"-":['s@',"&#xAD;"]}); // soft hyphen

  _Ctx.DefineLetter({"~":['s@','<tex:i class="aghtex-nobr"> </tex:i>']}); // <nobr>
  _Ctx.DefineLetter({'\n':['f',function(doc,argv){
    if (doc.scanner.is(mod_core.SCAN_WT_LTR, '\n')) {
      doc.skipSpaceAndComment();
      doc.currentCtx.output.buff.push("<br />");
    } else
      doc.currentCtx.output.buff.push(" ");
  }]});
  _Ctx.DefineCommand({
    " ": ['s@', "&nbsp;"],
    "par":['s@', "<br />"],
    "\\": ['f;#[]D', function(doc, argv) {
      if (argv[1]) {
        doc.currentCtx.output.buff.push('<tex:i class="aghtex-vspace" style="margin-bottom: ', argv[1], ';">&nbsp;</tex:i>');
      } else
        doc.currentCtx.output.buff.push('<br />');
    }]
  });

  //@A 字体
  _Ctx.DefineCommand({
    // - 文字の大きさ
    normalsize  : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-size-size-normal">', '</tex:f>'),
    tiny        : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-size-size-small4">', '</tex:f>'),
    scriptsize  : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-size-size-small3">', '</tex:f>'),
    footnotesize: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-size-size-small2">', '</tex:f>'),
    small       : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-size-size-small1">', '</tex:f>'),
    large       : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-size-size-large1">', '</tex:f>'),
    Large       : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-size-size-large2">', '</tex:f>'),
    LARGE       : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-size-size-large3">', '</tex:f>'),
    huge        : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-size-size-large4">', '</tex:f>'),
    Huge        : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-size-size-large5">', '</tex:f>'),

    // - フォント
    textrm: ['s@;#>1', '<tex:f class="aghtex-textrm">#1</tex:f>'],
    textsf: ['s@;#>1', '<tex:f class="aghtex-textsf">#1</tex:f>'],
    texttt: ['s@;#>1', '<tex:f class="aghtex-texttt">#1</tex:f>'],
    textmc: ['s@;#>1', '<tex:f class="aghtex-textrm">#1</tex:f>'],
    textgt: ['s@;#>1', '<tex:f class="aghtex-textgt">#1</tex:f>'],
    textmd: ['s@;#>1', '<tex:f class="aghtex-textmd">#1</tex:f>'],
    textbf: ['s@;#>1', '<tex:f class="aghtex-textbf">#1</tex:f>'],
    textup: ['s@;#>1', '<tex:f class="aghtex-textup">#1</tex:f>'],
    textit: ['s@;#>1', '<tex:f class="aghtex-textit">#1</tex:f>'],
    textsc: ['s@;#>1', '<tex:f class="aghtex-textsc">#1</tex:f>'],
    textsl: ['s@;#>1', '<tex:f class="aghtex-textsl">#1</tex:f>'],
    emph  : ['s@;#>1', '<tex:i class="aghtex-emphasize">#1</tex:i>'],
    rmfamily: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textrm">', '</tex:f>'),
    sffamily: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textsf">', '</tex:f>'),
    ttfamily: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-texttt">', '</tex:f>'),
    mcfamily: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textmc">', '</tex:f>'),
    gtfamily: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textgt">', '</tex:f>'),
    mdseries: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textmd">', '</tex:f>'),
    bfseries: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textbf">', '</tex:f>'),
    upshape : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textup">', '</tex:f>'),
    itshape : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textit">', '</tex:f>'),
    scshape : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textsc">', '</tex:f>'),
    slshape : mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textsl">', '</tex:f>'),
    em: mod_common.CreateCommandTagFollowing('<tex:i class="aghtex-emphasize">', '</tex:i>'),
    rm: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textrm">', '</tex:f>'),
    sl: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textsl">', '</tex:f>'),
    it: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textit">', '</tex:f>'),
    tt: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-texttt">', '</tex:f>'),
    bf: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textbf">', '</tex:f>'),
    sf: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textsf">', '</tex:f>'),
    sc: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textsc">', '</tex:f>'),
    mc: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textmc">', '</tex:f>'),
    gt: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textgt">', '</tex:f>'),
    dm: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textmc">', '</tex:f>'),
    dg: mod_common.CreateCommandTagFollowing('<tex:f class="aghtex-textgt">', '</tex:f>'),

    // 標準字体
    textnormal: ['s@;#>1', '<tex:fnorm>#1</tex:fnorm>'],
    normalfont: mod_common.CreateCommandTagFollowing('<tex:fnorm>', '</tex:fnorm>'),

    // 太字斜体
    boldmath: ['s@;#>1', '<tex:f class="aghtex-mathbm">#1</tex:f>'],

    // アクセント
    "'": mod_math.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x00B4;</tex:f>'), // alt = &#x02CA;
    "=": mod_math.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x00AF;</tex:f>'), // alt = &#x02C9;
    "u": mod_math.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02D8;</tex:f>'),
    "v": mod_math.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02C7;</tex:f>'),
    ".": mod_math.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02D9;</tex:f>'),
    '"': mod_math.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x00A8;</tex:f>'),
    "`": mod_math.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02CB;</tex:f>'),
    "^": mod_math.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02C6;</tex:f>'),
    "~": mod_math.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02DC;</tex:f>'),
    "H": mod_math.CreateAccentCommand('acc', '<tex:f class="aghtex-symb-mincho">&#x02DD;</tex:f>'),
    "t": mod_math.CreateAccentCommand('acc', '<tex:f class="aghtex-syma-mincho">&#x2040;</tex:f>'), // combining = &#x0361;
    "c": mod_math.CreateAccentCommand('low', '<tex:f class="aghtex-symb-mincho">&#x00B8;</tex:f>'), // combining = &#x0327;
    "b": mod_math.CreateAccentCommand('low', '<tex:f class="aghtex-symb-mincho">&#x02D7;</tex:f>'), // combining = &#x0320;
    "d": mod_math.CreateAccentCommand('low', '<tex:f class="aghtex-syma-mincho">&#x002E;</tex:f>')  // combining = &#x0323;
  });

  if (ns.compatMode == "IE-qks" || agh.browser.vIE < 8) {
    _Ctx.DefineCommand({
      "c": mod_math.CreateAccentCommandQksB( 0.2, '<tex:f class="aghtex-textgt">&#x327;</tex:f>'),
      "b": mod_math.CreateAccentCommandQksB( 0.2, "_"),
      "d": mod_math.CreateAccentCommandQksB(-1.0, "・")
    });
  }

  // \text... 記号 (math-mode で文字化けする系統の物)
  _Ctx.DefineCommand({"textasciicircum":['s@',"^"]});
  _Ctx.DefineCommand({"textasciitilde":['s@',"~"]});
  _Ctx.DefineCommand({"textbackslash":['s@','<tex:f class="aghtex-textrm">\\</tex:f>']});
  _Ctx.DefineCommand({"textbullet":['s@','<tex:f class="aghtex-textmr">•</tex:f>']}); // u2022
  _Ctx.DefineCommand({"textperiodcentered":['s@',"·"]});  // u00B7
  _Ctx.DefineCommand({"textbar":['s@',"|"]});  // platex: j に文字化け in math-mode
  _Ctx.DefineCommand({"textemdash":['s@',"―"]}); // platex: | に文字化け in math-mode
  _Ctx.DefineCommand({"textendash":['s@',"—"]});
  _Ctx.DefineCommand({"textexclamdown":['s@',"¡"]});  // platex: < に文字化け in math-mode
  _Ctx.DefineCommand({"textquestiondown":['s@',"¿"]});  // platex: > に文字化け in math-mode
  _Ctx.DefineCommand({"textquotedblleft":['s@','<tex:f class="aghtex-textrm">“</tex:f>']});
  _Ctx.DefineCommand({"textquotedblright":['s@','<tex:f class="aghtex-textrm">”</tex:f>']}); // platex: double prime に文字化け in math-mode
  _Ctx.DefineCommand({"textquoteleft":['s@','<tex:f class="aghtex-textrm">‘</tex:f>']});
  _Ctx.DefineCommand({"textquoteright":['s@','<tex:f class="aghtex-textrm">’</tex:f>']}); // platex: prime に文字化け in math-mode
  _Ctx.DefineCommand({"textasteriskcentered":['s@',"&#x2217;"]});
  _Ctx.DefineCommand({"textparagraph":['s@',"&#x00b6;"]});
  _Ctx.DefineCommand({"textbraceleft":['s@',"{"]});
  _Ctx.DefineCommand({"textbraceright":['s@',"}"]});
  _Ctx.DefineCommand({"textdagger":['s@',"&#x2020;"]});
  _Ctx.DefineCommand({"textdaggerdbl":['s@',"&#x2021;"]});
  _Ctx.DefineCommand({"textdollar":['s@',"$"]});
  _Ctx.DefineCommand({"textsection":['s@',"&#x00a7;"]});
  _Ctx.DefineCommand({"textsterling":['s@',"&#x00a3;"]});

  _Ctx.DefineLetter({">":['s@','&#x00BF;']}); // u00bf "¿", '<tex:f class="aghtex-symb-roman">&#x00BF;</tex:f>'
  _Ctx.DefineLetter({"<":['s@','&#x00A1;']}); // u00a1 "¡", '<tex:f class="aghtex-symb-roman">&#x00A1;</tex:f>'
  _Ctx.DefineLetter({"|":['s@',"―"]});
  _Ctx.DefineLetter({"?":['f@',function(doc,cmdName){
    doc.scanner.Next();
    if (doc.scanner.is(mod_core.SCAN_WT_LTR, "`")) {
      doc.currentCtx.output.buff.push('&#x00BF;');
      doc.scanner.Next();
    } else {
      doc.currentCtx.output.buff.push("?");
    }
  }]});
  _Ctx.DefineLetter({"!":['f@',function(doc,cmdName){
    doc.scanner.Next();
    if (doc.scanner.is(mod_core.SCAN_WT_LTR, "`")) {
      doc.currentCtx.output.buff.push('&#x00A1;');
      doc.scanner.Next();
    } else {
      doc.currentCtx.output.buff.push("!");
    }
  }]});
  _Ctx.DefineLetter({"-":['f@',function(doc,cmdName){
    doc.scanner.Next();
    if (!doc.scanner.is(mod_core.SCAN_WT_LTR, "-")) {
      doc.currentCtx.output.buff.push("-");
      return;
    }

    doc.scanner.Next();
    if (!doc.scanner.is(mod_core.SCAN_WT_LTR, "-")) {
      doc.currentCtx.output.buff.push("—");
      // ※ 本来は \u2013 であるべき
      return;
    }

    doc.scanner.Next();
    doc.currentCtx.output.buff.push("―");
    // ※ 本来は \u2014 であるべき
  }]});
  // Quotations
  function quoteleft(doc) {
    doc.scanner.Next();
    if (!doc.scanner.is(mod_core.SCAN_WT_LTR, "`") && !doc.scanner.is(mod_core.SCAN_WT_CMD, "lq")) {
      doc.currentCtx.output.buff.push('<tex:f class="aghtex-textrm">‘</tex:f>');
      return;
    }

    doc.scanner.Next();
    doc.currentCtx.output.buff.push('<tex:f class="aghtex-textrm">“</tex:f>');
  }
  _Ctx.AddLetterHandler("`", quoteleft);
  _Ctx.AddCommandHandler("lq", quoteleft);
  function quoteright(doc) {
    doc.scanner.Next();
    if (!doc.scanner.is(mod_core.SCAN_WT_LTR, "'") && !doc.scanner.is(mod_core.SCAN_WT_CMD, "rq")) {
      doc.currentCtx.output.buff.push('<tex:f class="aghtex-textrm">’</tex:f>');
      return;
    }

    doc.scanner.Next();
    doc.currentCtx.output.buff.push('<tex:f class="aghtex-textrm">”</tex:f>');
  }
  _Ctx.AddLetterHandler("'", quoteright);
  _Ctx.AddCommandHandler("rq", quoteright);
  _Ctx.DefineLetter({'"':['s@','<tex:f class="aghtex-textrm">”</tex:f>']}); // "

  _Ctx.AddEnvironment("center",ns.Environment.Create("s@",null,'<div class="aghtex-center">#0</div>',_CtxName));
  _Ctx.AddEnvironment("flushright",ns.Environment.Create("s@",null,'<div class="aghtex-flushright">#0</div>',_CtxName));
  _Ctx.AddEnvironment("flushleft",ns.Environment.Create("s@",null,'<div class="aghtex-flushleft">#0</div>',_CtxName));
  _Ctx.AddEnvironment("quote",ns.Environment.Create("s@",null,'<blockquote class="aghtex-quote">#0</blockquote>',_CtxName));
  _Ctx.AddEnvironment("quotation",ns.Environment.Create("s@",null,'<blockquote class="aghtex-quota">#0</blockquote>',_CtxName));
  _Ctx.AddEnvironment("verse",ns.Environment.Create("s@",null,'<tex:verse>#0</tex:verse>',_CtxName));

  //---------------------------------------------------------------------------
  // 改頁コマンド (この実装では区別はない)
  //---------------------------------------------------------------------------
  _Ctx.DefineCommand({"eject":['f',function(doc,argv){
    var c = doc.GetCounter("page");
    if (c != null) c.Step();
    doc.currentCtx.output.buff.push('<hr class="aghtex-newpage" />');
  }]});
  _Ctx.AddCommandHandler("supereject", _Ctx.handlerC["eject"]);
  _Ctx.AddCommandHandler("dosupereject", _Ctx.handlerC["eject"]);
  _Ctx.AddCommandHandler("newpage", _Ctx.handlerC["eject"]);
  _Ctx.AddCommandHandler("clearpage", _Ctx.handlerC["eject"]);
  _Ctx.AddCommandHandler("pagebreak", _Ctx.handlerC["eject"]);

  _Ctx.DefineCommand({"cleardoublepage":['f',function(doc,argv){
    var c = doc.GetCounter("page");
    if (c != null) {
      c.Step();
      c.Step();
    }
    doc.currentCtx.output.buff.push('<hr class="aghtex-newpage" /><hr class="aghtex-newpage" />');
  }]});

  //---------------------------------------------------------------------------
  _Ctx.DefineCommand({"line":['s@;#mode.lr>1','<tex:i class="aghtex-cmd-line">#1</tex:i>']});
  _Ctx.DefineCommand({"centerline":['s@;#mode.lr>1','<tex:i class="aghtex-cmd-centerline">#1</tex:i>']});
  _Ctx.DefineCommand({"leftline":['s@;#mode.lr>1','<tex:i class="aghtex-cmd-leftline">#1</tex:i>']});
  _Ctx.DefineCommand({"rightline":['s@;#mode.lr>1','<tex:i class="aghtex-cmd-rightline">#1</tex:i>']});

  //---------------------------------------------------------------------------
  // \begin{displaymath}
  // \[\]
  // \begin{math}
  // \(\)
  // \begin{equation}

  _Ctx.AddEnvironment("displaymath",ns.Environment.Create("s@",null,'<tex:math class="aghtex-displaymath">&nbsp;#0&nbsp;</tex:math>\r\n',"mode.math"));
  _Ctx.DefineCommand({"[":['s@;#mode.math>1\\]','<tex:math class="aghtex-displaymath">#1</tex:math>\r\n']});

  _Ctx.AddEnvironment("math",ns.Environment.Create("s@",null,'<tex:math>#0</tex:math>',"mode.math"));
  _Ctx.DefineCommand({"(":['s@;#mode.math>1\\)','<tex:math>#1</tex:math>']});

  _Ctx.AddLetterHandler("$", function(doc) {
    var buff = doc.currentCtx.output.buff;
    doc.scanner.Next();
    if (doc.scanner.is(mod_core.SCAN_WT_LTR, "$")) {
      doc.scanner.Next();
      // $$ - $$
      buff.push('<tex:math class="aghtex-displaymath">');

      // setup context and read under the context
      var ctx = doc.context_cast(["mode.math"]);
      ctx.AddLetterHandler("$", function(doc) {
        doc.scanner.Next();
        if (doc.scanner.is(mod_core.SCAN_WT_LTR, "$"))
          doc.scanner.Next();
        else
          doc.currentCtx.output.error("UnexpectedEOR", "$");

        doc.currentCtx.BREAK = true;
      });

      buff.push(doc.Read(ctx), '</tex:math>');
    } else {
      // $ - $
      buff.push('<tex:math>');

      // setup context and read under the context
      var ctx = doc.context_cast(["mode.math"]);
      ctx.SetContextVariable('mathstyle', mod_math.MATHSTYLE_TEXT);
      ctx.AddLetterHandler("$", function(doc) {
        doc.scanner.Next();
        doc.currentCtx.BREAK = true;
      });

      buff.push(doc.Read(ctx), '</tex:math>');
    }

  });

  var CTXV_LABEL_EQ = 'mod_ref/label:eq';

  _Ctx.AddEnvironment("equation", {
    prologue: function(doc, ctx) {
      doc.currentCtx.output.buff.push('<tex:math class="aghtex-displaymath">');
      ctx.SetContextVariable(CTXV_LABEL_EQ, []);
      ctx.userC["label"] = ns.Modules["mod:ref"]["cmd:label:eq"];
    },
    epilogue: function(doc, ctx) {
      // ToDo: mod_array.eqno_output と統合する?

      var buff = doc.currentCtx.output.buff;
      var labels = ctx.GetContextVariable(CTXV_LABEL_EQ);
      if (labels.length > 0) {
        var id = "aghtex." + labels[0];
        buff.push('<tex:i class="aghtex-equation-eqno-right" id="', id, '">');
        for (var i = 1; i < labels.length; i++)
          doc.references.label_id_map[labels[i]] = id;
      } else {
        buff.push('<tex:i class="aghtex-equation-eqno-right">');
      }

      // 式番号の形式を指定するコマンドを呼び出す様に変更する■
      //  InsertSource & ReadCommand
      var c = doc.GetCounter("equation");
      if (c == null) {
        buff.push('(?)');
      } else {
        c.Step();
        var eqno = c.arabic();
        buff.push('(', eqno, ')');
        if (labels.length > 0)
          doc.references.displayedText['ref@' + labels[0]] = eqno;
      }

      buff.push('</tex:i></tex:math>\r\n');
    },
    context: "mode.math"
  });

  var CTXV_FOOTNOTE = 'mod_ref/footnote';
  var CTXV_MPFOOTNOTE = 'mod_ref/is_mpfootnote';
  _Ctx.AddEnvironment("minipage", {
    prologue: function(doc, ctx) {
      var output = doc.currentCtx.output;

      var va = (doc.GetOptionalArgumentRaw() || "").trim();
      switch (va) {
      case "t": va = "top"; break;
      case "b": va = "bottom"; break;
      case "":
      case "c": va = "middle"; break;
      default:
        output.error("UnknownVerticaAlign", "\\minipage: first argument '" + va + "' is unknown vertical align");
        va = "middle";
        return;
      }

      var width = doc.ReadArgument("txt", false, null).trim();
      width = width.replace(/(\d*(?:\.\d*)?)\s*(\w+|%)/, "$1$2"); //■length もっとまともな変換

      output.buff.push('<tex:i class="aghtex-minipage" style="vertical-align:', va, ';width:', width, ';">');
      ctx.SetContextVariable(CTXV_MPFOOTNOTE, true);
      ctx.SetContextVariable(CTXV_FOOTNOTE, new ns.Writer());
    },
    epilogue: function(doc, ctx) {
      var output = doc.currentCtx.output;
      ns.Modules["mod:ref"].WriteFootnote(output, ctx);
      output.buff.push('</tex:i>');
    },
    context: "mode.para"
  });
}

function get_mod_data(doc) {
  return doc['mod:para'] || (doc['mod:para'] = {
    theorems: []
  });
}

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("global");
  var _CtxName="global";
  _Ctx.DefineCommand({"newtheorem":['f;#!1#[]!2#3#[]!4',function(doc,argv){
    var mod_ref = ns.Modules["mod:ref"]; // 読み込み順序の都合
    var thmname = argv[1];
    var refthmName = argv[2];
    var title = argv[3];
    var parentCounterName = argv[4];

    var theorems = get_mod_data(doc).theorems;
    if (theorems[thmname]) {
      doc.currentCtx.output.error('mod:para.cmd:newtheorem.AlreadyDefined', {name: thmname}, '\\newtheorem (mod:para)');
      return;
    }

    // 番号共有の定理環境(あれば)
    var refthm = null;
    if (refthmName != "") {
      refthm = theorems[refthmName];
      if (!refthm) {
        doc.currentCtx.output.error('mod:para.cmd:newtheorem.UndefinedTheorem', {refthm: refthmName}, '\\newtheorem (mod:para)');
        return;
      }
    }

    var thm = {};

    // counter and number
    if (refthm) {
      thm.counterName = refthm.counterName;
      thm.titleNumberSource = refthm.titleNumberSource;
    } else {
      thm.counterName = 'mod:para.cmd:newtheorem.' + thmname;
      thm.titleNumberSource = '\\arabic{' + thm.counterName + '}';
      if (parentCounterName && parentCounterName != "") {
        thm.titleNumberSource = '\\arabic{' + parentCounterName + '}.' + thm.titleNumberSource;
        doc.NewCounter(thm.counterName, parentCounterName);
      } else {
        doc.NewCounter(thm.counterName);
      }
    }

    thm.sectionCommand = mod_ref.CreateSectionCommand({
      counter: thm.counterName, refname: title + ' ' + thm.titleNumberSource,
      httag: 'h4', htclass: 'aghtex-latex-theorem', html: '# #'
    });

    doc.context_cast("mode.para").AddEnvironment(thmname, {
      prologue: function(doc, ctx) {
        var subtitle = doc.GetOptionalArgumentRaw() || '';
        doc.scanner.InsertSource('\\relax{' + subtitle + '}');
        thm.sectionCommand(doc, thmname); // h(doc, cmd)
        doc.currentCtx.output.buff.push('<tex:i class="aghtex-latex-theorem-content">');
      },
      epilogue: function() {
        doc.currentCtx.output.buff.push('</tex:i>');
      },
      context: "mode.para"
    });
    theorems[thmname] = thm;
  }]});
}

})();
//-----------------------------------------------------------------------------
(function _aghtex_include_mod_list_js() { /* main.pp.js: included from .gen/mod_list.js */
// -*- mode: js; coding: utf-8 -*- (日本語)

var TAG_UL = null;
var TAG_OL = null;
if (agh.browser.vIE) {
  TAG_UL = '<ul class="aghtex-item aghtex-ie">\r\n';
  TAG_OL = '<ol class="aghtex-enum aghtex-ie">\r\n';
} else {
  TAG_UL = '<ul class="aghtex-item">\r\n';
  TAG_OL = '<ol class="aghtex-enum">\r\n';
}

var STR_INVALID_ITEM = '環境情報の取得に失敗しました。\\item は環境の直下に記述する必要があります。';
var STR_REPLACED_CTX = "fatal: environment-context may have been replaced by someone.";

//■TODO カウンタを用いて番号を決定 (<li value="1234"> で設定可能)
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("env.itemize","mode.para");
  var _CtxName="env.itemize";
  _Ctx.DefineCommand({"item":['f;#[@aghtex-default]1',function(doc,argv){
    var envdata = doc.currentCtx["env:itemize"];
    var buff = doc.currentCtx.output.buff;
    if (envdata != null) {
      if (envdata.hasItem) {
        buff.push('</li>\r\n');
      } else {
        envdata.hasItem = true;
      }

      if (argv[1] == "@aghtex-default")
        buff.push(' <li>');
      else
        buff.push(' <li class="aghtex-itemize-marked"><tex:i class="aghtex-itemize-mark1"><tex:i class="aghtex-itemize-mark2">', argv[1], '</tex:i></tex:i>');
    } else {
      doc.currentCtx.output.error('env:itemize/missing envdata', STR_INVALID_ITEM);
    }
  }]});
}
ns.ContextFactory["mode.para"].AddEnvironment("itemize", {
  prologue: function(doc, ctx) {
    ctx["env:itemize"] = {hasItem: false};
    doc.currentCtx.output.buff.push(TAG_UL);
  },
  epilogue: function(doc, ctx) {
    var envdata = ctx["env:itemize"];
    if (envdata != null) {
      if (envdata.hasItem) doc.currentCtx.output.buff.push('</li>\r\n');
    } else {
      throw STR_REPLACED_CTX;
    }
    doc.currentCtx.output.buff.push('</ul>\r\n');
  },
  catcher: function(doc, ctx) { this.epilogue(doc, ctx); },
  context: "env.itemize"
});
ns.ContextFactory["mode.para"].AddEnvironment("enumerate", {
  prologue: function(doc, ctx) {
    ctx["env:itemize"] = {hasItem: false};
    doc.currentCtx.output.buff.push(TAG_OL);
  },
  epilogue: function(doc, ctx) {
    var envdata = ctx["env:itemize"];
    if (envdata != null) {
      if (envdata.hasItem) doc.currentCtx.output.buff.push('</li>\r\n');
    } else {
      throw STR_REPLACED_CTX;
    }
    doc.currentCtx.output.buff.push('</ol>\r\n');
  },
  catcher: function(doc, ctx) { this.epilogue(doc, ctx); },
  context: "env.itemize"
});

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("env.description","mode.para");
  var _CtxName="env.description";
  _Ctx.DefineCommand({"item":['f;#[]1',function(doc,argv){
    var output = doc.currentCtx.output;
    var buff = doc.currentCtx.output.buff;
    var envdata = doc.currentCtx["env:description"];
    if (envdata != null) {
      if (envdata.hasItem) {
        buff.push('</dd>');
      } else {
        envdata.hasItem = true;
      }
      if (argv[1] != "")
        buff.push('<dt><tex:dt>', argv[1], '</tex:dt></dt>');
      buff.push('<dd>');
    } else {
      output.error('env:itemize/missing envdata', STR_INVALID_ITEM);
    }
  }]});
}
ns.ContextFactory["mode.para"].AddEnvironment("description", {
  prologue: function(doc, ctx) {
    ctx["env:description"] = {hasItem: false};
    doc.currentCtx.output.buff.push('<dl class="aghtex-desc">\r\n');
  },
  epilogue: function(doc, ctx) {
    var envdata = ctx["env:description"];
    if (envdata != null) {
      if (envdata.hasItem) doc.currentCtx.output.buff.push('</dd>\r\n');
    } else {
      throw STR_REPLACED_CTX;
    }
    doc.currentCtx.output.buff.push('</dl>\r\n');
  },
  catcher: function(doc, ctx) { this.epilogue(doc, ctx); },
  context: "env.description"
});

})();

//-----------------------------------------------------------------------------
(function _aghtex_include_mod_ref_js() { /* main.pp.js: included from .gen/mod_ref.js */
/* -*- mode: js; coding: utf-8 -*- */

var _Mod = {};
ns.Modules["mod:ref"] = _Mod;
var CTXV_LABEL_EQ = 'mod_ref/label:eq';
var CTXV_LABEL_FIG = 'mod_ref/label:fig';
var CTXV_LABEL_TB = 'mod_ref/label:tb';

var mod_counter = ns.Modules["mod:counter"];

agh.memcpy(ns.Modules["core"].ErrorMessages, {
  "mod:ref.env:figure.cmd:label.ContextBroken": [
    "BUG/env:figure", "the context data is missing. the context data has removed or the context was replaced."],
  "mod:ref.env:table.cmd:label.ContextBroken": [
    "BUG/env:table", "the context data is missing. the context data has removed or the context was replaced."],
  "mod:ref.Document.AddContentsLine.UnsupportedContentsFile": [
    "file '{file}' n/a", "the contents file, '{file}', is not supported."],
  "mod:ref.env:thebibliography.cmd:bibitem.MissingEnvData": [
    '\\bibitem not in thebibliography',
    "failed to retrieve the environment data. the command, \\bibitem, should be used just in the thebibliography environment."],
  // "mod:ref.env:thebibliography.cmd:bibitem.MissingEnvData": [
  //   'BUG/env:thebibliography',
  //   "環境情報の取得に失敗しました。\n\\bibitem コマンドは thebibliography 環境直下にある必要があります。"]
  "mod:ref.cmd:label.EmptyLabel": [
    "empty \\label", "the argument of \\label is empty. specify the non empty name."]
});

_Mod.CreateSectionCommand = function(param) {
  var arr = param.html.split('#');
  var hasTitleNumber = arr.length == 3;

  // * param.httag 全体を括る要素の名前
  // * param.htclass 全体を括る要素のクラス名
  // * param.html    中身の html を指定する文字列
  //     文字列の中に # が一個含まれる時は、それが章題に変換される。
  //     文字列の中に # が二個含まれる時は、
  //     一つ目が章番号に変換され、二つ目が章題に変換される。
  // * param.counter セクション番号を数える為のカウンタ
  // ? param.refname
  //   関数の場合 (function(doc) {})
  //     \ref 用の文字列を生成する関数
  //     省略した時は \ref で参照する事はできない。
  //   文字列の場合
  //     \ref 用の文字列を生成する為の TeX ソース
  // ? param.get_number 章題に使う章番号の文字列を生成する関数 function(doc)
  //     param.html に二つの # が含まれる時に使われる。
  //     省略した時は代わりに refname の結果が使用される。
  //     この場合 refname 関数が設定されている必要がある。

  return ns.Command2("fA", "#[]>1#>2", function(doc, cmdName, aread) {
    // prologue
    if (param.emitnote)
      _Mod.WriteFootnote(doc.currentCtx.output, doc);
    if (param.counter)
      mod_counter.stepcounter(doc, param.counter);

    var referenceName = "";
    if (param.refname) {
      if (param.refname instanceof Function)
        referenceName = refname(doc);
      else {
        doc.scanner.InsertSource("{" + param.refname + "}");
        referenceName = doc.GetArgumentHtml();
      }
      doc.references.lastSection = referenceName;
      var id = doc.references.createSectionId(doc, param.counter);
    }

    // read arguments
    var argv = aread.read(doc, cmdName);

    // content
    var buff = doc.currentCtx.output.buff;
    if (id)
      buff.push('<', param.httag, ' class="', param.htclass, '" id="', id, '">');
    else
      buff.push('<', param.httag, ' class="', param.htclass, '">');

    if (hasTitleNumber) {
      var titleNumber = param.get_number ? param.get_number(doc) : referenceName;
      buff.push(arr[0], titleNumber, arr[1], argv[2], arr[2]);
    } else {
      buff.push(arr[0], argv[2], arr[1]);
    }

    if (param.toctype) {
      var tocline = argv[1].trim();
      if (tocline == "")
        tocline = argv[2];
      if (referenceName != "")
        tocline = referenceName + " " + tocline;
      doc.AddContentsLine(doc, "toc", param.toctype, tocline, id);
    }

    buff.push('</', param.httag, '>');
  });
};


new function(){
  var _Ctx=ns.ContextFactory.GetInstance("global");
  var _CtxName="global";
  _Ctx.DefineCommand({"label":['f;#1',function(doc,argv){
    var name = agh.Text.Escape(argv[1].trim(), "html-attr");
    if (name == "") {
      doc.currentCtx.output.error("mod:ref.cmd:label.EmptyLabel", null, "\\label (mod:ref.section)");
      return;
    }

    // 頁番号
    doc.references.label_page_map[name] = mod_counter.arabic(doc, "page");

    // 節番号
    var lastsec = doc.references.lastSection;
    if (lastsec != "")
      doc.references.displayedText['ref@' + name] = lastsec;
    if (doc.references.lastSectionId) {
      doc.references.label_id_map[name] = doc.references.lastSectionId;
    } else {
      var buff = doc.currentCtx.output.buff;
      buff.push('<a class="aghtex-label" name="aghtex.', name, '"></a>');
    }
  }]});
  _Ctx.DefineCommand({"ref":['f;#@1',function(doc,argv){
    var output = doc.currentCtx.output;
    var name = agh.Text.Escape(argv[1].trim(), "html-attr");
    var text = doc.references.displayedText['ref@' + name];
    if (text != null) {
      output.buff.push('<a class="aghtex-ref" href="#aghtex.', name, '">', text, '</a>');
    } else {
      output.buff.push('<a class="aghtex-ref" href="#aghtex.', name, '"><tex:ref ref="ref.', name, '">?</tex:ref></a>');
    }
  }]});
  _Ctx.DefineCommand({"pageref":['f;#@1',function(doc,argv){
    var output = doc.currentCtx.output;
    var name = agh.Text.Escape(argv[1].trim(), "html-attr");
    var text = doc.references.label_page_map[name];
    if (text != null)
      output.buff.push('<a class="aghtex-ref" href="#aghtex.', name, '">', text, '</a>');
    else
      output.buff.push('<a class="aghtex-ref" href="#aghtex.', name, '"><tex:ref ref="ref.', name, '">?</tex:ref></a>');
  }]});
  _Ctx.DefineCommand({"cite":['f;#@1',function(doc,argv){
    var a = argv[1].split(',');
    var buff = doc.currentCtx.output.buff;
    buff.push('[');
    for (var i = 0, iN = a.length; i < iN; i++) {
      var ref = 'bib.' + agh.Text.Escape(a[i].trim(), "html-attr");
      if (i > 0) buff.push(', ');
      buff.push('<a class="aghtex-cite" href="#aghtex.', ref, '"><tex:ref ref="', ref, '">?</tex:ref></a>');
    }
    buff.push(']');
  }]});
}

//------------------------------------------------------------------------------
//  \tableofcontents

var DOCV_FILE_TOC = 'mod:ref/toc';
var DOCV_FILE_LOF = 'mod:ref/lof';
var DOCV_FILE_LOT = 'mod:ref/lot';
function get_contents_file(doc, key) {
  var ret = doc[key];
  if (!ret) {
    ret = new ns.Writer();
    ret.data = [];
    doc[key] = ret;
  }
  return ret;
}

ns.Document.prototype.AddContentsLine = function(doc, file, type, content, id) {
  var counter = doc.GetCounter("page");
  var page = counter != null ? counter.arabic() : "?";

  switch (file) {
  case "toc":
    var f = get_contents_file(this, DOCV_FILE_TOC);
    f.buff.push(
      '<tex:i class="aghtex-toc-item"><table class="aghtex-css-table aghtex-toc-table aghtex-toc-table--', type, '"><tbody><tr class="aghtex-css-tr">',
      '<td class="aghtex-css-td aghtex-toc-cell-label">', content, '</td>',
      '<td class="aghtex-css-td aghtex-toc-cell-hfill"><tex:i class="aghtex-toc-hfill">&nbsp;</tex:i></td>',
      '<td class="aghtex-css-td aghtex-toc-cell-page">');

    if (id)
      f.buff.push('<a class="aghtex-ref" href="#', id, '">', page, '</a>');
    else
      f.buff.push(page);

    f.buff.push('</td></tr></tbody></table></tex:i>');
    f.data.push({type: type, content: content, id: id});
    break;
  case "lof":
    // TODO
  case "lot":
    // TODO
  default:
    doc.currentCtx.output.error(
      "mod:ref.Document.AddContentsLine.UnsupportedContentsFile", {file: file},
      "\\addcontentsline (mod:ref)");
    break;
  }
};

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("mode.para");
  var _CtxName="mode.para";
  _Ctx.DefineCommand({"addcontentsline":['f;#1#2#>3',function(doc,argv){
    var file = argv[1].trim();
    var type = agh.Text.Escape(argv[2].trim(), "html-attr");
    doc.AddContentsLine(doc, file, type, argv[3]);
  }]});
  _Ctx.DefineCommand({"addtocontents":['f;#1#2',function(doc,argv){
    var file = argv[1].trim();
    var content = argv[2];
    switch (file) {
    case "toc":
      var f = get_contents_file(this, DOCV_FILE_TOC);
      f.buff.push(content);
      break;
    case "lof":
      var f = get_contents_file(this, DOCV_FILE_LOF);
      f.buff.push(content);
      break;
    case "lot":
      var f = get_contents_file(this, DOCV_FILE_LOT);
      f.buff.push(content);
      break;
    }
  }]});
}

//------------------------------------------------------------------------------
//  \begin{figure}, \begin{table}

_Mod["cmd:label:eq"] = ns.Command2("f", "#1", function(doc, argv) {
  var name = agh.Text.Escape(argv[1].trim(), "html-attr");
  if (name == "") {
    doc.currentCtx.output.error("mod:ref.cmd:label.EmptyLabel", null, "\\label (mod:ref.eqno)");
    return;
  }

  // 頁番号
  doc.references.label_page_map[name] = mod_counter.arabic(doc, "page");

  // 式番号
  var counter = doc.GetCounter('equation');
  if (counter != null)
    doc.references.displayedText['ref@' + name] = counter.arabic();

  var labels = doc.GetContextVariable(CTXV_LABEL_EQ);
  if (labels == null) {
    doc.currentCtx.output.error(
      "mod:ref.env:equation.cmd:label.ContextBroken", null,
      "\\label (mod:ref.eqno)");
    return;
  }
  labels.push(name);
});

var cmd_caption_figure = ns.Command2("fA", "#>1", function(doc, cmdName, ar) {
  var counter = doc.GetCounter("figure");
  var counterNumber = '?';
  if (counter != null) {
    counter.Step();
    counterNumber = counter.arabic();
  }

  var argv = ar.read(doc, cmdName);

  var buff = doc.currentCtx.output.buff;
  buff.push(
    '<tex:i class="aghtex-figure-caption">Figure ', counterNumber, ': ',
    argv[1], '</tex:i>');
});

_Mod["cmd:label:fig"] = ns.Command2("f", "#1", function(doc, argv) {
  var name = agh.Text.Escape(argv[1].trim(), "html-attr");
  if (name == "") {
    doc.currentCtx.output.error("mod:ref.cmd:label.EmptyLabel", null, "\\label (mod:ref.figure)");
    return;
  }

  // 頁番号
  doc.references.label_page_map[name] = mod_counter.arabic(doc, "page");

  // 図番号, 表番号
  var counter = doc.GetCounter('figure');
  if (counter != null)
    doc.references.displayedText['ref@' + name] = counter.arabic();

  var labels = doc.GetContextVariable(CTXV_LABEL_FIG);
  if (labels == null) {
    doc.currentCtx.output.error(
      "mod:ref.env:figure.cmd:label.ContextBroken", null,
      "\\label (mod:ref.env:figure)");
    return;
  }
  labels.push(name);
});

var environment_params_figure = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    var va = doc.GetOptionalArgumentRaw(); // currently not used

    ctx.SetContextVariable(CTXV_LABEL_FIG, []);
    ctx.userC["caption"] = cmd_caption_figure;
    ctx.userC["label"] = _Mod["cmd:label:fig"];
  },
  epilogue: function(doc, ctx) {
    var buff = doc.currentCtx.output.buff;
    var labels = ctx.GetContextVariable(CTXV_LABEL_FIG);
    if (labels.length == 0) {
      buff.push('<tex:i class="aghtex-figure">');
    } else {
      var id = "aghtex." + labels[0];
      buff.push('<tex:i class="aghtex-figure" id="', id, '">');
      for (var i = 1; i < labels.length; i++)
        doc.references.label_id_map[labels[i]] = id;
    }

    buff.push(ctx.output.toHtml());
    buff.push('</tex:i></tex:i>');
  },
  context: "mode.para"
};
ns.ContextFactory["mode.para"].AddEnvironment("figure", environment_params_figure);
var cmd_caption_table = ns.Command2("fA", "#>1", function(doc, cmdName, ar) {
  var counter = doc.GetCounter("table");
  var counterNumber = '?';
  if (counter != null) {
    counter.Step();
    counterNumber = counter.arabic();
  }

  var argv = ar.read(doc, cmdName);

  var buff = doc.currentCtx.output.buff;
  buff.push(
    '<tex:i class="aghtex-table-caption">Table ', counterNumber, ': ',
    argv[1], '</tex:i>');
});

_Mod["cmd:label:tb"] = ns.Command2("f", "#1", function(doc, argv) {
  var name = agh.Text.Escape(argv[1].trim(), "html-attr");
  if (name == "") {
    doc.currentCtx.output.error("mod:ref.cmd:label.EmptyLabel", null, "\\label (mod:ref.table)");
    return;
  }

  // 頁番号
  doc.references.label_page_map[name] = mod_counter.arabic(doc, "page");

  // 図番号, 表番号
  var counter = doc.GetCounter('table');
  if (counter != null)
    doc.references.displayedText['ref@' + name] = counter.arabic();

  var labels = doc.GetContextVariable(CTXV_LABEL_TB);
  if (labels == null) {
    doc.currentCtx.output.error(
      "mod:ref.env:table.cmd:label.ContextBroken", null,
      "\\label (mod:ref.env:table)");
    return;
  }
  labels.push(name);
});

var environment_params_table = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    var va = doc.GetOptionalArgumentRaw(); // currently not used

    ctx.SetContextVariable(CTXV_LABEL_TB, []);
    ctx.userC["caption"] = cmd_caption_table;
    ctx.userC["label"] = _Mod["cmd:label:tb"];
  },
  epilogue: function(doc, ctx) {
    var buff = doc.currentCtx.output.buff;
    var labels = ctx.GetContextVariable(CTXV_LABEL_TB);
    if (labels.length == 0) {
      buff.push('<tex:i class="aghtex-table">');
    } else {
      var id = "aghtex." + labels[0];
      buff.push('<tex:i class="aghtex-table" id="', id, '">');
      for (var i = 1; i < labels.length; i++)
        doc.references.label_id_map[labels[i]] = id;
    }

    buff.push(ctx.output.toHtml());
    buff.push('</tex:i></tex:i>');
  },
  context: "mode.para"
};
ns.ContextFactory["mode.para"].AddEnvironment("table", environment_params_table);

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("env.thebibliography","mode.para");
  var _CtxName="env.thebibliography";
  _Ctx.DefineCommand({"bibitem":['f;#!1',function(doc,argv){
    var buff = doc.currentCtx.output.buff;
    var envdata = doc.currentCtx["env:thebibliography"];
    if (envdata != null) {
      if (envdata.hasItem) {
        buff.push('</li>\r\n');
      } else {
        envdata.hasItem = true;
      }

      var name = agh.Text.Escape(argv[1].trim(), "html-attr");
      buff.push(' <li id="aghtex.bib.', name, '">');

      var counter = doc.GetCounter('enumiv');
      if (counter != null) {
        counter.Step();
        var c = counter.arabic();
        buff.push("[", c, "] ");
        doc.references.displayedText['bib@' + name] = c;
      }
    } else {
      doc.currentCtx.output.error(
        "mod:ref.env:thebibliography.cmd:bibitem.MissingEnvData", null,
        "\\bibitem");
    }
  }]});
}

//------------------------------------------------------------------------------
//  \begin{thebibliography}

ns.ContextFactory["mode.para"].AddEnvironment("thebibliography", {
  prologue: function(doc, ctx) {
    var maxItems = doc.GetArgumentRaw();

    ctx["env:thebibliography"] = {hasItem: false, maxItems: maxItems};
    doc.currentCtx.output.buff.push('<h2 class="aghtex-article-thebibliography">References</h2>');
    doc.currentCtx.output.buff.push('<ul class="aghtex-thebibliography">');

    var counter = doc.GetCounter('enumiv');
    if (counter != null) counter.Clear();
  },
  epilogue: function(doc, ctx) {
    var envdata = ctx["env:thebibliography"];
    if (envdata != null) {
      if (envdata.hasItem) doc.currentCtx.output.buff.push('</li>\r\n');
    } else {
      throw STR_REPLACED_CTX;
    }
    doc.currentCtx.output.buff.push('</ul>\r\n');
  },
  catcher: function(doc, ctx) { this.epilogue(doc, ctx); },
  context: "env.thebibliography"
});

agh.memcpy(ns.Document.prototype, {
  getReferenceText: function get_reference_text(type, name) {
    switch (type) {
    case "ref":
      return this.references.displayedText['ref@' + name] || null;
    case "bib":
      return this.references.displayedText['bib@' + name] || null;
    case "contents":
      if (name == "toc" || name == "lof" || name == "lot") {
        var f = this["mod:ref/" + name];
        if (f != null) return f.toHtml();
      }
      return null;
    default:
      return null;
    }
  },
  ResolveReferences: function() {
    if (this.html == null) return;
    var self = this;
    return this.html = this.html.replace(/<tex:ref ref="(\w+)\.([^"<>]+)">\?<\/tex:ref>|<a class="aghtex-ref" href="#aghtex\.([^"]+)">/g, function($0, $1, $2, $B1) { //
      if ($1 != null && $1 != "") {
        return this.getReferenceText($1, $2) || $0;
      } else if ($B1 != "" && $B1) {
        if ($B1 in self.references.label_id_map)
          return '<a class="aghtex-ref" href="#' + self.references.label_id_map[$B1] + '">';
        else
          return $0;
      } else
        return $0;
    });
  },
  ResolveReference: function(target) {
    // a.aghtex-ref
    var elems = target.getElementsByTagName('a');
    for (var i = 0, iN = elems.length; i < iN; i++) {
      var elem = elems[i];
      if (!/(?:^|\s)aghtex-ref(?:\s|$)/.test(elem.className)) continue;
      if (!elem.href.startsWith('#aghtex.')) continue;
      var label = elem.href.substr(8);
      if (label in this.references.label_id_map)
        elem.href = '#' + this.references.label_id_map[label];
    }

    // tex:ref
    var elems = target.getElementsByTagName('tex:ref');
    for (var i = 0, iN = elems.length; i < iN; i++) {
      var elem = elems[i], m;
      var ref = elem.getAttribute("ref");
      if (!ref) continue;
      var m = ref.match(/^(\w+)\.(.*)$/);
      if (!m) continue;
      var text = this.getReferenceText(m[1], m[2]);
      if (!text) continue;
      elem.removeAttribute("ref");
      elem.innerHTML = agh.Text.Escape(text, "html");
    }
  }
});

//------------------------------------------------------------------------------
//  \footnote

var CTXV_FOOTNOTE = 'mod_ref/footnote';
var CTXV_MPFOOTNOTE = 'mod_ref/is_mpfootnote';

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("mode.para");
  var _CtxName="mode.para";

  var footnote = {
    get_counter: function(doc) {
      return doc.GetCounter("footnote");
    },
    write_mark: function(doc, output, label, mark) {
      output.buff.push('<a class="aghtex-footnotemark" href="#aghtex-fn-', label, '">', mark, '</a>');
    },
    add_item: function(doc, number, content, label) {
      var output = doc.GetContextVariable(CTXV_FOOTNOTE);
      if (output != null) {
        output.buff.push(
          '<li class="aghtex-footnotetext"><tex:i id="aghtex-fn-', label,
          '" class="aghtex-footnotetext-mark">', number,
          '</tex:i> ', content, '</li>');
      } else {
        output = doc.currentCtx.output;
        output.buff.push(
          ' [', number, ' <tex:i class="aghtex-footnotetext-inline">',
          content, '</tex:i>] ');
      }
    }
  };
  var mpfootnote = {
    get_counter: function(doc) {
      return doc.GetCounter("mpfootnote");
    },
    write_mark: function(doc, output, label, mark) {
      output.buff.push('<a class="aghtex-footnotemark" href="#aghtex-mpfn-', label, '">*', mark, '</a>');
    },
    add_item: function(doc, number, content, label) {
      var output = doc.GetContextVariable(CTXV_FOOTNOTE);
      if (output != null) {
        output.buff.push(
          '<li class="aghtex-footnotetext"><tex:i id="aghtex-mpfn-', label,
          '" class="aghtex-footnotetext-mark">*', number,
          '</tex:i> ', content, '</li>');
      } else {
        output = doc.currentCtx.output;
        output.buff.push(
          ' [*', number, ' <tex:i class="aghtex-footnotetext-inline">',
          content, '</tex:i>] ');
      }
    }
  };

  function get_footnote(doc) {
    if (doc.GetContextVariable(CTXV_MPFOOTNOTE))
      return mpfootnote;
    else
      return footnote;
  }

  _Mod.WriteFootnote = function(output, ctx) {
    //! @param[out] output output stream : ns.Writer
    //! @param[in]  ctx    context of footnotes : ns.Context or ns.Document

    var fn_out = ctx.GetContextVariable(CTXV_FOOTNOTE);
    if (!fn_out) return;

    var ht = fn_out.toHtml();
    if (ht == "") return;

    fn_out.clear();
    output.buff.push('<tex:i class="aghtex-footnote"><ul class="aghtex-footnote">', ht, '</ul></tex:i>');
  };

  _Ctx.DefineCommand({"footnotemark":['f;#[]1',function(doc,argv){
    var fn = get_footnote(doc);

    var output = doc.currentCtx.output;
    var c = agh.Text.Escape(argv[1].trim(), "html-attr");
    if (c == "") {
      var counter = fn.get_counter(doc);
      if (counter != null) {
        counter.Step();
        c = counter.arabic();
      } else {
        c = "?";
      }
    }

    fn.write_mark(doc, output, c, c);
  }]});

  _Ctx.DefineCommand({"footnotetext":['f;#[]1#mode.para>2',function(doc,argv){
    var fn = get_footnote(doc);

    var c = agh.Text.Escape(argv[1].trim(), "html-attr");
    if (c == "") {
      var counter = fn.get_counter(doc);
      if (counter != null)
        c = counter.arabic();
      else
        c = "?";
    }

    fn.add_item(doc, c, argv[2], c);
  }]});

  _Ctx.DefineCommand({"footnote":['f;#[]1#mode.para>2',function(doc,argv){
    var fn = get_footnote(doc);

    var c = agh.Text.Escape(argv[1].trim(), "html-attr");
    if (c == "") {
      var counter = fn.get_counter(doc);
      if (counter != null) {
        counter.Step();
        c = counter.arabic();
      } else {
        c = "?";
      }
    }

    var output = doc.currentCtx.output;
    fn.write_mark(doc, output, c, c);
    fn.add_item(doc, c, argv[2], c);
  }]});
}


})();
//-----------------------------------------------------------------------------
(function _aghtex_include_mod_array_js() { /* main.pp.js: included from .gen/mod_array.js */
// -*- mode: js -*-

agh.memcpy(ns.Modules["core"].ErrorMessages, {
  'mod:array.env:array.ctx:align.UnknownAlignmentCharacter': [
    "unknown align char '{ch}'",
    "指定した文字 '{ch}' は、表組みの alignment 指定子として未知です。\n"
      +"lcr 又は @, p, * 等を組み合わせて指定して下さい。"],
  'mod:array.cmd:multicolumn.DoubleAlignmentCharacter': [
    "extra align spec",
    "'{ch}' は二回目の alignment の設定です。\n"
      +"\\multicolumn に対して複数の alignment を設定する事は出来ません。"],
  'mod:array.cmd:multicol.EmptyAlignment': [
    "missing alignment", "\\multicolumn の第二引数に alignment の指定が含まれていません。\nlcr の何れかを指定して下さい。"],
  'mod:array.cmd:multicol.MulticolAlreadyHasContent': [
    "invalid \\{cmdName}", "Cells with contents cannot be turned into muticolumn cells."],
  'mod:array.cmd:multicol.MulticolAlreadyMulticol': [
    "invalid \\{cmdName}", "The multicolumn commands cannot be specified more than once in a single cell."],
  'mod:array.env:array.ctx:align.ltr:p.MissingArgument': [
    "missing arg", "alignment 指定子 p には引数が必要です。\np{width} の形式で引数を指定して下さい。"],
  'mod:array.env:array.ctx:align.ltr:*.InvalidRepeatNumber': [
    "invalid arg for '*'", "* の第一引数には繰り返し回数を示す正の整数値を指定して下さい。"],
  'mod:array.env:array.ctx:align.ltr:*.EmptyContent': [
    "missing arg", "* に第二引数がありません。\n第二引数には、繰り返す内容を指定して下さい。"],
  "mod:array.env:array.ExtraContentAfterMulticol": [
    "extra cell content",
    "\\multicol を指定した直後にセル内容を記述する事は出来ません。\n"
      + "\\ 又は & を用いて次の列か次の行に移ってから内容を既述して下さい。"],
  'mod:array.env:array.cmd:cline.InvalidRange': [
    "'{cmdName}' invalid arg",
    "第一引数 '{range}' は無効な形式です。\n"
      + "\\cline コマンドの第一引数は /\\d+\\-\\d+/ の形で指定して下さい。"],
  'mod:array.env:array.InvalidVerticalAlign': [
    "invalid valign",
    "指定した値 '{valign}' は垂直位置指定として不適切です。\r\ntbm のいずれかの値を指定して下さい。"],
  'mod:array.env:array.ExtraColumn': [
    "extra column", "指定された列数よりも多くの列が指定されています。\nalignment を正しく指定して下さい。"],
  'mod:array.env:eqnarray.ExtraColumn': [
    "extra column", "既定の列数よりも多くの列が指定されています。\neqnarray 環境では三列までしか使用する事は出来ません。"],
  'mod:array.env:gather.ExtraColumn': [
    "extra column", "gather 環境では複数の列を指定する事はできません。\\begin{align} 環境の使用を検討して下さい。"],
  'mod:array.env:eqnarray.ContextBroken': [
    "BUG/env:eqnarray", "ctx:env.eqnarray/cmd:\\\\: array context is not set. this command should be used inside env:eqnarray."],
  'mod:array.env:array.InvalidNextLine': [
    "invalid '{cmdName}'",
    "environment array: この場所で次の行に移る事は出来ません。"],
  'mod:array.env:array.InvalidNextColumn': [
    "invalid '{cmdName}'",
    "environment array: この場所で次の列に移る事は出来ません。"],
  'mod:array.env:array.InvalidHorizontalLine': [
    "invalid '{cmdName}'",
    "environment array: この場所で横罫線を設定する事は出来ません。"],
  'mod:array.env:array.InvalidMulticolumn': [
    "invalid '{cmdName}'",
    "environment array: この場所で複数列セルを宣言する事は出来ません。"],
  'mod:array.env:array.InvalidHdotsfor': [
    "invalid '{cmdName}'",
    "environment array: この場所で水平点線を宣言する事は出来ません。"],
  'mod:array.env:alignat.NegativeColumnNumber': [
    "invalid column number",
    "environment alignat: '{arg1}' は不正な列数です。列数には正の整数を指定して下さい。"]
});

var mod_core = ns.Modules["core"];
var mod_base = ns.Modules["mod:base"];
var _Mod = ns.Modules["mod:array"] = {};

agh.Namespace("ArrayTable", ns);
var _at = ns.ArrayTable;
_at.toAlign = (function() {
  var aligns = {
    "r": ' align="right"',
    "c": ' align="center"',
    "l": ' align="left"',
    "-": ''
  };
  return function(ltr) {
    if (ltr in aligns) return aligns[ltr];
    return "";
  };
})();
_at.toAlignClassName = function(ltr) {
  if (ltr == "r") return ' aghtex-array-cell--right';
  if (ltr == "c") return ' aghtex-array-cell--center';
  if (ltr == "l") return ' aghtex-array-cell--left';
  return "";
};
//********************************************************************
//
//    class Cell
//
//********************************************************************
_at.Cell = function(parent, x, y) {
  this.table = parent;
  this.x = x;
  this.y = y;
};
agh.memcpy(_at.Cell.prototype, {
  //****************************************************************
  //    既定値
  //****************************************************************
  content: "",     // セル内容
  is_hdots: false, // 水平に点線を表示するかどうか
  borderL: null, // Array of 1 or "@ string"
  borderR: null, // Array of 1 or "@ string"
  borderT: null,
  colspan: 1,
  is_spanpad: false,
  width: null,
  paddingL: null,
  paddingR: null,
  align: null,
  //----------------------------------------------------------------
  get_col: function() {
    return this.table.col(this.y);
  },
  get_bL: function() {
    return this.borderL || this.y == 0 && this.table.col(0).borderL;
  },
  get_bR: function() {
    return this.borderR || this.table.col(this.y).borderR;
  },
  get_bT: function() {
    if (this.x != 0) return false;
    if (this.borderT != null) return this.borderT;
    return !!this.table.borderH[0];
  },
  get_bB: function() {
    if (this.borderB != null) return this.borderB;
    return !!this.table.borderH[this.x + 1];
  },
  get_width: function() {
    if (this.width != null) return this.width;
    return this.table.col(this.y).width;
  },
  get_pL: function() {
    if (this.paddingL != null) return this.paddingL;
    return this.get_col().paddingL;
  },
  get_pR: function() {
    if (this.paddingR != null) return this.paddingR;
    return this.get_col().paddingR;
  },
  get_pB: function() {
    var line = this.table.line(this.x);
    if (line) return line.paddingBottom;
    return null;
  },
  get_align: function() {
    if (this.align != null) return this.align;
    return this.get_col().halign;
  },
  //****************************************************************
  //    幾何
  //****************************************************************
  /// <summary>
  /// この cell を表示するのに要する列数を返します。
  /// </summary>
  //cols: function() {
  //  return 1 + this.cols_bL() + this.cols_bR();
  //},
  cols_bL: function(bL) {
    // 左 border の取得
    bL = bL || this.get_bL();
    if (!bL) return 0;

    var r = 0;
    var right = true;
    agh.Array.eachR(bL, function(b) {
      if (!right | (right = b != 1)) r++; // (右が線) or (今回升) ⇒ ret++
    });

    return r;
  },
  cols_bR: function(bR) {
    bR = bR || this.get_bR();
    if (!bR) return 0;

    var r = 0;
    var left = true; // 左が升 (新しい td) か否か
    agh.Array.each(bR, function(b) {
      if (!left | (left = b != 1)) r++; // (左が線) or (今回升) ⇒ ret++
    });
    return r;
  },
  //****************************************************************
  //    出力
  //****************************************************************
  write: function(output) {
    if (this.is_spanpad) return;

    // 総 td@colspan 計算 (multicolumn も考慮)
    var x = this.x;
    var y = this.y;
    var totspan = 0;
    for (var i = 0; i < this.colspan; i++)
      totspan += this.table.col(y + i).tdc;

    // 書き出し (multicolumn の場合は最後の cell が担当)
    var wcell = this.table.cell(x, y + this.colspan - 1);
    wcell.write_internal(
      output,
      this.get_bL(),
      wcell.get_bR(),
      totspan);
  },
  write_internal: function(output, bL, bR, tdspan) {
    bL = bL || [];
    bR = bR || [];
    var sty = new ns.Writer();
    var sbuff = sty.buff;

    // calc main-td colspan
    tdspan -= this.cols_bR(bR) + this.cols_bL(bL);

    // border の描画方法
    //   [左 border], [内容], [右 border] の順に内容を出力する。
    //   できるだけ少ない列数で出力を行う為に、
    //   "中心TD" ([内容] を表示する為の TD) の左右の border も利用する。
    //   つまり、[左 border] の最後の縦線、[右 border] の最初の縦線は "中心TD" を用いて表示する。
    //
    // bbL bbR bbT bbB: "中心TD" の上下左右に border を表示するかどうか
    var bbL = agh.Array.last(bL) === 1;
    var bbR = agh.Array.first(bR) === 1;
    var bbT = this.get_bT();
    var bbB = this.get_bB();
    if (bbL || bbR || bbT || bbB) {
      sbuff.push('border-width:', bbT ? 1 : 0, 'px ', bbR ? 1 : 0, 'px ', bbB ? 1 : 0, 'px ', bbL ? 1 : 0, 'px!important;');
      if (bbL) bL = bL.slice(0, -1);
      if (bbR) bR = bR.slice(1);
    }

    var pL = this.get_pL();
    if (pL != null) sbuff.push('padding-left:', pL, '!important;');
    var pR = this.get_pR();
    if (pR != null) sbuff.push('padding-right:', pR, '!important;');
    var pB = this.get_pB();
    if (pB != null) sbuff.push('padding-bottom:', pB, '!important;');
    var width = this.get_width();
    if (width != null) sbuff.push('width:', width, '!important;');

    this.write_bL(output, bL, bbT, bbB);

    // 本体書き出し
    var className = 'aghtex-array-cell';
    var content = this.content;
    if (this.is_hdots) {
      var hdots_type = 'hdots';
      if (agh.browser.vIE < 10) hdots_type = 'hdots-ie9';
      content = '<tex:i class="aghtex-array-' + hdots_type + '"></tex:i>' + content;
      className += ' aghtex-array-cell--hdots';
    }
    className += _at.toAlignClassName(this.get_align());

    var buff = output.buff;
    buff.push(' <td class="aghtex-css-td ', className, '"');
    buff.push(_at.toAlign(this.get_align()));
    if (tdspan > 1) buff.push(' colspan="', tdspan, '"');
    var style = sty.toHtml();
    if (style.length > 0) {
      buff.push(' style="', style, '"');
      // ■ padding
    }
    buff.push('>', content, '</td>\n');

    this.write_bR(output, bR, bbT, bbB);
  },
  write_bL: function(output, bL, bT, bB) {
    var bw_left   = 0;
    var bw_top    = bT ? 1 : 0;
    var bw_bottom = bB ? 1 : 0;
    var bw_right  = 0;

    var buff = output.buff;
    for (var i = 0, iN = bL.length; i < iN; i++) {
      var border = bL[i];
      if (typeof border == "string" || border instanceof String) {
        buff.push(
          ' <td class="aghtex-css-td aghtex-array-border-txt" style="border-width:',
          bw_top, 'px ', bw_right, 'px ', bw_bottom, 'px ', bw_left, 'px!important;">',
          border, '</td>\n');

        bw_left = 0;
      } else if (border === 1) {
        if (bw_left > 0) {
          buff.push(
            ' <td class="aghtex-css-td aghtex-array-border-zw" style="border-width:',
            bw_top, 'px ', bw_right, 'px ', bw_bottom, 'px ', bw_left, 'px!important;"></td>\n');
        }

        bw_left = 1;
      } else {
//#debug
        alert("Fatal @ array2.ctx/write_bL\n予期しない境界線指定子です。");
        throw new Error("unexpected border-spec");
//#end debug
      }
    }

    if (bw_left > 0) {
      buff.push(
        ' <td class="aghtex-css-td aghtex-array-border-zw" style="border-width:',
        bw_top, 'px ', bw_right, 'px ', bw_bottom, 'px ', bw_left, 'px!important;"></td>\n');
    }
  },
  write_bR: function(output, bR, bT, bB) {
    var bw_left    = 0;
    var bw_top     = bT ? 1 : 0;
    var bw_bottom  = bB ? 1 : 0;
    var bw_right   = 0;
    var td_content = null;

    function emit_cell() {
      if (td_content != null) {
        buff.push(
          ' <td class="aghtex-css-td aghtex-array-border-txt" style="border-width:',
          bw_top, 'px ', bw_right, 'px ', bw_bottom, 'px ', bw_left, 'px!important;">',
          td_content, '</td>\n');

        bw_right = 0;
        td_content = null;
      } else {
        buff.push(
          ' <td class="aghtex-css-td aghtex-array-border-zw" style="border-width:',
          bw_top, 'px ', bw_right, 'px ', bw_bottom, 'px ', bw_left, 'px!important;"></td>\n');

        bw_right = 0;
      }
    }

    var buff = output.buff;
    for (var i = 0, iN = bR.length; i < iN; i++) {
      var border = bR[i];
      if (typeof border == "string" || border instanceof String) {
        if (td_content != null)
          emit_cell();

        td_content = border;
      } else if (border === 1) {
        bw_right = 1;
        emit_cell();
        // assert(bw_right == 0);
      } else {
//#debug
        alert("Fatal @ array2.ctx/write_bL\n予期しない境界線指定子です。");
        throw new Error("unexpected border-spec");
//#end debug
      }
    }

    if (td_content != null)
      emit_cell();
  },
  "0": 0
});
//********************************************************************
//
//    class Column
//
//********************************************************************
_at.Column = function(parent, y, copye) {
  this.table = parent;
  this.y = y;

  // この列を表示するのに使用する td の数を保持します。
  // 表示の直前 (Table#write) に update_tdc によって更新されます。
  this.tdc = 1;
  this.tdcL = 0;
  this.tdcR = 0;

  if (copye instanceof _at.Column) {
    this.width = copye.width;
    this.halign = copye.halign;
    this.borderL = copye.borderL;
    this.borderR = copye.borderR;
    this.paddingL = copye.paddingL;
    this.paddingR = copye.paddingR;
  }
};
agh.memcpy(_at.Column.prototype, {
  //****************************************************************
  //    既定値
  //****************************************************************
  borderL: null,
  borderR: null,
  halign: null,
  width: null,
  paddingL: null,
  paddingR: null,
  //****************************************************************
  //    設定
  //****************************************************************
  add_bL: function(b) {
    (this.borderL || (this.borderL = [])).push(b);
  },
  add_bR: function(b) {
    (this.borderR || (this.borderR = [])).push(b);
  },
  //****************************************************************
  //    出力
  //****************************************************************
  /// <summary>
  /// この列を表示するのに必要な td の数を計算します。
  /// </summary>
  update_tdc: function() {
    var table = this.table;
    var maxL = 0;
    var maxR = 0;
    for (var x = 0; x < table.xM; x++) {
      var c = table.cell(x, this.y);
      var l = c.cols_bL();
      if (l > maxL) maxL = l;
      var r = c.cols_bR();
      if (r > maxR) maxR = r;
    }
    this.tdc = maxL + 1 + maxR;
    this.tdcL = maxL;
    this.tdcR = maxR;

    return this.tdc;
  },
  _isPaddingLeftText: function() {
    var b = null;
    if (this.borderL != null) {
      b = agh.Array.last(this.borderL);
    } else if (this.y > 0) {
      var prev = this.table.col(this.y - 1).borderR;
      if (prev != null) b = agh.Array.last(prev);
    }
    return (typeof b == "string" || b instanceof String);
  },
  _isPaddingRightText: function() {
    var b = null;
    if (this.borderR != null)
      b = agh.Array.first(this.borderR);
    return (typeof b == "string" || b instanceof String);
  },
  update_padding: function() {
    var table = this.table;

    // paddingL
    if (this._isPaddingLeftText())
      this.paddingL = "0px";
    else if (this.y == 0)
      this.paddingL = "0.3ex"; // 最左列既定値

    // paddingR
    if (this._isPaddingRightText())
      this.paddingR = "0px";
    else if (this.y == this.table.yM - 1)
      this.paddingR = "0.3ex"; // 最右列既定値
  }
});
_at.CreateDummyColumn = function() {
  var table = new _at.Table();
  var y = 0;
  return new _at.Column(table, y);
};
//********************************************************************
//
//    ctx Align
//
//********************************************************************
//    AlignSetter
//====================================================================
_at.AlignSetterKey = new Object();
_at.TableAlignSetter = function(table) {
  this.table = table;
};
agh.memcpy(_at.TableAlignSetter.prototype, {
  setAlign: function(ltr) {
    var t = this.table;
    if (t.col().halign) t.next_col();
    t.col().halign = ltr;
  },
  setWidth: function(w) {
    this.table.col().width = w;
  },
  setBorder: function(b) {
    var t = this.table;
    if (t.cy == 0 && !t.col().halign) {
      t.col().add_bL(b); // 一番左の境界線
    } else {
      t.col().add_bR(b);
    }
  },
  idKey: _at.AlignSetterKey
});
_at.MulticolAlignSetter = function(doc, lcell, rcell) {
  this.doc = doc;
  this.lcell = lcell;
  this.rcell = rcell;
  this.align_set = false;
};
agh.memcpy(_at.MulticolAlignSetter.prototype, {
  setAlign: function(ltr) {
    if (this.align_set) {
      this.doc.currentCtx.output.error(
        'mod:array.cmd:multicolumn.DoubleAlignmentCharacter', {ch: ltr},
        "\\multicolumn.argument#1");
      return;
    }
    this.rcell.align = ltr;
    this.align_set = true;
  },
  setWidth: function(w) {
    this.rcell.width = w;
  },
  setBorder: function(b) {
    if (!this.align_set) {
      this.lcell.borderL.push(b);
    } else {
      this.rcell.borderR.push(b);
    }
  },
  idKey: _at.AlignSetterKey
});
//====================================================================
//    AlignHandlers
//====================================================================
// text_modifier として動作するハンドラ達
_at.AlignHandlers = {
  getAlignSetter: function(doc, ltr) {
    var setter = doc.currentCtx.CTXDATA;
//#debug
    if (setter.idKey !== _at.AlignSetterKey) {
      alert([
        "LOGIC_ERROR",
        "場所: array2.ctx/context env.array.align/command '" + ltr + "'",
        "状況: align 指定コマンドが呼び出されましたが、",
        "　　　ここは env.array.align context 直下ではありません。",
        "・env.array.align の text_modifier が子孫 context に混入している可能性",
        "・env.array.align で定義されたコマンドが子孫 context に混入している可能性"
      ].join("\n"));
      throw new Error("internal error");
    }
//#end debug
    return setter;
  },
  processText: function(doc, text) {
    // 最後の文字以外
    var iLast = text.length - 1;
    for (var i = 0; i < iLast; i++) {
      var c = text.substr(i, 1);
      if (!(c in this)) c = 0; // 既定のハンドラ
      this[c](doc, c);
    }

    // 最後の文字は文字ハンドラとして動作
    var c = text.substr(iLast, 1);
    var lh = doc.currentCtx.GetLetterHandler(c);
    if (lh == null) {
      doc.scanner.Next();
      this[0](doc, c);
      return;
    }
    lh(doc, c);
  },
  //-- handlers
  c: function(doc, ltr) {
    var setter = _at.AlignHandlers.getAlignSetter(doc, ltr);
    if (setter != null) setter.setAlign(ltr);
  },
  p: function(doc, ltr) {
    // エラー (之が呼び出される＝text の最後の文字ではない＝引数がない)
    doc.currentCtx.output.error(
      'mod:array.env:array.ctx:align.ltr:p.MissingArgument', null,
      "ltr:p (ctx:env.array.align)");
  },
  "0": function(doc, ltr) {
    doc.currentCtx.output.error(
      'mod:array.env:array.ctx:align.UnknownAlignmentCharacter', {ch: ltr},
      "letter '" + ltr + "' (ctx:env.array.align)");
  }
};
agh.memcpy(_at.AlignHandlers, _at.AlignHandlers, {l: "c", r: "c"});
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("env.array.align","sub.braced");
  var _CtxName="env.array.align";
  _Ctx.key = "env.array.align";
  _Ctx.initializer = function(mainctx) {
    if (mainctx[_Ctx.key]) return;
    mainctx[_Ctx.key] = true;

    // 直接
    if (!mainctx.ContainsBaseContext(this)) return;

    // (既に text_modifier が登録されていても無視)
    mainctx.text_modifier = function(doc, text) {
      if (text.length == 0) {
        doc.scanner.Next();
        return text;
      }

      _at.AlignHandlers.processText(doc, text);

      return "";
    };
  };
  //================================================================
  //>#1 を読み取るのに使用する context は…? 出来るだけ親 ctx が良い
  //→親に対応する context 名 .. を定義した。
  _Ctx.DefineLetter({
    "lcr": function(doc, cmdName) {
      doc.scanner.Next();
      _at.AlignHandlers[cmdName](doc, cmdName);
    },
    '|': function(doc, cmdName) {
      doc.scanner.Next();
      var setter = _at.AlignHandlers.getAlignSetter(doc, '|');
      if (setter != null) setter.setBorder(1);
    },
    'p': ['f;#D', function(doc, argv) {
      var setter = _at.AlignHandlers.getAlignSetter(doc, 'p');
      if (setter != null) {
        setter.setAlign('l');
        setter.setWidth(argv[1].toString());
      }
    }],
    '@': ['f;#..>1', function(doc, argv) {
      var setter = _at.AlignHandlers.getAlignSetter(doc, '@');
      if (setter != null) setter.setBorder(argv[1]);
    }],
    '*': ['f;#..!1#@2', function(doc, argv) {
      var output = doc.currentCtx.output;
      var i = parseInt(argv[1]);
      if (isNaN(i) || i < 1) {
        output.error(
          'mod:array.env:array.ctx:align.ltr:*.InvalidRepeatNumber', null,
          "ltr:* (ctx:env.array.align)");
        i = 1;
      }

      if (argv[2] == null) {
        output.error(
          'mod:array.env:array.ctx:align.ltr:*.EmptyContent', null,
          "ltr:* (ctx:env.array.align)");
        return;
      }

      // 挿入
      doc.scanner.InsertSource(argv[2].toString().repeat(i));
    }],
    "!\"#$'()=~-^`{[;:]+,./&<>?_&<>": function(doc, cmdName) {
      doc.scanner.Next();
      _at.AlignHandlers[0](doc, cmdName);
    },
    "\0\b\t\n\v\f\r 　": mod_base["cmd:relax"],
    "\x01\x02\x03\x04\x05\x06\x07\x0e\x0f": mod_base["cmd:relax"],
    "\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f": mod_base["cmd:relax"]
  });
}
//********************************************************************
//
//    class Table
//
//********************************************************************
_at.Table = function() {
  this.cells = [];
  this.borderH = [];  // 水平線データ

  this.cols = [];  // 列情報 [new Column, ...]

  // 行情報 [{paddingBottom, }, ...]
  //   paddingBottom は \\[1cm] で指定される vskip により設定される。
  //   行に属する各セルに paddingBottom を出力する。
  this.lines = [];
};
agh.memcpy(_at.Table.prototype, {
  //****************************************************************
  //    既定値
  //****************************************************************
  xM: 0,    // 行列の横の大きさ
  yM: 0,    // 行列の縦の大きさ
  cx: 0,
  cy: 0,
  valign: "m",

  m_defaultCol: null,
  m_subsup: null,
  //****************************************************************
  //    データ
  //****************************************************************
  cell: function(x, y) {
    if (x == null) x = this.cx;
    if (y == null) y = this.cy;
    while (x >= this.xM)
      this.cells[this.xM++] = [];
    if (y >= this.yM) this.yM = y+1;

    return this.cells[x][y] || (this.cells[x][y] = new _at.Cell(this, x, y));
  },
  line: function(x) {
    if (x == null) x = this.cx;
    var line = this.lines[x];
    if (line)
      return line;
    else
      return this.lines[x] = {};
  },
  col: function(y) {
    if (y == null) y = this.cy;
    if (y >= this.yM) this.yM = y+1;

    var column = this.cols[y];
    if (column)
      return column;
    else if (this.m_defaultCol)
      return this.cols[y] = new _at.Column(this, y, this.m_defaultCol);
    else
      return this.cols[y] = this.col_hookCreateNew(y);
  },
  col_hookCreateNew: function(y) {
    /// <summary>
    /// 列オブジェクトを初期化します。
    /// 新しく作成される列に変更を加えたい場合はこの関数を置き換えて下さい。
    /// </summary>
    return new _at.Column(this, y);
  },
  default_col: function() {
    if (!this.m_defaultCol)
      this.m_defaultCol = _at.CreateDummyColumn();
    return this.m_defaultCol;
  },
  //****************************************************************
  //    align 設定
  //****************************************************************
  // next_col() で移動
  //----------------------------------------------------------------
  clear_pos: function() {
    this.cy = 0;
    this.cx = 0;
  },
  //****************************************************************
  //    設定
  //****************************************************************
  // 水平線
  getHorizontalLines: function(row) {
    return this.borderH[row] || 0;
  },
  addHorizontalLines: function(row, count) {
    if (this.borderH[row] == null)
      this.borderH[row] = 0;

    this.borderH[row] += count || 1;
  },
  getHtmlRowCount: function() {
    var r = this.xM;
    for (var x = 0; x <= this.xM; x++) {
      var h = this.getHorizontalLines(x) - 1;
      if (h > 0) r += h;
    }
    return r;
  },
  //----------------------------------------------------------------
  next_col: function() {
    this.cy++;
  },
  next_row: function() {
    this.cx++;
    this.cy = 0;
  },
  set_hline: function() {
    this.addHorizontalLines(this.cx, 1);
  },
  _multispan_checkExistingCellContents: function(doc, commandName) {
    if (this.cell().is_multicol) {
      doc.currentCtx.output.error(
        'mod:array.cmd:multicol.MulticolAlreadyMulticol', {cmdName: commandName},
        "\\" + commandName + " (ctx:array)");
      return false;
    }

    var cellContent = doc.currentCtx.output.toHtml().trim();
    if (cellContent !== "") {
      doc.currentCtx.output.error(
        'mod:array.cmd:multicol.MulticolAlreadyHasContent', {cmdName: commandName},
        "\\" + commandName + " (ctx:array)");
    }

    return true;
  },
  _multispan_connectHorizontalCells: function(span) {
    this.cell().colspan = span;
    this.cell().is_multicol = true;
    for (var i = 1; i < span; i++) {
      var c = this.cell(this.cx, this.cy + i);
      c.is_spanpad = true;
      c.is_multicol = true;
    }
  },
  set_multicol: function(doc, span, align, content) {
    if (!this._multispan_checkExistingCellContents(doc, "multicolumn")) {
      doc.currentCtx.output.buff.push(content);
      return;
    }
    this._multispan_connectHorizontalCells(span);

    // 内容の設定
    var lcell = this.cell();
    this.cy += span - 1;
    var rcell = this.cell();
    rcell.content = content;

    // align の解釈
    lcell.borderL = [];
    rcell.borderR = [];

    var ctx_aln = doc.context_cast(["sub.braced", "env.array.align"]);
    ctx_aln.CTXDATA = new _at.MulticolAlignSetter(doc, lcell, rcell);
    doc.scanner.InsertSource("{" + align + "}");
    doc.scanner.Next(); // "{" の次
    var r = doc.Read(ctx_aln);
    if (r) doc.currentCtx.output.buff.push(r);

    if (rcell.align == null) {
      doc.currentCtx.output.error(
        'mod:array.cmd:multicol.EmptyAlignment', null,
        "\\multicolumn (ctx:array)");
    }
  },
  set_hdots: function(doc, span) {
    if (!this._multispan_checkExistingCellContents(doc, "hdotsfor")) return;
    this._multispan_connectHorizontalCells(span);
    var lcell = this.cell();
    this.cy += span - 1;
    var rcell = this.cell();

    lcell.borderL = [];
    rcell.borderR = [];
    rcell.is_hdots = true;
  },
  set_cline: function(start, end) {
    start--;
    if (start < 0) start = 0;
    if (this.cx == 0) for (var i = start; i < end; i++) {
      this.cell(0, i).borderT = true;
    } else for (var i = start; i < end; i++) {
      this.cell(this.cx - 1, i).borderB = true;
    }
  },
  get_current_col: function() {
    return this.cy;
  },
  setSubSup: function(value) {
    this.m_subsup = value;
  },
  //****************************************************************
  //    出力
  //****************************************************************
  write: function(output) {
    if (this.param_bracket || this.m_subsup) {
      var ltr1 = this.param_bracket && this.param_bracket[0];
      var ltr2 = this.param_bracket && this.param_bracket[1];
      var self = this;
      var content_writer = function(output) { self.write_content(output); };
      mod_base.OutputBracketedContent(output, content_writer, ltr1, ltr2, null, this.m_subsup);
    } else {
      this.write_content(output);
    }
  },
  write_content: function(output) {
    // init this.cols
    // 　各 cell 列に使用する td 列数の計算
    var tdc_total = 0;
    for (var y = 0; y < this.yM; y++) {
      this.col(y).update_padding();
      tdc_total += this.col(y).update_tdc();
    }

    // header
    var buff = output.buff;
    buff.push('<table class="aghtex-css-table-inline aghtex-array-table aghtex-array-valign-', this.valign, '"><tbody>\n');

    // thead (colgroups or dummy-row)
    this.write_thead(output);

    // content
    this.write_bT(output, tdc_total);
    for (var x = 0; x < this.xM; x++) {
      if (x == 0)
        buff.push('<tr class="aghtex-css-tr aghtex-array-first-row">\n');
      else if (x == this.xM - 1)
        buff.push('<tr class="aghtex-css-tr aghtex-array-last-row">\n');
      else
        buff.push('<tr class="aghtex-css-tr">\n');

      for (var y = 0; y < this.yM; y++) {
        if (this.cells[x][y])
          this.cells[x][y].write(output);
      }
      buff.push('</tr>\n');

      this.write_bB(output, tdc_total, x);
    }
    buff.push('</tbody></table>');
  },
  write_thead: function(output) {
    var buff = output.buff;

    if (agh.browser.vFx) {
      buff.push('<tr class="aghtex-css-tr aghtex-array-fxdummy-row">\n');
      for (var y = 0; y < this.yM; y++) {
        var col = this.col(y);
        buff.push(' ');
        for (var i = 0; i < col.tdcL; i++) buff.push('<td class="aghtex-css-td aghtex-array-fxdummy-border" />');
        buff.push('<td class="aghtex-css-td aghtex-array-fxdummy-cell" style="width:auto!important;"><tex:i class="aghtex-array-fxdummy-content">.</tex:i></td>');
        for (var i = 0; i < col.tdcR; i++) buff.push('<td class="aghtex-css-td aghtex-array-fxdummy-border" />');
        buff.push('\n');
      }
      buff.push('</tr>\n');
    }
  },
  write_bT: function(output, tdc_total) {
    // Note: IE とそれから Chrome で時々、中に dummy 要素がないと高さが潰れる。
    var h = this.getHorizontalLines(0) - 1;
    while (h-- > 0) {
      output.buff.push(
        '<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-array-hline-t" colspan="', tdc_total,
        '"><tex:i class="aghtex-array-hline-dummy">&nbsp;</tex:i></td></tr>\n');
    }
  },
  write_bB: function(output, tdc_total, x) {
    var h = this.getHorizontalLines(x + 1) - 1;
    while (h-- > 0) {
      output.buff.push(
        '<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-array-hline-b" colspan="', tdc_total,
        '"><tex:i class="aghtex-array-hline-dummy">&nbsp;</tex:i></td></tr>\n');
    }
  },
  "0": 0
});
//********************************************************************
//
//    func Handlers
//
//********************************************************************
agh.memcpy(_at.Table, {
  GetTable: function(doc, cmdName, msg_action) {
    var data = doc.currentCtx.ENVDATA;
    if (!(data instanceof _at.Table)) {
      doc.currentCtx.output.error(
        'mod:array.env:array.Invalid' + msg_action, {cmdName: cmdName},
        "\\" + cmdName);
      return null;
    }
    return data;
  },
  // &
  H_NEXT_COL: function(doc, cmdName) {
    doc.scanner.Next();
    var output = doc.currentCtx.output;
    var data = _at.Table.GetTable(doc, cmdName, "NextColumn");
    if (data == null) return;

    if (data.cell().is_multicol) {
      var cont = output.toHtml().trim();
      if (cont) {
        output.error(
          'mod:array.env:array.ExtraContentAfterMulticol', null,
          "ltr:& (env:array)");
        data.cell().content += cont;
      }
      output.clear();
      data.next_col();
      return;
    }

    data.cell().content = output.toHtml();
    output.clear();
    data.next_col();
  },
  // \\[dimen]
  H_NEXT_ROW: new ns.Command2("f", "#[]D", function(doc, argv) {
    var output = doc.currentCtx.output;
    var data = _at.Table.GetTable(doc, argv[0], "NextLine");
    if (data == null) return;

    if (argv[1]) data.line().paddingBottom = argv[1];
    data.cell().content += output.toHtml();
    output.clear();

    data.next_row();
  }),
  H_HLINE: function(doc, cmdName) {
    doc.scanner.Next();
    var data = _at.Table.GetTable(doc, cmdName, "HorizontalLine");
    if (data == null) return;

    data.set_hline();
  },
  // \cline{1-3}
  H_CLINE: new ns.Command2("f", "#mode.para!1", function(doc, args) {
    var output = doc.currentCtx.output;
    var data = _at.Table.GetTable(doc, args[0], "HorizontalLine");
    if (data == null) return;

    // chk 引数
    var s = args[1].match(/^\s*(\d)+\s*\-\s*(\d+)/);
    if (s == null) {
      output.error(
        'mod:array.env:array.cmd:cline.InvalidRange', {cmdName: args[0], range: args[1]},
        "\\" + args[0]);
      return;
    }

    data.set_cline(parseInt(s[1]), parseInt(s[2]));
  }),
  // \multicolumn{2}{|c|}{content}
  H_MULTICOL: new ns.Command2("f", "#!1#@2#>3", function(doc, args) {
    var data = _at.Table.GetTable(doc, args[0], "Multicolumn");
    if (data == null) return;

    var cnum = parseInt(args[1]);
    if (isNaN(cnum) || cnum <= 0) cnum = 1;
    var csty = args[2];
    var content = args[3];

    // ■ 既に内容があった場合警告
    data.set_multicol(doc, cnum, csty, content);
  }),
  H_HDOTSFOR: new ns.Command2("f", "#!1", function(doc, args) {
    var data = _at.Table.GetTable(doc, args[0], "Hdotsfor");
    if (data == null) return;

    var cnum = parseInt(args[1]);
    if (isNaN(cnum) || cnum <= 0) cnum = 1;
    data.set_hdots(doc, cnum);
  })
});
// export for use in amsmath
_Mod["cmd:hdotsfor"] = _at.Table.H_HDOTSFOR;
//*****************************************************************************
//  array 環境
//-----------------------------------------------------------------------------
_Mod.ArrayEnvironmentDefaultPrologue = function(doc, ctx) {
  var t = new _at.Table();
  return ctx.ENVDATA = t;

  /*
   * この関数を呼び出した後に、
   *   1. 垂直位置の設定
   *   2. 列の設定
   * 等を必要に応じて行う
   */
};
_Mod.ArrayEnvironmentDefaultEpilogue = function(doc, ctx) {
  var table = ctx.ENVDATA;

  // 最後の出力を拾う
  var last_cont = ctx.output.toHtml();
  if (last_cont.trim().length > 0)
    table.cell().content = last_cont;

  table.write(doc.currentCtx.output);
};
_Mod.ArrayEnvironmentDefaultCatcher = function(doc, ctx) {
  this.epilogue(doc, ctx);
};

_Mod.ArrayEnvironmentMathEpilogue = function(doc, ctx) {
  table.setSubSup(doc.GetSubSup());
  _Mod.ArrayEnvironmentDefaultEpilogue(doc, ctx);
}
//-----------------------------------------------------------------------------


_Mod.ReadVerticalAlign = function(doc) {
  var va = doc.GetOptionalArgumentRaw() || "m";
  if ("tbm".indexOf(va.trim().first()) < 0) {
    doc.currentCtx.output.error(
      'mod:array.env:array.InvalidVerticalAlign', {valign: va});
    va = "m";
  }
  return va;
};

var ENV_PARAMS = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    var t = _Mod.ArrayEnvironmentDefaultPrologue(doc, ctx);

    t.valign = _Mod.ReadVerticalAlign(doc); // 第1引数

    // 第二引数 : 水平位置合わせ
    //----------------------------------------------------
    if (doc.scanner.is(mod_core.SCAN_WT_LTR, "{")) {
      doc.scanner.Next();
      var ctx_aln = doc.context_cast(["sub.braced", "env.array.align"]);
      ctx_aln.CTXDATA = new _at.TableAlignSetter(t);
      var err = doc.Read(ctx_aln) || "";
      t.clear_pos(); // (cx,cy) = (0,0)

      // エラーがある場合
      if (err.trim())
        doc.currentCtx.output.buff.push(err);
    } else {
      // ■ alignment 指定開始の括弧がなかった場合
    }

    // 以降の列の追加
    t.default_col().add_bR(ns.Writer.get_error(
      'mod:array.env:array.ExtraColumn'));
  },
  epilogue: _Mod.ArrayEnvironmentDefaultEpilogue,
  catcher: _Mod.ArrayEnvironmentDefaultCatcher
};

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("env.array","mode.math");
  var _CtxName="env.array";
  _Ctx.AddLetterHandler("&", _at.Table.H_NEXT_COL);
  _Ctx.AddCommandHandler("\\", _at.Table.H_NEXT_ROW);
  _Ctx.AddCommandHandler("hline", _at.Table.H_HLINE);
  _Ctx.AddCommandHandler("cline", _at.Table.H_CLINE);
  _Ctx.AddCommandHandler("multicolumn", _at.Table.H_MULTICOL);
}
ENV_PARAMS.context = "env.array";
ns.ContextFactory["mode.math"].AddEnvironment("array", ENV_PARAMS);

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("env.tabular","mode.para");
  var _CtxName="env.tabular";
  _Ctx.AddLetterHandler("&", _at.Table.H_NEXT_COL);
  _Ctx.AddCommandHandler("\\", _at.Table.H_NEXT_ROW);
  _Ctx.AddCommandHandler("hline", _at.Table.H_HLINE);
  _Ctx.AddCommandHandler("cline", _at.Table.H_CLINE);
  _Ctx.AddCommandHandler("multicolumn", _at.Table.H_MULTICOL);
}
ENV_PARAMS.context = "env.tabular";
ns.ContextFactory["mode.para"].AddEnvironment("tabular", ENV_PARAMS);

//-----------------------------------------------------------------------------
// 式番号 (eqnarray)

var CTXV_LABEL_EQ = 'mod_ref/label:eq';
var CTXV_NONUMBER = 'mod_array/nonumber';
var CTXV_ARRAYCTX = 'mod_array/arrayCtx';

_Mod.eqno_output = function(doc, actx, output) {
  var counter = doc.GetCounter("equation");

  // 式番号
  var buff = output.buff;
  if (!actx.dataV[CTXV_NONUMBER]) {
    buff.push('<tex:i class="aghtex-eqno-margin"></tex:i>');
    buff.push('<tex:i class="aghtex-eqno">&nbsp;<tex:i class="aghtex-eqno-right">');
    if (counter == null) {
      buff.push('(?)');
    } else {
      counter.Step();
      buff.push('(', counter.arabic(), ')');
    }
    buff.push('</tex:i></tex:i>');
  }
  actx.dataV[CTXV_NONUMBER] = false;

  var labels = actx.GetContextVariable(CTXV_LABEL_EQ);
  if (labels.length > 0) {
    var id = "aghtex." + labels[0];
    for (var i = 1; i < labels.length; i++)
      doc.references.label_id_map[labels[i]] = id;

    buff.push('<a class="aghtex-label" name="', id, '">&nbsp;</a>');
    if (counter != null)
      doc.references.displayedText['ref@' + labels[0]] = counter.arabic();

    labels.length = 0;
  }
};

function isEndingEqnoRequired(ctx) {
  if (ctx.ENVDATA.get_current_col() != 0)
    return true;

  var last_cont = ctx.output.toHtml();
  if (last_cont.trim().length > 0)
    return true;

  return false;
}

_Mod.eqno_prologue = function(doc, ctx) {
  ctx.dataV[CTXV_ARRAYCTX] = ctx;
  ctx.dataV[CTXV_NONUMBER] = false;
  ctx.SetContextVariable(CTXV_LABEL_EQ, []);
  ctx.userC["label"] = ns.Modules["mod:ref"]["cmd:label:eq"];
};
_Mod.eqno_epilogue = function(doc, ctx) {
  if (isEndingEqnoRequired(ctx))
    _Mod.eqno_output(doc, ctx, ctx.output);
};

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("env.eqnarray","env.array");
  var _CtxName="env.eqnarray";
  _Ctx.DefineCommand("nonumber", ["f", function(doc, argv) {
    doc.AssignContextVariable(CTXV_NONUMBER, true);
  }]);
  _Ctx.DefineCommand("\\", ["f;#[]D", function(doc, argv) {
    var output = doc.currentCtx.output;
    var data = _at.Table.GetTable(doc, argv[0], "NextLine");
    if (data == null) return;

    var actx = doc.GetContextVariable(CTXV_ARRAYCTX);
    if (actx != null) {
      _Mod.eqno_output(doc, actx, output);
    } else {
      output.error('mod:array.env:eqnarray.ContextBroken');
    }

    if (argv[1]) data.line().paddingBottom = argv[1];
    data.cell().content += output.toHtml();
    output.clear();

    data.next_row();
  }]);
}

/* 表環境を新しく式番号に対応する為の手順
 * 1. context は "env.eqnarray" またはそれを継承する物である事
 * 2. prologue で以下を記述する事
 *    _Mod.eqno_prologue(doc, ctx);
 * 3. epilogue の処理の前に以下を記述する事
 *    _Mod.eqno_epilogue(doc, ctx);
 */

//-----------------------------------------------------------------------------
// \begin{eqnarray*}
// \begin{eqnarray}

_Mod["envdef:eqnarray*"] = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    var t = _Mod.ArrayEnvironmentDefaultPrologue(doc, ctx);

    // 列の設定
    t.col(0).halign = "r";
    t.col(1).halign = "c";
    t.col(2).halign = "l";
    t.col(1).paddingL = "0px";
    t.col(1).paddingR = "0px";
    t.default_col().add_bR(ns.Writer.get_error(
      'mod:array.env:eqnarray.ExtraColumn', null,
      "env:eqnarray"));
  },
  epilogue: function(doc, ctx) {
    doc.currentCtx.output.buff.push('<tex:math class="aghtex-displaymath">');
    _Mod.ArrayEnvironmentDefaultEpilogue(doc,ctx);
    doc.currentCtx.output.buff.push('</tex:math>');
  },
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.array"
};
_Mod["envdef:eqnarray"] = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    _Mod["envdef:eqnarray*"].prologue(doc, ctx);
    _Mod.eqno_prologue(doc, ctx);
  },
  epilogue: function(doc, ctx) {
    _Mod.eqno_epilogue(doc, ctx);
    _Mod["envdef:eqnarray*"].epilogue(doc, ctx);
  },
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.eqnarray"
};

ns.ContextFactory["mode.para"].AddEnvironment("eqnarray*", _Mod["envdef:eqnarray*"]);
ns.ContextFactory["mode.para"].AddEnvironment("eqnarray", _Mod["envdef:eqnarray"]);

//-----------------------------------------------------------------------------
// amsmath \begin{align*}  (text mode)
// amsmath \begin{align}   (text mode)
// amsmath \begin{aligned} (math mode)

_Mod["envdef:align*"] = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    var t = _Mod.ArrayEnvironmentDefaultPrologue(doc, ctx);

    // 列の設定
    t.col_hookCreateNew = function(y) {
      var r = _at.Table.prototype.col_hookCreateNew.call(this, y);
      if (y % 2 == 0) {
        r.halign = "r";
        r.paddingR = "0px";
      } else {
        r.halign = "l";
        r.paddingL = "0px";
      }
      return r;
    };
  },
  epilogue: _Mod["envdef:eqnarray*"].epilogue,
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.array"
};

_Mod["envdef:align"] = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    _Mod["envdef:align*"].prologue(doc, ctx);
    _Mod.eqno_prologue(doc, ctx);
  },
  epilogue: function(doc, ctx) {
    _Mod.eqno_epilogue(doc, ctx);
    _Mod["envdef:align*"].epilogue(doc, ctx);
  },
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.eqnarray"
};

_Mod["envdef:aligned"] = {
  suppressOutput: true,
  prologue: _Mod["envdef:align*"].prologue,
  epilogue: _Mod.ArrayEnvironmentMathEpilogue,
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.array"
};

// amsmath \begin{alignat*}  (text mode)
// amsmath \begin{alignat}   (text mode)
// amsmath \begin{alignedat} (math mode)

_Mod["envdef:alignat*"] = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    var t = _Mod.ArrayEnvironmentDefaultPrologue(doc, ctx);

    var n_ = doc.ReadArgument("txt");
    var n = parseInt(n_);
    if (!(n > 0)) {
      doc.currentCtx.output.error('mod:array.env:alignat.NegativeColumnNumber', {arg1: n_});
    } else for (var i = 0; i < n; i++) {
      t.col(2 * i).halign = "r";
      t.col(2 * i).paddingR = "0px";
      t.col(2 * i + 1).halign = "l";
      t.col(2 * i + 1).paddingL = "0px";
    }

    t.default_col().add_bR(ns.Writer.get_error(
      'mod:array.env:narray.ExtraColumn', null,
      "env:alignat"));
  },
  epilogue: _Mod["envdef:eqnarray*"].epilogue,
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.array"
};

_Mod["envdef:alignat"] = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    _Mod["envdef:alignat*"].prologue(doc, ctx);
    _Mod.eqno_prologue(doc, ctx);
  },
  epilogue: function(doc, ctx) {
    _Mod.eqno_epilogue(doc, ctx);
    _Mod["envdef:alignat*"].epilogue(doc, ctx);
  },
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.eqnarray"
};

_Mod["envdef:alignedat"] = {
  suppressOutput: true,
  prologue: _Mod["envdef:alignat*"].prologue,
  epilogue: _Mod.ArrayEnvironmentMathEpilogue,
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.array"
};

// \begin{flalign*} (amsmath)
// \begin{flalign} (amsmath)

_Mod["envdef:flalign*"] = {
  suppressOutput: true,
  prologue: _Mod["envdef:align*"].prologue,
  epilogue: function(doc, ctx) {
    doc.currentCtx.output.buff.push('<tex:math class="aghtex-flalign">');
    _Mod.ArrayEnvironmentDefaultEpilogue(doc, ctx);
    doc.currentCtx.output.buff.push('</tex:math>');
  },
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.array"
};

_Mod["envdef:flalign"] = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    _Mod["envdef:flalign*"].prologue(doc, ctx);
    _Mod.eqno_prologue(doc, ctx);
  },
  epilogue: function(doc, ctx) {
    _Mod.eqno_epilogue(doc, ctx);
    _Mod["envdef:flalign*"].epilogue(doc, ctx);
  },
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.eqnarray"
};

// amsmath \begin{gather*}  (text mode)
// amsmath \begin{gather}   (text mode)
// amsmath \begin{gathered} (math mode)

_Mod["envdef:gather*"] = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    var t = _Mod.ArrayEnvironmentDefaultPrologue(doc, ctx);

    t.col(0).halign = "c";
    t.default_col().add_bR(ns.Writer.get_error(
      'mod:array.env:gather.ExtraColumn', null,
      "env:gather"));
  },
  epilogue: function(doc, ctx) {
    doc.currentCtx.output.buff.push('<tex:math class="aghtex-displaymath">');
    _Mod.ArrayEnvironmentDefaultEpilogue(doc, ctx);
    doc.currentCtx.output.buff.push('</tex:math>');
  },
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.array"
};

_Mod["envdef:gather"] = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    _Mod["envdef:gather*"].prologue(doc, ctx);
    _Mod.eqno_prologue(doc, ctx);
  },
  epilogue: function(doc, ctx) {
    _Mod.eqno_epilogue(doc, ctx);
    _Mod["envdef:gather*"].epilogue(doc, ctx);
  },
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.eqnarray"
};

_Mod["envdef:gathered"] = {
  suppressOutput: true,
  prologue: _Mod["envdef:gather*"].prologue,
  epilogue: _Mod.ArrayEnvironmentMathEpilogue,
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.array"
};

// \begin{multline*} (amsmath)
// \begin{multline} (amsmath)

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("env.multline","env.array");
  var _CtxName="env.multline";
  _Ctx.DefineCommand("nonumber", ['f', function(doc, argv) {
    doc.AssignContextVariable(CTXV_NONUMBER, true);
  }]);
}

_Mod["envdef:multline*"] = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    var t = _Mod.ArrayEnvironmentDefaultPrologue(doc, ctx);

    t.col(0).halign = "l";
    t.default_col().add_bR(ns.Writer.get_error(
      'mod:array.env:gather.ExtraColumn', null,
      "env:multline"));
  },
  epilogue: function(doc, ctx) {
    var table = ctx.ENVDATA;

    // 最後の出力を拾う
    var last_cont = ctx.output.toHtml();
    if (last_cont.trim().length > 0)
      table.cell().content = last_cont;

    // padding 設定
    if (table.xM >= 2) {
      for (var x = 1; x < table.xM - 1; x++)
        table.cell(x, 0).paddingL = "4em";
      table.cell(table.xM - 1, 0).paddingL = "8em";
    }

    // 出力
    doc.currentCtx.output.buff.push('<tex:math class="aghtex-displaymath">');
    table.write(doc.currentCtx.output);
    doc.currentCtx.output.buff.push('</tex:math>');
  },
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.array"
};

_Mod["envdef:multline"] = {
  suppressOutput: true,
  prologue: function(doc, ctx) {
    _Mod["envdef:multline*"].prologue(doc, ctx);
    _Mod.eqno_prologue(doc, ctx);
  },
  epilogue: function(doc, ctx) {
    _Mod.eqno_output(doc, ctx, ctx.output);
    _Mod["envdef:multline*"].epilogue(doc, ctx);
  },
  catcher: _Mod.ArrayEnvironmentDefaultCatcher,
  context: "env.multline"
};

//-----------------------------------------------------------------------------
// \begin{matrix} (amsmath)
// \begin{pmatrix} (amsmath)
// \begin{bmatrix} (amsmath)
// \begin{Bmatrix} (amsmath)
// \begin{vmatrix} (amsmath)
// \begin{Vmatrix} (amsmath)

function define_xmatrix(name, bracket) {
  _Mod[name] = {
    suppressOutput: true,
    prologue: function(doc, ctx) {
      var t = _Mod.ArrayEnvironmentDefaultPrologue(doc, ctx);
      t.valign = _Mod.ReadVerticalAlign(doc);
      t.param_bracket = bracket;
      t.default_col().halign = "c";
    },
    epilogue: _Mod.ArrayEnvironmentMathEpilogue,
    catcher: _Mod.ArrayEnvironmentDefaultCatcher,
    context: "env.array"
  };
}

define_xmatrix("envdef:matrix", null);
define_xmatrix("envdef:pmatrix", ["(", ")"]);
define_xmatrix("envdef:bmatrix", ["[", "]"]);
define_xmatrix("envdef:Bmatrix", ["{", "}"]);
define_xmatrix("envdef:vmatrix", ["|", "|"]);
define_xmatrix("envdef:Vmatrix", ["∥", "∥"]);

})();

//-----------------------------------------------------------------------------
(function _aghtex_include_cls_article_js() { /* main.pp.js: included from .gen/cls_article.js */
// -*- mode: js; coding: utf-8 -*-

// Package
//   \documentclass{article}
// ChangeLog
//   2013-09-02, KM
//     * documentclass.ctx から名称変更
// References

// var JBOOK = function(doc) {
//   doc.NewCounter("part", null);
//   doc.NewCounter("chapter", null);
//   doc.NewCounter("section", "chapter");
//   doc.NewCounter("subsection", "section");
//   doc.NewCounter("subsubsection", "subsection");
//   doc.NewCounter("paragraph", "subsubsection");
//   doc.NewCounter("subparagraph", "paragraph");

//   doc.NewCounter("equation", "section");
//   doc.NewCounter("figure", "section");
//   doc.NewCounter("table", "section");

//   doc.context_cast("mode.para");
//   with(doc.contexts["mode.para"]) {
//     _Ctx.DefineCommand({"part":['s;#1',"\\stepcounter{part}\\begin{center}\\Huge\\vspace{2em}\\textbf{第\\Roman{part}部\\\\ #1}\\vspace{2em}\\end{center}"]});
//     _Ctx.DefineCommand({"chapter":['s;#1',"\\stepcounter{chapter}\\textbf{\\huge 第\\arabic{chapter}章\\quad #1\\vspace{2em}}"]});
//     _Ctx.DefineCommand({"section":['s;#1',"\\vspace{1ex}\\stepcounter{section}\\textbf{\\LARGE\\arabic{chapter}.\\arabic{section}\\ #1}\\vspace{1ex}"]});
//     _Ctx.DefineCommand({"subsection":['s;#1',"\\vspace{1ex}\\stepcounter{subsection}\\textbf{\\Large\\arabic{chapter}.\\arabic{section}.\\arabic{subsection}\\ #1}\\vspace{1ex}"]});
//     _Ctx.DefineCommand({"subsubsection":['s;#1',"\\vspace{1ex}\\stepcounter{subsubsection}{\\Large\\textbf{\\arabic{chapter}.\\arabic{section}.\\arabic{subsection}.\\arabic{subsubsection}\\ #1}}\\vspace{1ex}"]});
//     _Ctx.DefineCommand({"paragraph":['s;#1',"\\vspace{1ex}\\stepcounter{paragraph}■\\textbf{#1}\\vspace{1ex}"]});
//     _Ctx.DefineCommand({"subparagraph":['s;#1',"\\vspace{1ex}\\stepcounter{subparagraph}\\textbf{#1}\\quad"]});
//     _Ctx.DefineCommand({"part*":['s;#1',"\\begin{center}\\Huge\\textit\\textbf{#1}\\end{center}"]});
//     _Ctx.DefineCommand({"chapter*":['s;#1',"\\vspace{1ex}{\\huge\\textbf{#1}}\\\\"]});
//     _Ctx.DefineCommand({"section*":['s;#1',"\\vspace{1ex}{\\LARGE\\textbf{#1}}\\\\"]});
//     _Ctx.DefineCommand({"subsection*":['s;#1',"\\vspace{1ex}{\\Large\\textbf{§\\ #1}}\\\\"]});
//     _Ctx.DefineCommand({"subsubsection*":['s;#1',"\\vspace{1ex}{\\Large\\textbf{§\\ °\\ #1}}\\\\"]});
//     _Ctx.DefineCommand({"paragraph*":['s;#1',"\\vspace{1ex}\\textbf\\underline{#1}\\\\"]});
//     _Ctx.DefineCommand({"subparagraph*":['s;#1',"\\vspace{1ex}\\textbf{#1}\\quad\\\\"]});
//   }
// };
// var JARTICLE = function(doc) {
//   doc.NewCounter("part", null);
//   doc.NewCounter("section", null);
//   doc.NewCounter("subsection", "section");
//   doc.NewCounter("subsubsection", "subsection");
//   doc.NewCounter("paragraph", "subsubsection");
//   doc.NewCounter("subparagraph", "paragraph");

//   doc.NewCounter("equation", "section");
//   doc.NewCounter("figure", "section");
//   doc.NewCounter("table", "section");

//   doc.context_cast("mode.para");
//   with(doc.contexts["mode.para"]) {
//     _Ctx.DefineCommand({"part":['s;#1',"\\stepcounter{part}{\\Large 第\\Roman{part}部}\\vspace{1em}{\\quad\\Huge\\textbf{#1}}\\vspace{2em}"]});
//     _Ctx.DefineCommand({"section":['s;#1',"\\vspace{1ex}\\stepcounter{section}\\textbf{\\LARGE\\arabic{section}\\ #1}\\vspace{1ex}"]});
//     _Ctx.DefineCommand({"subsection":['s;#1',"\\vspace{1ex}\\stepcounter{subsection}\\textbf{\\Large\\arabic{section}.\\arabic{subsection}\\ #1}\\vspace{1ex}"]});
//     _Ctx.DefineCommand({"subsubsection":['s;#1',"\\vspace{1ex}\\stepcounter{subsubsection}{\\Large\\textbf{\\arabic{section}.\\arabic{subsection}.\\arabic{subsubsection}\\ #1}}\\vspace{1ex}"]});
//     _Ctx.DefineCommand({"paragraph":['s;#1',"\\vspace{1ex}\\stepcounter{paragraph}\\textbf\\underline{#1}\\vspace{1ex}"]});
//     _Ctx.DefineCommand({"subparagraph":['s;#1',"\\vspace{1ex}\\stepcounter{subparagraph}\\textbf{#1}\\quad"]});
//     _Ctx.DefineCommand({"part*":['s;#1',"\\begin{center}\\Huge\\textit\\textbf{#1}\\end{center}"]});
//     _Ctx.DefineCommand({"section*":['s;#1',"\\vspace{1ex}{\\LARGE\\textbf{#1}}\\\\"]});
//     _Ctx.DefineCommand({"subsection*":['s;#1',"\\vspace{1ex}{\\Large\\textbf{§\\ #1}}\\\\"]});
//     _Ctx.DefineCommand({"subsubsection*":['s;#1',"\\vspace{1ex}{\\Large\\textbf{§\\ °\\ #1}}\\\\"]});
//     _Ctx.DefineCommand({"paragraph*":['s;#1',"\\vspace{1ex}\\textbf\\underline{#1}\\\\"]});
//     _Ctx.DefineCommand({"subparagraph*":['s;#1',"\\vspace{1ex}\\textbf{#1}\\quad\\\\"]});
//   }
// };
// ns.Document.Classes["jbook"] = JBOOK;
// ns.Document.Classes["jsbook"] = JBOOK;
// ns.Document.Classes["jarticle"] = JARTICLE;
// ns.Document.Classes["jsarticle"] = JARTICLE;

agh.memcpy(ns.Modules["core"].ErrorMessages, {
  "cls:article.cmd:author.MultipleAuthor": [
    "MultipleAuthor", "multiple \\author are specified!"],
  'cls:revtex.cmd:affiliation.NoAssociatedAuthor': [
    "NoAssociatedAuthor", "\\affiliation{{{affiliation}}}: there are no associated author"],
  'cls:revtex.cmd:email.NoAssociatedAuthor': [
    "NoAssociatedAuthor", "\\email{{{email}}}: there are no associated author"]
});

var monthNames = [
  "January",   "February",  "March",     "April",
  "May",       "June",      "July",      "August",
  "September", "October",   "November",  "December"
];
function getDateString(date) {
  var y = date.getYear();
  if (y < 1900) y += 1900;
  y = y.toString();
  var m = monthNames[date.getMonth()];
  var d = date.getDate().toString();
  return m + " " + d + ", " + y;
}
// ToDo: currently unused. It will be used for \today command.
function getDateStringOfToday() {
  return getDateString(new Date);
}
function getDateStringOflastModified(doc) {
  var date = new Date(doc && doc.option.lastModified || document.lastModified);
  if (!(date.getTime() > 0)) date = new Date; // date.getTime() may be NaN
  return getDateString(date);
}

//-----------------------------------------------------------------------------
// \documentclass{article}

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("cls:article/global");
  var _CtxName="cls:article/global";
  _Ctx.DefineCommand({"title":['f;#mode.para>1',function(doc,argv){
    doc.SetContextVariable('cls:article/title', argv[1]);
  }]});
  _Ctx.DefineCommand({"author":['f;#mode.para>1',function(doc,argv){
    var author = doc.GetContextVariable('cls:article/author');
    if (author != null) {
      doc.currentCtx.output.error(
        'cls:article.cmd:author.MultipleAuthor', null, "\\author (cls:article/global)");
      author += ", " + argv[1];
    } else {
      author = argv[1];
    }
    doc.SetContextVariable('cls:article/author', author);
  }]});
  _Ctx.DefineCommand({"date":['f;#mode.para>1',function(doc,argv){
    doc.SetContextVariable('cls:article/date', argv[1]);
  }]});
}
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("cls:article/mode.para");
  var _CtxName="cls:article/mode.para";
  // ■abstract の中身は maketitle の時に出力されるのでは?
  _Ctx.DefineCommand({"abstract":['s@','<h2 class="aghtex-article-abstract">Abstract</h2>']});
  _Ctx.DefineCommand({"acknowledgement":['s@','<h2 class="aghtex-article-acknowledgement">Acknowledgement</h2>']});
  _Ctx.DefineCommand({"tableofcontents":['s@','<h2 class="aghtex-article-toc">Contents</h2><tex:i class="aghtex-article-toc"><tex:ref ref="contents.toc">?</tex:ref></tex:i>']});

  // section コマンドに求められる事
  // TODO: \appendix より後の番号の書式の変更

  var mod_ref = ns.Modules["mod:ref"];

  _Ctx.AddCommandHandler("part", mod_ref.CreateSectionCommand({
    counter: "part", refname: '\\Roman{part}', toctype: "part", emitnote: true,
    httag: 'h1', htclass: 'aghtex-article-part', html: '<tex:i class="aghtex-article-part">Part #</tex:i> #'
  }));
  _Ctx.AddCommandHandler("section", mod_ref.CreateSectionCommand({
    counter: "section", refname: '\\arabic{section}', toctype: "section", emitnote: true,
    httag: 'h2', htclass: 'aghtex-article-section', html: '# #'
  }));
  _Ctx.AddCommandHandler("subsection", mod_ref.CreateSectionCommand({
    counter: "subsection", refname: '\\arabic{section}.\\arabic{subsection}', toctype: "subsection", emitnote: true,
    httag: 'h3', htclass: 'aghtex-article-subsection', html: '# #'
  }));
  _Ctx.AddCommandHandler("subsubsection", mod_ref.CreateSectionCommand({
    counter: "subsubsection", refname: '\\arabic{section}.\\arabic{subsection}.\\arabic{subsubsection}', emitnote: true,
    httag: 'h4', htclass: 'aghtex-article-subsubsection', html: '# #'
  }));
  _Ctx.AddCommandHandler("paragraph"     , mod_ref.CreateSectionCommand({counter: "paragraph"   , httag: 'h5', htclass: 'aghtex-article-paragraph', html: '# #'}));
  _Ctx.AddCommandHandler("subparagraph"  , mod_ref.CreateSectionCommand({counter: "subparagraph", httag: 'h6', htclass: 'aghtex-article-subparagraph', html: '# #'}));

  _Ctx.AddCommandHandler("part*"         , mod_ref.CreateSectionCommand({emitnote: true, httag: 'h1', htclass: 'aghtex-article-part', html: '#'}));
  _Ctx.AddCommandHandler("section*"      , mod_ref.CreateSectionCommand({emitnote: true, httag: 'h2', htclass: 'aghtex-article-section', html: '#'}));
  _Ctx.AddCommandHandler("subsection*"   , mod_ref.CreateSectionCommand({emitnote: true, httag: 'h3', htclass: 'aghtex-article-subsection', html: '#'}));
  _Ctx.AddCommandHandler("subsubsection*", mod_ref.CreateSectionCommand({emitnote: true, httag: 'h4', htclass: 'aghtex-article-subsubsection', html: '#'}));
  _Ctx.AddCommandHandler("paragraph*"    , mod_ref.CreateSectionCommand({httag: 'h5', htclass: 'aghtex-article-paragraph', html: '#'}));
  _Ctx.AddCommandHandler("subparagraph*" , mod_ref.CreateSectionCommand({httag: 'h6', htclass: 'aghtex-article-subparagraph', html: '#'}));

  _Ctx.DefineCommand({"maketitle":['f',function(doc,argv){
    var output = doc.currentCtx.output;
    var buff = output.buff;

    buff.push('<h1 class="aghtex-article-title"><tex:i class="aghtex-article-title">');
    var title = doc.GetContextVariable('cls:article/title');
    if (title)
      buff.push(title);
    else
      output.error('\\title not set', '\\title is not set.', '\\maketitle');

    buff.push('</tex:i><tex:i class="aghtex-article-author">');
    var author = doc.GetContextVariable('cls:article/author');
    if (author)
      buff.push(author);
    else
      output.error('\\author not set', '\\author is not set.', '\\maketitle');

    buff.push('</tex:i><tex:i class="aghtex-article-date">');
    var date = doc.GetContextVariable('cls:article/date');
    if (date)
      buff.push(date);
    else
      buff.push(getDateStringOflastModified(doc));

    buff.push('</tex:i></h1>');
  }]});
}

function initialize_article_counters(doc) {
  doc.NewCounter("page", null);
  doc.NewCounter("equation", null);
  doc.NewCounter("figure", null);
  doc.NewCounter("table", null);

  doc.NewCounter("footnote", null);
  doc.NewCounter("mpfootnote", null);

  doc.NewCounter("enumi", null);
  doc.NewCounter("enumii", "enumi");
  doc.NewCounter("enumiii", "enumii");
  doc.NewCounter("enumiv", "enumiii");
  doc.NewCounter("itemi", null);
  doc.NewCounter("itemii", "itemi");
  doc.NewCounter("itemiii", "itemii");
  doc.NewCounter("itemiv", "itemiii");

  doc.NewCounter("part", null);
  doc.NewCounter("section", null);
  doc.NewCounter("subsection", "section");
  doc.NewCounter("subsubsection", "subsection");
  doc.NewCounter("paragraph", "subsubsection");
  doc.NewCounter("subparagraph", "paragraph");
}

ns.Document.Classes["article"] = function(doc) {
  initialize_article_counters(doc);
  doc.context_cast("global").OverwriteContext(doc.context_cast("cls:article/global"));
  doc.context_cast("mode.para").OverwriteContext(doc.context_cast("cls:article/mode.para"));
};

//-----------------------------------------------------------------------------
// \documentclass{revtex4}

var _revtex = 'cls:revtex';

var RevtexAuthorData = function(doc) {
  // 既存
  var data = doc.GetDocumentVariable(_revtex, 'author');
  if (data != null) return data;

  // 新規
  this.doc = doc;
  this.authors = [];
  this.affiliations = [];
  this.aff2ind = {};
  doc.SetDocumentVariable(_revtex, 'author', this);
};

agh.memcpy(RevtexAuthorData.prototype, {
  setEmail: function(email) {
    var author = this.authors[this.authors.length - 1];
    if (author != null) {
      author.email = email; // ■複数指定した時
    } else {
      this.doc.currentCtx.output.error(
        'cls:revtex.cmd:email.NoAssociatedAuthor',
        {email: email}, "\\email (cls:revtex)");
    }
  },
  setAffiliation: function(affiliation) {
    var affindex = this.aff2ind[affiliation];
    if (affindex == null) {
      this.affiliations.push(affiliation);
      affindex = this.affiliations.length;
      this.aff2ind[affiliation] = affindex;
    }

    var author = this.authors[this.authors.length - 1];
    if (author != null) {
      author.affindices.push(affindex);
    } else {
      this.doc.currentCtx.output.error(
        'cls:revtex.cmd:affiliation.NoAssociatedAuthor',
        {affiliation: argv[1]}, "\\affiliation (cls:revtex)");
    }
  },
  writeAuthors: function() {
    var buff = this.doc.currentCtx.output.buff;
    buff.push('<tex:i class="aghtex-revtex-author">');

    var email = new ns.Counter("<email>", null);
    for (var i = 0; i < this.authors.length; i++) {
      var a = this.authors[i];

      // 人名
      buff.push(a.name);
      if (i + 1 < this.authors.length) buff.push(",");

      // 肩
      var restCount = a.affindices.length;
      if (a.email != null) restCount++;
      if (restCount > 0) {
        buff.push('<tex:i class="aghtex-revtex-authorindex">');
        for (var j = 0; j < a.affindices.length; j++) {
          buff.push('<tex:i class="aghtex-revtex-authorindex-affiliation">', a.affindices[j], '</tex:i>');
          if (--restCount != 0) buff.push(', ');
        }

        if (a.email != null) {
          email.Add(1);
          buff.push('<tex:i class="aghtex-revtex-authorindex-email">', email.fnsymbol(), '</tex:i>');
        }
        buff.push('</tex:i>');
      }

      if (i + 1 < this.authors.length)
        buff.push(i + 2 == this.authors.length?" and ": " ");
    }
    buff.push('</tex:i>');

    for (var i = 0; i < this.affiliations.length; i++) {
      var aff = this.affiliations[i];
      var index = this.aff2ind[aff];
      buff.push('<tex:i class="aghtex-revtex-affiliation"><tex:i class="aghtex-revtex-affiliationindex">', index, '</tex:i>', aff, '</tex:i>');
    }
  }
});
function revtex_get_author_data(doc) {
  return new RevtexAuthorData(doc);
}

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("cls:revtex/global");
  var _CtxName="cls:revtex/global";
  _Ctx.DefineCommand({"title":['f;#mode.para>1',function(doc,argv){
    doc.SetDocumentVariable(_revtex, 'title', argv[1]);
  }]});
  _Ctx.DefineCommand({"author":['f;#mode.para>1',function(doc,argv){
    var author = argv[1];
    var data = revtex_get_author_data(doc);
    data.authors.push({name: author, affindices: []});
  }]});
  _Ctx.DefineCommand({"email":['f;#mode.para>1',function(doc,argv){
    var data = revtex_get_author_data(doc);
    data.setEmail(argv[1]);
  }]});
  _Ctx.DefineCommand({"affiliation":['f;#mode.para>1',function(doc,argv){
    var data = revtex_get_author_data(doc);
    data.setAffiliation(argv[1]);
  }]});
  _Ctx.DefineCommand({"date":['f;#mode.para>1',function(doc,argv){
    doc.SetDocumentVariable(_revtex, 'date', argv[1]);
  }]});
  // _Ctx.DefineCommand({"abstract":['f;#mode.para>1',function(doc,argv){
  //   doc.SetDocumentVariable(_revtex, 'abstract', argv[1]);
  // }]});

  _Ctx.AddEnvironment("abstract", {
    context: 'mode.para',
    suppressOutput: true,
    epilogue: function(doc, ctx) {
      doc.SetDocumentVariable(_revtex, 'abstract', ctx.output.toHtml());
    }
  });
}

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("cls:revtex/mode.para");
  var _CtxName="cls:revtex/mode.para";
  _Ctx.DefineCommand({"acknowledgement":['s@','<h2 class="aghtex-revtex-acknowledgement">Acknowledgement</h2>']});
  _Ctx.DefineCommand({"tableofcontents":['s@','<h2 class="aghtex-revtex-toc">Contents</h2><tex:i class="aghtex-revtex-toc"><tex:ref ref="contents.toc">?</tex:ref></tex:i>']});

  // section コマンドに求められる事
  // TODO: \appendix より後の番号の書式の変更

  var mod_ref = ns.Modules["mod:ref"];

  _Ctx.AddCommandHandler("part", mod_ref.CreateSectionCommand({
    counter: "part", refname: '\\Roman{part}', toctype: "part", emitnote: true,
    httag: 'h1', htclass: 'aghtex-revtex-part', html: '<tex:i class="aghtex-revtex-part">Part #</tex:i> #'
  }));
  _Ctx.AddCommandHandler("section", mod_ref.CreateSectionCommand({
    counter: "section", refname: '\\Roman{section}.', toctype: "section", emitnote: true,
    httag: 'h2', htclass: 'aghtex-revtex-section', html: '#<tex:i class="aghtex-hspace-quad"></tex:i> #'
  }));
  _Ctx.AddCommandHandler("subsection", mod_ref.CreateSectionCommand({
    counter: "subsection", refname: '\\Alph{subsection}.', toctype: "subsection", emitnote: true,
    httag: 'h3', htclass: 'aghtex-revtex-subsection', html: '#<tex:i class="aghtex-hspace-quad"></tex:i> #'
  }));
  _Ctx.AddCommandHandler("subsubsection", mod_ref.CreateSectionCommand({
    counter: "subsubsection", refname: '\\arabic{section}.\\arabic{subsection}.\\arabic{subsubsection}', emitnote: true,
    httag: 'h4', htclass: 'aghtex-revtex-subsubsection', html: '# #'
  }));
  _Ctx.AddCommandHandler("paragraph"     , mod_ref.CreateSectionCommand({counter: "paragraph"   , httag: 'h5', htclass: 'aghtex-revtex-paragraph', html: '# #'}));
  _Ctx.AddCommandHandler("subparagraph"  , mod_ref.CreateSectionCommand({counter: "subparagraph", httag: 'h6', htclass: 'aghtex-revtex-subparagraph', html: '# #'}));

  _Ctx.AddCommandHandler("part*"         , mod_ref.CreateSectionCommand({emitnote: true, httag: 'h1', htclass: 'aghtex-revtex-part', html: '#'}));
  _Ctx.AddCommandHandler("section*"      , mod_ref.CreateSectionCommand({emitnote: true, httag: 'h2', htclass: 'aghtex-revtex-section', html: '#'}));
  _Ctx.AddCommandHandler("subsection*"   , mod_ref.CreateSectionCommand({emitnote: true, httag: 'h3', htclass: 'aghtex-revtex-subsection', html: '#'}));
  _Ctx.AddCommandHandler("subsubsection*", mod_ref.CreateSectionCommand({emitnote: true, httag: 'h4', htclass: 'aghtex-revtex-subsubsection', html: '#'}));
  _Ctx.AddCommandHandler("paragraph*"    , mod_ref.CreateSectionCommand({httag: 'h5', htclass: 'aghtex-revtex-paragraph', html: '#'}));
  _Ctx.AddCommandHandler("subparagraph*" , mod_ref.CreateSectionCommand({httag: 'h6', htclass: 'aghtex-revtex-subparagraph', html: '#'}));

  _Ctx.DefineCommand({"maketitle":['f',function(doc,argv){
    var output = doc.currentCtx.output;
    var buff = output.buff;

    buff.push('<h1 class="aghtex-revtex-title"><tex:i class="aghtex-revtex-title">');
    var title = doc.GetDocumentVariable(_revtex, 'title');
    if (title)
      buff.push(title);
    else
      output.error('\\title not set', '\\title is not set.', '\\maketitle');
    buff.push('</tex:i>');

    var authorData = revtex_get_author_data(doc);
    authorData.writeAuthors(doc);

    buff.push('<tex:i class="aghtex-revtex-date">(Dated: ');
    var date = doc.GetDocumentVariable(_revtex, 'date');
    if (date)
      buff.push(date);
    else
      buff.push(getDateStringOflastModified(doc));

    buff.push(')</tex:i></h1>');

    var abs = doc.GetDocumentVariable(_revtex, 'abstract');
    if (abs != null) {
      buff.push('<h2 class="aghtex-revtex-abstract">Abstract</h2>');
      buff.push(abs);
    }

  }]});
}

ns.Document.Classes["revtex4"] = function(doc, opt, cls) {
  initialize_article_counters(doc);
  doc.context_cast("global").OverwriteContext(doc.context_cast("cls:revtex/global"));
  doc.context_cast("mode.para").OverwriteContext(doc.context_cast("cls:revtex/mode.para"));
  var options = opt.split(',');
  for (var i = 0, iN = options.length; i < iN; i++) {
    var option = options[i].trim();
    if (option == 'amsmath')
      ns.Document.Packages["amsmath"](doc, "", "amsmath");
    else if (option == 'amssymb')
      ns.Document.Packages["amssymb"](doc, "", "amssymb");
    // ■amsfonts
  }
};
ns.Document.Classes["revtex4-1"] = ns.Document.Classes["revtex4"];

// 対応していない package が指定されたときはここに入る。
// 多少遅くなるが内部で include されている可能性のある色々の usepackge を実行する。
ns.Document.Classes["default"] = function(doc, opt, cls) {
  initialize_article_counters(doc);
  doc.context_cast("global").OverwriteContext(doc.context_cast("cls:article/global"));
  doc.context_cast("mode.para").OverwriteContext(doc.context_cast("cls:article/mode.para"));
  ns.Document.Packages["amsmath"](doc, "", "amsmath");
  ns.Document.Packages["amssymb"](doc, "", "amssymb");
  ns.Document.Packages["latexsym"](doc, "", "latexsym");
};

})();
//-----------------------------------------------------------------------------
(function _aghtex_include_pkg_ams_js() { /* main.pp.js: included from .gen/pkg_ams.js */
// -*- mode:js;coding:utf-8 -*-

// Package
//   \usepackage{latexsym}
//   \usepackage{amssymb}
//   \usepackage{amsmath}
// ChangeLog
//   2013-09-02, KM
//     * documentclass.ctx から分離・作成
// References
//
// 公開

/** pkg_ams.ctx
 *
 *  @section 公開オブジェクト
 *    ※以下 pkg_ams = ns.Modules["pkg:ams"] とする。
 *
 *    @fn pkg_ams.DefineDotsForCommand(cmdName,dotsType)
 *    @fn pkg_ams.DefineDotsForCommand({cmdName:dotsType})
 *    @fn pkg_ams.DefineDotsForLetter(letter,dotsType)
 *    @fn pkg_ams.DefineDotsForLetter({letter:dotsType})
 */

var mod_core = ns.Modules["core"];
var mod_base = ns.Modules["mod:base"];
var mod_array = ns.Modules["mod:array"];
var mod_math = ns.Modules["mod:math"];
var _Mod = ns.Modules["pkg:ams"] = {};

agh.memcpy(mod_core.ErrorMessages, {
  'pkg:ams.cmd:cfrac.InvalidAlignment': [
    "\\cfrac[alignment]",
    "The alignment '{align}' is unrecognized. Specify one of l, c, r."],
  'pkg:ams.pkg:amsmath.ObsoleteName': [
    "old name: {pkgName}", "The package name '{pkgName}' is obsoleted. Please use 'amsmath'."]
});

//******************************************************************************
//  \usepackage{latexsym}
//==============================================================================
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("pkg:latexsym/mode.math");
  var _CtxName="pkg:latexsym/mode.math";
  _Ctx.DefineCommand({
    lhd     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22B2;</tex:f>'],
    rhd     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22B3;</tex:f>'],
    unlhd   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22B4;</tex:f>'],
    unrhd   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22B5;</tex:f>'],
    mho     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2127;</tex:f>'],
    leadsto : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21DD;</tex:f>'],
    Join    : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x22c8;</tex:f>'],
    Box     : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">□</tex:f>'],
    sqsubset: ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x228f;</tex:f>'],
    sqsupset: ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2290;</tex:f>'],
    Diamond : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">◇</tex:f>'],

    // \iint \iiint \iiiint \idotsint
    iint    : ['f', function(doc, cmdName) { mod_math["cmd:int"](doc, '&#x222C;'); }],
    iiint   : ['f', function(doc, cmdName) { mod_math["cmd:int"](doc, '&#x222D;'); }],
    iiiint  : ['f', function(doc, cmdName) { mod_math["cmd:int"](doc, '&#x2A0C;'); }],
    idotsint: ['f', function(doc, cmdName) { mod_math["cmd:int"](doc, '&#x222B;<tex:f class="aghtex-dotsi">&#x22EF;</tex:f>&#x222B;'); }],

    varlimsup : ['s', '\\mathop\\overline\\mathrm{lim}'],
    varliminf : ['s', '\\mathop\\underline\\mathrm{lim}'],
    varinjlim : ['s', '\\mathop\\underrightarrow\\mathrm{lim}'],
    varprojlim: ['s', '\\mathop\\underleftarrow\\mathrm{lim}']
  });
}
ns.Document.Packages["latexsym"] = function(doc,opt,pkgName) {
  doc.context_cast("mode.math").AddBaseContext(doc.context_cast("pkg:latexsym/mode.math"));
};
//******************************************************************************
//  \usepackage{amssymb}
//==============================================================================
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("pkg:amssymb/mode.math");
  var _CtxName="pkg:amssymb/mode.math";
  _Ctx.DefineCommand({
    mathbb             : ['s@;#>1', (
      // Sf/Cr: text-stroke
      agh.browser.vSf ?
        '<tex:i class="aghtex-mathbb-stroke-sf">#1</tex:i>' :
      agh.browser.vCr ?
        '<tex:i class="aghtex-mathbb-stroke">#1</tex:i>' :
      // Cr/Op/Fx: text-shadow
      agh.browser.vOp || agh.browser.vFx >= 3.5 || agh.browser.vIE >= 10.0 ?
        '<tex:i class="aghtex-mathbb-shadow">#1</tex:i>' :
      // IE: filter:glow
      agh.browser.vIE ? '<tex:i class="aghtex-mathbb-glow">#1</tex:i>':
      // Old versions: multiple overlays
      '<tex:i class="aghtex-mathbb-old">' +
        '<tex:i class="aghtex-mathbb-a">#1</tex:i>' +
        '<tex:i class="aghtex-mathbb-b">#1</tex:i>' +
        '<tex:i class="aghtex-mathbb-c">#1</tex:i>' +
        '<tex:i class="aghtex-mathbb-d">#1</tex:i>' +
        '<tex:i class="aghtex-mathbb-e">#1</tex:i>#1</tex:i>'
    )],
    mathfrak           : ['s@;#>1', '<tex:f class="aghtex-mathfrak">#1</tex:f>'],

    lessdot            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋖</tex:f>'],
    gtrdot             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋗</tex:f>'],
    doteqdot           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≑</tex:f>'],
    leqslant           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a7d;</tex:f>'],
    geqslant           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a7e;</tex:f>'],
    risingdotseq       : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≓</tex:f>'],
    eqslantless        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a95;</tex:f>'],
    eqslantgtr         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a96;</tex:f>'],
    fallingdotseq      : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≒</tex:f>'],
    leqq               : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≦</tex:f>'],
    geqq               : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≧</tex:f>'],
    eqcirc             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≖</tex:f>'],
    lll                : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋘</tex:f>'],
    ggg                : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋙</tex:f>'],
    circeq             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≗</tex:f>'],
    lesssim            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≲</tex:f>'],
    gtrsim             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≳</tex:f>'],
    triangleq          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≜</tex:f>'],
    lessapprox         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a85;</tex:f>'],
    gtrapprox          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a86;</tex:f>'],
    bumpeq             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≏</tex:f>'],
    lessgtr            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≶</tex:f>'],
    gtrless            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≷</tex:f>'],
    Bumpeq             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≎</tex:f>'],
    lesseqgtr          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋚</tex:f>'],
    gtreqless          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋛</tex:f>'],
    thicksim           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">∼</tex:f>'],
    lesseqqgtr         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a8b;</tex:f>'],
    gtreqqless         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a8c;</tex:f>'],
    thickapprox        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≈</tex:f>'],
    preccurlyeq        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≼</tex:f>'],
    succcurlyeq        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≽</tex:f>'],
    approxeq           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≊</tex:f>'],
    curlyeqprec        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋞</tex:f>'],
    curlyeqsucc        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋟</tex:f>'],
    backsim            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">∽</tex:f>'],
    precsim            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≾</tex:f>'],
    succsim            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≿</tex:f>'],
    backsimeq          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋍</tex:f>'],
    precapprox         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2ab7;</tex:f>'],
    succapprox         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2ab8;</tex:f>'],
    vDash              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊨</tex:f>'],
    subseteqq          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2ac5;</tex:f>'],
    supseteqq          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2ac6;</tex:f>'],
    Vdash              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊩</tex:f>'],
    Subset             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋐</tex:f>'],
    Supset             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋑</tex:f>'],
    Vvdash             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊪</tex:f>'],
    sqsubset           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊏</tex:f>'],
    sqsupset           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊐</tex:f>'],
    backepsilon        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x03f6;</tex:f>'],
    therefore          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">∴</tex:f>'],
    because            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">∵</tex:f>'],
    varpropto          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">∝</tex:f>'],
    shortmid           : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2223;</tex:f>'],
    shortparallel      : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2225;</tex:f>'],
    between            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">≬</tex:f>'],
    smallsmile         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⌣</tex:f>'], // ■TODO:small version
    smallfrown         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⌢</tex:f>'], // ■TODO:small version
    pitchfork          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⋔</tex:f>'],
    vartriangleleft    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊲</tex:f>'],
    vartriangleright   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊳</tex:f>'],
    blacktriangleleft  : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">◄</tex:f>'],
    blacktriangleright : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">►</tex:f>'],
    trianglelefteq     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊴</tex:f>'],
    trianglerighteq    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">⊵</tex:f>'],

    nless              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x226e;</tex:f>'],
    ngtr               : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x226f;</tex:f>'],
    varsubsetneqq      : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2ac8;</tex:f>'],
    varsupsetneqq      : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2ac9;</tex:f>'],
    lneq               : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a87;</tex:f>'],
    gneq               : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a88;</tex:f>'],
    nleq               : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2270;</tex:f>'],
    ngeq               : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2271;</tex:f>'],
    nsubseteqq         : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2288;</tex:f>'],
    nsupseteqq         : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2289;</tex:f>'],
    nleqslant          : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2274;</tex:f>'],
    ngeqslant          : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2275;</tex:f>'],
    lneqq              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2268;</tex:f>'],
    gneqq              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2269;</tex:f>'],
    nmid               : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2224;</tex:f>'],
    nparallel          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2226;</tex:f>'],
    lvertneqq          : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2268;</tex:f>'],
    gvertneqq          : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2269;</tex:f>'],
    nleqq              : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2270;</tex:f>'],
    ngeqq              : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2271;</tex:f>'],
    nshortmid          : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2224;</tex:f>'],
    nshortparallel     : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x2226;</tex:f>'],
    lnsim              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22e6;</tex:f>'],
    gnsim              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22e7;</tex:f>'],
    lnapprox           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a89;</tex:f>'],
    gnapprox           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2a8a;</tex:f>'],
    nsim               : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2241;</tex:f>'],
    ncong              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2247;</tex:f>'],
    nprec              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2280;</tex:f>'],
    nsucc              : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2281;</tex:f>'],
    npreceq            : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x22e0;</tex:f>'],
    nsucceq            : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x22e1;</tex:f>'],
    nvdash             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22ac;</tex:f>'],
    nvDash             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22ad;</tex:f>'],
    precneqq           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2ab5;</tex:f>'],
    succneqq           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2ab6;</tex:f>'],
    precnsim           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22e8;</tex:f>'],
    succnsim           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22e9;</tex:f>'],
    nVdash             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22ae;</tex:f>'],
    nVDash             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22af;</tex:f>'],
    precnapprox        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2ab9;</tex:f>'],
    succnapprox        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2aba;</tex:f>'],
    subsetneq          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x228a;</tex:f>'],
    supsetneq          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x228b;</tex:f>'],
    ntriangleleft      : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22ea;</tex:f>'],
    ntriangleright     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22eb;</tex:f>'],
    varsubsetneq       : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x228a;</tex:f>'],
    varsupsetneq       : ['s@', '<tex:f class="aghtex-binop aghtex-syma-mincho">&#x228b;</tex:f>'],
    nsubseteq          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2288;</tex:f>'],
    nsupseteq          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2289;</tex:f>'],
    ntrianglelefteq    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22ec;</tex:f>'],
    ntrianglerighteq   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22ed;</tex:f>'],
    subsetneqq         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2acb;</tex:f>'],
    supsetneqq         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2acc;</tex:f>'],
    nleftarrow         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x219a;</tex:f>'],
    nrightarrow        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x219b;</tex:f>'],
    nleftrightarrow    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21ae;</tex:f>'],
    nLeftrightarrow    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21ce;</tex:f>'],
    nLeftarrow         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21cd;</tex:f>'],
    nRightarrow        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21cf;</tex:f>'],

    dotplus            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2214;</tex:f>'],
    centerdot          : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22c5;</tex:f>'],
    intercal           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22ba;</tex:f>'],
    divideontimes      : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22c7;</tex:f>'],
    ltimes             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22c9;</tex:f>'],
    rtimes             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22ca;</tex:f>'],
    Cup                : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22d3;</tex:f>'],
    Cap                : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22d2;</tex:f>'],
    smallsetminus      : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2216;</tex:f>'],
    doublebarwedge     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x2306;</tex:f>'],
    veebar             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22bb;</tex:f>'],
    barwedge           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22bc;</tex:f>'],
    boxplus            : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x229e;</tex:f>'],
    boxminus           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x229f;</tex:f>'],
    circleddash        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x229d;</tex:f>'],
    circledcirc        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x229a;</tex:f>'],
    boxtimes           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22a0;</tex:f>'],
    boxdot             : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22a1;</tex:f>'],
    leftthreetimes     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22cb;</tex:f>'],
    rightthreetimes    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22cc;</tex:f>'],
    curlyvee           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22ce;</tex:f>'],
    curlywedge         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22cf;</tex:f>'],
    circledast         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x229b;</tex:f>'],

    dashleftarrow      : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21e0;</tex:f>'], // ■mwg_mathsymb:TODO
    dashrightarrow     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21e2;</tex:f>'], // ■mwg_mathsymb:TODO
    leftleftarrows     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21c7;</tex:f>'],
    rightrightarrows   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21c9;</tex:f>'],
    upuparrows         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21c8;</tex:f>'],
    downdownarrows     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21ca;</tex:f>'],
    leftrightarrows    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21c6;</tex:f>'],
    rightleftarrows    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21c4;</tex:f>'],
    Lleftarrow         : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21da;</tex:f>'],
    Rrightarrow        : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21db;</tex:f>'],
    upharpoonleft      : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21bf;</tex:f>'],
    upharpoonright     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21be;</tex:f>'],
    twoheadleftarrow   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x219e;</tex:f>'],
    twoheadrightarrow  : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21a0;</tex:f>'],
    leftarrowtail      : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21a2;</tex:f>'],
    rightarrowtail     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21a3;</tex:f>'],
    downharpoonleft    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21c3;</tex:f>'],
    downharpoonright   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21c2;</tex:f>'],
    leftrightharpoons  : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21cb;</tex:f>'],
    rightleftharpoons  : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21cc;</tex:f>'],
    Lsh                : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21b0;</tex:f>'],
    Rsh                : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21b1;</tex:f>'],
    looparrowleft      : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21ab;</tex:f>'],
    looparrowright     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21ac;</tex:f>'],
    curvearrowleft     : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21b6;</tex:f>'],
    curvearrowright    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21b7;</tex:f>'],
    circlearrowleft    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21ba;</tex:f>'],
    circlearrowright   : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21bb;</tex:f>'],
    leftrightsquigarrow: ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21ad;</tex:f>'],
    multimap           : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22b8;</tex:f>'],
    rightsquigarrow    : ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x21dd;</tex:f>'],

    ulcorner           : ['s@', '<tex:f class="aghtex-symb-mincho">&#x250c;</tex:f>'],
    urcorner           : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2510;</tex:f>'],
    llcorner           : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2514;</tex:f>'],
    lrcorner           : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2518;</tex:f>'],

    Box                : ['s@', '<tex:f class="aghtex-syma-mincho">□</tex:f>'],
    Diamond            : ['s@', '<tex:f class="aghtex-syma-mincho">&#x25c7;</tex:f>'],
    hbar               : ['s@', '<tex:f class="aghtex-symb-roman">ħ</tex:f>'],
    hslash             : ['s@', '<tex:f class="aghtex-symb-mincho">ℏ</tex:f>'],
    Bbbk               : ['s@', '<tex:f class="aghtex-symb-mincho">k</tex:f>'],
    square             : ['s@', '<tex:f class="aghtex-symb-mincho">□</tex:f>'],
    blacksquare        : ['s@', '<tex:f class="aghtex-symb-mincho">■</tex:f>'],
    circledS           : ['s@', '<tex:f class="aghtex-symb-mincho">Ⓢ</tex:f>'],
    vartriangle        : ['s@', '<tex:f class="aghtex-symb-mincho">△</tex:f>'],
    blacktriangle      : ['s@', '<tex:f class="aghtex-symb-mincho">▲</tex:f>'],
    complement         : ['s@', '<tex:f class="aghtex-symb-mincho">∁</tex:f>'],
    triangledown       : ['s@', '<tex:f class="aghtex-symb-mincho">▽</tex:f>'],
    blacktriangledown  : ['s@', '<tex:f class="aghtex-symb-mincho">▼</tex:f>'],
    Game               : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2141;</tex:f>'],
    lozenge            : ['s@', '<tex:f class="aghtex-symb-mincho">◊</tex:f>'],
    blacklozenge       : ['s@', '<tex:f class="aghtex-symb-mincho">&#x29eb;</tex:f>'],
    bigstar            : ['s@', '<tex:f class="aghtex-symb-mincho">★</tex:f>'],
    angle              : ['s@', '<tex:f class="aghtex-symb-mincho">∠</tex:f>'],
    measuredangle      : ['s@', '<tex:f class="aghtex-symb-mincho">∡</tex:f>'],
    sphericalangle     : ['s@', '<tex:f class="aghtex-symb-mincho">∢</tex:f>'],
    diagup             : ['s@', '<tex:f class="aghtex-symb-mincho">╱</tex:f>'],
    diagdown           : ['s@', '<tex:f class="aghtex-symb-mincho">╲</tex:f>'],
    backprime          : ['s@', '<tex:f class="aghtex-symb-mincho">‵</tex:f>'],
    nexists            : ['s@', '<tex:f class="aghtex-symb-mincho">∄</tex:f>'],
    Finv               : ['s@', '<tex:f class="aghtex-symb-mincho">Ⅎ</tex:f>'],
    varnothing         : ['s@', '<tex:f class="aghtex-symb-mincho">∅</tex:f>'],
    eth                : ['s@', '<tex:f class="aghtex-symb-mincho">ð</tex:f>'],
    mho                : ['s@', '<tex:f class="aghtex-symb-mincho">℧</tex:f>'],

    digamma            : ['s@', '<tex:f class="aghtex-symb-mincho">&#x03dc;</tex:f>'],
    beth               : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2136;</tex:f>'],
    daleth             : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2138;</tex:f>'],
    gimel              : ['s@', '<tex:f class="aghtex-symb-mincho">&#x2137;</tex:f>'],

    // integrals
    iint               : ['f', function(doc, cmdName) { mod_math["cmd:int"](doc, '&#x222C;'); }],
    iiint              : ['f', function(doc, cmdName) { mod_math["cmd:int"](doc, '&#x222D;'); }],
    iiiint             : ['f', function(doc, cmdName) { mod_math["cmd:int"](doc, '&#x2A0C;'); }]
  });
}
ns.Document.Packages["amssymb"] = function(doc, opt, pkgName) {
  doc.context_cast("mode.math").AddBaseContext(doc.context_cast("pkg:amssymb/mode.math"));
};
//******************************************************************************
//  \usepackage{amsmath}
//    ftp://ftp.ams.org/pub/tex/doc/amsmath/amsldoc.pdf
//==============================================================================
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("pkg:amsmath/mode.para");
  var _CtxName="pkg:amsmath/mode.para";
  _Ctx.AddEnvironment("equation*",ns.Environment.Create("s@",null,'<tex:math class="aghtex-displaymath">#0</tex:math>',"mode.math"));

  _Ctx.DefineCommand({
    // \AmS
    "AmS": ['s@', '<tex:AmS>A<span>M</span>S</tex:AmS>'],

    // CHK: 以下は paragraph mode でも使えるのか?
    dots : ['s@', '<tex:f class="aghtex-binop aghtex-symb-roman">&#x2026;</tex:f>'],
    ldots: ['s@', '<tex:f class="aghtex-binop aghtex-symb-roman">&#x2026;</tex:f>']
  });

  _Ctx.DefineEnvironment({
    "align*"   : mod_array["envdef:align*"],
    "align"    : mod_array["envdef:align"],
    "alignat*" : mod_array["envdef:alignat*"],
    "alignat"  : mod_array["envdef:alignat"],
    "flalign*" : mod_array["envdef:flalign*"],
    "flalign"  : mod_array["envdef:flalign"],
    "gather*"  : mod_array["envdef:gather*"],
    "gather"   : mod_array["envdef:gather"],
    "multline*": mod_array["envdef:multline*"],
    "multline" : mod_array["envdef:multline"]
  });

  _Ctx.handlerC['!'] = ns.ContextFactory.GetInstance("mode.para").handlerC['negthinspace'];
}
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("pkg:amsmath/mode.math");
  var _CtxName="pkg:amsmath/mode.math";

  _Ctx.DefineCommand({
    boldsymbol: ['s@;#>1', '<tex:f class="aghtex-mathbm">#1</tex:f>'],
    substack  : ['s;#1', "\\begin{array}{c}#1\\end{array}"],

    // 色々なスタイルの分数
    dfrac     : ['f;#>1#>2', mod_math["cmd:frac"]],
    tfrac     : ['f;#>1#>2', mod_math["cmd:frac"]]
  });

  //--------------------------------------------------------------------------
  //  \cfrac
  //--------------------------------------------------------------------------
  var cfrac_html = null;
  if (agh.browser.vIE) {
    cfrac_html = (
      '<table class="aghtex-css-table-inline aghtex-frac-ie6-table" cellspacing="0"><tbody>'
        + '<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-frac-ie6-num" style="text-align:$!important;">$</td></tr>'
        + '<tr class="aghtex-css-tr"><td class="aghtex-css-td aghtex-frac-ie6-den" style="text-align:$!important;">$</td></tr>'
        + '</tbody></table>'
    ).split(/\$/g);
  } else {
    cfrac_html = (
      '<tex:frac><tex:num style="text-align:$!important;">$</tex:num>'
      + '<tex:den style="text-align:$!important;">$</tex:den></tex:frac>'
    ).split(/\$/g);
  }
  _Ctx.DefineCommand({cfrac: ['f;#[c]!1#>2#>3', function(doc, argv) {
    var output = doc.currentCtx.output;
    var align =
        argv[1] == "r" ? "right":
        argv[1] == "l" ? "left":
        argv[1] == "c" ? "center":
        "";
    if (align == "") {
      output.error(
        'pkg:ams.cmd:cfrac.InvalidAlignment',
        {align: argv[1]}, '\\cfrac (pkg:ams)');
      align = "center";
    }
    output.buff.push(
      cfrac_html[0],align,
      cfrac_html[1],argv[2],
      cfrac_html[2],align,
      cfrac_html[3],argv[3],
      cfrac_html[4]);
  }]});

  _Ctx.AddEnvironment("cases",ns.Environment.Create("s",null,"\\left\\{\\begin{array}{lc}#0\\end{array}\\right.","mode.math"));
  _Ctx.AddEnvironment("split",ns.Environment.Create("s",null,"\\begin{array}{r@{}l}#0\\end{array}","mode.math"));

  // \AmS
  _Ctx.DefineCommand({AmS: ['s@', '<tex:AmS>A<span>M</span>S</tex:AmS>']});

  // \binom, \tbinom, \dbinom, \genfrac
  function cmd_genfrac(doc, left, right, barWidth, style, htNumerator, htDenominator) {
    // TODO: style=0: displaystyle, 1: textstyle, 2: scriptstyle, 3: scriptscriptstyle, other: normal

    var output = doc.currentCtx.output;
    var buff = output.buff;
    buff.push('<table class="aghtex-css-table-inline aghtex-genfrac-table" cellspacing="0"><tbody><tr class="aghtex-css-tr aghtex-cmdleft-row">');
    if (left)
      mod_base.OutputStretchBracketTd(output, left, 2);

    var hasBar = barWidth && barWidth;
    buff.push('<td align="center" class="aghtex-css-td ', hasBar ? 'aghtex-genfrac-numerator' : 'aghtex-genfrac-center', '"');
    if (hasBar && barWidth !== '1px')
      buff.push(' style="border-bottom-width:', barWidth, ';"');
    buff.push('>', htNumerator, '</td>');

    if (right)
      mod_base.OutputStretchBracketTd(output, right, 2);
    buff.push('</tr><tr class="aghtex-css-tr"><td align="center" class="aghtex-css-td aghtex-genfrac-center">', htDenominator, '</td></tr>');
    buff.push('</tbody></table>');
  }

  _Ctx.DefineCommand({
    binom  : ['f;#>1#>2', function(doc, argv) { cmd_genfrac(doc, '(', ')', null, null, argv[1], argv[2]); }],
    tbinom : ['f;#>1#>2', function(doc, argv) { cmd_genfrac(doc, '(', ')', null, 1, argv[1], argv[2]); }],
    dbinom : ['f;#>1#>2', function(doc, argv) { cmd_genfrac(doc, '(', ')', null, 0, argv[1], argv[2]); }],
    genfrac: ['f;#>1#>2#>3#>4#>5#>6', function(doc, argv) { cmd_genfrac(doc, argv[1], argv[2], argv[3], argv[4], argv[5], argv[6]); }]
  });

  // TODO: command s:mode.math\uproot
  // TODO: command s:mode.math\leftroot

  //---------------------------------------------------------------------------
  // dots

  var DOTSO = 0; // comma
  var DOTSC = 1; // comma
  var DOTSB = 2; // binary
  var DOTSM = 3; // multiply
  var DOTSI = 4; // int
  var cmd_dots_table = {};

  _Ctx.DefineCommand({
    dotsc: ['s@', '<tex:f class="aghtex-binop aghtex-symb-roman">&#x2026;</tex:f>' ], // dots comma,    下付三点
    dotsb: ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22EF;</tex:f>'], // dots binary,   中央三点
    dotsm: ['s@', '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22EF;</tex:f>'], // dots multiply, 中央三点
    dotso: ['s@', '<tex:f class="aghtex-binop aghtex-symb-roman">&#x2026;</tex:f>' ], // dots other,    下付三点
    dotsi: ['f', function(doc, argv) {
      // dots integral, 中央三点
      if (!mod_math.GetMathStyle(doc))
        doc.currentCtx.output.buff.push('<tex:f class="aghtex-dotsi">&#x22EF;</tex:f>');
      else
        doc.currentCtx.output.buff.push('<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22EF;</tex:f>');
    }],
    dots : ['f', function(doc, argv) {
      doc.skipSpaceAndComment();

      switch (doc.scanner.wordtype) {
      case mod_core.SCAN_WT_LTR:
      case mod_core.SCAN_WT_CMD:
        var type = cmd_dots_table[doc.scanner.wordtype + ':' + doc.scanner.word];
        break;
      case mod_core.SCAN_WT_TXT:
        var type = DOTSM;
        break;
      default:
        var type = DOTSO;
        break;
      }

      switch (type) {
      case DOTSB: case DOTSM:
        var ht = '<tex:f class="aghtex-binop aghtex-symb-mincho">&#x22EF;</tex:f>';
        break;
      case DOTSI:
        var ht = '<tex:f class="aghtex-dotsi aghtex-symb-mincho">&#x22EF;</tex:f>';
        break;
      case DOTSC:
      default:
        var ht = '<tex:f class="aghtex-binop aghtex-symb-roman">&#x2026;</tex:f>';
        break;
      }

      doc.currentCtx.output.buff.push(ht);
    }],

    // marker commands for \dots
    DOTSB: mod_base["cmd:relax"],
    DOTSI: mod_base["cmd:relax"],
    DOTSX: mod_base["cmd:relax"]
  });

  function DefineDotsForCommand(cmdName, dotstype) {
    if (arguments.length === 1) {
      var defs = arguments[0];
      var keys = agh.ownkeys(defs);
      for (var i = 0, iN = keys.length; i < iN; i++) {
        var k = keys[i];
        DefineDotsForCommand(k, defs[k]);
      }
    } else
      cmd_dots_table['cmd:' + cmdName] = dotstype;
  }
  function DefineDotsForLetter(cmdName, dotstype) {
    if (arguments.length === 1) {
      var defs = arguments[0];
      var keys = agh.ownkeys(defs);
      for (var i = 0, iN = keys.length; i < iN; i++) {
        var k = keys[i];
        DefineDotsForLetter(k, defs[k]);
      }
    } else
      cmd_dots_table['ltr:' + cmdName] = dotstype;
  }
  _Mod.DefineDotsForLetter = DefineDotsForLetter;
  _Mod.DefineDotsForCommand = DefineDotsForCommand;

  DefineDotsForCommand({DOTSB: DOTSB, DOTSI: DOTSI, DOTSX: DOTSO});

  DefineDotsForCommand({
    sum: DOTSB, prod: DOTSB, coprod: DOTSB,
    bigcap: DOTSB, bigcup: DOTSB, bigvee: DOTSB, bigwedge: DOTSB,
    bigodot: DOTSB, bigoplus: DOTSB, bigotimes: DOTSB, biguplus: DOTSB,
    bigsqcup: DOTSB,

    implies: DOTSB,impliedby: DOTSB,And: DOTSB,

    longrightarrow: DOTSB, Longrightarrow: DOTSB, longleftarrow: DOTSB, Longleftarrow: DOTSB,
    longleftrightarrow: DOTSB, Longleftrightarrow: DOTSB,
    mapsto: DOTSB, longmapsto: DOTSB, hookrightarrow: DOTSB, hookleftarrow: DOTSB,
    iff: DOTSB, doteq: DOTSB,

    'int': DOTSI, oint: DOTSI,
    iint: DOTSI, iiint: DOTSI, iiiint: DOTSI, idotsint: DOTSI,

    '{': DOTSM, bigl: DOTSM, Bigl: DOTSM, biggl: DOTSM, Biggl: DOTSM
  });

  DefineDotsForCommand({
    dotsc: DOTSC, dotsb: DOTSB, dotsm: DOTSM, dotsi: DOTSI, dotso: DOTSO,
    ldots: DOTSC, cdots: DOTSB
  });
  DefineDotsForLetter({
    '+': DOTSB, '-': DOTSB, '/': DOTSB, '*': DOTSB,
    '=': DOTSB, '>': DOTSB, '<': DOTSB,

    '.': DOTSC, ',': DOTSC, ':': DOTSC, ';': DOTSC,

    '[': DOTSM, '(': DOTSM
  });

  //---------------------------------------------------------------------------

  _Ctx.DefineCommand({
    iff      : ['s>mode.math', '\\;\\Longleftrightarrow\\;'],
    implies  : ['s>mode.math', '\\;\\Longrightarrow\\;'],
    impliedby: ['s>mode.math', '\\;\\Longleftarrow\\;'],
    And      : ['s@'         , '<tex:f class="aghtex-symb-roman">&amp;</tex:f>'],

    overset  : ["f;#>1#>2", function(doc, argv) {
      var buff = doc.currentCtx.output.buff;
      mod_math.OutputOverbrace(buff, argv[2], false, argv[1]);
    }],
    underset : ["f;#>1#>2", function(doc, argv) {
      var buff = doc.currentCtx.output.buff;
      mod_math.OutputUnderbrace(buff, argv[2], false, argv[1]);
    }],

    // \overleftrightarrow
    // \underrightarrow
    // \underleftarrow
    // \underleftrightarrow
    overleftrightarrow : mod_math.CreateCommandOverStretch({commandName: "overleftrightarrow", imageSrc: "stretch_lrarr.png", svg: mod_math["svg:stretch_lrarr"]}),
    underrightarrow    : mod_math.CreateCommandUnderStretch({commandName: "underrightarrow", imageSrc: "stretch_rarr.png", svg: mod_math["svg:stretch_rarr"]}),
    underleftarrow     : mod_math.CreateCommandUnderStretch({commandName: "underleftarrow", imageSrc: "stretch_larr.png", svg: mod_math["svg:stretch_larr"]}),
    underleftrightarrow: mod_math.CreateCommandUnderStretch({commandName: "underleftrightarrow", imageSrc: "stretch_lrarr.png", svg: mod_math["svg:stretch_lrarr"]}),

    // \dddot,  \dddot
    dddot : mod_math.CreateAccentCommand('vec', '<tex:f class="aghtex-syma-mincho">&#x22EF;</tex:f>', true), // combining = &#x20DB;
    ddddot: mod_math.CreateAccentCommand('vec', '<tex:f class="aghtex-syma-mincho">&#x2509;</tex:f>', true)  // combining = &#x20DC;
  });

  // TODO: command s:mode.math\align
  _Ctx.DefineEnvironment({
    // TODO: environment s:mode.math\split (上で簡単な実装があるが…)

    aligned  : mod_array["envdef:aligned"],
    alignedat: mod_array["envdef:alignedat"],
    gathered : mod_array["envdef:gathered"],

    // matrix, pmatrix については、
    //   元々存在したコマンド \matrix \pmatrix の動作を上書きする。
    matrix : mod_array["envdef:matrix"],
    pmatrix: mod_array["envdef:pmatrix"],
    bmatrix: mod_array["envdef:bmatrix"],
    Bmatrix: mod_array["envdef:Bmatrix"],
    vmatrix: mod_array["envdef:vmatrix"],
    Vmatrix: mod_array["envdef:Vmatrix"]
  });

  // TODO: command s:mode.math\bordermatrix (cmd 上書き)

  // TODO: command s:mode.math\tag
  // TODO: command s:mode.math\tag*
  // TODO: command s:mode.math\notag
  // TODO: command f\raisetag(#1)

  _Ctx.DefineCommand({
    lvert: ['s@', '<tex:f class="aghtex-symb-mincho">&#x007c;</tex:f>'], // u007c "|",  u2223
    lVert: ['s@', '<tex:f class="aghtex-symb-mincho">&#x2225;</tex:f>'], // u2225 "∥", u???? (‖)
    rvert: ['s@', '<tex:f class="aghtex-symb-mincho">&#x007c;</tex:f>'],
    rVert: ['s@', '<tex:f class="aghtex-symb-mincho">&#x2225;</tex:f>'],

    // 2014-03-05 \operatornamewithlimits
    // 2018-01-30 \operatorname, \operatorname*
    'operatorname*'       : ['s;#1', '\\mathop{\\textrm{#1}}'],
    operatornamewithlimits: ['s;#1', '\\mathop{\\textrm{#1}}'],
    operatorname : ["f;#mode.para>1", function(doc, argv) {
      var buff = doc.currentCtx.output.buff;
      var sbsp = doc.GetSubSup();
      buff.push('<tex:i class="aghtex-mathop">', argv[1]);
      mod_math.OutputSupSubScripts(doc, sbsp.sup, sbsp.sub);
      buff.push('</tex:i>');
    }]
  });
}
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("pkg:amsmath/global");
  var _CtxName="pkg:amsmath/global";
  _Ctx.DefineCommand({
    // command s:mode.math\eqref 2014-03-05
    eqref: ['s;#1', '\\textup{(\\ref{#1})}'],

    // command \DeclareMathOperator 2014-03-05
    "DeclareMathOperator*": ['s;#1#2', '\\def#1{\\mathop{\\mathrm{#2}}}'],
    "DeclareMathOperator" : ['s;#1#2', '\\def#1{{\\mathrm{#2}}}']
  });
}
ns.Document.Packages["amsmath"] = function(doc, opt, pkgName) {
  if (pkgName === "amstex") {
    doc.currentCtx.output.error(
      'pkg:ams.pkg:amsmath.ObsoleteName',
      {pkgName: pkgName}, '\\usepackage{' + pkgName + '} (pkg:ams)');
  }
  doc.context_cast("mode.para").OverwriteContext(doc.context_cast("pkg:amsmath/mode.para"));
  doc.context_cast("mode.math").AddBaseContext(doc.context_cast("pkg:amsmath/mode.math"));
  doc.context_cast("global").OverwriteContext(doc.context_cast("pkg:amsmath/global"));
  doc.context_cast("env.array").AddCommandHandler("hdotsfor", mod_array["cmd:hdotsfor"]);
};
ns.Document.Packages["amstex"] = ns.Document.Packages["amsmath"];
//******************************************************************************

})();
//-----------------------------------------------------------------------------
(function _aghtex_include_pkg_bm_js() { /* main.pp.js: included from .gen/pkg_bm.js */
/* -*- mode:js;coding:utf-8 -*- */

// Package
//   \usepackage{bm}
// ChangeLog
//   2016-04-02, KM
//     bugfix: Fixed mismatches of opening tags <tex:f> and closing tags </tex:i>.
//   2012/12/02, KM
//     Created, \DeclareBoldSymbol, \bmdefine, \hmdefine, \bm, \hm, \boldsymbol, \heavysymbol
// References
//   http://ftp.yz.yamagata-u.ac.jp/pub/CTAN/macros/latex/required/tools/bm.pdf

agh.memcpy(ns.Modules["core"].ErrorMessages, {
  "pkg:bm.DefineBoldSymbol.InvalidMathVersion": [
    "InvalidMathVersion",
    "\\DeclareBoldSymbol: {weight} is invalid as an optional argument."],
  "pkg:bm.DefineBoldSymbol.InvalidCommandName": [
    "InvalidCommandName",
    "\\DeclareBoldSymbol: {name} は不適切なコマンド名です。\n"
      + "新しいコマンドの名前は \\commandname の形式で指定して下さい。"]
});

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("pkg:bm/global");
  var _CtxName="pkg:bm/global";
  function DefineBoldSymbol(doc,weight,name,content) {
    if (weight == 'bold') {
      content = '<tex:f class="aghtex-mathbm">' + content + '</tex:f>';
    } else if (weight == 'heavy') {
      content = '<tex:f class="aghtex-mathhm">' + content + '</tex:f>';
    } else {
      doc.currentCtx.output.error(
        "pkg:bm.DefineBoldSymbol.InvalidMathVersion",
        {weight: weight}, "\\DefineBoldSymbol#1 (pkg:bm/global)");
    }

    if (name.substr(0, 1) != "\\") {
      doc.currentCtx.output.error(
        "pkg:bm.DefineBoldSymbol.InvalidCommandName",
        {name: name}, "DefineBoldSymbol (pkg:bm/global)");
      return;
    } else
      name = name.substr(1);

    doc.SetMacroHandler(name, new ns.Command2("s@", "", content));
  }
  _Ctx.DefineCommand({
    DeclareBoldSymbol: ['f;#[bold]!1#2#mode.math>3', function(doc, argv) {
      DefineBoldSymbol(doc, argv[1].trim(), argv[2].trim(), argv[3]);
    }],
    bmdefine: ['f;#1#mode.math>3', function(doc, argv) {
      DefineBoldSymbol(doc, 'bold', argv[1].trim(), argv[2]);
    }],
    hmdefine: ['f;#1#mode.math>3', function(doc, argv) {
      DefineBoldSymbol(doc, 'heavy', argv[1].trim(), argv[2]);
    }]
  });

}
new function(){
  var _Ctx=ns.ContextFactory.GetInstance("pkg:bm/mode.math");
  var _CtxName="pkg:bm/mode.math";
  _Ctx.DefineCommand({
    bm         : ['s@;#>1', '<tex:f class="aghtex-mathbm">#1</tex:f>'],
    hm         : ['s@;#>1', '<tex:f class="aghtex-mathhm">#1</tex:f>'],
    boldsymbol : ['s@;#>1', '<tex:f class="aghtex-mathbm">#1</tex:f>'],
    heavysymbol: ['s@;#>1', '<tex:f class="aghtex-mathhm">#1</tex:f>']
  });

  // \bmmax, \hmmax
  //   これはユーザが指定する変数で、
  //   キャッシュの大きさを指定する。この実装では関係ない。
}
ns.Document.Packages["bm"] = function(doc, opt, pkgName) {
  doc.context_cast("global").OverwriteContext(doc.context_cast("pkg:bm/global"));
  doc.context_cast("mode.math").OverwriteContext(doc.context_cast("pkg:bm/mode.math"));
};

})();
//-----------------------------------------------------------------------------
(function _aghtex_include_pkg_color_js() { /* main.pp.js: included from .gen/pkg_color.js */
/* -*- mode:js -*- */

// Package
//   \usepackage{color}
// ChangeLog
//   2012/12/02, KM
//     Created,
// References
//   http://texlive.tug.org/texlive/devsrc/Master/texmf-dist/doc/latex/graphics/color.pdf
//   http://en.wikibooks.org/wiki/LaTeX/Colors


function NamedColors() {}
agh.memcpy(NamedColors.prototype, {
  // predifined colors
  white         : '#FFFFFF', black         : '#000000', red           : '#FF0000', green         : '#00FF00',
  blue          : '#0000FF', cyan          : '#00ADEE', magenta       : '#EC008D', yellow        : '#FFF100',
  // dvips colors
  Apricot       : '#FBB982', Aquamarine    : '#00B5BE', Bittersweet   : '#C04F17', Black         : '#221E1F',
  Blue          : '#2D2F92', BlueGreen     : '#00B3B8', BlueViolet    : '#473992', BrickRed      : '#B6321C',
  Brown         : '#792500', BurntOrange   : '#F7921D', CadetBlue     : '#74729A', CarnationPink : '#F282B4',
  Cerulean      : '#00A2E3', CornflowerBlue: '#41B0E4', Cyan          : '#00AEEF', Dandelion     : '#FDBC42',
  DarkOrchid    : '#A4538A', Emerald       : '#00A99D', ForestGreen   : '#009B55', Fuchsia       : '#8C368C',
  Goldenrod     : '#FFDF42', Gray          : '#949698', Green         : '#00A64F', GreenYellow   : '#DFE674',
  JungleGreen   : '#00A99A', Lavender      : '#F49EC4', LimeGreen     : '#8DC73E', Magenta       : '#EC008C',
  Mahogany      : '#A9341F', Maroon        : '#AF3235', Melon         : '#F89E7B', MidnightBlue  : '#006795',
  Mulberry      : '#A93C93', NavyBlue      : '#006EB8', OliveGreen    : '#3C8031', Orange        : '#F58137',
  OrangeRed     : '#ED135A', Orchid        : '#AF72B0', Peach         : '#F7965A', Periwinkle    : '#7977B8',
  PineGreen     : '#008B72', Plum          : '#92268F', ProcessBlue   : '#00B0F0', Purple        : '#99479B',
  RawSienna     : '#974006', Red           : '#ED1B23', RedOrange     : '#F26035', RedViolet     : '#A1246B',
  Rhodamine     : '#EF559F', RoyalBlue     : '#0071BC', RoyalPurple   : '#613F99', RubineRed     : '#ED017D',
  Salmon        : '#F69289', SeaGreen      : '#3FBC9D', Sepia         : '#671800', SkyBlue       : '#46C5DD',
  SpringGreen   : '#C6DC67', Tan           : '#DA9D76', TealBlue      : '#00AEB3', Thistle       : '#D883B7',
  Turquoise     : '#00B4CE', Violet        : '#58429B', VioletRed     : '#EF58A0', White         : '#FFFFFF',
  WildStrawberry: '#EE2967', Yellow        : '#FFF200', YellowGreen   : '#98CC70', YellowOrange  : '#FAA21A'
});

function parseFloat01(text) {
  var value = parseFloat(text);
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
function float_to_hex2(value) {
  var r = Math.round(value * 255).toString(16);
  return r.length == 1 ? "0" + r : r;
}

function get_color_dict(doc) {
  if (doc['pkg:color/colors'] == null)
    doc['pkg:color/colors'] = {named: new NamedColors(), defined: new NamedColors};
  return doc['pkg:color/colors'];
}

function get_color(doc, model, spec) {
  var dict = get_color_dict(doc);
  switch (model.toLowerCase()) {
  case "":
    if (dict.defined[spec])
      return dict.defined[spec];
    break;
  case 'named':
    if (dict.named[spec])
      return dict.named[spec];
    break;
  case 'gray':
  case 'grey':
    var ww = float_to_hex2(parseFloat01(spec || 0));
    return "#" + ww + ww + ww;
  case 'rgb':
    var s = spec.split(',');
    var rr = float_to_hex2(parseFloat01(s[0] || 0));
    var gg = float_to_hex2(parseFloat01(s[1] || 0));
    var bb = float_to_hex2(parseFloat01(s[2] || 0));
    return "#" + rr + gg + bb;
  case 'cmyk':
    var c = parseFloat01(s[0] || 0);
    var m = parseFloat01(s[1] || 0);
    var y = parseFloat01(s[2] || 0);
    var ik = 1 - parseFloat01(s[3] || 0);
    var rr = float_to_hex2(ik * (1 - c));
    var gg = float_to_hex2(ik * (1 - m));
    var bb = float_to_hex2(ik * (1 - y));
    return "#" + rr + gg + bb;
  default:
    doc.currentCtx.output.error('InvalidColorModel','invalid color model {model=' + model + '}.');
    return null;
  }

  doc.currentCtx.output.error('InvalidColor', 'invalid color specification {model=' + model + ', spec=' + spec + '}.');
  return null;
}

new function(){
  var _Ctx=ns.ContextFactory.GetInstance("pkg:color/global");
  var _CtxName="pkg:color/global";
  _Ctx.DefineCommand({"DefineNamedColor":['f;#!1#!2#!3#!4',function(doc,argv){
    // \DefineNamedColor{named}{name}{model}{colour-spec}

    if (argv[1] != 'named') {
      doc.currentCtx.output.error(
        'InvalidColorModel',
        '\\DefineNamedColor: "' + argv[1] + '"is specified to first argument. it should be "named"');
      return;
    }

    var name = argv[2];
    var color = get_color(doc, argv[3].trim(), argv[4].trim());
    if (color)
      get_color_dict(doc).named[name] = color;
  }]});
  _Ctx.DefineCommand({"definecolor":['f;#!1#!2#!3',function(doc,argv){
    // \definecolor{name}{model}{colour-spec}

    var name = argv[1];
    var color = get_color(doc, argv[2].trim(), argv[3].trim());
    if (color)
      get_color_dict(doc).defined[name] = color;
  }]});
  _Ctx.DefineCommand({"color":['f;#[]!1#!2',function(doc,argv){
    // \color[model]{colour-spec}

    var color = get_color(doc, argv[1].trim(), argv[2].trim());
    if (color == null) return;

    doc.currentCtx.output.buff.push('<tex:i class="aghtex-color-textcolor" style="color:', color, ';--aghtex-color:', color, ';">');
    doc.currentCtx.output.appendPost("</tex:i>");
  }]});
  _Ctx.DefineCommand({"textcolor":['f;#[]!1#!2#>3',function(doc,argv){
    var color = get_color(doc, argv[1].trim(), argv[2].trim());
    if (color == null) return;

    doc.currentCtx.output.buff.push('<tex:i class="aghtex-color-textcolor" style="color:', color, ';--aghtex-color:', color, ';">', argv[3], "</tex:i>");
  }]});
  _Ctx.DefineCommand({"colorbox":['f;#[]!1#!2#mode.lr>3',function(doc,argv){
    // \colorbox[model]{background-colour-spec}{text}

    var buff = doc.currentCtx.output.buff;
    var bgc = get_color(doc, argv[1].trim(), argv[2].trim());
    if (bgc != null) {
      buff.push('<tex:i class="aghtex-hbox aghtex-color-box" style="background-color:', bgc, '">');
    } else {
      buff.push('<tex:i class="aghtex-hbox aghtex-color-box">');
    }
    buff.push(argv[3], "</tex:i>");
  }]});
  _Ctx.DefineCommand({"fcolorbox":['f;#[]!1#!2#!3#mode.lr>4',function(doc,argv){
    // \fcolorbox[model]{frame-colour-spec}{background-colour-spec}{text}

    var buff = doc.currentCtx.output.buff;
    var frc = get_color(doc, argv[1].trim(), argv[2].trim());
    var bgc = get_color(doc, argv[1].trim(), argv[3].trim());
    if (frc != null || bgc != null) {
      buff.push('<tex:i class="aghtex-hbox aghtex-color-box" style="');
      if (frc != null) {
        buff.push('border:solid 1px ', frc, ';');
      }
      if (bgc != null) {
        buff.push('background-color:', bgc, ';');
      }
      buff.push('">');
    } else {
      buff.push('<tex:i class="aghtex-hbox aghtex-color-box">');
    }
    buff.push(argv[4], "</tex:i>");
  }]});

  _Ctx.DefineCommand({"normalcolor":['f',function(doc,argv){
    // \normalcolor
    // 既定色に戻す。
    var dict = get_color_dict(doc);
    dict.named = new NamedColors();
    dict.defined = new NamedColors();
  }]});
}
ns.Document.Packages["color"] = function(doc, opt, pkgName) {
  doc.context_cast("global").OverwriteContext(doc.context_cast("pkg:color/global"));
};

})();
//-----------------------------------------------------------------------------
(function _aghtex_include_pkg_url_js() { /* main.pp.js: included from .gen/pkg_url.js */
/* -*- mode:js -*- */

// Package
//   \usepackage{url}
// ChangeLog
//   2012/12/06, KM
//     Created,
// References
//   http://www.ctan.org/tex-archive/macros/latex/contrib/url/
//     ftp://ftp.u-aizu.ac.jp/pub/tex/CTAN/macros/latex/contrib/url/url.pdf

var mod_core = ns.Modules["core"];

agh.memcpy(ns.Modules["core"].ErrorMessages,{
  "pkg:url.InitializationFailed": [
    "PackageFailed",
    "failed to initialize package 'url'"],
  "pkg:url.UrlCommand.VerbMissingPunct": [
    "MissingPunct",
    "\\{cmdName}:\n"
      + "  \\{cmdName} の終端を定義する記号文字が指定されていません。\n"
      + "  使用例: \\{cmdName}|http://example.com/|"],
  "pkg:url.cmd:DeclareUrlCommand.InvalidCommandName": [
    'InvalidCommandName',
    "\\DeclareUrlCommand: a first argument of DeclareUrlCommand should have the form of '\\cmdName' ('{cmd}' is specified)."],
  "pkg:url.cmd:urldef.InvalidCommandName": [
    'InvalidCommandName',
    "\\urldef: the first argument '{cmd}' does not have the form of '\\cmdName'."],
  "pkg:url.cmd:urldef.InvalidCommandName2": [
    'InvalidCommandName',
    "\\urldef: the second argument '{urlcmd}' does not have the form of '\\cmdName'."],
  "pkg:url.cmd:urldef.NotUrlCommand": [
    'NotUrlCommand',
    "\\urldef: the second argument \\{urlcmd} is not registered as a url command."]
});

ns.Document.Packages["url"] = function(doc, opt, pkgName) {
  initialize_pkg_url();
  var h = ns.Document.Packages["url"];
  if (h == arguments.callee) {
    doc.currentCtx.output.error("pkg:url.InitializationFailed", null, "\\usepackage{url}");

  } else
    h(doc, opt, pkgName);
};

var initialize_pkg_url_flag = false;
function initialize_pkg_url() {
  if (initialize_pkg_url_flag) return;
  initialize_pkg_url_flag = true;
  var package_name = 'pkg:url';

  function create_insert_command(source) {
    return function(doc, cmdName) {
      doc.scanner.Next();
      doc.currentCtx.output.buff.push(source);
    };
  }

  function UrlStyleDictionary() {}
  var command_etag_default = ns.Command2("s@", "", '</a>');
  agh.memcpy(UrlStyleDictionary.prototype, {
    tt: {
      stag: ns.Command2("s@", "#>1", '<a class="aghtex-url-tt" href="#1">'),
      etag: command_etag_default
    },
    rm: {
      stag: ns.Command2("s@", "#>1", '<a class="aghtex-url-rm" href="#1">'),
      etag: command_etag_default
    },
    sf: {
      stag: ns.Command2("s@", "#>1", '<a class="aghtex-url-sf" href="#1">'),
      etag: command_etag_default
    },
    same: {
      stag: ns.Command2("s@", "#>1", '<a class="aghtex-url-same" href="#1">'),
      etag: command_etag_default
    }
  });

  var urlstyles_vname = 'pkg:url/styles';
  function get_doc_pkgdata(doc) {
    if (doc[urlstyles_vname] == null)
      doc[urlstyles_vname] = {urlstyle: "tt", styles: new UrlStyleDictionary, declared: {url: ""}};
    return doc[urlstyles_vname];
  }

  function read_verblike_argument(doc, cmdName) {
    doc.skipSpaceAndComment();
    var wordtype = doc.scanner.wordtype;
    var word     = doc.scanner.word;
    if (wordtype != mod_core.SCAN_WT_LTR) {
      output.error(
        "pkg:url.UrlCommand.VerbMissingPunct",
        {cmdName: cmdName}, "url command (pkg:url)");
      return null;
    } else if (word == '{') {
      return doc.GetArgumentRaw();
    } else {
      doc.scanner.Next();
      var ctx = doc.context_cast(ns.ContextFactory["sub.until.raw"]);
      ctx.until_type = wordtype;
      ctx.until_word = word;
      ctx.rawctx_ebuff = [];
      var result = doc.Read(ctx);
      if (ctx.rawctx_ebuff.length)
        doc.currentCtx.output.buff.push(ctx.rawctx_ebuff.join(''));
      return result;
    }
  }
  function CreateUrlCommand(styles) {
    var source = styles + '\\aghtexInternalUrlSTag{\\aghtexInternalUrlContent}\\UrlLeft\\aghtexInternalUrlContent\\UrlRight\\aghtexInternalUrlETag';
    return function(doc, cmdName) {
      var output = doc.currentCtx.output;

      doc.scanner.Next();
      var content = read_verblike_argument(doc, cmdName);
      if (content == null) return;

      doc.currentCtx.userC['aghtexInternalUrlContent'] = create_insert_command(content);
      doc.scanner.InsertSource(source);
    };
  }

  new function(){
    var _Ctx=ns.ContextFactory.GetInstance("pkg:url/global");
    var _CtxName="pkg:url/global";
    // \DeclareUrlCommand{\cmd}{styles}
    // \url{}
    // \url||
    // \urldef{\cmd}{\url}{url}

    _Ctx.DefineCommand({"urlstyle":['f;#!1',function(doc,argv){
      var d = get_doc_pkgdata(doc);
      var urlstyle = argv[1].trim();
      d.urlstyle = urlstyle;
    }]});

    _Ctx.DefineCommand({"aghtexInternalUrlSTag":['f@',function(doc,cmdName){
      var d = get_doc_pkgdata(doc);
      var s = d.styles[d.urlstyle] || d.styles['tt'];
      s.stag(doc, cmdName);
    }]});
    _Ctx.DefineCommand({"aghtexInternalUrlETag":['f@',function(doc,cmdName){
      var d = get_doc_pkgdata(doc);
      var s = d.styles[d.urlstyle] || d.styles['tt'];
      s.etag(doc, cmdName);
    }]});
    _Ctx.DefineCommand({"UrlLeft":['s@','']});
    _Ctx.DefineCommand({"UrlRight":['s@','']});

    _Ctx.AddCommandHandler("url", CreateUrlCommand(""));
    _Ctx.DefineCommand({"DeclareUrlCommand":['f;#1#2',function(doc,argv){
      var cmd = argv[1].trim();
      if (cmd.slice(0,1) != '\\') {
        doc.currentCtx.output.error(
          "pkg:url.cmd:DeclareUrlCommand.InvalidCommandName",
          {cmd: cmd}, "\\DeclareUrlCommand#1 (pkg:url/global)");
        return;
      } else {
        cmd=cmd.slice(1);
      }

      doc.SetMacroHandler(cmd, CreateUrlCommand(argv[2]));
    }]});
    _Ctx.DefineCommand({"urldef":['f;#1#2',function(doc,argv){
      var cmd = argv[1].trim();
      if (cmd.slice(0, 1) != '\\') {
        doc.currentCtx.output.error(
          "pkg:url.cmd:urldef.InvalidCommandName",
          {cmd: cmd}, "\\urldef#1 (pkg:url/global)");
        return;
      } else {
        cmd = cmd.slice(1);
      }

      var urlcmd = argv[2].trim();
      if (urlcmd.slice(0, 1) != '\\') {
        doc.currentCtx.output.error(
          "pkg:url.cmd:urldef.InvalidCommandName2",
          {urlcmd: urlcmd}, "\\urldef#2 (pkg:url/global)");
        return;
      } else {
        urlcmd = urlcmd.slice(1);
      }
      var styles = get_doc_pkgdata(doc).declared[urlcmd];
      if (styles == null) {
        doc.currentCtx.output.error(
          "pkg:url.cmd:urldef.NotUrlCommand",
          {urlcmd: urlcmd}, "\\urldef#2 (pkg:url/global)");
        return;
      }

      var content = read_verblike_argument(doc, argv[0]);
      if (content == null) return;
      var content_inserter = create_insert_command(content);

      var source = styles + '\\aghtexInternalUrlSTag{\\aghtexInternalUrlContent}\\UrlLeft\\aghtexInternalUrlContent\\UrlRight\\aghtexInternalUrlETag';

      doc.SetMacroHandler(cmd, function(doc, cmdName) {
        doc.scanner.Next();

        doc.currentCtx.userC['aghtexInternalUrlContent'] = content_inserter;
        doc.scanner.InsertSource(source);
      });
    }]});

    /* Not supported functionalities:

       Url 表示に用いる既定のフォントを変更
       \def\UrlFont{\tt} % 等幅フォントに変更
       \def\UrlFont{\rm} % ローマンフォントに変更

       mathbinops と同じ強度の折返可能文字
       \UrlBreaks

       mathrel と同じ強度の折返可能文字
       \UrlBigBreaks

       折返不可能な文字
       \UrlNoBreaks

       より詳細な設定
       \UrlSpecials

       折り返し可能文字の周りの余白の設定
       \Urlmuskip = 0mu plus 1mu

       各折返可能文字の折返強度を設定
       \mathchardef\UrlBreakPenalty = 100
       \mathchardef\UrlBigBreakPenalty = 100
    */
  }

  ns.Document.Packages["url"] = function(doc, opt, pkgName) {
    doc.context_cast("global").OverwriteContext(doc.context_cast("pkg:url/global"));
  };
}

})();

/*===========================================================================*/
});
