// Mwgtex4IeBho.h : CMwgtex4IeBho �̐錾

#pragma once
#include "resource.h"       // ���C�� �V���{��

#include "mwgtex4ie_i.h"

#include <shlguid.h>        // IID_IWebBrowser2, DIID_DWebBrowserEvents2, etc.
#include <exdispid.h>       // DISPID_DOCUMENTCOMPLETE, etc.
#include <mshtml.h>         // DOM interfaces

#if defined(_WIN32_WCE) && !defined(_CE_DCOM) && !defined(_CE_ALLOW_SINGLE_THREADED_OBJECTS_IN_MTA)
#error "DCOM �̊��S�T�|�[�g���܂�ł��Ȃ� Windows Mobile �v���b�g�t�H�[���̂悤�� Windows CE �v���b�g�t�H�[���ł́A�P��X���b�h COM �I�u�W�F�N�g�͐������T�|�[�g����Ă��܂���BATL ���P��X���b�h COM �I�u�W�F�N�g�̍쐬���T�|�[�g���邱�ƁA����т��̒P��X���b�h COM �I�u�W�F�N�g�̎����̎g�p�������邱�Ƃ���������ɂ́A_CE_ALLOW_SINGLE_THREADED_OBJECTS_IN_MTA ���`���Ă��������B���g�p�� rgs �t�@�C���̃X���b�h ���f���� 'Free' �ɐݒ肳��Ă���ADCOM Windows CE �ȊO�̃v���b�g�t�H�[���ŃT�|�[�g�����B��̃X���b�h ���f���Ɛݒ肳��Ă��܂����B"
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
