# -*- mode:makefile-gmake -*-

all: gzjs.exe
.PHONY: all

res/sfxframe.js: inflate/out/sfxframe-20090728.js
	cp -p $< $@
res/sfxframe85.js: inflate/out/sfxframe-a85-v3.js
	cp -p $< $@
gzjs.exe: RexJs.cs gzjs.cs gzjs.deflate.cs res/sfxframe.js res/sfxframe85.js
	csc -r:'System.dll' -res:'res/sfxframe.js' -res:'res/sfxframe85.js' gzjs.cs RexJs.cs gzjs.deflate.cs
	cp gzjs.exe ../
