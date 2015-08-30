@ECHO OFF
ECHO -------------------------------------------------------------------------------
ECHO   agh.addon.aghtex4ie Install
ECHO                   Copyright (C) 2004-2012, Koichi Murase, all rights reserved.
ECHO -------------------------------------------------------------------------------

IF NOT EXIST "%PROGRAMFILES%\Myoga" (
  ECHO MD "%PROGRAMFILES%\Myoga"
       MD "%PROGRAMFILES%\Myoga"
)

ECHO XCOPY /F /I /S /Y /D . "%PROGRAMFILES%\Myoga\agh.addon.aghtex4ie" /EXCLUDE:noinstall.lst
     XCOPY /F /I /S /Y /D . "%PROGRAMFILES%\Myoga\agh.addon.aghtex4ie" /EXCLUDE:noinstall.lst
ECHO PUSHD "%PROGRAMFILES%\Myoga\agh.addon.aghtex4ie"
     PUSHD "%PROGRAMFILES%\Myoga\agh.addon.aghtex4ie"
ECHO REGSVR32 /s aghtex4ie.dll
     REGSVR32 /s aghtex4ie.dll
ECHO EXPLORER .
     EXPLORER .
ECHO POPD
     POPD

ECHO -------------------------------------------------------------------------------
ECHO   agh.addon.aghtex4ie Installed
ECHO -------------------------------------------------------------------------------
ECHO Press any key to exit...
PAUSE > nul
