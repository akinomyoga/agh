(function() {
  function show_headers(hs) {
    var buff = [];
    for (var i = 0; i < hs.length; i++)
      buff.push(hs[i].name, ': ', hs[i].value, '\n');
    alert(buff.join(""));
  }
  chrome.webRequest.onHeadersReceived.addListener(function(details) {
    var hs = details.responseHeaders;
    var contentTypeProcessed = false;
    var contentDispositionProcessed = false;

    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      switch (h.name.toLowerCase()) {
      case 'content-type':
        contentTypeProcessed = true;
        h.value = h.value ? h.value.replace(/^\s*[^\s\;]*/, "text/plain") : "text/plain";
        break;
      case 'content-disposition':
        contentDispositionProcessed = true;
        h.value = 'inline';
        break;
      }
    }

    if (!contentTypeProcessed)
      hs.push({name: "Content-Type", value: "text/plain"});
    if (!contentDispositionProcessed)
      hs.push({name: "Content-Disposition", value: "inline"});
    //show_headers(hs);
    return {responseHeaders: hs};
  }, {
    urls: ["*://*/*.tex"],
    types: ["main_frame", "sub_frame"]
  }, [
    "blocking",
    "responseHeaders"
  ]);

  var aghtex = agh.LaTeX.Utils;
  chrome.extension.onConnect.addListener(function(port, name) {
    // content script 初期化時に呼び出される
    port.onMessage.addListener(function(info, con) {
      // content script からの要求に対し。

      var ret = null;
      switch (info.operation) {
      case "tex_transform":
        ret = aghtex.tex_transform.apply(aghtex, info.arguments);
        break;
      case "agh.Text.Decode":
        ret = agh.Text.Decode.apply(agh.Text, info.arguments);
        break;
      }

      con.postMessage({callId: info.callId, returnValue: ret});
    });
  });
})();
