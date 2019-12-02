# Makefile -*- mode:makefile-gmake -*-

all:
.PHONY: all

include ../config.mk

BASE=../..
OUTDIR=$(BASE)/out/latex
DOCDIR=$(BASE)/doc/latex

MONO:=$(shell bash -c 'type -p mono')
GZJS:=$(MONO) $(BASE)/tools/ext/gzjs.exe
CTXC:=$(MONO) $(BASE)/tools/out/ctxc.exe
MWGPP:=$(BASE)/tools/ext/mwg_pp.awk

TTF2EOT   := $(BASE)/tools/out/ttf2eot
SFNT2WOFF := $(BASE)/tools/out/sfnt2woff

ifeq ($(USER)@$(HOSTNAME),koichi@gauge)
TTF2EOT:=lib/ttf2eot
SFNT2WOFF:=lib/sfnt2woff
endif

all: $(OUTDIR) $(OUTDIR)/.htaccess
$(OUTDIR):
	mkdir -p $@
$(OUTDIR)/.htaccess: htaccess
	cp -p $< $@

all: css jsfiles resources
ifneq ($(generate_compressed_jsfiles),)
all: jgzfiles
endif

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
jsfiles += $(OUTDIR)/%name%.js
$(OUTDIR)/%name%.js.gz: $(OUTDIR)/%name%.js
	$(GZJS) $<
$(OUTDIR)/%name%.jgz: $(OUTDIR)/%name%.js.gz
	cp $< $@
#%define end
#-------------------------------------------------------------------------------

.gen:
	mkdir -p $@

#%m aghtex::Module (
modules+=.gen/%name%.js
.gen/%name%.ctx: %name%.ctx | .gen
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
	$(MWGPP) $< > $@
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
jsfiles: $(jsfiles)
jgzfiles: $(jsfiles:.js=.js.gz) $(jsfiles:.js=.jgz)
.PHONY: jsfiles jgzfiles

#-------------------------------------------------------------------------------
# resources
#-------------------------------------------------------------------------------
AgehaFontsDir := aghfonts

#%define RegisterTTFFile
resources:=$(resources)      \
	$(OUTDIR)/%fontname%.ttf   \
	$(OUTDIR)/%fontname%.eot   \
	$(OUTDIR)/%fontname%.woff
$(OUTDIR)/%fontname%.ttf: res/%fontname%.ttf
	cp -p $< $@
$(OUTDIR)/%fontname%.eot: res/%fontname%.ttf
	$(TTF2EOT) $< > $@
$(OUTDIR)/%fontname%.woff: res/%fontname%.ttf
	$(SFNT2WOFF) $<
	mv res/%fontname%.woff $(OUTDIR)
#%end

.PHONY: submodule
submodule: $(AgehaFontsDir)/LICENSE
$(AgehaFontsDir)/LICENSE:
	git submodule init
	git submodule update

#%define RegisterAgehaFont
resources:=$(resources)      \
	$(OUTDIR)/%fontname%.ttf   \
	$(OUTDIR)/%fontname%.eot   \
	$(OUTDIR)/%fontname%.woff
$(OUTDIR)/%fontname%.ttf: $(AgehaFontsDir)/%fontname%.ttf
	cp -p $< $@
$(OUTDIR)/%fontname%.eot: $(AgehaFontsDir)/%fontname%.ttf
	$(TTF2EOT) $< > $@
$(OUTDIR)/%fontname%.woff: $(AgehaFontsDir)/%fontname%.ttf
	$(SFNT2WOFF) $<
	mv $(AgehaFontsDir)/%fontname%.woff $(OUTDIR)
$(AgehaFontsDir)/%fontname%.ttf: | submodule
#%end
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathit|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathbm|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathrm|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathcal|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathbb|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathfrak|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathbf|
#%expand RegisterAgehaFont.r|%fontname%|aghtex_mathscr|


#%define add_res (
resources:=$(resources) $(OUTDIR)/%name%
$(OUTDIR)/%name%: res/%name%
	cp -p $< $@
#%)
#%expand add_res.r#%name%#stretch_sqrt.png#
#%expand add_res.r#%name%#stretch_lparen.png#
#%expand add_res.r#%name%#stretch_rparen.png#
#%expand add_res.r#%name%#stretch_lbrace.png#
#%expand add_res.r#%name%#stretch_rbrace.png#
#%expand add_res.r#%name%#stretch_overbrace.png#
#%expand add_res.r#%name%#stretch_underbrace.png#
#%expand add_res.r#%name%#stretch_langle.png#
#%expand add_res.r#%name%#stretch_rangle.png#
#%expand add_res.r#%name%#paren5l.png#
#%expand add_res.r#%name%#paren5r.png#
#%expand add_res.r#%name%#stretch_widehat.png#
#%expand add_res.r#%name%#stretch_widetilde.png#
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
