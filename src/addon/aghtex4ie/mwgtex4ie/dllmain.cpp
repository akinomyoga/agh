// dllmain.cpp : DllMain の実装

#include "stdafx.h"
#include "resource.h"
#include "mwgtex4ie_i.h"
#include "dllmain.h"

#include <cstdio>
#include <cwchar>
#include <string>

Cmwgtex4ieModule _AtlModule;

WCHAR mwgtex4ie_addon_directory[_MAX_PATH]=L"";
static void init_mwgtex4ie_directory(HINSTANCE hInstance){
  static bool initialized=false;
  if(initialized)return;
  initialized=true;

  ::GetModuleFileNameW((HMODULE)hInstance,mwgtex4ie_addon_directory,_MAX_PATH);

  LPWSTR lastSlash;
  {
    lastSlash=std::wcsrchr(mwgtex4ie_addon_directory,'/');
    LPWSTR r=std::wcsrchr(mwgtex4ie_addon_directory,'\\');
    if(r!=NULL&&(lastSlash==NULL||r>lastSlash))lastSlash=r;
  }

  //std::wcscpy(lastSlash,L"/agh.addon.aghtex4ie/");
  std::wcscpy(lastSlash,L"\\");
  //::MessageBoxW(NULL,mwgtex4ie_addon_directory,L"mwgtex4ie addon directory is...",0);
}

static bool aghfonts_installed=false;

static void install_aghfonts1(const WCHAR* fname,bool& fERR,std::wstring& errmsg){
  std::wstring ttf=mwgtex4ie_addon_directory;
  ttf+=L"agh\\latex\\";
  ttf+=fname;
  ttf+=L".ttf";

  //if(0==::AddFontResourceW(ttf.c_str())){
  if(0==::AddFontResourceExW(ttf.c_str(),FR_PRIVATE,0)){
    fERR=true;
    errmsg+=ttf;
    errmsg+=L"\r\n";
  }
}

static void install_aghfonts(){
  if(aghfonts_installed)return;
  aghfonts_installed=true;

  bool fERR=false;
  std::wstring errmsg=L"aghtex4ie.dll: Failed to load the following fonts:\r\n";

  install_aghfonts1(L"aghtex_mathit",fERR,errmsg);
  install_aghfonts1(L"aghtex_mathbm",fERR,errmsg);
  install_aghfonts1(L"aghtex_mathrm",fERR,errmsg);
  install_aghfonts1(L"aghtex_mathcal",fERR,errmsg);
  install_aghfonts1(L"aghtex_mathbb",fERR,errmsg);
  install_aghfonts1(L"aghtex_mathfrak",fERR,errmsg);

  if(fERR)
    ::MessageBoxW(NULL,errmsg.c_str(),_T("agh.addon.aghtex4ie"),0);
}

static void uninstall_aghfonts1(const WCHAR* fname){
  std::wstring ttf=mwgtex4ie_addon_directory;
  ttf+=L"agh\\latex\\";
  ttf+=fname;
  ttf+=L".ttf";

  //::RemoveFontResourceW(ttf.c_str());
  ::RemoveFontResourceExW(ttf.c_str(),FR_PRIVATE,0);
}

static void uninstall_aghfonts(){
  if(!aghfonts_installed)return;
  aghfonts_installed=false;

  uninstall_aghfonts1(L"aghtex_mathit");
  uninstall_aghfonts1(L"aghtex_mathbm");
  uninstall_aghfonts1(L"aghtex_mathrm");
  uninstall_aghfonts1(L"aghtex_mathcal");
  uninstall_aghfonts1(L"aghtex_mathbb");
  uninstall_aghfonts1(L"aghtex_mathfrak");
}

// DLL エントリ ポイント
extern "C" BOOL WINAPI DllMain(HINSTANCE hInstance, DWORD dwReason, LPVOID lpReserved){
  //hInstance;
  switch(dwReason){
  case DLL_PROCESS_ATTACH:
    DisableThreadLibraryCalls(hInstance);
    init_mwgtex4ie_directory(hInstance);
    install_aghfonts();
    break;
  case DLL_PROCESS_DETACH:
    uninstall_aghfonts();
    break;
  }

  return _AtlModule.DllMain(dwReason, lpReserved); 
}
