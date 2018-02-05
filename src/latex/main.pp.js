//  filename  : agh.lang.tex.js
//  charset   : utf-8
//*****************************************************************************
//
//  Ageha JavaScript Library 3.1 :: LaTeX  Interpreter
//
//                     copyright (c) 2008-2013, K. Murase. All rights reserved.
//
//*****************************************************************************
#%[DEBUG_SCANNER=0]
#%[DEBUG=1]
agh.scripts.register("agh.lang.tex.js", ["agh.js"], function() {
/*===========================================================================*/
  var nsName = "agh.LaTeX";
  //var nsName = "agh.DHTeXML2";
  var ns = agh.Namespace(nsName);

//-----------------------------------------------------------------------------
(function aghtex_include_core_js() { /* main.pp.js: included from core.js */
#%include core.js
})();

#%m include (
#%%[functionName="_aghtex_include_@".replace("[^a-zA-Z]","_")]
//-----------------------------------------------------------------------------
#%%x (
(function $"functionName"() { /* main.pp.js: included from .gen/@ */
#%%).i
##%include .gen/@
})();
#%)

#%x include.r|@|base.js|
#%x include.r|@|mod_counter.js|
#%x include.r|@|mod_length.js|

#%x include.r|@|mod_common.js|
#%x include.r|@|mod_math.js|
#%x include.r|@|texsym.js|
#%x include.r|@|mod_para.js|
#%x include.r|@|mod_list.js|

#%x include.r|@|mod_ref.js|
#%x include.r|@|mod_array.js|

#%x include.r|@|cls_article.js|
#%x include.r|@|pkg_ams.js|
#%x include.r|@|pkg_bm.js|
#%x include.r|@|pkg_color.js|
#%x include.r|@|pkg_url.js|

/*===========================================================================*/
});
