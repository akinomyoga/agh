# -*- mode:makefile-gmake -*-

all:
.PHONY: all tests

MWGPP:=mwg_pp.awk

Makefile: Makefile.pp
	$(MWGPP) $< > $@

# sample data from agh.lang.tex.js
out/data.dat: ../../../out/agh.lang.tex.js
	gzjs -Wno-gz -o$@ $<
	sed -i -e '1s/^\xef\xbb\xbf//' -e '/[^]/!d' -e 's/$$//' $@
out/data.dat.gz: out/data.dat
	gzip -9 -c $< > $@
gzcut.exe: gzcut.cpp
	g++ -o $@ $<
out/data-gz85.dat: out/data.dat.gz gzcut.exe
	./gzcut.exe $< > $@
out/data-deflate+base64.dat: out/data.dat
	gzjs -Wsfx -o - $< | sed -e '1,/replace(/d' -e "/^[^']/d" > $@
out/data-deflate+base85.dat: out/data.dat
	gzjs -Wsfx85 -o - $< | sed -e '1,/replace(/d' -e "/^[^']/d" > $@

#%m frame64
tests+=out/sfxtest-%suffix%.js
out/sfxtest-%suffix%.js: frame-%suffix%.js sfxtest-b64.def.js out/data-deflate+base64.dat
	cat sfxtest-b64.def.js $< | $(MWGPP) > $@
frames+=out/sfxframe-%suffix%.js
out/sfxframe-%suffix%.js: frame-%suffix%.js sfxframe-b64.def.js
	cat sfxframe-b64.def.js $< | $(MWGPP) > $@
#%end
#%x frame64.r|%suffix%|20090720|
#%x frame64.r|%suffix%|20090728|

tests+=out/sfxtest-a85-v1.js
out/sfxtest-a85-v1.js: frame-a85-v1.js impl_inflate.js impl_a85.js impl_utf8.js sfxtest-a85.def.js out/data-gz85.dat
	cat sfxtest-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@
frames+=out/sfxframe-a85-v1.js
out/sfxframe-a85-v1.js: frame-a85-v1.js impl_inflate.js impl_a85.js impl_utf8.js sfxframe-a85.def.js
	cat sfxframe-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@

out/.frame-a85-v2gen1.js: frame-a85-v2.js impl_inflate.js impl_a85.js impl_utf8.js
	PPC_CPP=1 $(MWGPP) $< > $@
out/.frame-a85-v2gen2.js: out/.frame-a85-v2gen1.js
	gzjs -Wno-gz -Wrtok -o$@ $<
tests+=out/sfxtest-a85-v2.js
out/sfxtest-a85-v2.js: frame-a85-v2f.js out/.frame-a85-v2gen2.js sfxtest-a85.def.js out/data-gz85.dat
	cat sfxtest-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@
frames+=out/sfxframe-a85-v2.js
out/sfxframe-a85-v2.js: frame-a85-v2f.js out/.frame-a85-v2gen2.js sfxframe-a85.def.js
	cat sfxframe-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@

out/.frame-a85-v3gen1.js: out/.frame-a85-v2gen1.js
	uglifyjs -c -m -o $@ $<
	sed -i -e 's/^!function/(function/' -e 's/();\{0,1\}$$/)()/' -e 's/\bassign\b/A/g' -e 's/\bstatus\b/B/g' -e 's/\broot\b/C/g' -e 's/\blist\b/D/g' $@
out/.frame-a85-v3gen2.js: out/.frame-a85-v3gen1.js
	gzjs -Wno-gz -Wrtok -Wno-fold-string -o$@ $<
tests+=out/sfxtest-a85-v3.js
out/.frame-a85-v3f.js: frame-a85-v2f.js
	sed 's/v2/v3/g' $< > $@
out/sfxtest-a85-v3.js: out/.frame-a85-v3f.js out/.frame-a85-v3gen2.js sfxtest-a85.def.js out/data-gz85.dat
	cat sfxtest-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@
frames+=out/sfxframe-a85-v3.js
out/sfxframe-a85-v3.js: out/.frame-a85-v3f.js out/.frame-a85-v3gen2.js sfxframe-a85.def.js
	cat sfxframe-a85.def.js $< | PPC_CPP=1 $(MWGPP) > $@

tests: $(tests)
all: $(frames)
