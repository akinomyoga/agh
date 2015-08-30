#include "stdafx.h"
#include "mwg.mshtml.h"
namespace mwg{
namespace MshtmlDom{

// -*- mode:C++;coding:shift_jis -*-
  //===========================================================================
  // class HTMLDocument :: implementations
  //---------------------------------------------------------------------------
  HTMLElementCollection HTMLDocument::getElementsByTagName(BSTR tagName){
    CComPtr<IHTMLElementCollection> ret;
    _get3()->getElementsByTagName(tagName,&ret);
    return HTMLElementCollection(ret);
  }
  HTMLElement HTMLDocument::createElement(BSTR tagName){
    CComPtr<IHTMLElement> ret;
    _get2()->createElement(tagName,&ret);
    return HTMLElement(ret);
  }
  HTMLElement HTMLDocument::get_body(){
    CComPtr<IHTMLElement> ret;
    _get2()->get_body(&ret);
    return HTMLElement(ret);
  }
  HTMLWindow HTMLDocument::get_parentWindow(){
    CComPtr<IHTMLWindow2> ret;
    _get2()->get_parentWindow(&ret);
    return HTMLWindow(ret);
  }
  HTMLElementCollection HTMLDocument::get_images(){
    CComPtr<IHTMLElementCollection> ret;
    _get2()->get_images(&ret);
    return HTMLElementCollection(ret);
  }

  //===========================================================================
  // class HTMLWindow :: implementations
  //---------------------------------------------------------------------------
  CComVariant HTMLWindow::execScript(BSTR code,BSTR lang){
    CComVariant ret;
    _get2()->execScript(code,lang,&ret);
    return ret;
  }

  //===========================================================================
  // class HTMLStyle :: implementations
  //---------------------------------------------------------------------------
  BSTR HTMLStyle::get_display(){
    BSTR ret;
    _get1()->get_display(&ret);
    return ret;
  }
  void HTMLStyle::set_display(BSTR const& value){
    _get1()->put_display(value);
  }
  VARIANT HTMLStyle::get_backgroundColor(){
    VARIANT ret;
    _get1()->get_backgroundColor(&ret);
    return ret;
  }
  void HTMLStyle::set_backgroundColor(VARIANT const& value){
    _get1()->put_backgroundColor(value);
  }

  //===========================================================================
  // class HTMLElement :: implementations
  //---------------------------------------------------------------------------
  HTMLStyle HTMLElement::get_style(){
    CComPtr<IHTMLStyle> ret;
    _get1()->get_style(&ret);
    return HTMLStyle(ret);
  }
  HTMLElementCollection HTMLElement::getElementsByTagName(BSTR tagName){
    CComPtr<IHTMLElementCollection> ret;
    _get2()->getElementsByTagName(tagName,&ret);
    return HTMLElementCollection(ret);
  }
  VARIANT HTMLElement::getAttribute(BSTR attributeName,LONG lFlags){
    VARIANT ret;
    _get1()->getAttribute(attributeName,lFlags,&ret);
    return ret;
  }
  void HTMLElement::setAttribute(BSTR attributeName,VARIANT attributeValue,LONG lFlags){
    _get1()->setAttribute(attributeName,attributeValue,lFlags);
  }

  //===========================================================================
  // class HTMLElementCollection :: implementations
  //---------------------------------------------------------------------------
  long HTMLElementCollection::get_length(){
    long ret;
    _get1()->get_length(&ret);
    return ret;
  }
  CComPtr<IDispatch> HTMLElementCollection::item(CComVariant key,CComVariant arg2){
    CComPtr<IDispatch> ret;
    _get1()->item(key,arg2,&ret);
    return ret;
  }
}
}
