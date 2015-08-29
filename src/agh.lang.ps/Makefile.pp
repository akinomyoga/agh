# -*- Makefile -*-

DOCDIR:=../../doc/agh.lang.ps
OUTDIR:=../../out

.PHONY: all jsfiles doc
all: jsfiles

Makefile: Makefile.pp
	mwg_pp.awk $< > $@

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

jsfiles:=$(jsfiles) $(OUTDIR)/agh.lang.ps.js $(OUTDIR)/agh.lang.ps.js.gz $(OUTDIR)/agh.lang.ps.jgz
$(OUTDIR)/agh.lang.ps.js: $(agh_lang_ps_source)
	mwg_pp.awk $< > $@
$(OUTDIR)/agh.lang.ps.js.gz: $(OUTDIR)/agh.lang.ps.js
	gzjs $<
$(OUTDIR)/agh.lang.ps.jgz: $(OUTDIR)/agh.lang.ps.js.gz
	cp $< $@

jsfiles: $(jsfiles)

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
