#include "stdafx.h"
#include <string>
#include <utility>
#include <algorithm>
#include <cstring>
#include <cstdio>
#include <cwchar>
#include "HttpsProtocolHook.h"
#include "Mwgtex4IeBho.h"
#include "dllmain.h"

namespace mwg{
namespace Net{

  /// 文字列の末端が . または .. である時にそれを解決します。
  static void ResolveDirectoryTraversals_traverse(std::wstring& dst,int ndots){
    if(ndots==1){
      std::size_t const len=dst.length();
      if(len>=2) // dst ~ .*\/\.
        dst.erase(len-2);
      else // dst ~ \.
        dst.erase();
    }else if(ndots==2){
      std::size_t const len=dst.length();
      if(len>=3) // dst ~ .*\/\.\.
        dst.erase(len-3);
      else // dst ~ \.\.
        dst.erase();
    }
  }

  static void ResolveDirectoryTraversals(std::wstring& dst,LPCWSTR src){
    wchar_t clast=0;
    int ndots=0;
    for(;;){
      wchar_t c=*src;

      // サロゲートペア
      //if(0xD800<=c&&c<=0xDBFF||0xDC00<=c&&c<=0xDFFF)continue;
      switch(c){
      case '\0':
      case '?':case '#':case ':':
        ResolveDirectoryTraversals_traverse(dst,ndots);
        return;
      case '/':case '\\':
        ResolveDirectoryTraversals_traverse(dst,ndots);
        if(ndots!=0)dst+='/';
        ndots=0;
        break;
      case '.':
        dst+=*src;
        if(ndots>=0)ndots++;
        break;
      case '\r':
      case '\n':
        dst+=L' ';
        ndots=-1;
        break;
      default:
        dst+=*src;
        ndots=-1;
        break;
      }
      
      clast=*src++;
    }
  }

  static LPCWSTR GetMimeType(LPCWSTR filepath){
    LPCWSTR filename=std::wcsrchr(filepath,'/');
    if(filename==NULL)filename=filepath;

    LPCWSTR ext=std::wcsrchr(filename,'.');
    if(ext!=NULL){
      if(std::wcscmp(ext,L".txt")==0)
        return L"text/plain;charset=utf-8";
      else if(std::wcscmp(ext,L".htm")==0)
        return L"text/html;charset=utf-8";
      else if(std::wcscmp(ext,L".html")==0)
        return L"text/html;charset=utf-8";
      else if(std::wcscmp(ext,L".js")==0)
        return L"text/javascript;charset=utf-8";
      else if(std::wcscmp(ext,L".css")==0)
        return L"text/css;charset=utf-8";
      else if(std::wcscmp(ext,L".png")==0)
        return L"image/png";
      else if(std::wcscmp(ext,L".gif")==0)
        return L"image/gif";
      else if(std::wcscmp(ext,L".jpg")==0)
        return L"image/jpeg";
      else if(std::wcscmp(ext,L".ttf")==0)
        return L"application/x-font-ttf";
      else if(std::wcscmp(ext,L".eot")==0){
        //::MessageBoxW(NULL,filepath,L"loading font file...",0);
        return L"application/vnd.ms-fontobject";
      }else if(std::wcscmp(ext,L".woff")==0)
        return L"application/x-woff";
    }

    return L"application/octet-stream";
  }

  static bool GetContentFilename(std::wstring& file,LPCWSTR szUrl){

    // remove scheme
    std::size_t const urllen=std::wcslen(szUrl);
    if(urllen>6&&std::memcmp(szUrl,L"mwg://",6*sizeof(wchar_t))==0){
      szUrl+=6;
    }else if(urllen>7&&std::memcmp(szUrl,L"http://",7*sizeof(wchar_t))==0){
      szUrl+=7;
    }else if(urllen>8&&std::memcmp(szUrl,L"https://",8*sizeof(wchar_t))==0){
      szUrl+=8;
    }else return false;
  
    // remove host
    LPCWSTR const szpathname=std::wcschr(szUrl,L'/');
    if(szpathname==NULL)return false;

    // canonicalize path
    std::wstring pathname;
    ResolveDirectoryTraversals(pathname,szpathname);

    // get filename
    static const wchar_t* const directive=L"agh.addon.aghtex4ie/";
    static const std::size_t lenDirective=std::wcslen(directive);
    if(pathname.compare(0,lenDirective,directive,lenDirective)!=0)return false;
    file+=mwgtex4ie_addon_directory;
    file+=&pathname[0]+lenDirective;

    // check file
    return (file.length()>0&&::_waccess(file.c_str(),04)==0);
  }

  bool CHttpsProtocolHook::startContentFile(LPCWSTR szUrl,IInternetProtocolSink *sink){
    // getpath
    std::wstring filename;
    if(!GetContentFilename(filename,szUrl))return false;

    // open
    this->clearContentFile();
    if(0!=::_wfopen_s(&this->m_file,filename.c_str(),L"rb")||this->m_file==NULL)return false;

    // getsize
    if(0!=::_fseeki64(this->m_file,0,SEEK_END))goto error1;
    this->m_filelen=::_ftelli64(this->m_file);
    if(this->m_filelen<0)goto error1;
    std::rewind(this->m_file);

    //::MessageBoxW(NULL,filename.c_str(),L"opened content file ...",0);
    sink->ReportData(BSCF_LASTDATANOTIFICATION,100,100);
    sink->ReportProgress(BINDSTATUS_MIMETYPEAVAILABLE,GetMimeType(filename.c_str()));
    sink->ReportResult(S_OK,200,NULL); // 200 = HTTP OK
    return true;
  error1:
    this->clearContentFile();
    return false;
  }

  void CHttpsProtocolHook::clearContentFile(){
    this->m_filepos=0;
    this->m_filelen=0;
    this->m_file_terminated=false;
    this->m_file_locked=false;
    if(this->m_file!=NULL){
      std::fclose(this->m_file);
      this->m_file=NULL;
    }
  }

  // IInternetProtocolRoot
  STDMETHODIMP CHttpsProtocolHook::Start(
    /* [in] */ LPCWSTR szUrl,
    /* [in] */ IInternetProtocolSink *pOIProtSink,
    /* [in] */ IInternetBindInfo *pOIBindInfo,
    /* [in] */ DWORD grfPI,
    /* [in] */ HANDLE_PTR dwReserved
  ){
    //return S_OK; // ダウンロード開始 (非同期的取得)
    //return E_PENDING; // データ利用可能 (同期的取得可能)
    //return INET_E_USE_DEFAULT_PROTOCOLHANDLER; // デフォルトハンドラに任せる

    //MessageBox(NULL,_T("CHttpsProtocolHook::Start!"),NULL,0);
    if(this->startContentFile(szUrl,pOIProtSink))
      return E_PENDING;

    std::wstring url=szUrl;
    if(url==L"mwg://hello/"||url==L"https://hello/"){
      // dbg
      this->dbg_data="hello world!";
      this->dbg_index=0;
      this->dbg_length=12;
      pOIProtSink->ReportData(BSCF_LASTDATANOTIFICATION,dbg_length,dbg_length);
      pOIProtSink->ReportProgress(BINDSTATUS_MIMETYPEAVAILABLE,L"text/plain;charset=utf-8");
      pOIProtSink->ReportResult(S_OK,200,NULL); // 200 = HTTP OK
      return E_PENDING;
    }

    return INET_E_USE_DEFAULT_PROTOCOLHANDLER;
  }

  STDMETHODIMP CHttpsProtocolHook::Continue(
    /* [in] */ PROTOCOLDATA *pProtocolData
  ){
    //return S_OK;        // Success.
    //return E_PENDING;   // The next state will complete asynchronously.
    //return INET_E_xxx;  // Internet-specific errors.
    if(!this->m_file){
      MessageBox(NULL,_T("CHttpsProtocolHook::Continue!"),NULL,0);
    }
    return S_OK;
  }

  STDMETHODIMP CHttpsProtocolHook::Abort(
    /* [in] */ HRESULT hrReason,
    /* [in] */ DWORD dwOptions
  ){
    if(!this->m_file){
      MessageBox(NULL,_T("CHttpsProtocolHook::Abort!"),NULL,0);
    }
    return S_OK;
  }

  STDMETHODIMP CHttpsProtocolHook::Terminate(
    /* [in] */ DWORD dwOptions
  ){
    if(this->m_file!=NULL&&!this->m_file_terminated){
      this->m_file_terminated=true;
      if(!this->m_file_locked){
        this->clearContentFile();
      }
    }

    return S_OK;
  }

  STDMETHODIMP CHttpsProtocolHook::Suspend(){
    if(!this->m_file){
      MessageBox(NULL,_T("CHttpsProtocolHook::Suspend!"),NULL,0);
    }
    return S_OK;
  }
  STDMETHODIMP CHttpsProtocolHook::Resume(){
    if(!this->m_file){
      MessageBox(NULL,_T("CHttpsProtocolHook::Resume!"),NULL,0);
    }
    return S_OK;
  }

  // IInternetProtocol
  STDMETHODIMP CHttpsProtocolHook::Read(
    /* [in, out] */ void *pv,
    /* [in] */ ULONG cb,
    /* [out] */ ULONG *pcbRead
  ){
    //return S_OK;    // The read was successful, but there is still additional data available.
    //return S_FALSE; // All of the data has been completely downloaded.
    if(this->m_file){
      __int64 n=(ULONG)std::min<__int64>(cb,this->m_filelen-this->m_filepos);
      if(n<=0)return S_FALSE;
      *pcbRead=(ULONG)n;

      this->m_filepos+=::fread(pv,1,*pcbRead,this->m_file);
      return this->m_filepos>=this->m_filelen?S_FALSE:S_OK;
    }else{
      ULONG n=*pcbRead=std::min<ULONG>(cb,this->dbg_length-this->dbg_index);
      if(n<=0)return S_FALSE;

      std::memcpy(pv,this->dbg_data,n);
      this->dbg_index+=n;
      return this->dbg_index>=this->dbg_length?S_FALSE:S_OK;
    }
  }

  STDMETHODIMP CHttpsProtocolHook::Seek(
    /* [in] */ LARGE_INTEGER dlibMove,
    /* [in] */ DWORD dwOrigin,
    /* [out] */ ULARGE_INTEGER *plibNewPosition
  ){
    if(this->m_file){
      ::_fseeki64(this->m_file,dlibMove.QuadPart,dwOrigin);
      plibNewPosition->QuadPart=this->m_filepos=::_ftelli64(this->m_file);
      return S_OK;
    }else{
      MessageBox(NULL,_T("CHttpsProtocolHook::Seek!"),NULL,0);
      plibNewPosition->QuadPart=0;
      return S_OK;
    }
  }

  STDMETHODIMP CHttpsProtocolHook::LockRequest(
    /* [in] */ DWORD dwOptions
  ){
    if(this->m_file!=NULL){
      this->m_file_locked=true;
    }
    return S_OK;
  }

  STDMETHODIMP CHttpsProtocolHook::UnlockRequest(){
    if(this->m_file!=NULL&&this->m_file_locked){
      this->m_file_locked=false;
      if(this->m_file_terminated){
        this->clearContentFile();
      }
    }

    return S_OK;
  }

  STDMETHODIMP CHttpsProtocolHookFactory::CreateInstance(IUnknown *pUnkOuter,REFIID riid,void **ppvObject){
    HRESULT hr;
    if(ppvObject==NULL)return E_POINTER;
    *ppvObject=NULL;

    if(pUnkOuter!=NULL){
      if(!InlineIsEqualUnknown(riid))return E_NOINTERFACE;
      //return CLASS_E_NOAGGREGATION;

      CComAggObject<CHttpsProtocolHook>* p;
      hr=CComAggObject<CHttpsProtocolHook>::CreateInstance(pUnkOuter,&p);
      if(FAILED(hr))return hr;

      p->AddRef();
      hr=p->QueryInterface(riid,ppvObject);
      p->Release();
      return hr;
    }else{
      CComObject<CHttpsProtocolHook>* p;
      HRESULT hr=CComObject<CHttpsProtocolHook>::CreateInstance(&p);
      if(FAILED(hr))return hr;

      p->AddRef();
      hr=p->QueryInterface(riid,ppvObject);
      p->Release();
      return hr;
    }
  }
}
}
