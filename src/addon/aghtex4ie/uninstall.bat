@ECHO OFF
ECHO -------------------------------------------------------------------------------
ECHO   agh.addon.aghtex4ie Uninstall
ECHO                   Copyright (C) 2004-2012, Koichi Murase, all rights reserved.
ECHO -------------------------------------------------------------------------------

IF NOT EXIST "%PROGRAMFILES%\Myoga\agh.addon.aghtex4ie" (
  ECHO agh.addon.aghtex4ie is not installed on this system.
  ECHO There is no directory, "%PROGRAMFILES%\Myoga\agh.addon.aghtex4ie".
  GOTO END
) 

IF EXIST "%PROGRAMFILES%\Myoga\agh.addon.aghtex4ie\aghtex4ie.dll" (
  ECHO PUSHD "%PROGRAMFILES%\Myoga\agh.addon.aghtex4ie"
       PUSHD "%PROGRAMFILES%\Myoga\agh.addon.aghtex4ie"
  ECHO REGSVR32 /u /s aghtex4ie.dll
       REGSVR32 /u /s aghtex4ie.dll
  ECHO POPD
       POPD
)

ECHO PUSHD "%PROGRAMFILES%\Myoga"
     PUSHD "%PROGRAMFILES%\Myoga"
ECHO RD /Q /S "%PROGRAMFILES%\Myoga\agh.addon.aghtex4ie"
     RD /Q /S "%PROGRAMFILES%\Myoga\agh.addon.aghtex4ie"
ECHO POPD
     POPD

ECHO -------------------------------------------------------------------------------
ECHO   agh.addon.aghtex4ie Uninstalled
ECHO -------------------------------------------------------------------------------

:END
ECHO Press any key to exit...
PAUSE > nul
