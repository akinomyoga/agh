# -*- mode:makefile-gmake -*-

BASE=../..
OUTDIR:=$(BASE)/out

MONO:=$(shell bash -c 'type -p mono')
GZJS:=$(MONO) $(BASE)/tools/ext/gzjs.exe
MWGPP:=$(BASE)/tools/ext/mwg_pp.awk

#%m compress_js
jsfiles+=$(OUTDIR)/%name%.js $(OUTDIR)/%name%.js.gz $(OUTDIR)/%name%.jgz
$(OUTDIR)/%name%.js.gz: $(OUTDIR)/%name%.js
	$(GZJS) $<
$(OUTDIR)/%name%.jgz: $(OUTDIR)/%name%.js.gz
	cp $< $@
#%end

all:
.PHONY:

Makefile: Makefile.pp
	$(MWGPP) $< > $@

#%x compress_js.r|%name%|agh.text.encode|
$(OUTDIR)/agh.text.encode.js: main.pp gencat.js enc_uni.js enc_jis.js test.js
	$(MWGPP) $< > $@
gencat.js: /home/koichi/prog/mat/unicode/gencat.js
	cp -p $< $@

all: $(jsfiles)
