# -*- Makefile -*-

.PHONY: all
all: ../mwg.mshtml.h ../mwg.mshtml.cpp

MWGPP:=mwg_pp.awk

../mwg.mshtml.h: mwg.mshtml.hpp mwg.mshtml.def
	PPC_PRAGMA=1 $(MWGPP) $< > $@
../mwg.mshtml.cpp: mwg.mshtml.pp.cpp mwg.mshtml.def
	PPC_PRAGMA=1 $(MWGPP) $< > $@
