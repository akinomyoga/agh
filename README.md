#`agh` - Ageha JavaScript Library -

##Build

###Requirements

- `make` (GNU Make)
- `gawk` (GNU awk)
- A C# compiler: `csc` (Windows) or `dmcs` (Mono)
- CLI: .NET Frameworks (Windows) or `mono` (Mono)
- `sfnt2woff` [WOFF fonts!](http://people.mozilla.org/~jkew/woff/)
- `ttf2eot` [ttf2eot](https://github.com/metaflop/ttf2eot)
- `lwiki` (optional) [lwiki](https://github.com/akinomyoga/lwiki)

###Build and setup

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

##Usage

###`agh.js`
Basically, the script file `agh/agh.js` is loaded first.
This file provides a functionality to load other agh scripts as well as basic utilities to create libraries.

```html
<!DOCTYPE html>
<html>
<head>
<title>Sample</title>
<script type="text/javascript" src="/path/to/agh/agh.js"></script>
<script type="text/javascript">
agh.scripts.wait('event:onload',function(){
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

Other agh scripts can be loaded using a function `agh.scripts.wait(scriptName,callback)`.
The script name to be loaded is specified to the first argument `scriptName`.
The function `callback` will be called on the completion of the load.
Scripts which depends on `scriptName` can be placed in `callback`.
The following codes show a template form to use `agh.scripts.wait`:

```html
<script type="text/javascript" src="/path/to/agh/agh.js"></script>
<script type="text/javascript">
agh.scripts.wait(["agh.text.js","agh.dom.js"],function(){
  // do something using the function of agh.text.js / agh.dom.js
});
</script>
```

Script names are filenames relative to `agh.js`;
for example, the name for `agh/agh.text.js` is `"agh.text.js"`.
The special name `"event:onload"` specifies that the `callback` should be called after `load` event of `window`.
If css filenames are specified, corresponding `link` elements to load the files will be generated.
However, the css files do not block the execution of `callback`.
To load more than one target, an array can be specified to `scriptName`.
If an array is specified, `callback` is called when all the files specified in the array are completed.


###`agh.text.color.js`
The script `agh/agh.text.color.js` provides the functions to convert some source codes into highlighted html.

```html
<script type="text/javascript" src="/path/to/agh/agh.js"></script>
<script type="text/javascript">
agh.scripts.wait("agh.text.color.js",function(){
  agh.Array.each(document.getElementsByTagName("pre"),function(pre){
    pre.innerHTML = agh.Text.Color(pre.innerHTML, "js", "/html");
  });
});
</script>
```

###`agh.lang.tex.js`
The script `agh/agh.lang.tex.js` provides the conversion of TeX codes into html.

###`agh.lang.ps.js`
The script `agh/agh.lang.tex.js` provides the interpreter of PostScript.

###Other files

- `agh.class.js`
- `agh.debug.js`
- `agh.dom.js`
- `agh.forms.js`
- `agh.regex.js`
- `agh.text.js`
- `agh.text.encode.js`
- `agh.fly.js`
