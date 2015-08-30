// -*- mode:C++;coding:shift_jis -*-
#ifndef MWG_MSHTML_H
#define MWG_MSHTML_H
#include <exdispid.h>       // DISPID_DOCUMENTCOMPLETE, etc.
#include <mshtml.h>         // DOM interfaces
#include <exception>
namespace mwg{
namespace MshtmlDom{
  class HTMLWindow;
  class HTMLDocument;
  class HTMLElement;
  class HTMLElementCollection;
  class HTMLStyle;

#pragma%m begin_class (
#pragma%%[className="__className__"]
  //===========================================================================
  // class __className__ :: declaration
  //---------------------------------------------------------------------------
  class __className__{
#pragma%)
#pragma%m declare_interface0 (
#pragma%%[ptr0="ptr__no__",get0="_get__no__"]
#pragma%%x (
  private:
    CComPtr<__interface__> ptr__no__;
    __interface__* _get__no__(){
      if(ptr__no__==NULL)
        throw std::exception("mwg::MshtmlDom::${className}: null");
      return ptr__no__;
    }
  public:
    explicit $"className"(CComPtr<__interface__> const& ptr):ptr__no__(ptr){}
    operator bool() const{return ptr__no__!=NULL;}
#pragma%%).i
#pragma%)
#pragma%m declare_interface (
#pragma%%x (
  private:
    CComPtr<__interface__>  ptr__no__;
    __interface__* _get__no__(){
      if(!ptr__no__){
        $"get0"()->QueryInterface<__interface__>(&ptr__no__);
        if(ptr__no__==NULL)
          throw std::exception("mwg::MshtmlDom::${className}: No __interface__ interface");
      }
      return ptr__no__;
    }
#pragma%%).i
#pragma%)
#pragma%m declare_methodA (
#pragma%%x (
  public:
    $"returnType" __memberName__(__params__);
#pragma%%).i
#pragma%)
#pragma%[declare_methodB=declare_methodA,declare_methodC=declare_methodA]
#pragma%m declare_rpropertyA (
#pragma%%x (
  public:
    __declspec(property(get=get___memberName__)) $"returnType" __memberName__;
    $"returnType" get___memberName__();
#pragma%%).i
#pragma%)
#pragma%m declare_rpropertyB (
#pragma%%x (
  public:
    __declspec(property(get=get___memberName__)) $"returnType" __memberName__;
    $"returnType" get___memberName__();
#pragma%%).i
#pragma%)
#pragma%m declare_apropertyB (
#pragma%%x (
  public:
    __declspec(property(get=get___memberName__,put=set___memberName__)) $"returnType" __memberName__;
    $"returnType" get___memberName__();
    void set___memberName__($"returnType" const& value);
#pragma%%).i
#pragma%)
#pragma%m end_class (
#pragma%%x declare_content
  };
#pragma%)

#pragma%< mwg.mshtml.def

}
}
#endif
