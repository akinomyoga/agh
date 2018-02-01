// Mwgtex4IeBho.cpp : CMwgtex4IeBho ‚ÌŽÀ‘•

#include "stdafx.h"
#include <exception>
#include "Mwgtex4IeBho.h"
#include "HttpsProtocolHook.h"
#include "mwg.mshtml.h"

// CMwgtex4IeBho
void https_hook_install(){
  static bool https_hook_installed=false;
  if(https_hook_installed)return;
  https_hook_installed=true;

  HRESULT hr;

  IInternetSession *pInetSess;
  hr=CoInternetGetSession(0,&pInetSess,0);
  if(!(SUCCEEDED(hr)&&pInetSess))return;

  CComObject<mwg::Net::CHttpsProtocolHookFactory>* comFactory=NULL;
  hr=CComObject<mwg::Net::CHttpsProtocolHookFactory>::CreateInstance(&comFactory);
  if(!(SUCCEEDED(hr)&&comFactory))return;

  comFactory->AddRef();
  CComPtr<IClassFactory> icfFactory;
  hr=comFactory->QueryInterface<IClassFactory>(&icfFactory);
  if(SUCCEEDED(hr)){
    //hr=pInetSess->RegisterNameSpace(icfFactory,CLSID_HttpSProtocol,_T("https"),0,NULL,0);
    hr=pInetSess->RegisterNameSpace(icfFactory,CLSID_NULL,_T("https"),0,NULL,0);
    hr=pInetSess->RegisterNameSpace(icfFactory,CLSID_NULL,_T("mwg"),0,NULL,0);
  }
  comFactory->Release();
}

STDMETHODIMP CMwgtex4IeBho::SetSite(IUnknown* pUnkSite){
  //MessageBox(NULL,_T("hello agh.addon.aghtex4ie"),NULL,0);

  if (pUnkSite != NULL){
    // Cache the pointer to IWebBrowser2.
    HRESULT hr=pUnkSite->QueryInterface(IID_IWebBrowser2, (void**)&m_spWebBrowser);
    if(SUCCEEDED(hr)){
      // Register to sink events from DWebBrowserEvents2.
      hr=DispEventAdvise(m_spWebBrowser);
      if(SUCCEEDED(hr)){
        m_fAdvised=TRUE;
      }
    }

    https_hook_install();
  }else{
    // Unregister event sink.
    if(m_fAdvised){
      DispEventUnadvise(m_spWebBrowser);
      m_fAdvised=FALSE;
    }

    // Release cached pointers and other resources here.
    m_spWebBrowser.Release();
  }

  // Return the base class implementation
  return IObjectWithSiteImpl<CMwgtex4IeBho>::SetSite(pUnkSite);
}

void STDMETHODCALLTYPE CMwgtex4IeBho::OnDocumentComplete(IDispatch *pDisp,VARIANT *pvarURL){
  //// Retrieve the top-level window from the site.
  //{
  //  HWND hwnd;
  //  HRESULT hr=m_spWebBrowser->get_HWND((LONG_PTR*)&hwnd);
  //  if(SUCCEEDED(hr)){
  //    // Output a message box when page is loaded.
  //    MessageBox(hwnd,_T("Hello World!"),_T("BHO"),MB_OK);
  //  }
  //}

  // Query for the IWebBrowser2 interface.
  CComQIPtr<IWebBrowser2> spTempWebBrowser = pDisp;

  // Is this event associated with the top-level browser?
  if(spTempWebBrowser && m_spWebBrowser&&m_spWebBrowser.IsEqualObject(spTempWebBrowser)){
    // Get the current document object from browser...
    CComPtr<IDispatch> spDispDoc;
    HRESULT hr=m_spWebBrowser->get_Document(&spDispDoc);
    if(SUCCEEDED(hr)){
      // ...and query for an HTML document.
      CComQIPtr<IHTMLDocument2> spHTMLDoc=spDispDoc;
      if(spHTMLDoc!=NULL){
        // Finally, remove the images.
        this->document_onload(spHTMLDoc);
      }
    }
  }
}

void RemoveImages(IHTMLDocument2* pDocument){
  mwg::MshtmlDom::HTMLDocument document(pDocument);
  try {
    mwg::MshtmlDom::HTMLElementCollection images=document.images;
    if(!images)return;

    for(int i=0,iN=images.length;i<iN;i++){
      mwg::MshtmlDom::HTMLElement image=images[i];
      if(!image)continue;

      image.style.display=CComBSTR(L"none");
    }
  }catch(std::exception&){}
}

void CMwgtex4IeBho::document_onload(IHTMLDocument2* pdocument){
  // /* document.body.style="#ffe" */{
  //  CComPtr<IHTMLElement> body;
  //  hr=pdocument->get_body(&body);
  //  if(hr!=S_OK||body==NULL)return;

  //  CComPtr<IHTMLStyle> style;
  //  hr=body->get_style(&style);
  //  if(hr!=S_OK||style==NULL)return;

  //  style->put_backgroundColor(CComVariant(L"#ffe"));

  //  //IHTMLElement* hello1;
  //  //IHTMLElement2* hello2;
  //  //IHTMLElement3* hello3;
  //  //IHTMLElement4* hello4;
  //}

  try {

    mwg::MshtmlDom::HTMLDocument document(pdocument);
    //document.parentWindow.execScript(CComBSTR("alert(123);"),NULL);

    //document.body.style.backgroundColor=CComVariant(L"#eff");
    //document.parentWindow.execScript(CComBSTR(
    //  "if(/^https?\\:\\/\\/(?:mail|groups|sites)\\.google\\.com\\//.test(window.location.href)){\n"
    //  "  var head=document.getElementsByTagName(\"head\")[0];\n"
    //  "  var script=document.createElement(\"script\");\n"
    //  "  script.setAttribute(\"type\",\"text/javascript\");\n"
    //  "  script.setAttribute(\"charset\",\"utf-8\");\n"
    //  "  script.setAttribute(\"src\",\"https://\"+location.host+\"/agh.addon.aghtex4ie/agh/agh.js\");\n"
    //  "  head.appendChild(script);\n"
    //  "  document.body.style.backgroundColor=\"#fef\";\n"
    //  "}\n"
    //),NULL);

    document.parentWindow.execScript(CComBSTR(
      "(function(){\n"
      "  var head=document.getElementsByTagName(\"head\")[0];\n"
      "  var script=document.createElement(\"script\");\n"
      "  script.setAttribute(\"type\",\"text/javascript\");\n"
      "  script.setAttribute(\"charset\",\"utf-8\");\n"
      "  script.setAttribute(\"src\",\"https://\"+location.host+\"/agh.addon.aghtex4ie/aghtex4ie.js\");\n"
      "  head.appendChild(script);\n"
      "})()\n"
    ),NULL);

    //mwg::MshtmlDom::HTMLElement head=document.getElementsByTagName(CComBSTR(L"head"))[0];
    //mwg::MshtmlDom::HTMLElement script=document.createElement(CComBSTR(L"script"));
    //script.setAttribute(CComBSTR("type"),CComVariant("text/javascript"));
    //script.setAttribute(CComBSTR("charset"),CComVariant("utf-8"));
    //script.setAttribute(CComBSTR("src"),CComVariant("/agh.addon.aghtex4ie/agh/agh.js"));


    //CComPtr<IHTMLElementCollection> heads=body.getElementsByTagName(CComBSTR(L"head"));
  }catch(std::exception& ex){
    ::MessageBoxA(NULL,ex.what(),NULL,0);
  }
}

//void CMwgtex4IeBho::RemoveImages(IHTMLDocument2* pDocument){
//  CComPtr<IHTMLElementCollection> spImages;
//
//  // Get the collection of images from the DOM.
//  HRESULT hr=pDocument->get_images(&spImages);
//  if(hr!=S_OK||spImages==NULL)return;
//
//  // Get the number of images in the collection.
//  long cImages = 0;
//  hr=spImages->get_length(&cImages);
//  if(hr!=S_OK||cImages<=0)return;
//
//  for(int i=0;i<cImages;i++){
//    CComVariant svarItemIndex(i);
//    CComVariant svarEmpty;
//    CComPtr<IDispatch> spdispImage;
//
//    // Get the image out of the collection by index.
//    hr = spImages->item(svarItemIndex, svarEmpty, &spdispImage);
//    if(hr!=S_OK||spdispImage==NULL)continue;
//
//    // First, query for the generic HTML element interface...
//    CComQIPtr<IHTMLElement> spElement = spdispImage;
//
//    if(!spElement)continue;
//
//    // ...then ask for the style interface.
//    CComPtr<IHTMLStyle> spStyle;
//    hr = spElement->get_style(&spStyle);
//
//    // Set display="none" to hide the image.
//    if (hr == S_OK && spStyle != NULL){
//      static const CComBSTR sbstrNone(L"none");
//      spStyle->put_display(sbstrNone);
//    }
//  }
//}
