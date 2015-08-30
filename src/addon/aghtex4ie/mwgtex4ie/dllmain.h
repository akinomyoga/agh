// dllmain.h : モジュール クラスの宣言

class Cmwgtex4ieModule : public CAtlDllModuleT< Cmwgtex4ieModule >
{
public :
	DECLARE_LIBID(LIBID_mwgtex4ieLib)
	DECLARE_REGISTRY_APPID_RESOURCEID(IDR_MWGTEX4IE, "{C2EFEB94-12D0-44B5-88C0-E4307C7839C0}")
};

extern wchar_t mwgtex4ie_addon_directory[];
extern class Cmwgtex4ieModule _AtlModule;
