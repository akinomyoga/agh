// Mwgtex4IeBho.h : CMwgtex4IeBho の宣言

#pragma once
#include "resource.h"       // メイン シンボル

#include "mwgtex4ie_i.h"

#include <shlguid.h>        // IID_IWebBrowser2, DIID_DWebBrowserEvents2, etc.
#include <exdispid.h>       // DISPID_DOCUMENTCOMPLETE, etc.
#include <mshtml.h>         // DOM interfaces

#if defined(_WIN32_WCE) && !defined(_CE_DCOM) && !defined(_CE_ALLOW_SINGLE_THREADED_OBJECTS_IN_MTA)
#error "DCOM の完全サポートを含んでいない Windows Mobile プラットフォームのような Windows CE プラットフォームでは、単一スレッド COM オブジェクトは正しくサポートされていません。ATL が単一スレッド COM オブジェクトの作成をサポートすること、およびその単一スレッド COM オブジェクトの実装の使用を許可することを強制するには、_CE_ALLOW_SINGLE_THREADED_OBJECTS_IN_MTA を定義してください。ご使用の rgs ファイルのスレッド モデルは 'Free' に設定されており、DCOM Windows CE 以外のプラットフォームでサポートされる唯一のスレッド モデルと設定されていました。"
#endif



// CMwgtex4IeBho

class ATL_NO_VTABLE CMwgtex4IeBho :
	public CComObjectRootEx<CComSingleThreadModel>,
	public CComCoClass<CMwgtex4IeBho, &CLSID_Mwgtex4IeBho>,
	public IObjectWithSiteImpl<CMwgtex4IeBho>,
	public IDispatchImpl<IMwgtex4IeBho, &IID_IMwgtex4IeBho, &LIBID_mwgtex4ieLib, /*wMajor =*/ 1, /*wMinor =*/ 0>,
  public IDispEventImpl<1, CMwgtex4IeBho, &DIID_DWebBrowserEvents2, &LIBID_SHDocVw, 1, 1>
{
public:
	CMwgtex4IeBho(){}

  DECLARE_REGISTRY_RESOURCEID(IDR_MWGTEX4IEBHO)

  DECLARE_NOT_AGGREGATABLE(CMwgtex4IeBho)

  BEGIN_COM_MAP(CMwgtex4IeBho)
    COM_INTERFACE_ENTRY(IMwgtex4IeBho)
    COM_INTERFACE_ENTRY(IDispatch)
    COM_INTERFACE_ENTRY(IObjectWithSite)
  END_COM_MAP()

  DECLARE_PROTECT_FINAL_CONSTRUCT()

  HRESULT FinalConstruct(){
    return S_OK;
  }

  void FinalRelease(){}

public:
  STDMETHOD(SetSite)(IUnknown *pUnkSite);

private:
  CComPtr<IWebBrowser2>  m_spWebBrowser;

//----------------------------------------------------------------------------
//  IDispEventImpl<1>
public:
  BEGIN_SINK_MAP(CMwgtex4IeBho)
      SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_DOCUMENTCOMPLETE, OnDocumentComplete)
  END_SINK_MAP()

  // DWebBrowserEvents2
  void STDMETHODCALLTYPE OnDocumentComplete(IDispatch *pDisp, VARIANT *pvarURL); 
private:
  BOOL m_fAdvised; 

private:
  void document_onload(IHTMLDocument2 *document);
};

OBJECT_ENTRY_AUTO(__uuidof(Mwgtex4IeBho), CMwgtex4IeBho)
