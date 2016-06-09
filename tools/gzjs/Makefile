# -*- mode:makefile-gmake -*-

all: gzjs.exe
.PHONY: all

include ../csc_default.mk

BASE:=../..
MWGPP:=$(BASE)/tools/ext/mwg_pp.awk

.PHONY: inflate
inflate/out/sfxframe-a85-v3.js inflate/out/sfxframe-20090728.js: inflate
inflate: inflate/Makefile
	make -C inflate all
inflate/Makefile: inflate/Makefile.pp
	$(MWGPP) < $< > $@

res:
	mkdir -p $@

res/sfxframe.js: inflate/out/sfxframe-20090728.js | res
	cp -p $< $@

res/sfxframe85.js: inflate/out/sfxframe-a85-v3.js | res
	cp -p $< $@

gzjs.exe: RexJs.cs gzjs.cs gzjs.deflate.cs res/sfxframe.js res/sfxframe85.js
	$(CSC) $(CSFLAGS) -res:'res/sfxframe.js' -res:'res/sfxframe85.js' gzjs.cs RexJs.cs gzjs.deflate.cs
	cp gzjs.exe ../
