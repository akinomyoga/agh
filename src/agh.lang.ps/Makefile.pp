# -*- mode: makefile-gmake -*-

all:
.PHONY: all

include ../config.mk

Makefile: Makefile.pp
	$(MWGPP) $< > $@

BASE=../..
DOCDIR:=$(BASE)/doc/agh.lang.ps
OUTDIR:=$(BASE)/out

MONO:=$(shell bash -c 'type -p mono')
GZJS:=$(MONO) $(BASE)/tools/ext/gzjs.exe
MWGPP:=$(BASE)/tools/ext/mwg_pp.awk

all: jsfiles
ifneq ($(generate_compressed_jsfiles),)
all: jgzfiles
endif

#------------------------------------------------------------------------------
#  jsfiles
#------------------------------------------------------------------------------
agh_lang_ps_source:= \
  agh.lang.ps.js     \
  agh.lang.ps-opt.js \
  agh.lang.ps-vml.js \
  agh.lang.ps-svg.js \
  agh.lang.ps-canvas.js \
  agh.lang.ps-geo.js \
  agh.lang.ps-io.js \
  agh.lang.ps-cmd.js

jsfiles += $(OUTDIR)/agh.lang.ps.js
$(OUTDIR)/agh.lang.ps.js: $(agh_lang_ps_source) | $(OUTDIR)
	$(MWGPP) $< > $@
$(OUTDIR)/agh.lang.ps.js.gz: $(OUTDIR)/agh.lang.ps.js | $(OUTDIR)
	$(GZJS) -o $@ $<
$(OUTDIR)/agh.lang.ps.jgz: $(OUTDIR)/agh.lang.ps.js.gz | $(OUTDIR)
	cp $< $@

jsfiles: $(jsfiles)
jgzfiles: $(jsfiles:.js=.js.gz) $(jsfiles:.js=.jgz)
.PHONY: jsfiles jgzfiles

#------------------------------------------------------------------------------
#  documents
#------------------------------------------------------------------------------
document_files+=$(DOCDIR)
$(DOCDIR):
	mkdir -p $@
#%define RegisterDocumentHtml (
$(DOCDIR)/%SRC%: %SRC% .httree
	httree_template=../.httree_template.htm httree $< > $@
document_files+=$(DOCDIR)/%SRC%
#%)
#%expand RegisterDocumentHtml.r|%SRC%|hist.htm|
#%expand RegisterDocumentHtml.r|%SRC%|hist1.htm|
#%expand RegisterDocumentHtml.r|%SRC%|hist3.htm|
#%expand RegisterDocumentHtml.r|%SRC%|hist4.htm|

doc: $(document_files)
.PHONY: doc
