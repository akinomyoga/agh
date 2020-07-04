# -*- mode: makefile-gmake -*-

all:
.PHONY: all

include csc_default.mk

OUTDIR:=out

all: $(OUTDIR)/csscompat.exe
$(OUTDIR)/csscompat.exe: csscompat.cs | $(OUTDIR)
	$(CSC) $(CSFLAGS) '-out:$@' $<

$(OUTDIR):
	mkdir -p $@

all: $(OUTDIR)/ctxc.exe
$(OUTDIR)/ctxc.exe: ctxc.cs ctxc.frame.js | $(OUTDIR)
	$(CSC) $(CSFLAGS) '-out:$@' $< '-res:ctxc.frame.js'

all: $(OUTDIR)/gzjs.exe
$(OUTDIR)/gzjs.exe:
	+make -C gzjs

all: $(OUTDIR)/reptxt.exe
$(OUTDIR)/reptxt.exe: reptxt.cs | $(OUTDIR)
	$(CSC) $(CSFLAGS) '-out:$@' $<

.PHONY: submodule
submodule: ext/unidata/Makefile
ext/unidata/Makefile:
	git submodule init
	git submodule update

.PHONY: make-unidata
all: make-unidata
make-unidata: | submodule
	+make -C ext/unidata

all: $(OUTDIR)/ttf2eot
$(OUTDIR)/ttf2eot: ext/ttf2eot/ttf2eot
	cp $< $@
ext/ttf2eot/ttf2eot: | submodule ext/ttf2eot/.gitignore
	+make -C ext/ttf2eot
ext/ttf2eot/.gitignore: | submodule
	printf '%s\n' /.gitignore *.o /ttf2eot /ttf2eot > $@

all: $(OUTDIR)/sfnt2woff
$(OUTDIR)/sfnt2woff: ext/woff/sfnt2woff
	cp $< $@
ext/woff/sfnt2woff: | ext/woff
	+make -C ext/woff
ext/woff:
	mkdir -p $@ && cd $@ && unzip ../woff-code-latest.zip

#------------------------------------------------------------------------------
