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
#%m Source::read_char
    if (this.index < this.length) {
      this.ch = this.text.substr(this.index, 1);
      return true;
    } else {
      this.ch = "EOF"; // ■TODO: "EOF" を別の物に。SCAN_CH_EOF={}; 等。
      return false;
    }
#%end
#%x Source::read_char
  },
  wbegin: function aghtex_Source_wbegin() {
    this.index = this.wstart;
#%x Source::read_char
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
//%x (
agh.memcpy(ns.Scanner4.prototype, {
  //======================================================================
  // Source
  InsertSource: function(instext) {
//%m Scanner::pushSource
    if (this.source != null) //&& this.source.index < this.source.length) // ■■
      this.sourceStack.push(this.source);
//%end
//%m Scanner::popSource
    if (this.sourceStack.length > 0) {
      this.source = this.sourceStack.pop();
    }
//%end
    /// <summary>
    /// 現在の単語開始位置に文字列を挿入します。
    /// </summary>
//%x Scanner::pushSource
    this.source = new ns.Source(instext);
    this.Next();
  },
  ConsumePartialTxt: function(length) {
//%if DEBUG_SCANNER
    aghtex_assert(this.wordtype == SCAN_WT_TXT, "Scanner4#ClipFirstFromTxt assert(Scanner4.wordtype=='txt')");
//%end
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
//%if DEBUG_SCANNER
    aghtex_assert(this.wordtype == SCAN_WT_TXT, "Scanner4#ClipFirstFromTxt assert(Scanner4.wordtype=='txt')");
//%end
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

//%if DEBUG_SCANNER
    aghtex_assert(src.index < src.length, "Scanner4#Next: assert(src.index<src.length)");
//%end
    var c = src.text.charCodeAt(src.index);

//%[is_special_character="c < 64 && !(48 <= c && c < 58) && 0 <= c || 91 <= c && c < 97 || 123 <= c && c<127 || c == 0x3000"]
//%[is_command="c == 0x5c"]
//%[is_comment="c == 0x25"]
//%[is_return="c == 0x0d"]
    if ($"is_special_character") {
      if ($"is_command") {
        if (this.m_makeatletter)
          var reg = /\\(?:[^!"#$&'()=~|\-\^`{\[;:\]+},.\/<>?_ \n\t\r\v\f\b　\\%*\x1F0-9]+\*?|[^*]\*?|\*|$)/g;
        else
          var reg = /\\(?:[^!"#$&'()=~|\-\^`{\[;:\]+},.\/<>?_ \n\t\r\v\f\b　\\%*\x1F0-9@]+\*?|[^*]\*?|\*|$)/g;

//%m Scanner4::reg_match_word
        reg.lastIndex = src.index;
//%  if DEBUG_SCANNER
        if (!reg.test(src.text)) {
          this.word = null;
          this.wordtype = SCAN_WT_INV;
          throw new Error("[fatal: Scanner4: failed in regexp matching]");
        }
//%  else
        reg.test(src.text);
//%  end
//%end
//%x Scanner4::reg_match_word

        this.wordtype = SCAN_WT_CMD;
        this.word = src.text.slice(src.index + 1, reg.lastIndex);
        src.index = reg.lastIndex;
      } else if ($"is_comment") {
        var reg = /\%[^\n]*(?:\n|$)/g;
//%x Scanner4::reg_match_word

        this.wordtype = SCAN_WT_COM;
        this.word = src.text.slice(src.index + 1, reg.lastIndex);
        src.index = reg.lastIndex;
      } else if (c == 0x1F) {
        // 2014-09-27
        //   US(\x1F) トークンの強制区切
        //   置換した引数 #1 などが前後のトークンとくっつかない様にする為。
        var reg = /\x1F+/g;
//%x Scanner4::reg_match_word
        src.index = reg.lastIndex;
        this.Next();
      } else if ($"is_return") {
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
//%x Scanner4::reg_match_word

      this.wordtype = SCAN_WT_TXT;
      this.word = src.text.slice(src.index, reg.lastIndex);
      src.index = reg.lastIndex;
    }
//%).i
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
#%if DEBUG
    else {
      // ContextFactory 丈でなく Context を直接指定できるようにするべきか?
      throw new Error("LOGIC_ERROR: Unknown type of ContextFactory-base");
    }
#%end
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
#%if DEBUG
    else {
      throw new Error("LOGIC_ERROR: AddLetterHandler の第一引数には登録する文字を指定して下さい");
    }
#%end
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
  this.handlerL = handler_l || {};  // 制御文字 handler
  this.handlerC = handler_c || {};  // コマンド handler
  this.handlerE = handler_e || {};  // 環境開始 handler
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
    displayedHtml: {},
    label_id_map: {},
    label_page_map: {}
  };
  // refs.displayedHtml[sec:attention] = "1.2.4";
  // refs.displayedHtml[eq:firstEquation] = "1";

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
#%if DEBUG
    else if (val) {
      throw new Error("LOGIC_ERROR: Document#context_cast ArgumentUnexpectedType");
    }
#%end
    return null;
  },
  wrap_context: function(context) {
#%if DEBUG
    if (context == null)
      throw new Error("LOGIC_ERROR: Document#context_cast ArgumentNull");
    if (!(context instanceof ns.Context))
      throw new Error("LOGIC_ERROR: Document#context_cast ArgumentUnexpectedType");
#%end
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
  //  DocumentVariables:
  //    context に属するのではなく document に直接属する変数。
  //----------------------------------------------------------------------
  GetDocumentVariable: function(dictName, key) {
    var dict = this[dictName];
    if (!key) return dict;
    return dict ? dict[key] : null;
  },
  SetDocumentVariable: function(dictName, key, value) {
    var dict = this[dictName] || (this[dictName] = {});
    dict[key] = value;
  },
  //======================================================================
  //  コンテキスト変数検索
  //    GetMacroHandler: マクロハンドラ
  //    GetLengthData:   長さ変数
  //----------------------------------------------------------------------
  internalGetContextVariable: function(dictName, key) {
    var ret = this.currentCtx[dictName][key];
    if (ret != null) return ret;

    for (var i = this.ctxStack.length - 1; i >= 0; i--) {
      ret = this.ctxStack[i][dictName][key];
      if (ret != null) return ret;
    }
    return null;
  },
  internalSetContextVariable: function(dictName, key, value) {
    this.currentCtx[dictName][key] = value;
  },
  internalReplaceContextVariable: function(dictName, key, value) {
    var d = this.currentCtx[dictName];
    if (d[key] != null) {
      d[key] = value;
      return true;
    }

    for (var i = this.ctxStack.length - 1; i >= 0; i--) {
      d = this.ctxStack[i][dictName];
      if (d[key] != null) {
        d[key] = value;
        return true;
      }
    }

    return false;
  },
  // 指定された名前の変数を全ての文脈で削除する (unused)
  internalDeepRemoveContextVariable: function(dictName, key) {
    var d = this.currentCtx[dictName];
    if (d[key] != null) d[key] = null;
    for (var i = this.ctxStack.length - 1; i >= 0; i--) {
      d = this.ctxStack[i][dictName];
      if (d[key] != null) d[key] = null;
    }
  },
  // 全ての文脈で指定された名前の変数を設定する。
  internalDeepSetContextVariable: function(dictName, key, value) {
    this.currentCtx[dictName][key] = value;
    for (var i = this.ctxStack.length - 1; i >= 0; i--)
      this.ctxStack[i][dictName][key] = value;
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
    if (isGlobal || this.GetContextVariable('mod:common/global'))
      this.internalDeepSetContextVariable('userC', cmd, handler);
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
#%m Document::Read::switch
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
#% if DEBUG
        default:
        case SCAN_WT_INV:
          output.error("無効な語", "無効な語です。パーサ自体のバグである可能性が高いです。");
          this.currentCtx.BREAK = true;
          break;
#% end
      }
#%end
    //-----------------------------------------------------------------------

    var output = new ns.Writer();
    this.pushContext(baseContext);
    this.currentCtx.output = output;
    this.currentCtx.Initialize();
    for (;;) {
#%x Document::Read::switch
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
#%if DEBUG
    default:
      throw new Error("LOGIC_ERROR: Document#ReadArgument (arg#1): the specified command type is unrecognized.");
#%end
    }
    //baseContext.BREAK = true;
    //return this.Read(baseContext);
  },
  //*/
  /// <summary>
  /// 引数を html として取得します。
  /// </summary>
  GetArgumentHtml: function(basectx, contextVariables) {
    var output = new ns.Writer();
    if (!basectx) basectx = this.currentCtx;

    // 一単語
    var stkdepth = this.scanner.sourceStack.length;
    var fmacro = false;
    {
      this.skipSpaceAndComment();
      this.pushContext(this.context_cast([basectx, "sub.argument"]));
      if (contextVariables) agh.memcpy(this.currentCtx.dataV, contextVariables);
      this.currentCtx.output = output;
      this.currentCtx.Initialize();
      this.currentCtx.BREAK = true;
      for (;;) {
#%x Document::Read::switch.r|case SCAN_WT_CMD:|case SCAN_WT_CMD: fmacro=|
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
#%x Document::Read::switch
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
#%if DEBUG
ns.Document.Test = function(text) {
  var doc = new ns.Document(text, "global");
  window.test_doc = doc;
  //doc.SetAlphaMode(true);
  doc.Parse();
  return doc.html;
};
#%end

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
#%m ns::Command2::readers_read::body
    var args = [cmdName];
    for (var i = 0; i < this.length; i++) {
      args.push(this[i](doc, cmdName));
    }
#%end
#%x ns::Command2::readers_read::body
    return args;
  },
  /// *** CreateArgReaders 戻り値に設定されるメソッドです ***
  readers_apply_args: function(text, args, isHtml) {
#%m ns::Command2::readers_apply_args::body
    return text.replace(/#(0?)([1-9])|##/g, function($0, $1, $2) {
      if ($0 === "##") return "#";
      var ret = args[$2];
      if (ret == null) ret = $0;
      if ($1 == "0") ret = agh.Text.Unescape(ret, "html");
      if (!isHtml) ret = "\x1F" + ret + "\x1F"; // トークン強制区切 (see ns.Scanner)
      return ret;
    });
#%end
#%x ns::Command2::readers_apply_args::body
  },
  /// *** CreateArgReaders 戻り値に設定されるメソッドです ***
  /// <summary>
  /// 全引数の読み取りを実行し、指定された text の置換を行います。
  /// </summary>
  readers_apply_read_args: function(text, doc, cmdName, isHtml) {
    // return this.readers_apply_args(text, this.read(doc, cmdName)); に等価
#%x ns::Command2::readers_read::body
#%x ns::Command2::readers_apply_args::body
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
