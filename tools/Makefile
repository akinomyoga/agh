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
	make -C gzjs

all: $(OUTDIR)/reptxt.exe
$(OUTDIR)/reptxt.exe: reptxt.cs | $(OUTDIR)
	$(CSC) $(CSFLAGS) '-out:$@' $<

#------------------------------------------------------------------------------
# on koichi@gauge

ifeq ($(USER)@$(HOSTNAME)/$(OSTYPE),koichi@gauge/win)

KCHBIN:=$(shell cygpath -u c:/usr/koichi/bin)
all: $(KCHBIN)/reptxt.exe
$(KCHBIN)/reptxt.exe: $(OUTDIR)/reptxt.exe
	cp $< $@

endif

#------------------------------------------------------------------------------
