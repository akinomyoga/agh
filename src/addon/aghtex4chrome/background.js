(function() {
  chrome.webRequest.onHeadersReceived.addListener(function(details) {
    var hs = details.responseHeaders;
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (h.name.toLowerCase() != 'content-type') continue;

      var value = h.value;
      h.value = value ? value.replace(/^\s*[^\s\;]*/, "text/plain") : "text/plain";
      // alert("Rewrite: " + h.name + " " + value + " -> " + h.value);
      return {responseHeaders: hs};
    }

    // alert("Add: Content-Type text/plain");
    hs.push({name: "Content-Type", value: "text/plain"});
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
