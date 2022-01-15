/* hook for AGH_URLBASE */
// mwg.scripts.AGH_URLBASE = "http://tkynt2.phys.s.u-tokyo.ac.jp/~murase/mwg3/";
// mwg.scripts.AGH_URLBASE = "http://tkynt2.phys.s.u-tokyo.ac.jp/~murase/agh/";
// mwg.scripts.AGH_URLBASE = "http://padparadscha/agh/";
// mwg.scripts.AGH_URLBASE = "https://akinomyoga.github.io/agh/";
agh.scripts.AGH_URLBASE = chrome.extension.getURL("agh/agh.js").slice(0,-6);
