#include "stdafx.h"
#include "mwg.mshtml.h"
namespace mwg{
namespace MshtmlDom{
#pragma%m begin_class (
#pragma%%[className="__className__"]
  //===========================================================================
  // class __className__ :: implementations
  //---------------------------------------------------------------------------
#pragma%)
#pragma%m end_class (
#pragma%)
#pragma%[declare_interface0="",declare_interface=""]
#pragma%m declare_methodA (
#pragma%%x (
  $"returnType" $"className"::__memberName__(__params__){
    CComPtr<$"returnInterface"> ret;
    _get__no__()->__memberName__(${.eval|"__args__".length==0?"":"__args__,"}&ret);
    return $"returnType"(ret);
  }
#pragma%%).i
#pragma%)
#pragma%m declare_methodB (
#pragma%%x (
  $"returnType" $"className"::__memberName__(${.eval|"__params__".replace("\\=[^,]+","")}){
    $"returnType" ret;
    _get__no__()->__memberName__(${.eval|"__args__".length==0?"":"__args__,"}&ret);
    return ret;
  }
#pragma%%).i
#pragma%)
#pragma%m declare_methodC (
#pragma%%x (
  void $"className"::__memberName__(${.eval|"__params__".replace("\\=[^,]+","")}){
    _get__no__()->__memberName__(__args__);
  }
#pragma%%).i
#pragma%)
#pragma%m declare_rpropertyA (
#pragma%%x (
  $"returnType" $"className"::get___memberName__(){
    CComPtr<$"returnInterface"> ret;
    _get__no__()->get___memberName__(&ret);
    return $"returnType"(ret);
  }
#pragma%%).i
#pragma%)
#pragma%m declare_rpropertyB (
#pragma%%x (
  $"returnType" $"className"::get___memberName__(){
    $"returnType" ret;
    _get__no__()->get___memberName__(&ret);
    return ret;
  }
#pragma%%).i
#pragma%)
#pragma%m declare_apropertyB (
#pragma%%x (
  $"returnType" $"className"::get___memberName__(){
    $"returnType" ret;
    _get__no__()->get___memberName__(&ret);
    return ret;
  }
  void $"className"::set___memberName__($"returnType" const& value){
    _get__no__()->put___memberName__(value);
  }
#pragma%%).i
#pragma%)

#pragma%< mwg.mshtml.def
}
}
