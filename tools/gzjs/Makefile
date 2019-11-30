# -*- mode:makefile-gmake -*-

all:
.PHONY: all

include ../csc_default.mk

BASE:=../..
MWGPP:=$(BASE)/tools/ext/mwg_pp.awk

OUTDIR:=$(BASE)/tools/out
$(OUTDIR):
	mkdir -p $@

.PHONY: inflate
inflate/out/sfxframe-a85-v3.js inflate/out/sfxframe-20090728.js: inflate
inflate: inflate/Makefile
	+make -C inflate all
inflate/Makefile: inflate/Makefile.pp
	$(MWGPP) < $< > $@

res/sfxframe.js: inflate/out/sfxframe-20090728.js | res
	cp -p $< $@
res/sfxframe85.js: inflate/out/sfxframe-a85-v3.js | res
	cp -p $< $@
res:
	mkdir -p $@

all: $(OUTDIR)/gzjs.exe
$(OUTDIR)/gzjs.exe: gzjs.cs RexJs.cs gzjs.deflate.cs res/sfxframe.js res/sfxframe85.js | $(OUTDIR)
	$(CSC) $(CSFLAGS) '-out:$@' '-res:res/sfxframe.js' '-res:res/sfxframe85.js' gzjs.cs RexJs.cs gzjs.deflate.cs
