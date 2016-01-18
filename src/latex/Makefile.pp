# Makefile -*- mode:makefile-gmake -*-

all:
.PHONY: all

TOOLS=../../tools
CTXC:=$(TOOLS)/ctxc.sh
OUTDIR=../../out/latex
DOCDIR=../../doc/latex

MWGPP:=mwg_pp.awk

all: $(OUTDIR) $(OUTDIR)/.htaccess
$(OUTDIR):
	mkdir -p $@
$(OUTDIR)/.htaccess: htaccess
	cp -p $< $@

all: css jsfiles resources

Makefile: Makefile.pp
	$(MWGPP) $< > $@

css: $(OUTDIR)/latex.ie.css

#-------------------------------------------------------------------------------
# .css files
#-------------------------------------------------------------------------------
$(OUTDIR)/latex.ie.css: latex.pp.css
	PPC_C=1 $(MWGPP) $<
	mv latex.ie.css $(OUTDIR)/
	mv latex.fx.css $(OUTDIR)/
	mv latex.sf.css $(OUTDIR)/
	mv latex.op.css $(OUTDIR)/

#-------------------------------------------------------------------------------
# .js files
#-------------------------------------------------------------------------------
#%define add_js
jsfiles:=$(jsfiles) $(OUTDIR)/%name%.js
$(OUTDIR)/%name%.js.gz: $(OUTDIR)/%name%.js
	$(TOOLS)/gzjs.sh $<
$(OUTDIR)/%name%.jgz: $(OUTDIR)/%name%.js.gz
	cp $< $@
#%define end
#-------------------------------------------------------------------------------

#%m aghtex::Module (
modules+=.gen/%name%.js
.gen/%name%.ctx: %name%.ctx
	cp -p $< $@ 
.gen/%name%.js: .gen/%name%.ctx
	$(CTXC) -p -o$@ $<
#%)
#%x aghtex::Module.r/%name%/base/
#%x aghtex::Module.r/%name%/mod_counter/
#%x aghtex::Module.r/%name%/mod_length/
#%x aghtex::Module.r/%name%/mod_common/
#%x aghtex::Module.r/%name%/mod_math/
#%x aghtex::Module.r/%name%/texsym/
#%x aghtex::Module.r/%name%/mod_para/
#%x aghtex::Module.r/%name%/mod_list/
modules+=.gen/mod_ref.js
.gen/mod_ref.ctx: mod_ref.ctx
	mwg_pp.awk $< > $@
.gen/mod_ref.js: .gen/mod_ref.ctx
	$(CTXC) -p -o$@ $<
#%x aghtex::Module.r/%name%/mod_array/

#%x aghtex::Module.r/%name%/cls_article/
#%x aghtex::Module.r/%name%/pkg_ams/
#%x aghtex::Module.r/%name%/pkg_bm/
#%x aghtex::Module.r/%name%/pkg_url/
#%x aghtex::Module.r/%name%/pkg_color/

modules: $(modules)

$(OUTDIR)/../agh.lang.tex.js: main.pp.js core.js $(modules)
	PPC_CPP=1 $(MWGPP) $< > $@

#%x add_js.r#%name%#../agh.lang.tex#

#-------------------------------------------------------------------------------
jsfiles: $(jsfiles) $(jsfiles:.js=.js.gz) $(jsfiles:.js=.jgz)

#-------------------------------------------------------------------------------
# resources
#-------------------------------------------------------------------------------
AgehaFontsDir:=aghfonts

#%define RegisterTTFFile (
resources:=$(resources)      \
	$(OUTDIR)/%fontname%.ttf   \
	$(OUTDIR)/%fontname%.eot   \
	$(OUTDIR)/%fontname%.woff
$(OUTDIR)/%fontname%.ttf: res/%fontname%.ttf
	cp -p $< $@
$(OUTDIR)/%fontname%.eot: res/%fontname%.ttf
	lib/ttf2eot $< > $@
$(OUTDIR)/%fontname%.woff: res/%fontname%.ttf
	lib/sfnt2woff $<
	mv res/%fontname%.woff $(OUTDIR)
#%)
#%define RegisterAgehaFont (
resources:=$(resources)      \
	$(OUTDIR)/%fontname%.ttf   \
	$(OUTDIR)/%fontname%.eot   \
	$(OUTDIR)/%fontname%.woff
$(OUTDIR)/%fontname%.ttf: $(AgehaFontsDir)/%fontname%.ttf
	cp -p $< $@
$(OUTDIR)/%fontname%.eot: $(AgehaFontsDir)/%fontname%.ttf
	lib/ttf2eot $< > $@
$(OUTDIR)/%fontname%.woff: $(AgehaFontsDir)/%fontname%.ttf
	lib/sfnt2woff $<
	mv $(AgehaFontsDir)/%fontname%.woff $(OUTDIR)
#%)
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathit|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathbm|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathrm|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathcal|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathbb|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathfrak|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathbf|


#%define add_res (
resources:=$(resources) $(OUTDIR)/%name%
$(OUTDIR)/%name%: res/%name%
	cp -p $< $@
#%)
#%expand add_res.r#%name%#int.png#
#%expand add_res.r#%name%#oint.png#
#%expand add_res.r#%name%#root.png#
#%expand add_res.r#%name%#paren1l.png#
#%expand add_res.r#%name%#paren1r.png#
#%expand add_res.r#%name%#paren2l.png#
#%expand add_res.r#%name%#paren2r.png#
#%expand add_res.r#%name%#paren2ov.png#
#%expand add_res.r#%name%#paren2ud.png#
#%expand add_res.r#%name%#paren4l.png#
#%expand add_res.r#%name%#paren4r.png#
#%expand add_res.r#%name%#paren5l.png#
#%expand add_res.r#%name%#paren5r.png#
#%expand add_res.r#%name%#stretch_hat.png#
#%expand add_res.r#%name%#stretch_tilde.png#
#%expand add_res.r#%name%#stretch_larr.png#
#%expand add_res.r#%name%#stretch_rarr.png#
#%expand add_res.r#%name%#stretch_lrarr.png#
#%expand add_res.r#%name%#stretch_uarr.png#
#%expand add_res.r#%name%#stretch_darr.png#
#%expand add_res.r#%name%#stretch_udarr.png#
#%expand add_res.r#%name%#stretch_uarr2.png#
#%expand add_res.r#%name%#stretch_darr2.png#
#%expand add_res.r#%name%#stretch_udarr2.png#
#%expand add_res.r#%name%#stretch_slash.png#
#%expand add_res.r#%name%#stretch_bslash.png#

#%expand add_res.r#%name%#stretch_lparen.svg#
#%expand add_res.r#%name%#stretch_rparen.svg#
#%expand add_res.r#%name%#stretch_lbrace.svg#
#%expand add_res.r#%name%#stretch_rbrace.svg#
#%expand add_res.r#%name%#stretch_langle.svg#
#%expand add_res.r#%name%#stretch_rangle.svg#
#%expand add_res.r#%name%#stretch_sqrt.svg#

resources: $(resources)
