# `agh` - Ageha JavaScript Library -

## Build

### Requirements

- `make` (GNU Make)
- `gawk` (GNU awk)
- A C# compiler: `csc` (Windows) or `dmcs` (Mono)
- CLI: .NET Framework (Windows) or `mono` (Mono)
- [`uglifyjs`](https://github.com/mishoo/UglifyJS2) with Node.js
- `sfnt2woff` [WOFF fonts!](http://people.mozilla.org/~jkew/woff/)
- `ttf2eot` [ttf2eot](https://github.com/metaflop/ttf2eot)
- `lwiki` (optional) [lwiki](https://github.com/akinomyoga/lwiki)

### Build and setup

```bash
$ git clone --recursive git@github.com:akinomyoga/agh.git
$ cd agh
$ make
```

The resulting scripts will be generated in the subdirectory `agh/out`.
Please copy the directory to the place you want to have agh library.
The following command shows an example to place the library into the path `/path/to/webroot/agh`.

```bash
$ cp -a -r out /path/to/webroot/agh
```

## Basic usage

### Load `agh.js` first
Basically, the script file `agh/agh.js` is loaded first.
This file provides a functionality to load other agh scripts as well as basic utilities to create libraries.

```html
<!DOCTYPE html>
<html>
<head>
<title>Sample</title>
<script type="text/javascript" src="/path/to/agh/agh.js"></script>
<script type="text/javascript">
agh.scripts.wait('event:onload', function() {
  var t = document.createTextNode("Hello, world!");
  document.getElementById("hello").appendChild(t);
});
</script>
</head>
<body>
<h1>Hello</h1>
<div id="hello">
</div>
</body>
</html>
```

Other agh scripts can be loaded using a function `agh.scripts.wait(scriptName, callback)`.
The script name to be loaded is specified to the first argument `scriptName`.
The function `callback` will be called on the completion of the load including all the dependencies.
Scripts which depend on `scriptName` can be placed in `callback`.
The following codes show a template form to use `agh.scripts.wait`:

```html
<script type="text/javascript" src="/path/to/agh/agh.js"></script>
<script type="text/javascript">
agh.scripts.wait(["agh.text.js", "agh.dom.js"], function() {
  // do something using the function of agh.text.js / agh.dom.js
});
</script>
```

Script names are filenames relative to `agh.js`;
for example, the name for `agh/agh.text.js` is `"agh.text.js"`.
The special name `"event:onload"` specifies that the `callback` should be called after `load` event of `window`.
If css filenames are specified, corresponding `<link />` elements for the css files will be generated.
However, the css files do not block the execution of `callback`.
To load more than one target, an array can be specified to `scriptName`.
If an array is specified, `callback` is called when all the files specified in the array are completed.


### Use `agh.text.color.js`
The script `agh/agh.text.color.js` provides the functions to convert some source codes into highlighted html.
The following example shows a way to highlight contents of `<pre>` elements as a javascript source codes.

```html
<script type="text/javascript" src="/path/to/agh/agh.js"></script>
<script type="text/javascript">
agh.scripts.wait(["event:onload", "agh.text.color.js"], function() {
  agh.Array.each(document.getElementsByTagName("pre"), function(pre) {
    pre.innerHTML = agh.Text.Color(pre.innerHTML, "js", "/html");
  });
});
</script>
```

### Use `agh.lang.tex.js`
The script `agh/agh.lang.tex.js` provides conversions of TeX codes into html.

```html
<script type="text/javascript" src="/path/to/agh/agh.js"></script>
<script type="text/javascript">
agh.scripts.wait(["event:onload", "agh.lang.tex.js"], function() {
  var div = document.getElementById("texdoc");
  var source = agh.Text.Unescape(div.innerHTML, "html");
  var doc = new agh.LaTeX.Document(source);
  var result = doc.Parse();
  div.innerHTML = result;
});
</script>
<div id="texdoc">
\documentclass{article}
\begin{document}
Hello, \TeX world!
\end{document}
</div>
```

### Use `agh.lang.ps.js`
The script `agh/agh.lang.tex.js` provides an interpreter of PostScript.

```html
<script type="text/javascript" src="/path/to/agh/agh.js"></script>
<script type="text/javascript">
agh.scripts.wait(["event:onload", "agh.lang.ps.js"], function() {
  var psimage = document.getElementById("psimage");
  var source = agh.Text.Unescape(psimage.innerHTML, "html");
  var ps = new agh.PostScript.Processor({
    target: psimage,
    bb: [0,0,610,790],
    size: ['500px','500px']
  });
  ps.graphics.SetBoundingBox(0,0,610,790);
  ps.outstream=console.log;
  ps.Run(source);
});
</script>
<div id="psimage">
%%BoundingBox: 0 0 600 600
%%MwgOptimization: ib
%!OPS-1.0 %%Creator: HAYAKAWA,Takashi (h-takasi@isea.is.titech.ac.jp)
/p/floor/S/add/A/copy/n/exch/i/index/J/ifelse/r/roll/e/sqrt/H{count 2 idiv exch
repeat}def/q/gt/h/exp/t/and/C/neg/T/dup/Y/pop/d/mul/w/div/s/cvi/R/rlineto{load
def}H/c(j1idj2id42rd)/G(140N7)/Q(31C85d4)/B(V0R0VRVC0R)/K(WCVW)/U(4C577d7)300
T translate/I(3STinTinTinY)/l(993dC99Cc96raN)/k(X&amp;E9!&amp;1!J)/Z(blxC1SdC9n5dh)/j
(43r)/O(Y43d9rE3IaN96r63rvx2dcaN)/z(&amp;93r6IQO2Z4o3AQYaNlxS2w!)/N(3A3Axe1nwc)/W
270 def/L(1i2A00053r45hNvQXz&amp;vUX&amp;UOvQXzFJ!FJ!J)/D(cjS5o32rS4oS3o)/v(6A)/b(7o)
/F(&amp;vGYx4oGbxSd0nq&amp;3IGbxSGY4Ixwca3AlvvUkbQkdbGYx4ofwnw!&amp;vlx2w13wSb8Z4wS!J!)/X
(4I3Ax52r8Ia3A3Ax65rTdCS4iw5o5IxnwTTd32rCST0q&amp;eCST0q&amp;D1!&amp;EYE0!J!&amp;EYEY0!J0q)/V
3 def/x(jd5o32rd4odSS)/a(1CD)/E(YYY)/o(1r)/f(nY9wn7wpSps1t1S){[n{( )T 0 4 3 r
put T(/)q{T(9)q{cvn}{s}J}{($)q{[}{]}J}J cvx}forall]cvx def}H K{K{L setgray
moveto B fill}for Y}for showpage
</div>
```

### Other files

- `agh.class.js`
- `agh.debug.js`
- `agh.dom.js`
- `agh.forms.js`
- `agh.regex.js`
- `agh.text.js`
- `agh.text.encode.js`
- `agh.fly.js`
