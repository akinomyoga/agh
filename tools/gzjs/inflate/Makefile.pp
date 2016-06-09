# -*- mode:makefile-gmake -*-

all:
.PHONY: all tests
BASE:=../../..

UGLIFY:=uglifyjs

# CLI Engine
MONO:=$(shell bash -c 'type -p mono')

OUTDIR:=out

GZJS:=$(MONO) $(BASE)/tools/ext/gzjs.exe
MWGPP:=$(BASE)/tools/ext/mwg_pp.awk

$(OUTDIR):
	mkdir -p $@

Makefile: Makefile.pp
	$(MWGPP) $< > $@

# sample data from agh.lang.tex.js
$(OUTDIR)/data.dat: ../../../out/agh.lang.tex.js
	$(GZJS) -Wno-gz -o$@ $<
	sed -i -e '1s/^\xef\xbb\xbf//' -e '/[^]/!d' -e 's/$$//' $@
$(OUTDIR)/data.dat.gz: $(OUTDIR)/data.dat | $(OUTDIR)
	gzip -9 -c $< > $@
gzcut.exe: gzcut.cpp
	g++ -o $@ $<
$(OUTDIR)/data-gz85.dat: $(OUTDIR)/data.dat.gz gzcut.exe | $(OUTDIR)
	./gzcut.exe $< > $@
$(OUTDIR)/data-deflate+base64.dat: $(OUTDIR)/data.dat | $(OUTDIR)
	$(GZJS) -Wsfx -o - $< | sed -e '1,/replace(/d' -e "/^[^']/d" > $@
$(OUTDIR)/data-deflate+base85.dat: $(OUTDIR)/data.dat | $(OUTDIR)
	$(GZJS) -Wsfx85 -o - $< | sed -e '1,/replace(/d' -e "/^[^']/d" > $@

#%m frame64
tests+=$(OUTDIR)/sfxtest-%suffix%.js
$(OUTDIR)/sfxtest-%suffix%.js: frame-%suffix%.js sfxtest-b64.def.js $(OUTDIR)/data-deflate+base64.dat | $(OUTDIR)
	cat sfxtest-b64.def.js $< | $(MWGPP) > $@
frames+=$(OUTDIR)/sfxframe-%suffix%.js
$(OUTDIR)/sfxframe-%suffix%.js: frame-%suffix%.js sfxframe-b64.def.js | $(OUTDIR)
	cat sfxframe-b64.def.js $< | $(MWGPP) > $@
#%end
#%x frame64.r|%suffix%|20090720|
#%x frame64.r|%suffix%|20090728|

tests+=$(OUTDIR)/sfxtest-a85-v1.js
$(OUTDIR)/sfxtest-a85-v1.js: frame-a85-v1.js impl_inflate.js impl_a85.js impl_utf8.js sfxtest-a85.def.js $(OUTDIR)/data-gz85.dat | $(OUTDIR)
	cat sfxtest-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@
frames+=$(OUTDIR)/sfxframe-a85-v1.js
$(OUTDIR)/sfxframe-a85-v1.js: frame-a85-v1.js impl_inflate.js impl_a85.js impl_utf8.js sfxframe-a85.def.js | $(OUTDIR)
	cat sfxframe-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@

$(OUTDIR)/.frame-a85-v2gen1.js: frame-a85-v2.js impl_inflate.js impl_a85.js impl_utf8.js | $(OUTDIR)
	PPC_CPP=1 $(MWGPP) $< > $@
$(OUTDIR)/.frame-a85-v2gen2.js: $(OUTDIR)/.frame-a85-v2gen1.js | $(OUTDIR)
	$(GZJS) -Wno-gz -Wrtok -o$@ $<
tests+=$(OUTDIR)/sfxtest-a85-v2.js
$(OUTDIR)/sfxtest-a85-v2.js: frame-a85-v2f.js $(OUTDIR)/.frame-a85-v2gen2.js sfxtest-a85.def.js $(OUTDIR)/data-gz85.dat | $(OUTDIR)
	cat sfxtest-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@
frames+=$(OUTDIR)/sfxframe-a85-v2.js
$(OUTDIR)/sfxframe-a85-v2.js: frame-a85-v2f.js $(OUTDIR)/.frame-a85-v2gen2.js sfxframe-a85.def.js | $(OUTDIR)
	cat sfxframe-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@

$(OUTDIR)/.frame-a85-v3gen1.js: $(OUTDIR)/.frame-a85-v2gen1.js | $(OUTDIR)
	$(UGLIFY) -c -m -o $@ $<
	sed -i -e 's/^!function/(function/' -e 's/();\{0,1\}$$/)()/' -e 's/\bassign\b/A/g' -e 's/\bstatus\b/B/g' -e 's/\broot\b/C/g' -e 's/\blist\b/D/g' $@
$(OUTDIR)/.frame-a85-v3gen2.js: $(OUTDIR)/.frame-a85-v3gen1.js | $(OUTDIR)
	$(GZJS) -Wno-gz -Wrtok -Wno-fold-string -o$@ $<
tests+=$(OUTDIR)/sfxtest-a85-v3.js
$(OUTDIR)/.frame-a85-v3f.js: frame-a85-v2f.js | $(OUTDIR)
	sed 's/v2/v3/g' $< > $@
$(OUTDIR)/sfxtest-a85-v3.js: $(OUTDIR)/.frame-a85-v3f.js $(OUTDIR)/.frame-a85-v3gen2.js sfxtest-a85.def.js $(OUTDIR)/data-gz85.dat | $(OUTDIR)
	cat sfxtest-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@
frames+=$(OUTDIR)/sfxframe-a85-v3.js
$(OUTDIR)/sfxframe-a85-v3.js: $(OUTDIR)/.frame-a85-v3f.js $(OUTDIR)/.frame-a85-v3gen2.js sfxframe-a85.def.js | $(OUTDIR)
	cat sfxframe-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@

tests: $(tests)
all: $(frames)
