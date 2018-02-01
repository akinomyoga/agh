# -*- mode:makefile-gmake -*-

all:
.PHONY:

include ../config.mk

all: jsfiles
ifneq ($(generate_compressed_jsfiles),)
all: jgzfiles
endif

BASE=../..
OUTDIR:=$(BASE)/out
directories+=$(OUTDIR)

MONO:=$(shell bash -c 'type -p mono')
GZJS:=$(MONO) $(BASE)/tools/ext/gzjs.exe
MWGPP:=$(BASE)/tools/ext/mwg_pp.awk

Makefile: Makefile.pp
	$(MWGPP) $< > $@

#%m compress_js
jsfiles += $(OUTDIR)/%name%.js
$(OUTDIR)/%name%.js.gz: $(OUTDIR)/%name%.js
	$(GZJS) $<
$(OUTDIR)/%name%.jgz: $(OUTDIR)/%name%.js.gz
	cp $< $@
#%end


directories+=.gen

#%x compress_js.r|%name%|agh.text.encode|
$(OUTDIR)/agh.text.encode.js: main.pp .gen/gencat.js enc_uni.js enc_jis.js test.js | $(OUTDIR)
	$(MWGPP) $< > $@
.gen/gencat.js: $(BASE)/tools/ext/unidata/out/gencat.js | .gen
	cp -p $< $@

jsfiles: $(jsfiles)
jgzfiles: $(jsfiles:.js=js.gz) $(jsfiles:.js=jgz)
.PHONY: jsfiles jgzfiles

# all: jgzfiles


$(directories):
	mkdir -p $@
