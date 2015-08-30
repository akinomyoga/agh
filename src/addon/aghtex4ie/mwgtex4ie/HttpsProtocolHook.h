#pragma once
#include "resource.h"       // ÉÅÉCÉì ÉVÉìÉ{Éã
#include "mwgtex4ie_i.h"
#include <cstdio>

namespace mwg{
namespace Net{

class CHttpsProtocolHook;
class CHttpsProtocolHookFactory;

class ATL_NO_VTABLE CHttpsProtocolHook:
  public CComObjectRootEx<CComSingleThreadModel>,
  public CComCoClass<CHttpsProtocolHook, &CLSID_HttpsProtocolHook>,
	public IDispatchImpl<IHttpsProtocolHook, &IID_IHttpsProtocolHook, &LIBID_mwgtex4ieLib, /*wMajor =*/ 1, /*wMinor =*/ 0>,
  public IInternetProtocol
//public IInternetProtocolRoot
{

  DECLARE_NOT_AGGREGATABLE(CHttpsProtocolHook)

  BEGIN_COM_MAP(CHttpsProtocolHook)
    COM_INTERFACE_ENTRY(IInternetProtocol)
    COM_INTERFACE_ENTRY(IInternetProtocolRoot)
  END_COM_MAP()

  DECLARE_CLASSFACTORY_EX(CHttpsProtocolHookFactory)

private:
  // dbg
  ULONG dbg_index;
  ULONG dbg_length;
  void* dbg_data;

  std::FILE* m_file;
  __int64 m_filelen;
  __int64 m_filepos;
  bool m_file_locked;
  bool m_file_terminated;
  bool startContentFile(LPCWSTR url,IInternetProtocolSink *sink);
  void clearContentFile();
public:
  CHttpsProtocolHook(){
    this->m_file=NULL;
  }

  DECLARE_PROTECT_FINAL_CONSTRUCT()
  HRESULT FinalConstruct(){return S_OK;}
  void FinalRelease(){}

public:
  // IInternetProtocolRoot
  STDMETHODIMP Start(
    /* [in] */ LPCWSTR szUrl,
    /* [in] */ IInternetProtocolSink *pOIProtSink,
    /* [in] */ IInternetBindInfo *pOIBindInfo,
    /* [in] */ DWORD grfPI,
    /* [in] */ HANDLE_PTR dwReserved);

  STDMETHODIMP Continue(
    /* [in] */ PROTOCOLDATA *pProtocolData);

  STDMETHODIMP Abort(
    /* [in] */ HRESULT hrReason,
    /* [in] */ DWORD dwOptions);

  STDMETHODIMP Terminate(
    /* [in] */ DWORD dwOptions);

  STDMETHODIMP Suspend();

  STDMETHODIMP Resume();

  // IInternetProtocol
  STDMETHODIMP Read(
    /* [in, out] */ void *pv,
    /* [in] */ ULONG cb,
    /* [out] */ ULONG *pcbRead);

  STDMETHODIMP Seek(
    /* [in] */ LARGE_INTEGER dlibMove,
    /* [in] */ DWORD dwOrigin,
    /* [out] */ ULARGE_INTEGER *plibNewPosition);

  STDMETHODIMP LockRequest(
    /* [in] */ DWORD dwOptions);

  STDMETHODIMP UnlockRequest();

};

class ATL_NO_VTABLE CHttpsProtocolHookFactory:
  public CComClassFactory,
	public IDispatchImpl<IHttpsProtocolHookFactory, &IID_IHttpsProtocolHookFactory, &LIBID_mwgtex4ieLib, /*wMajor =*/ 1, /*wMinor =*/ 0>
  //public CComObjectRootEx<CComSingleThreadModel>,
  //public CComCoClass<CHttpsProtocolHookFactory, &CLSID_HttpsProtocolHookFactory>,
{
  STDMETHODIMP CreateInstance(IUnknown *pUnkOuter, REFIID riid, void **ppvObject);
};

}
}
