

/* this ALWAYS GENERATED file contains the definitions for the interfaces */


 /* File created by MIDL compiler version 7.00.0500 */
/* at Tue Jan 27 03:43:28 2015
 */
/* Compiler settings for .\mwgtex4ie.idl:
    Oicf, W1, Zp8, env=Win32 (32b run)
    protocol : dce , ms_ext, c_ext, robust
    error checks: stub_data 
    VC __declspec() decoration level: 
         __declspec(uuid()), __declspec(selectany), __declspec(novtable)
         DECLSPEC_UUID(), MIDL_INTERFACE()
*/
//@@MIDL_FILE_HEADING(  )

#pragma warning( disable: 4049 )  /* more than 64k source lines */


/* verify that the <rpcndr.h> version is high enough to compile this file*/
#ifndef __REQUIRED_RPCNDR_H_VERSION__
#define __REQUIRED_RPCNDR_H_VERSION__ 475
#endif

#include "rpc.h"
#include "rpcndr.h"

#ifndef __RPCNDR_H_VERSION__
#error this stub requires an updated version of <rpcndr.h>
#endif // __RPCNDR_H_VERSION__

#ifndef COM_NO_WINDOWS_H
#include "windows.h"
#include "ole2.h"
#endif /*COM_NO_WINDOWS_H*/

#ifndef __mwgtex4ie_i_h__
#define __mwgtex4ie_i_h__

#if defined(_MSC_VER) && (_MSC_VER >= 1020)
#pragma once
#endif

/* Forward Declarations */ 

#ifndef __IMwgtex4IeBho_FWD_DEFINED__
#define __IMwgtex4IeBho_FWD_DEFINED__
typedef interface IMwgtex4IeBho IMwgtex4IeBho;
#endif 	/* __IMwgtex4IeBho_FWD_DEFINED__ */


#ifndef __IHttpsProtocolHook_FWD_DEFINED__
#define __IHttpsProtocolHook_FWD_DEFINED__
typedef interface IHttpsProtocolHook IHttpsProtocolHook;
#endif 	/* __IHttpsProtocolHook_FWD_DEFINED__ */


#ifndef __IHttpsProtocolHookFactory_FWD_DEFINED__
#define __IHttpsProtocolHookFactory_FWD_DEFINED__
typedef interface IHttpsProtocolHookFactory IHttpsProtocolHookFactory;
#endif 	/* __IHttpsProtocolHookFactory_FWD_DEFINED__ */


#ifndef __Mwgtex4IeBho_FWD_DEFINED__
#define __Mwgtex4IeBho_FWD_DEFINED__

#ifdef __cplusplus
typedef class Mwgtex4IeBho Mwgtex4IeBho;
#else
typedef struct Mwgtex4IeBho Mwgtex4IeBho;
#endif /* __cplusplus */

#endif 	/* __Mwgtex4IeBho_FWD_DEFINED__ */


#ifndef __HttpsProtocolHook_FWD_DEFINED__
#define __HttpsProtocolHook_FWD_DEFINED__

#ifdef __cplusplus
typedef class HttpsProtocolHook HttpsProtocolHook;
#else
typedef struct HttpsProtocolHook HttpsProtocolHook;
#endif /* __cplusplus */

#endif 	/* __HttpsProtocolHook_FWD_DEFINED__ */


#ifndef __HttpsProtocolHookFactory_FWD_DEFINED__
#define __HttpsProtocolHookFactory_FWD_DEFINED__

#ifdef __cplusplus
typedef class HttpsProtocolHookFactory HttpsProtocolHookFactory;
#else
typedef struct HttpsProtocolHookFactory HttpsProtocolHookFactory;
#endif /* __cplusplus */

#endif 	/* __HttpsProtocolHookFactory_FWD_DEFINED__ */


/* header files for imported files */
#include "oaidl.h"
#include "ocidl.h"

#ifdef __cplusplus
extern "C"{
#endif 


#ifndef __IMwgtex4IeBho_INTERFACE_DEFINED__
#define __IMwgtex4IeBho_INTERFACE_DEFINED__

/* interface IMwgtex4IeBho */
/* [unique][helpstring][nonextensible][dual][uuid][object] */ 


EXTERN_C const IID IID_IMwgtex4IeBho;

#if defined(__cplusplus) && !defined(CINTERFACE)
    
    MIDL_INTERFACE("069073F0-741B-4399-871D-D7D278FCDD24")
    IMwgtex4IeBho : public IDispatch
    {
    public:
    };
    
#else 	/* C style interface */

    typedef struct IMwgtex4IeBhoVtbl
    {
        BEGIN_INTERFACE
        
        HRESULT ( STDMETHODCALLTYPE *QueryInterface )( 
            IMwgtex4IeBho * This,
            /* [in] */ REFIID riid,
            /* [iid_is][out] */ 
            __RPC__deref_out  void **ppvObject);
        
        ULONG ( STDMETHODCALLTYPE *AddRef )( 
            IMwgtex4IeBho * This);
        
        ULONG ( STDMETHODCALLTYPE *Release )( 
            IMwgtex4IeBho * This);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfoCount )( 
            IMwgtex4IeBho * This,
            /* [out] */ UINT *pctinfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfo )( 
            IMwgtex4IeBho * This,
            /* [in] */ UINT iTInfo,
            /* [in] */ LCID lcid,
            /* [out] */ ITypeInfo **ppTInfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetIDsOfNames )( 
            IMwgtex4IeBho * This,
            /* [in] */ REFIID riid,
            /* [size_is][in] */ LPOLESTR *rgszNames,
            /* [range][in] */ UINT cNames,
            /* [in] */ LCID lcid,
            /* [size_is][out] */ DISPID *rgDispId);
        
        /* [local] */ HRESULT ( STDMETHODCALLTYPE *Invoke )( 
            IMwgtex4IeBho * This,
            /* [in] */ DISPID dispIdMember,
            /* [in] */ REFIID riid,
            /* [in] */ LCID lcid,
            /* [in] */ WORD wFlags,
            /* [out][in] */ DISPPARAMS *pDispParams,
            /* [out] */ VARIANT *pVarResult,
            /* [out] */ EXCEPINFO *pExcepInfo,
            /* [out] */ UINT *puArgErr);
        
        END_INTERFACE
    } IMwgtex4IeBhoVtbl;

    interface IMwgtex4IeBho
    {
        CONST_VTBL struct IMwgtex4IeBhoVtbl *lpVtbl;
    };

    

#ifdef COBJMACROS


#define IMwgtex4IeBho_QueryInterface(This,riid,ppvObject)	\
    ( (This)->lpVtbl -> QueryInterface(This,riid,ppvObject) ) 

#define IMwgtex4IeBho_AddRef(This)	\
    ( (This)->lpVtbl -> AddRef(This) ) 

#define IMwgtex4IeBho_Release(This)	\
    ( (This)->lpVtbl -> Release(This) ) 


#define IMwgtex4IeBho_GetTypeInfoCount(This,pctinfo)	\
    ( (This)->lpVtbl -> GetTypeInfoCount(This,pctinfo) ) 

#define IMwgtex4IeBho_GetTypeInfo(This,iTInfo,lcid,ppTInfo)	\
    ( (This)->lpVtbl -> GetTypeInfo(This,iTInfo,lcid,ppTInfo) ) 

#define IMwgtex4IeBho_GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId)	\
    ( (This)->lpVtbl -> GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId) ) 

#define IMwgtex4IeBho_Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr)	\
    ( (This)->lpVtbl -> Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr) ) 


#endif /* COBJMACROS */


#endif 	/* C style interface */




#endif 	/* __IMwgtex4IeBho_INTERFACE_DEFINED__ */


#ifndef __IHttpsProtocolHook_INTERFACE_DEFINED__
#define __IHttpsProtocolHook_INTERFACE_DEFINED__

/* interface IHttpsProtocolHook */
/* [unique][helpstring][nonextensible][dual][uuid][object] */ 


EXTERN_C const IID IID_IHttpsProtocolHook;

#if defined(__cplusplus) && !defined(CINTERFACE)
    
    MIDL_INTERFACE("0B7933E3-EDD9-4293-8B9D-1FDA6EDF04A0")
    IHttpsProtocolHook : public IDispatch
    {
    public:
    };
    
#else 	/* C style interface */

    typedef struct IHttpsProtocolHookVtbl
    {
        BEGIN_INTERFACE
        
        HRESULT ( STDMETHODCALLTYPE *QueryInterface )( 
            IHttpsProtocolHook * This,
            /* [in] */ REFIID riid,
            /* [iid_is][out] */ 
            __RPC__deref_out  void **ppvObject);
        
        ULONG ( STDMETHODCALLTYPE *AddRef )( 
            IHttpsProtocolHook * This);
        
        ULONG ( STDMETHODCALLTYPE *Release )( 
            IHttpsProtocolHook * This);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfoCount )( 
            IHttpsProtocolHook * This,
            /* [out] */ UINT *pctinfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfo )( 
            IHttpsProtocolHook * This,
            /* [in] */ UINT iTInfo,
            /* [in] */ LCID lcid,
            /* [out] */ ITypeInfo **ppTInfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetIDsOfNames )( 
            IHttpsProtocolHook * This,
            /* [in] */ REFIID riid,
            /* [size_is][in] */ LPOLESTR *rgszNames,
            /* [range][in] */ UINT cNames,
            /* [in] */ LCID lcid,
            /* [size_is][out] */ DISPID *rgDispId);
        
        /* [local] */ HRESULT ( STDMETHODCALLTYPE *Invoke )( 
            IHttpsProtocolHook * This,
            /* [in] */ DISPID dispIdMember,
            /* [in] */ REFIID riid,
            /* [in] */ LCID lcid,
            /* [in] */ WORD wFlags,
            /* [out][in] */ DISPPARAMS *pDispParams,
            /* [out] */ VARIANT *pVarResult,
            /* [out] */ EXCEPINFO *pExcepInfo,
            /* [out] */ UINT *puArgErr);
        
        END_INTERFACE
    } IHttpsProtocolHookVtbl;

    interface IHttpsProtocolHook
    {
        CONST_VTBL struct IHttpsProtocolHookVtbl *lpVtbl;
    };

    

#ifdef COBJMACROS


#define IHttpsProtocolHook_QueryInterface(This,riid,ppvObject)	\
    ( (This)->lpVtbl -> QueryInterface(This,riid,ppvObject) ) 

#define IHttpsProtocolHook_AddRef(This)	\
    ( (This)->lpVtbl -> AddRef(This) ) 

#define IHttpsProtocolHook_Release(This)	\
    ( (This)->lpVtbl -> Release(This) ) 


#define IHttpsProtocolHook_GetTypeInfoCount(This,pctinfo)	\
    ( (This)->lpVtbl -> GetTypeInfoCount(This,pctinfo) ) 

#define IHttpsProtocolHook_GetTypeInfo(This,iTInfo,lcid,ppTInfo)	\
    ( (This)->lpVtbl -> GetTypeInfo(This,iTInfo,lcid,ppTInfo) ) 

#define IHttpsProtocolHook_GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId)	\
    ( (This)->lpVtbl -> GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId) ) 

#define IHttpsProtocolHook_Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr)	\
    ( (This)->lpVtbl -> Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr) ) 


#endif /* COBJMACROS */


#endif 	/* C style interface */




#endif 	/* __IHttpsProtocolHook_INTERFACE_DEFINED__ */


#ifndef __IHttpsProtocolHookFactory_INTERFACE_DEFINED__
#define __IHttpsProtocolHookFactory_INTERFACE_DEFINED__

/* interface IHttpsProtocolHookFactory */
/* [unique][helpstring][nonextensible][dual][uuid][object] */ 


EXTERN_C const IID IID_IHttpsProtocolHookFactory;

#if defined(__cplusplus) && !defined(CINTERFACE)
    
    MIDL_INTERFACE("7543FADC-2527-4b5d-B7BC-D3894984AEC6")
    IHttpsProtocolHookFactory : public IDispatch
    {
    public:
    };
    
#else 	/* C style interface */

    typedef struct IHttpsProtocolHookFactoryVtbl
    {
        BEGIN_INTERFACE
        
        HRESULT ( STDMETHODCALLTYPE *QueryInterface )( 
            IHttpsProtocolHookFactory * This,
            /* [in] */ REFIID riid,
            /* [iid_is][out] */ 
            __RPC__deref_out  void **ppvObject);
        
        ULONG ( STDMETHODCALLTYPE *AddRef )( 
            IHttpsProtocolHookFactory * This);
        
        ULONG ( STDMETHODCALLTYPE *Release )( 
            IHttpsProtocolHookFactory * This);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfoCount )( 
            IHttpsProtocolHookFactory * This,
            /* [out] */ UINT *pctinfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetTypeInfo )( 
            IHttpsProtocolHookFactory * This,
            /* [in] */ UINT iTInfo,
            /* [in] */ LCID lcid,
            /* [out] */ ITypeInfo **ppTInfo);
        
        HRESULT ( STDMETHODCALLTYPE *GetIDsOfNames )( 
            IHttpsProtocolHookFactory * This,
            /* [in] */ REFIID riid,
            /* [size_is][in] */ LPOLESTR *rgszNames,
            /* [range][in] */ UINT cNames,
            /* [in] */ LCID lcid,
            /* [size_is][out] */ DISPID *rgDispId);
        
        /* [local] */ HRESULT ( STDMETHODCALLTYPE *Invoke )( 
            IHttpsProtocolHookFactory * This,
            /* [in] */ DISPID dispIdMember,
            /* [in] */ REFIID riid,
            /* [in] */ LCID lcid,
            /* [in] */ WORD wFlags,
            /* [out][in] */ DISPPARAMS *pDispParams,
            /* [out] */ VARIANT *pVarResult,
            /* [out] */ EXCEPINFO *pExcepInfo,
            /* [out] */ UINT *puArgErr);
        
        END_INTERFACE
    } IHttpsProtocolHookFactoryVtbl;

    interface IHttpsProtocolHookFactory
    {
        CONST_VTBL struct IHttpsProtocolHookFactoryVtbl *lpVtbl;
    };

    

#ifdef COBJMACROS


#define IHttpsProtocolHookFactory_QueryInterface(This,riid,ppvObject)	\
    ( (This)->lpVtbl -> QueryInterface(This,riid,ppvObject) ) 

#define IHttpsProtocolHookFactory_AddRef(This)	\
    ( (This)->lpVtbl -> AddRef(This) ) 

#define IHttpsProtocolHookFactory_Release(This)	\
    ( (This)->lpVtbl -> Release(This) ) 


#define IHttpsProtocolHookFactory_GetTypeInfoCount(This,pctinfo)	\
    ( (This)->lpVtbl -> GetTypeInfoCount(This,pctinfo) ) 

#define IHttpsProtocolHookFactory_GetTypeInfo(This,iTInfo,lcid,ppTInfo)	\
    ( (This)->lpVtbl -> GetTypeInfo(This,iTInfo,lcid,ppTInfo) ) 

#define IHttpsProtocolHookFactory_GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId)	\
    ( (This)->lpVtbl -> GetIDsOfNames(This,riid,rgszNames,cNames,lcid,rgDispId) ) 

#define IHttpsProtocolHookFactory_Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr)	\
    ( (This)->lpVtbl -> Invoke(This,dispIdMember,riid,lcid,wFlags,pDispParams,pVarResult,pExcepInfo,puArgErr) ) 


#endif /* COBJMACROS */


#endif 	/* C style interface */




#endif 	/* __IHttpsProtocolHookFactory_INTERFACE_DEFINED__ */



#ifndef __mwgtex4ieLib_LIBRARY_DEFINED__
#define __mwgtex4ieLib_LIBRARY_DEFINED__

/* library mwgtex4ieLib */
/* [helpstring][version][uuid] */ 


EXTERN_C const IID LIBID_mwgtex4ieLib;

EXTERN_C const CLSID CLSID_Mwgtex4IeBho;

#ifdef __cplusplus

class DECLSPEC_UUID("95E7C414-8D83-42A9-B243-9366FD6CFA67")
Mwgtex4IeBho;
#endif

EXTERN_C const CLSID CLSID_HttpsProtocolHook;

#ifdef __cplusplus

class DECLSPEC_UUID("C98B7CCA-A4C0-4a9a-AF52-5520897B6CAE")
HttpsProtocolHook;
#endif

EXTERN_C const CLSID CLSID_HttpsProtocolHookFactory;

#ifdef __cplusplus

class DECLSPEC_UUID("B9932C9A-9379-4359-A609-8EEA4EE0D695")
HttpsProtocolHookFactory;
#endif
#endif /* __mwgtex4ieLib_LIBRARY_DEFINED__ */

/* Additional Prototypes for ALL interfaces */

/* end of Additional Prototypes */

#ifdef __cplusplus
}
#endif

#endif


