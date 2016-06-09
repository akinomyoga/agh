# Makefile

include csc_default.mk

all: csscompat.exe
csscompat.exe: csscompat.cs
	$(CSC) $(CSFLAGS) $<

all: ctxc.exe
ctxc.exe: ctxc.frame.js ctxc.cs
	$(CSC) $(CSFLAGS) -res:ctxc.frame.js ctxc.cs

all: gzjs.exe
gzjs.exe:
	make -C gzjs

all: reptxt.exe
reptxt.exe: reptxt.cs
	$(CSC) $(CSFLAGS) $<

#------------------------------------------------------------------------------
# on koichi@gauge

ifeq ($(USER)@$(HOSTNAME)/$(OSTYPE),koichi@gauge/win)

KCHBIN:=$(shell cygpath -u c:/usr/koichi/bin)
all: $(KCHBIN)/reptxt.exe
$(KCHBIN)/reptxt.exe: reptxt.exe
	cp $< $@

endif

#------------------------------------------------------------------------------
