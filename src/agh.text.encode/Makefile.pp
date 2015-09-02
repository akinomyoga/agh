# -*- mode:makefile-gmake -*-

OUTDIR:=../../out

#%define compress_js
jsfiles+=$(OUTDIR)/%name%.js $(OUTDIR)/%name%.js.gz $(OUTDIR)/%name%.jgz
$(OUTDIR)/%name%.js.gz: $(OUTDIR)/%name%.js
	gzjs $<
$(OUTDIR)/%name%.jgz: $(OUTDIR)/%name%.js.gz
	cp $< $@
#%define end

all:
.PHONY:

Makefile: Makefile.pp
	mwg_pp.awk $< > $@

#%expand compress_js.r|%name%|agh.text.encode|
$(OUTDIR)/agh.text.encode.js: main.pp gencat.js enc_uni.js enc_jis.js test.js
	mwg_pp.awk $< > $@
gencat.js: /home/koichi/prog/mat/unicode/gencat.js
	cp -p $< $@

all: $(jsfiles)
