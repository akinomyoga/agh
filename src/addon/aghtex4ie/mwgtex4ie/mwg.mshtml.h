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


// -*- mode:C++;coding:shift_jis -*-
  //===========================================================================
  // class HTMLDocument :: declaration
  //---------------------------------------------------------------------------
  class HTMLDocument{
  private:
    CComPtr<IHTMLDocument2> ptr2;
    IHTMLDocument2* _get2(){
      if(ptr2==NULL)
        throw std::exception("mwg::MshtmlDom::HTMLDocument: null");
      return ptr2;
    }
  public:
    explicit HTMLDocument(CComPtr<IHTMLDocument2> const& ptr):ptr2(ptr){}
    operator bool() const{return ptr2!=NULL;}
  private:
    CComPtr<IHTMLDocument>  ptr1;
    IHTMLDocument* _get1(){
      if(!ptr1){
        _get2()->QueryInterface<IHTMLDocument>(&ptr1);
        if(ptr1==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLDocument: No IHTMLDocument interface");
      }
      return ptr1;
    }
  private:
    CComPtr<IHTMLDocument3>  ptr3;
    IHTMLDocument3* _get3(){
      if(!ptr3){
        _get2()->QueryInterface<IHTMLDocument3>(&ptr3);
        if(ptr3==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLDocument: No IHTMLDocument3 interface");
      }
      return ptr3;
    }
  private:
    CComPtr<IHTMLDocument4>  ptr4;
    IHTMLDocument4* _get4(){
      if(!ptr4){
        _get2()->QueryInterface<IHTMLDocument4>(&ptr4);
        if(ptr4==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLDocument: No IHTMLDocument4 interface");
      }
      return ptr4;
    }
  private:
    CComPtr<IHTMLDocument5>  ptr5;
    IHTMLDocument5* _get5(){
      if(!ptr5){
        _get2()->QueryInterface<IHTMLDocument5>(&ptr5);
        if(ptr5==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLDocument: No IHTMLDocument5 interface");
      }
      return ptr5;
    }
  public:
    HTMLElementCollection getElementsByTagName(BSTR tagName);
  public:
    HTMLElement createElement(BSTR tagName);
  public:
    __declspec(property(get=get_body)) HTMLElement body;
    HTMLElement get_body();
  public:
    __declspec(property(get=get_parentWindow)) HTMLWindow parentWindow;
    HTMLWindow get_parentWindow();
  public:
    __declspec(property(get=get_images)) HTMLElementCollection images;
    HTMLElementCollection get_images();
  };

  //===========================================================================
  // class HTMLWindow :: declaration
  //---------------------------------------------------------------------------
  class HTMLWindow{
  private:
    CComPtr<IHTMLWindow2> ptr2;
    IHTMLWindow2* _get2(){
      if(ptr2==NULL)
        throw std::exception("mwg::MshtmlDom::HTMLWindow: null");
      return ptr2;
    }
  public:
    explicit HTMLWindow(CComPtr<IHTMLWindow2> const& ptr):ptr2(ptr){}
    operator bool() const{return ptr2!=NULL;}
  private:
    CComPtr<IHTMLWindow3>  ptr3;
    IHTMLWindow3* _get3(){
      if(!ptr3){
        _get2()->QueryInterface<IHTMLWindow3>(&ptr3);
        if(ptr3==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLWindow: No IHTMLWindow3 interface");
      }
      return ptr3;
    }
  private:
    CComPtr<IHTMLWindow4>  ptr4;
    IHTMLWindow4* _get4(){
      if(!ptr4){
        _get2()->QueryInterface<IHTMLWindow4>(&ptr4);
        if(ptr4==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLWindow: No IHTMLWindow4 interface");
      }
      return ptr4;
    }
  private:
    CComPtr<IHTMLWindow5>  ptr5;
    IHTMLWindow5* _get5(){
      if(!ptr5){
        _get2()->QueryInterface<IHTMLWindow5>(&ptr5);
        if(ptr5==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLWindow: No IHTMLWindow5 interface");
      }
      return ptr5;
    }
  public:
    CComVariant execScript(BSTR code,BSTR lang);
  };

  //===========================================================================
  // class HTMLStyle :: declaration
  //---------------------------------------------------------------------------
  class HTMLStyle{
  private:
    CComPtr<IHTMLStyle> ptr1;
    IHTMLStyle* _get1(){
      if(ptr1==NULL)
        throw std::exception("mwg::MshtmlDom::HTMLStyle: null");
      return ptr1;
    }
  public:
    explicit HTMLStyle(CComPtr<IHTMLStyle> const& ptr):ptr1(ptr){}
    operator bool() const{return ptr1!=NULL;}
  private:
    CComPtr<IHTMLStyle2>  ptr2;
    IHTMLStyle2* _get2(){
      if(!ptr2){
        _get1()->QueryInterface<IHTMLStyle2>(&ptr2);
        if(ptr2==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLStyle: No IHTMLStyle2 interface");
      }
      return ptr2;
    }
  private:
    CComPtr<IHTMLStyle3>  ptr3;
    IHTMLStyle3* _get3(){
      if(!ptr3){
        _get1()->QueryInterface<IHTMLStyle3>(&ptr3);
        if(ptr3==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLStyle: No IHTMLStyle3 interface");
      }
      return ptr3;
    }
  private:
    CComPtr<IHTMLStyle4>  ptr4;
    IHTMLStyle4* _get4(){
      if(!ptr4){
        _get1()->QueryInterface<IHTMLStyle4>(&ptr4);
        if(ptr4==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLStyle: No IHTMLStyle4 interface");
      }
      return ptr4;
    }
  private:
    CComPtr<IHTMLStyle5>  ptr5;
    IHTMLStyle5* _get5(){
      if(!ptr5){
        _get1()->QueryInterface<IHTMLStyle5>(&ptr5);
        if(ptr5==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLStyle: No IHTMLStyle5 interface");
      }
      return ptr5;
    }
  public:
    __declspec(property(get=get_display,put=set_display)) BSTR display;
    BSTR get_display();
    void set_display(BSTR const& value);
  public:
    __declspec(property(get=get_backgroundColor,put=set_backgroundColor)) VARIANT backgroundColor;
    VARIANT get_backgroundColor();
    void set_backgroundColor(VARIANT const& value);
  };

  //===========================================================================
  // class HTMLElement :: declaration
  //---------------------------------------------------------------------------
  class HTMLElement{
  private:
    CComPtr<IHTMLElement> ptr1;
    IHTMLElement* _get1(){
      if(ptr1==NULL)
        throw std::exception("mwg::MshtmlDom::HTMLElement: null");
      return ptr1;
    }
  public:
    explicit HTMLElement(CComPtr<IHTMLElement> const& ptr):ptr1(ptr){}
    operator bool() const{return ptr1!=NULL;}
  private:
    CComPtr<IHTMLElement2>  ptr2;
    IHTMLElement2* _get2(){
      if(!ptr2){
        _get1()->QueryInterface<IHTMLElement2>(&ptr2);
        if(ptr2==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLElement: No IHTMLElement2 interface");
      }
      return ptr2;
    }
  private:
    CComPtr<IHTMLElement3>  ptr3;
    IHTMLElement3* _get3(){
      if(!ptr3){
        _get1()->QueryInterface<IHTMLElement3>(&ptr3);
        if(ptr3==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLElement: No IHTMLElement3 interface");
      }
      return ptr3;
    }
  private:
    CComPtr<IHTMLElement4>  ptr4;
    IHTMLElement4* _get4(){
      if(!ptr4){
        _get1()->QueryInterface<IHTMLElement4>(&ptr4);
        if(ptr4==NULL)
          throw std::exception("mwg::MshtmlDom::HTMLElement: No IHTMLElement4 interface");
      }
      return ptr4;
    }
  public:
    __declspec(property(get=get_style)) HTMLStyle style;
    HTMLStyle get_style();
  public:
    HTMLElementCollection getElementsByTagName(BSTR tagName);
  public:
    VARIANT getAttribute(BSTR attributeName,LONG lFlags=1);
  public:
    void setAttribute(BSTR attributeName,VARIANT attributeValue,LONG lFlags=1);
  };

  //===========================================================================
  // class HTMLElementCollection :: declaration
  //---------------------------------------------------------------------------
  class HTMLElementCollection{
  private:
    CComPtr<IHTMLElementCollection> ptr1;
    IHTMLElementCollection* _get1(){
      if(ptr1==NULL)
        throw std::exception("mwg::MshtmlDom::HTMLElementCollection: null");
      return ptr1;
    }
  public:
    explicit HTMLElementCollection(CComPtr<IHTMLElementCollection> const& ptr):ptr1(ptr){}
    operator bool() const{return ptr1!=NULL;}
  public:
    __declspec(property(get=get_length)) long length;
    long get_length();
  public:
    CComPtr<IDispatch> item(CComVariant key,CComVariant arg2);
  public:
    HTMLElement operator[](int index){
      if(index<0||this->length<=index)
        return HTMLElement(CComPtr<IHTMLElement>());

      CComPtr<IDispatch> dispElem=this->item(CComVariant(index),CComVariant());
      if(!dispElem)
        return HTMLElement(CComPtr<IHTMLElement>());

      return HTMLElement(CComQIPtr<IHTMLElement>(dispElem));
    }
  };

}
}
#endif
