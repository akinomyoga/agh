

/* this ALWAYS GENERATED file contains the IIDs and CLSIDs */

/* link this file in with the server and any clients */


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


#ifdef __cplusplus
extern "C"{
#endif


#include <rpc.h>
#include <rpcndr.h>

#ifdef _MIDL_USE_GUIDDEF_

#ifndef INITGUID
#define INITGUID
#include <guiddef.h>
#undef INITGUID
#else
#include <guiddef.h>
#endif

#define MIDL_DEFINE_GUID(type,name,l,w1,w2,b1,b2,b3,b4,b5,b6,b7,b8) \
        DEFINE_GUID(name,l,w1,w2,b1,b2,b3,b4,b5,b6,b7,b8)

#else // !_MIDL_USE_GUIDDEF_

#ifndef __IID_DEFINED__
#define __IID_DEFINED__

typedef struct _IID
{
    unsigned long x;
    unsigned short s1;
    unsigned short s2;
    unsigned char  c[8];
} IID;

#endif // __IID_DEFINED__

#ifndef CLSID_DEFINED
#define CLSID_DEFINED
typedef IID CLSID;
#endif // CLSID_DEFINED

#define MIDL_DEFINE_GUID(type,name,l,w1,w2,b1,b2,b3,b4,b5,b6,b7,b8) \
        const type name = {l,w1,w2,{b1,b2,b3,b4,b5,b6,b7,b8}}

#endif !_MIDL_USE_GUIDDEF_

MIDL_DEFINE_GUID(IID, IID_IMwgtex4IeBho,0x069073F0,0x741B,0x4399,0x87,0x1D,0xD7,0xD2,0x78,0xFC,0xDD,0x24);


MIDL_DEFINE_GUID(IID, IID_IHttpsProtocolHook,0x0B7933E3,0xEDD9,0x4293,0x8B,0x9D,0x1F,0xDA,0x6E,0xDF,0x04,0xA0);


MIDL_DEFINE_GUID(IID, IID_IHttpsProtocolHookFactory,0x7543FADC,0x2527,0x4b5d,0xB7,0xBC,0xD3,0x89,0x49,0x84,0xAE,0xC6);


MIDL_DEFINE_GUID(IID, LIBID_mwgtex4ieLib,0xB7644CDB,0x1973,0x40B5,0x92,0x16,0x94,0x06,0xF0,0xF9,0x3A,0x84);


MIDL_DEFINE_GUID(CLSID, CLSID_Mwgtex4IeBho,0x95E7C414,0x8D83,0x42A9,0xB2,0x43,0x93,0x66,0xFD,0x6C,0xFA,0x67);


MIDL_DEFINE_GUID(CLSID, CLSID_HttpsProtocolHook,0xC98B7CCA,0xA4C0,0x4a9a,0xAF,0x52,0x55,0x20,0x89,0x7B,0x6C,0xAE);


MIDL_DEFINE_GUID(CLSID, CLSID_HttpsProtocolHookFactory,0xB9932C9A,0x9379,0x4359,0xA6,0x09,0x8E,0xEA,0x4E,0xE0,0xD6,0x95);

#undef MIDL_DEFINE_GUID

#ifdef __cplusplus
}
#endif



