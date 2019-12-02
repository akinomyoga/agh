(function() {
  //----------------------------------------------------------------------------
  //  Browser

  var browser = (function detect_browser() {
    var ua = navigator.userAgent;
    var wblist = [{tag: "Chrome", id: "Cr"}, {tag: "Safari", id: "Sf"}, {tag: "Gecko", id: "Fx"}, {tag: "Opera", id: "Op"}, {tag: "IE", id: "IE"}];
    for(var i = 0; i < wblist.length; i++) {
      if (ua.indexOf(wblist[i].tag) < 0) continue;
      return wblist[i].id;
    }
    return null;
  })();

  if (browser == null) return;
  var isSf = browser == "Cr" || browser == "Sf";
  var isOp = browser == "Op";
  var isFx = browser == "Fx";
  var isIE = browser == "IE";

  if (isFx && !('innerText' in HTMLElement.prototype)) {
    HTMLElement.prototype.__defineSetter__("innerText", function(value) {
      this.textContent = value;
    });
    HTMLElement.prototype.__defineGetter__("innerText", function() {
      return this.textContent;
    });
  }

  var getTextContent, setTextContent;
  function initializeTextContentFunctions() {
    if (isIE) {
      getTextContent = function(node) {
        if (node.nodeType === 3)
          return node.data;
        else
          return node.innerText;
      };
      setTextContent = function(node, value) {
        if (node.nodeType === 3)
          node.data = value;
        else
          node.innerText = value;
      };
    }else{
      getTextContent = function(node) {
        return node.textContent;
      };
      setTextContent = function(node,value) {
        node.textContent = value;
      };
    }
  }
  getTextContent = function(node) {
    initializeTextContentFunctions();
    return getTextContent(node);
  };
  setTextContent = function(node, value) {
    initializeTextContentFunctions();
    getTextContent(node, value);
  };

  //----------------------------------------------------------------------------
  //  Loader
  var script_hash = '';
  (function() {
    var aghjs = "https://akinomyoga.github.io/agh/agh.js";
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var hash = '';
      var src = scripts[i].src.replace(/#.*$/, function($0) { hash = $0; return ''; });
      var rep = src.replace(/agh\.fly\.((?:js|jgz|js\.gz|min\.js)(?:\?.*)?)$/, "agh.$1");
      if (src == rep) continue;
      aghjs = rep;
      script_hash = hash;
      break;
    }
    if (window.agh && window.agh.scripts) return;
    document.write('<script type="text/javascript" charset="utf-8" src="' + aghjs + '"></script>\r\n');
  })();

  function _fly_attach(target, type, func, bubble) {
    if (target.addEventListener)
      target.addEventListener(type, func, !!bubble);
    else
      target.attachEvent("on" + type, func);
  }

  function delayed_wait(delay, waitlist, func) {
    var waiter = function() {
      if (delay == 0) {
        agh.scripts.wait(waitlist, func);
      } else {
        window.setTimeout(function() {
          agh.scripts.wait(waitlist, func);
        }, delay);
      }
    };
    _fly_attach(window, "load", waiter, false);
  }

  //----------------------------------------------------------------------------
  //  Utilities

  function for_tag(elem, tagName, proc) {
    agh.Array.each(elem.getElementsByTagName(tagName), proc);
  }

  function read_meta(name, defaultValue) {
    name = name.toLowerCase();
    var metas = document.getElementsByTagName("meta");
    for(var i = 0; i < metas.length; i++) {
      if (!metas[i].name || metas[i].name.toLowerCase() !== name) continue;
      return metas[i].content;
    }
    return defaultValue;
  }

  //----------------------------------------------------------------------------
  //  agh.Text.Color
  //----------------------------------------------------------------------------
  function initialize_highlight() {
    agh.fly.process_color = function(target) {
      if (!target) target = document;
      agh.scripts.wait([
        "agh.js",
        "agh.text.js",
        "agh.text.color.js",
        "agh.text.color.css"
      ], function() {
        function determineLanguageFromClassName(className) {
          var source_lang = null;
          className.replace(/\bagh-prog-(\w+)\b/g, function($0, $1) {
            if (source_lang == null && agh.Text.Color[$1] instanceof Function)
              source_lang = $1;
          });
          if (source_lang == null)
            for (var i = 0, iN = translations.length; i < iN; i++) {
              if (!translations[i].cls.test(className)) continue;
              source_lang = translations[i].type;
              break;
            }
          return source_lang;
        }

        var translations = [
          // {cls:/\b(?:cpp|agh-prog-c)\b/,type:'cpp'},
          // {cls:/\bx86\b/,type:'x86'},
          // {cls:/\bjs\b/,type:'js'},
          // {cls:/\bcs\b/,type:'cs'},
          // {cls:/\bhtml\b/,type:'html'},
          // {cls:/\bxml\b/,type:'xml'},
          // {cls:/\bel\b/,type:'el'},
          // {cls:/\bcss\b/,type:'css'}
        ];
        for_tag(target, "pre", function(pre) {
          var fDIRTY = false;
          var className = pre.className;
          var content = pre.innerHTML;

          if (className.match(/\bdiff\b/)) {
            content = agh.Text.Color(content, "diff", "/html");
            fDIRTY = true;
          }

          if (className.match(/\biline\b/)) {
            content = agh.Text.Color(content, ".iline", "/html");
            fDIRTY = true;
          }

          var source_lang = determineLanguageFromClassName(className);
          if (source_lang != null) {
            content = agh.Text.Color(content, source_lang, "/html");
            fDIRTY = true;
          }

          if (fDIRTY) pre.innerHTML = content;
        });

        for_tag(target, "code", function(pre) {
          var fDIRTY = false;
          var className = pre.className;
          var content = pre.innerHTML;

          var source_lang = determineLanguageFromClassName(className);
          if (source_lang != null) {
            content = agh.Text.Color(content,source_lang,"/html");
            fDIRTY = true;
          }

          if (fDIRTY) pre.innerHTML = content;
        });

        for_tag(target, "dl", function(dl) {
          if (!dl.className.match(/\bprog-items\b/)) return;
          for_tag(dl, "dt", function(dt) {
            dt.innerHTML = agh.Text.Color(dt.innerHTML, "cpp", "/html");
          });
        });

        for_tag(target, "table", function(table) {
          if (!table.className.match(/\btext-macro\b/)) return;
          for_tag(table, "td", function(td) {
            td.innerHTML = agh.Text.Color(td.innerHTML, "cpp", "/html");
          });
        });
      });
    }
  }

  //****************************************************************************
  //
  //  TeX Transformation Functions
  //
  //----------------------------------------------------------------------------
  /**
   * agh.fly.latex_v1 (tex 変換 v1)
   *   古い形式の LaTeX 変換用の utils オブジェクト。
   *   agh.onlatexkickready に設定した関数の第一引数に渡され、
   *   その関数内で LaTeX の変換を実行するのに用いる。
   *
   *   @var agh.onlatexkickready = function(utils) {};
   *   @fn utils.tex_transform(target, mode, option)
   *   @fn utils.tex_transform_marker(parentElem, mode, option)
   */
  function initialize_latex_v1() {
    agh.fly.latex_v1 = {
      m_preamble: "",
      tex_transform: function(target, mode, option) {
        /// <summary>
        /// 指定された全ての要素について TeX 置換を実行します。
        /// </summary>
        /// <param name="mode">TeX 置換のモードを指定します。
        /// 値 full: 通常 TeX ドキュメントとして変換します。既定値です。
        /// 値 math: 数式モードで変換を実行します。
        /// 値 para: パラグラフモードで変換を実行します。
        /// </param>
        mode = this.tex_modes[mode];
        if (mode == null) mode = this.tex_modes["full"];

        if (agh.is(target, String)) {
          return mode.transform(target, option);
        } else if(agh.is(target, Array)) {
          var elems = target;

          var texbuff = [];
          for (var i = 0; i < elems.length; i++)
            texbuff.push(elems[i].innerText);

          var htmlbuff = mode.transform(texbuff.join("\n(@)"), option).split("(@)");
          for (var i = 0; i < elems.length; i++)
            mode.sethtml(elems[i],htmlbuff[i]);
        } else { // if ('tagName' in target)
          var span = target;
          var result = mode.transform(span.innerText, option);
          mode.sethtml(span, result);
        }
      },
      tex_modes: (function() {
        var sethtml_para = function(elem, html) {
          elem.innerHTML = '<tex:container class="aghfly-tex aghtex-para"></tex:container>';
          elem.firstChild.innerHTML=html;
        };
        var sethtml_math = function(elem, html) {
          elem.innerHTML = '<tex:container class="aghfly-tex aghtex-math"></tex:container>';
          elem.firstChild.innerHTML = html;
          // ↓これだと Fx (CSS1Compat) の時に tex:container の外に table が出てしまう
          // elem.innerHTML="<tex:container>" + html + "</tex:container>";
        };
        var paraContext = ["global", "mode.para", "pkg:amsmath/mode.para"];
        var mathContext = ["global", "mode.math", "pkg:amssymb/mode.math", "pkg:amsmath/mode.math"];

        return {
          full: {
            transform: function(source) {
              return new agh.LaTeX.Document(this.m_preamble + source, "global").Parse();
            },
            sethtml: sethtml_para
          },
          para: {
            transform: function(source) {
              return new agh.LaTeX.Document(this.m_preamble + source, paraContext).Parse();
            },
            sethtml: sethtml_para
          },
          math: {
            transform: function(source) {
              return new agh.LaTeX.Document(this.m_preamble + source, mathContext).Parse();
            },
            sethtml: sethtml_math
          },
          eqnarr: {
            transform: function(source, option) {
              source = "\\begin{array}[t]{r@{\\;}c@{\\;}l}" + source + "\\end{array}";
              if(/\bbraced\b/.test(option))
                source = "\\left\\{" + source + "\\right.";
              var html = new agh.LaTeX.Document(this.m_preamble + source, mathContext).Parse();
              return html;
            },
            sethtml: sethtml_math
          },
          begin: {
            transform: function(source, option) {
              var envname = option.envname;
              source = "\\usepackage{amsmath,amssymb,bm}\\begin{" + envname + "}" + source + "\\end{" + envname + "}";
              var html = new agh.LaTeX.Document(this.m_preamble + source, paraContext).Parse();
              return html;
            },
            sethtml: sethtml_para
          }
        }
      })(),
      tex_transform_marker: function(parentElem, mode, reg_range) {
        var pText = agh.browser.name == "IE" ? "data" : "textContent";

        function getTextNodes(parent) {
          /// <summary>
          /// 要素に含まれている #text ノードの集合を取得します。
          /// </summary>
          var texts = [];
          function getChildTextsR(elem) {
            if (elem.nodeType == 3)
              texts.push(elem);
            else if(elem.nodeType == 1)
              agh.Array.each(elem.childNodes,getChildTextsR);
          }
          getChildTextsR(parent);
          return texts;
        }

        // pair の抜き出し
        var elems = [];
        agh.Array.each(getTextNodes(parentElem), function(t) {
          var itex = 0;
          var html = t[pText].replace(/[\<\>\"\&]/g, function($0) {
            // escape html (改行は変換しない)
            return {'<': '&lt;', '>': '&gt;', '"': '&quot;', '&': '&amp;'}[$0];
          }).replace(reg_range, function($0, $1) {
            // tagging tex:math
            itex++;
            return '<tex:container class="aghfly-tex aghfly-tex-' + mode + '" title="' + $1 + '">' + $1 + '</tex:container>';
          });

          if (itex == 0) return;
          var span = document.createElement("span");
          span.innerHTML = html;
          t.parentNode.insertBefore(span, t);
          t[pText] = "";

          agh.Array.each(span.childNodes, function(e) {
            if (e.nodeType != 1) return;
            elems.push(e);
          });
        });

        this.tex_transform(elems, mode);
      }
    };
  }

  //---------------------------------------------------------------------------
  // 2013-11-05
  /**
   * agh.fly.js tex 変換
   *
   * - script#tex-preamble
   * - (obsoleted) script#tex-default
   *   これらの要素に TeX ソースを指定しておくと、それを変換の最初に読み取ります。
   *   script 要素の type 属性には "application/x-tex" を指定して下さい。
   *
   * - body.aghfly-inline-math
   *   内部に含まれる $...$ を inline math-mode tex として変換します。
   *
   * - body.aghfly-inline-math-bqd
   * - (obsoleted) body.tex\:math_bqd
   *   内部に含まれる `$...$ を inline math-mode tex として変換します。
   *
   * - elem.aghfly-tex-imath
   *   内部に含まれる $...$ を inline math-mode tex として変換します。
   * - elem.aghfly-tex-imathbq
   * - elem.aghfly-tex-suppress
   *   この要素の子ノードに対する変換を実行しません。
   *
   * - span.aghfly-tex-math
   *   中身を inline math-mode tex として変換します。
   * - span.aghfly-tex-para
   *   中身を inline text-mode tex として変換します。
   *
   * - p.aghfly-begin-(envname)
   * - div.aghfly-begin-(envname)
   *   中身を envname 環境内の tex として変換します。
   *   '*' で終わる環境名の場合は、'*' の代わりに '_' を指定する事もできます。
   *   ('*' は、HTML の規格上、クラス名に含められない為。)
   *
   * - (obsoleted) p.tex\:eqn       (→ p.aghfly-tex-begin-gather_)
   * - (obsoleted) div.tex\:eqn     (→ div.aghfly-tex-begin-gather_)
   * - (obsoleted) p.tex\:eqnarr    (→ p.aghfly-tex-begin-align_)
   * - (obsoleted) div.tex\:eqnarr  (→ div.aghfly-tex-begin-align_)
   *   中身を displaymath の数式として変換します。
   */
  function initialize_latex20131105() {
    agh.fly.latex_v2 = {
      m_preamble: ""
    };

    //---------------------------------------------------
    // 1 変換対象の収集

    var escapeEntityMap = {'<': '&lt;', '>': '&gt;', '"': '&quot;', '&': '&amp;'};
    function escapeEntity(text) {
      return text.replace(/[\<\>\"\&]/g, function($0) { return escapeEntityMap[$0]; });
    }

    agh.fly.latex_v2.extractInlineMathFromTextNode = function(targets, node, reg_range) {
      var itex = 0;
      var html = escapeEntity(getTextContent(node)).replace(reg_range, function($0, $1) {
        itex++;
        return '<tex:target class="aghfly-tex-math" title="' + $1 + '">' + $1 + '</tex:target>';
      });
      if (itex == 0) return;

      var span = document.createElement("span");
      span.innerHTML = html;
      node.parentNode.insertBefore(span, node);
      setTextContent(node, "");

      for (var i = 0, iN = span.childNodes.length; i < iN; i++) {
        var target = span.childNodes[i];
        if (target.nodeType == 1)
          targets.push({type: "imath", target: target});
      }
    };

    function extractAllTargets(elem, params) {
      var targets = [];

      function processNodes(children, elementOnly) {
        if (!(children instanceof Array))
          children = agh(children, Array); // 内容固定

        for (var i = 0, iN = children.length; i < iN; i++) {
          var child = children[i];
          if (elementOnly && child.nodeType !== 1) continue;

          if (child.nodeType === 3) {
            processTextNode(child);
          } else if(child.nodeType === 1) {
            processElementNode(child);
          }
        }
      }

      function processTextNode(node) {
        if (params.regexInlineMath)
          agh.fly.latex_v2.extractInlineMathFromTextNode(targets, node, params.regexInlineMath);
      }

      function processElementNode(elem) {
        if (/^(?:p|div)$/i.test(elem.tagName)) {
          var m;
          if ((m=/(?:^|\s)aghfly-begin-([a-zA-Z]+[_*]?)(?:\s|$)/.exec(elem.className))) {
            targets.push({type: "begin", envname: m[1].replace(/_$/, '*'), target: elem});
            processNodes(elem.childNodes, true);
            return;
          }

          // obsoleted classes: tex:eqn, tex:eqnarr
          if (/(?:^|\s)tex\:eqn(?:\s|$)/.test(elem.className)) {
            if (!/(?:^|\s)nocenter(?:\s|$)/.test(elem.className))
              elem.style.textAlign = "center";
            targets.push({type: "math", target: elem, options: elem.className});
            processNodes(elem.childNodes, true);
            return;
          } else if (/(?:^|\s)tex\:eqnarr(?:\s|$)/.test(elem.className)) {
            if (!/(?:^|\s)nocenter(?:\s|$)/.test(elem.className))
              elem.style.textAlign = "center";
            targets.push({type: "eqnarr", target: elem, options: elem.className});
            processNodes(elem.childNodes, true);
            return;
          }
        } else if (/^span$/i.test(elem.tagName)) {
          // classes aghfly-tex-math, aghfly-tex-para
          // obsoleted classes: tex:math, tex:para
          // inline-math, inline-tex
          if (/(?:^|\s)(?:aghfly-tex-|tex\:)math(?:\s|$)/.test(elem.className)) {
            if (elem.title == null || elem.title == "")
              elem.title = getTextContent(elem);
            targets.push({type: "imath", target: elem});
            processNodes(elem.childNodes, true);
            return;
          } else if (/(?:^|\s)(?:aghfly-tex-|tex\:)para(?:\s|$)/.test(elem.className)) {
            if (elem.title == null || elem.title == "")
              elem.title = getTextContent(elem);
            targets.push({type: "para", target: elem});
            processNodes(elem.childNodes, true);
            return;
          }
        }

        if (/(?:^|\s)aghfly-tex-suppress(?:\s|$)/.test(elem.className)) return;

        // 再帰的に探索
        {
          var original_regex = params.regexInlineMath;

          if (/^(?:pre|code)$/i.test(elem.tagName))
            params.regexInlineMath = /[^\s\S]/g; // 何にも一致させない
          else if (/(?:^|\s)(?:aghfly-tex-imath|tex\:dollared)(?:\s|$)/.test(elem.className))
            params.regexInlineMath = /\`?\$((?=[^$\s])[^$]*[^$\s])\$/g; // /\$([^\$]+)\$/g;
          else if (/(?:^|\s)aghfly-tex-imathbq(?:\s|$)/.test(elem.className))
            params.regexInlineMath = /\`\$([^\$]+)\$/g;

          processNodes(elem.childNodes);

          params.regexInlineMath = original_regex;
        }
      }

      processElementNode(elem);
      return targets;
    }

    //---------------------------------------------------
    // 2 全体 TeX ソースの構築と埋込要素の収集

    var getRandomAlphaHex_table = {
      '0': 'G', '1': 'H', '2': 'I', '3': 'J', '4': 'K',
      '5': 'L', '6': 'M', '7': 'N', '8': 'O', '9': 'P'
    };
    function getRandomAlphaHex8() {
      return (0 | Math.random() * 0x7FFFFFFF).toString(16).toUpperCase().replace(/[0-9]/g, function($0) {
        return getRandomAlphaHex_table[$0];
      });
    }

    // aghflyEmbeddedNode: 推測されない様にコマンド名を乱数にする
    var ID_EMBEDDED_NODE = 'aghflyEx' + getRandomAlphaHex8() + getRandomAlphaHex8();
    var ID_AGHFLY_PARA = 'aghflyPx' + getRandomAlphaHex8() + getRandomAlphaHex8();
    var ID_AGHFLY_MATH = 'aghflyMx' + getRandomAlphaHex8() + getRandomAlphaHex8();

    function extractTeXSourceAndEmbeddedNodes(elem, sourceBuffer, nodeBuffer, params) {
      var children = elem.childNodes;
      for(var j = 0, jN = children.length; j < jN; j++) {
        var child = children[j];
        if (child.nodeType === 3) {
          var content = getTextContent(child);
          if (params.filterSource instanceof Function)
            content = params.filterSource(content);
          sourceBuffer.push(content);
        } else {
          sourceBuffer.push('{\\', ID_EMBEDDED_NODE, '}');
          nodeBuffer.push(child);
        }
      }
    }

    function targets_constructFullTeXSource(targets, buff, params) {
      for(var i = 0, iN = targets.length; i < iN; i++) {
        var ent = targets[i];
        ent.embedded = [];

        var aghflyEnvironmentName = ID_AGHFLY_MATH;
        var prefix = '';
        var suffix = '';

        switch (ent.type) {
        case "math":
          break;
        case "imath":
          prefix = '\\textstyle{}';
          break;
        case "para":
          aghflyEnvironmentName = ID_AGHFLY_PARA;
          break;
        case "eqnarr":
          if (/(?:^|\s)braced(?:\s|$)/.test(ent.options)) {
            prefix = '\\left\\{\\begin{array}[t]{r@{\\;}c@{\\;}l}';
            suffix = '\\end{array}\\right.';
          } else {
            aghflyEnvironmentName = ID_AGHFLY_PARA;
            prefix = '\\begin{eqnarray*}';
            suffix = '\\end{eqnarray*}';
          }
          break;
        case "begin":
          aghflyEnvironmentName = ID_AGHFLY_PARA;
          var envname = ent.envname;
          prefix = '\\begin{' + envname + '}';
          suffix = '\\end{' + envname + '}';
          break;
        }

        buff.push('\\begin{', aghflyEnvironmentName, '}');
        buff.push(prefix);
        extractTeXSourceAndEmbeddedNodes(ent.target, buff, ent.embedded, params);
        buff.push('%\n'); // 中身に % が含まれている場合対策
        buff.push(suffix);
        buff.push('\\end{', aghflyEnvironmentName, '}');
      }
    }

    //---------------------------------------------------
    // 3 変換実施と結果出力

    function container_setHtmlAndEmbeddedNodes(container, html, embedded) {
      container.innerHTML = html;

      var iemb = 0;

      var idiv = 0;
      var divs = agh(container.getElementsByTagName("div"), Array);
      while (idiv < divs.length && iemb < embedded.length) {
        var emb = divs[idiv++];
        if (emb.className != 'aghfly-embedded-node') continue;

        emb.innerHTML = '';
        emb.appendChild(embedded[iemb++]);
      }

      if (iemb < embedded.length) {
        // 本来此処には来ない (ID_EMBEDDED_NODE の重複がない限り)。
        for(; iemb < embedded.length; iemb++)
          container.appendChild(embedded[iemb]);
      }
    }

    var CMDH_EMBEDDED;
    function CMDH_EMBEDDED_getInstance() {
      if (!CMDH_EMBEDDED)
        CMDH_EMBEDDED = new agh.LaTeX.Command2('s@', null, '<div class="aghfly-embedded-node">[to be replaced]</div>');
      return CMDH_EMBEDDED;
    }

    // @param params.targets
    // @param params.regexInlineMath
    // @param params.preamble
    // @param params.flag_revert_symbols
    agh.fly.latex_v2.transform = function latex_v2_transform(elem, params) {
      if (!elem) elem = document.body;
      if (!params) params = {};

      if (params.flag_revert_symbols) {
        var symbolsTable = {
          Α: '{A}',        Β: '{B}',         Γ: '{\\Gamma}',  Δ: '{\\Delta}',
          Ε: '{E}',        Ζ: '{Z}',         Η: '{H}',        Θ: '{\\Theta}',
          Ι: '{I}',        Κ: '{K}',         Λ: '{\\Lambda}', Μ: '{M}',
          Ν: '{N}',        Ξ: '{\\Xi}',      Ο: '{O}',        Π: '{\\Pi}',
          Ρ: '{P}',        Σ: '{\\Sigma}',   Τ: '{T}',        Υ: '{\\Upsilon}',
          Φ: '{\\Phi}',    Χ: '{\\Chi}',     Ψ: '{\\Psi}',    Ω: '{\\Omega}',

          α: '{\\alpha}',    β: '{\\beta}',     γ: '{\\gamma}',    δ: '{\\delta}',
          ε: '{\\epsilon}',  ζ: '{\\zeta}',     η: '{\\eta}',      θ: '{\\theta}',
          ι: '{\\iota}',     κ: '{\\kappa}',    λ: '{\\lambda}',   μ: '{\\mu}',
          ν: '{\\nu}',       ξ: '{\\xi}',       ο: '{o}',          π: '{\\pi}',
          ρ: '{\\rho}',      ς:  '{\\varsigma}', σ: '{\\sigma}',    τ: '{\\tau}',
          υ: '{\\upsilon}',  φ: '{\\varphi}',   χ: '{\\chi}',      ψ: '{\\psi}',
          ω: '{\\omega}',

          '±': '{\\pm}', '∂': '{\\partial}', '∇': '{\\nabla}'
        };
        params.filterSource = function(tex) {
          return tex.replace(/[Α-ω±∂∇]/g, function($0) { return symbolsTable[$0] || $0; });
        };
      }

      var targets = params.targets || extractAllTargets(elem, params);

      var buff = [];
      buff.push('\\usepackage{amsmath,amssymb,bm}');
      if (params.preamble) buff.push(params.preamble);
      targets_constructFullTeXSource(targets, buff, params);

      //console.log("dbg: buff.join()=" + buff.join(""));
      var doc = new agh.LaTeX.Document(buff.join(''), ["global", "mode.para"]);

      var ctx = doc.context_cast("global");
      ctx.AddCommandHandler(ID_EMBEDDED_NODE, CMDH_EMBEDDED_getInstance());
      ctx.AddEnvironment(ID_AGHFLY_MATH, {
        suppressOutput: true,
        epilogue: function(doc, ctx) { sethtml('<tex:math>' + ctx.output.toHtml() + '</tex:math>', "math"); },
        context: "mode.math"
      });
      ctx.AddEnvironment(ID_AGHFLY_PARA, {
        suppressOutput: true,
        epilogue: function(doc, ctx) { sethtml(ctx.output.toHtml(), "para"); },
        context: "mode.para"
      });

      var itarget = 0;
      var div = document.createElement("div");
      var containers = [];
      function sethtml(html, mode) {
        var ent = targets[itarget++];

        if (ent == null) {
          // 本来此処に来ない (ID_AGHFLY_MATH/PARA が重複しない限り)。
          ent = {target: document.createElement("div"), embedded: []};
          document.body.appendChild(ent.target);
        }

        div.innerHTML = '<tex:container class="aghfly-tex aghtex-' + mode + '"></tex:container>';
        var container = div.firstChild;
        container_setHtmlAndEmbeddedNodes(container, html, ent.embedded);

        ent.target.innerHTML = '';
        ent.target.appendChild(container);
        containers.push(container);
      }

      var result = doc.Parse();
      for (var i = 0; i < containers.length; i++)
        doc.ResolveReference(containers[i]);
    };
  }

  //****************************************************************************

  var kick_type = read_meta("agh-fly-type","");

  function initialize() {
    if (agh.fly) return;
    agh.Namespace("fly", agh);

    var procs = [];
    agh.fly.defineContentsProcessor = function(proc) {
      procs.push(proc);
    };
    agh.fly.processContents = function(target) {
      if (!target) target = document;
      for (var i = 0; i < procs.length; i++)
        procs[i](target);
    };

    initialize_highlight();
    initialize_latex_v1();
    initialize_latex20131105();
  }

  if (/\bcolor\b/.test(kick_type)) {
    _fly_attach(window, "load", function() {
      initialize();
      agh.fly.process_color(document);
      agh.fly.defineContentsProcessor(agh.fly.process_color);
    });
  }

  if (/\btex\b/.test(kick_type)) {
    delayed_wait(0, [
      "agh.js",
      "agh.lang.tex.js",
      "latex/latex." + (isIE ? 'ie' : isFx ? 'fx' : isOp ? 'op' : 'sf') + ".css"
    ], function() {
      initialize();

      var params = {};
      {
        // set params.flag_revert_symbols
        params.flag_revert_symbols = read_meta("aghfly-reverts-symbols", false);

        // set params.preamble
        var elem = document.getElementById("tex-preamble") || document.getElementById("tex-default");
        if (elem != null) {
          var preamble = elem.innerHTML;
          agh.fly.latex_v1.m_preamble = preamble;
          params.preamble = preamble;
        }

        // set params.regexInlineMath
        if (/(?:^|\s)aghfly-inline-math(?:\s|$)/.test(document.body.className)) {
          // class="aghfly-inline-math"
          params.regexInlineMath = /\`?\$((?!\s)[^$]*[^$\s])\$/g;
        } else if(/(?:^|\s)(?:aghfly-inline-math-bqd|tex\:math_bqd)(?:\s|$)/.test(document.body.className)) {
          // class="aghfly-inline-math-bqd"
          // class="tex:math_bqd" (obsolete)
          params.regexInlineMath = /\`\$([^\$]+)\$/g;
        }
      }

      agh.fly.latex_v2.transform(document.body, params);
      agh.fly.defineContentsProcessor(function(target) {
        return agh.fly.latex_v2.transform(target, params);
      });
      if (agh.is(agh.onlatexkickready, Function))
        agh.onlatexkickready(agh.fly.latex_v1);
    });
  }

  if (script_hash == '#hatena' && window.aghtex4hatenablog != "processed") {
    window.aghtex4hatenablog = "processed";

    // 参考: agh.dom.js
    var css_add = (function() {
      var sheet;
      if (agh.browser.vIE && document.createStyleSheet) {
        try {
          sheet = document.createStyleSheet();
        }catch(ex){}
      }
      if (!sheet) {
        var style = document.createElement("style");
        style.type = "text/css";
        style.appendChild(document.createTextNode(""));
        var head = document.getElementsByTagName("head")[0] || document.documentElement;
        head.appendChild(style);
        sheet = style.sheet;
      }

      var rules = sheet.cssRules || sheet.rules;
      return function(selector, css) {
        return sheet.insertRule(selector + "{" + css + "}", rules.length);
      };
    })();
    css_add('.entry-content pre[lang^="tex:"]', 'background-color: #eee; color: black; white-space: normal; border: 1px dashed gray; padding: 0; font-size: 70%;');


    // 直接 agh.js, agh.lang.tex.js を読み込んでいると仮定
    _fly_attach(document, "DOMContentLoaded", function() {
      initialize();

      var params = {};
      {
        params.preamble = '\\documentclass{revtex4}';
        params.flag_revert_symbols = true;

        function extractAllTargets(elem, params) {
          params.targets = [];

          function processElementNode_code(code) {
            var tnode = code.previousSibling;
            if (!tnode) return;
            if (tnode.nodeType == 1 && /^span$/i.test(tnode.tagName) && tnode.childNodes.length)
              tnode = tnode.childNodes[tnode.childNodes.length - 1];
            if (tnode.nodeType != 3) return;
            var text = getTextContent(tnode);
            if (!text.endsWith("$")) return;
            setTextContent(tnode, text.substr(0, text.length - 1));

            var source = getTextContent(code);
            var span = code.ownerDocument.createElement('span');
            span.title = source;
            setTextContent(span, source);
            code.parentNode.insertBefore(span, code);
            code.style.display = 'none';
            params.targets.push({type: "imath", target: span});
          }

          function processElementNode_pre(pre) {
            var ent = null;
            var lang = pre.dataset.lang;
            if (lang == "tex:preamble") {
              params.preamble += getTextContent(pre) + "\n";
              pre.style.display = 'none';
            } else if (lang == "tex:plain") {
              ent = {type: "para"};
            } else if (lang && lang.startsWith('tex:')) {
              ent = {type: "begin", envname: lang.substr(4)};
            }

            if (ent) {
              var source = getTextContent(pre);
              var div = pre.ownerDocument.createElement('div');
              div.title = source;
              setTextContent(div, source);
              pre.parentNode.insertBefore(div, pre);
              pre.style.display = 'none';
              ent.target = div;
              params.targets.push(ent);
            }
          }

          function processElementNode(elem) {
            if (/^code$/i.test(elem.tagName)) {
              processElementNode_code(elem);
            } else if (/^pre$/i.test(elem.tagName)) {
              processElementNode_pre(elem);
            } else if (/^div$/i.test(elem.tagName) && /(?:^|\s)aghtex(?:\s|$)/.test(elem.className)) {
              params.targets.push({type: "begin", envname: "align", target: elem});
              processNodes(elem.childNodes);
            } else if (/^span$/i.test(elem.tagName) && /(?:^|\s)aghtex(?:\s|$)/.test(elem.className)) {
              params.targets.push({type: "imath", target: elem});
              processNodes(elem.childNodes);
            } else {
              processNodes(elem.childNodes);
            }
          }

          function processNodes(children, elementOnly) {
            if (!(children instanceof Array))
              children = agh(children, Array); // 内容固定

            for (var i = 0, iN = children.length; i < iN; i++) {
              var child = children[i];
              if (elementOnly && child.nodeType !== 1) continue;

              if(child.nodeType === 3)
                agh.fly.latex_v2.extractInlineMathFromTextNode(params.targets, child, /\`?\$((?!\n)[^$]*[^$\n])\$/g);
              else if(child.nodeType === 1)
                processElementNode(child);
            }
          }

          processElementNode(elem);
        }

        extractAllTargets(document.body, params);
      }

      if (params.targets.length) {
        agh.fly.latex_v2.transform(document.body, params);
        agh.Array.each(document.getElementsByClassName("entry-footer"), function(elem) {
          var div = document.createElement('div');
          div.innerHTML = '<a class="aghfly-powered-hatena" href="https://akinomyoga.hatenablog.com/entry/2019/11/30/180113" target="_blank">Powered by aghtex4hatenablog</a>';
          css_add('a.aghfly-powered-hatena', 'color: white; background: gray; padding: 0.3ex; font-size: 80%; font-weight: bold;');
          if (elem.childNodes[0])
            elem.insertBefore(div, elem.childNodes[0]);
          else
            elem.appendChild(div);
        });
      }
    });
  }
})();
