// ==UserScript==
// @name           agh.addon.aghtex4seahorse v%VERSION%
// @description    Displays mathematical formulas written in TeX sources.
// @include        https://mail.google.com/mail/*
// @include        http://mail.google.com/mail/*
// @include        https://groups.google.com/group/*
// @include        http://groups.google.com/group/*
// @include        https://sites.google.com/site/*
// @include        http://site.google.com/site/*
// @type           SleipnirScript
// ==/UserScript==
var document = _document;
var window = _window;
(function() {
  var url = _window.location.href;
  var key = null;
  if (/\/\/mail\.google\.com\//.test(url))
    key = "gmail";
  else if (/\/\/groups\.google\.com\//.test(url))
    key = "ggroup";
  else if (/\/\/sites\.google\.com\//.test(url))
    key = "gsite";
  if (key == null) return;
  //---------------------------------------------------------------------------

  var aghutil = {
    // from https://sites.google.com/site/958site/Home/sleipnirscript/Show-SpeedDial-Icon-in-Sleipnir-Start
    GetCodebasePath: function(name) {
      if (this.contentPathRoot != null)
        return this.contentPathRoot + name;

      var reg_ext_js = /\.js$/i;
      this.contentPathRoot = sleipnir.ScriptFullName.replace(sleipnir.ScriptName, "").replace(reg_ext_js, "");
      return this.contentPathRoot + name;
    },
    GetUrlFromFilepath: (function() {
      var reg_char_yen = /\\/g;
      var reg_char_and = /\&/g;
      var reg_char_spc = / /g;
      return function(path) {
        return "file:///" + path.replace(reg_char_yen, "/").replace(reg_char_and, "%26").replace(reg_char_spc, "%20");
      };
    })(),
    // ReadFileAllTextA: function(filename) {
    //   var buff = [];
    //   var f = sleipnir.OpenFile(agh_basepath+"\\"+filename,"r");
    //   for (var i = 0; i < 10000; i++) {
    //     var line = f.ReadLine();
    //     if (line == null) break;
    //     buff.push(line);
    //   }
    //   alert("line = " + i + "; first = " + buff[0]);
    //   if (buff[0].startsWith("\uFEFF"))
    //     buff[0] = buff[0].substr(1);
    //   return buff[0].join("\n");
    // },
    ReadFileAllText: function(filename, charset) {
      try {
        var f = sleipnir.CreateObject("ADODB.Stream");
        f.Charset = charset || "UTF-8";
        f.Open();
        f.LoadFromFile(filename);
        var ret = f.ReadText;
        f.Close();
        return ret;
      } catch(e) {
        return null;
      }
    },
    // LoadJsA: function(filename) {
    //   return sleipnir.RunScript(agh_basepath + "\\" + filename);
    // },
    // LoadJsB: function(filename){
    //   var aghbase = "https://akinomyoga.github.io/agh";
    //   var head = document.getElementsByTagName("head")[0];
    //   var script = document.createElement("script");
    //   script.setAttribute("type", "text/javascript");
    //   script.setAttribute("charset", "utf-8");
    //   script.setAttribute("src", aghbase + "/" + filename);
    //   head.appendChild(script);
    // },
    _:0
  };

  var ext_basepath = aghutil.GetCodebasePath("agh.addon.aghtex4seahorse");
  var ext_baseurl  = aghutil.GetUrlFromFilepath(ext_basepath);
  var agh_basepath = ext_basepath + "\\agh";
  var agh_baseurl  = ext_baseurl + "/agh";

  // test to load image from local
  // document.body.style.backgroundImage = "url(" + agh_baseurl + "/latex/int.png)";
  function load_js(jsfile) {
    var src = aghutil.ReadFileAllText(ext_basepath+"\\"+jsfile);
    if (src == null) return false;
    _window.eval(src);
    return true;
  }
  function load_css(cssfile) {
    var head = document.getElementsByTagName("head")[0];
    var link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    link.setAttribute("charset", "utf-8");
    link.setAttribute("href", ext_baseurl + "/" + cssfile);
    head.appendChild(link);
  }

  if (!load_js("agh/agh.js")) {
    alert("aghtex4seahorse: failed to initialize agh.js");
    return;
  }
  // agh.scripts.AGH_URLBASE = "https://akinomyoga.github.io/agh/";
  agh.scripts.AGH_URLBASE = agh_baseurl + "/";
  agh.scripts.load_css = function(cssfile) {
    //alert("load_css: " + agh.scripts.AGH_URLBASE + cssfile);
    return true;
  };

  load_js("agh/agh.text.js");
  load_js("agh/agh.lang.tex.js");
  load_js("aghtex.js");
  load_js("aghtex4gmail.js");
  //load_css("aghtex.css");
  load_js("aghtex4seahorse.js");

  agh.LaTeX.Utils["aghtex.css/content"] = aghutil.ReadFileAllText(ext_basepath + "\\aghtex.css");
  agh.LaTeX.Utils["latex.ie.css/content"] = aghutil.ReadFileAllText(agh_basepath + "\\latex\\latex.ie.css");
})();
