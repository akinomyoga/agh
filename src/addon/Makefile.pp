# -*- Makefile -*-

OUTDIR:=../../out

.PHONY: all
all: $(OUTDIR)/addon $(OUTDIR)/addon/index.html \
	aghtex4chrome \
	aghtex4thunderbird \
	aghtex4firefox \
	aghtex4ie \
	aghtex4seahorse

Makefile: Makefile.pp
	mwg_pp.awk $< > $@

.PHONY: upload
upload: aghtex4gmail.htm
	scp -p $< tkynt2:~/public_html/agh/addon/index.html

$(OUTDIR)/addon:
	mkdir -p $@
$(OUTDIR)/addon/index.html: aghtex4gmail.htm
	cp -p $< $@

#==============================================================================
#  aghtex4chrome
#------------------------------------------------------------------------------
MWGTEX4CR_ID:=agh.addon.aghtex4chrome
MWGTEX4CR_OUTDIR:=$(OUTDIR)/addon/$(MWGTEX4CR_ID)
#%define aghtex4chrome::mkdir (
aghtex4chrome_files:=$(aghtex4chrome_files) $(MWGTEX4CR_OUTDIR)/%FILE%
$(MWGTEX4CR_OUTDIR)/%FILE%:
	mkdir -p $@
#%)
#%define aghtex4chrome::copy (
aghtex4chrome_files:=$(aghtex4chrome_files) $(MWGTEX4CR_OUTDIR)/%FILE%
$(MWGTEX4CR_OUTDIR)/%FILE%: aghtex4chrome/%FILE%
	cp -p $< $@
#%)
#%define aghtex4chrome::copy_agh (
aghtex4chrome_files:=$(aghtex4chrome_files) $(MWGTEX4CR_OUTDIR)/agh/%FILE%
$(MWGTEX4CR_OUTDIR)/agh/%FILE%: $(OUTDIR)/%FILE%
	cp -p $< $@
#%)
#------------------------------------------------------------------------------
aghtex4chrome_files:=$(MWGTEX4CR_OUTDIR)
$(MWGTEX4CR_OUTDIR):
	mkdir -p $@
#%expand aghtex4chrome::mkdir.r|%FILE%|agh|
#%expand aghtex4chrome::mkdir.r|%FILE%|agh/latex|
#%expand aghtex4chrome::copy.r|%FILE%|aghtex.js|
#%expand aghtex4chrome::copy.r|%FILE%|aghtex.css|
#%expand aghtex4chrome::copy.r|%FILE%|aghtex4gmail.js|
#%expand aghtex4chrome::copy.r|%FILE%|aghtex4chrome.js|
#%expand aghtex4chrome::copy.r|%FILE%|agh.hook_path.js|
#%expand aghtex4chrome::copy.r|%FILE%|agh.icon.agh_16x16.png|
#%expand aghtex4chrome::copy.r|%FILE%|agh.icon.agh_48x48.png|
#%expand aghtex4chrome::copy.r|%FILE%|agh.icon.agh_128x128.png|
#%expand aghtex4chrome::copy.r|%FILE%|background.htm|
#%expand aghtex4chrome::copy.r|%FILE%|background.js|
#%expand aghtex4chrome::copy.r|%FILE%|viewtex.css|
#%expand aghtex4chrome::copy_agh.r|%FILE%|agh.js|
#%expand aghtex4chrome::copy_agh.r|%FILE%|agh.text.js|
#%expand aghtex4chrome::copy_agh.r|%FILE%|agh.text.encode.js|
#%expand aghtex4chrome::copy_agh.r|%FILE%|agh.lang.tex.js|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/latex.sf.css|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/int.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/oint.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/root.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/paren1l.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/paren1r.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/paren2l.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/paren2ov.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/paren2r.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/paren2ud.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/paren4l.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/paren4r.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/paren5l.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/paren5r.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_bslash.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_darr.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_darr2.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_hat.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_larr.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_lrarr.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_rarr.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_slash.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_tilde.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_uarr.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_uarr2.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_udarr.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_udarr2.png|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_sqrt.svg|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_langle.svg|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_lbrace.svg|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_lparen.svg|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_rangle.svg|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_rbrace.svg|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/stretch_rparen.svg|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/aghtex_mathit.ttf|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/aghtex_mathbm.ttf|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/aghtex_mathrm.ttf|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/aghtex_mathbb.ttf|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/aghtex_mathcal.ttf|
#%expand aghtex4chrome::copy_agh.r|%FILE%|latex/aghtex_mathfrak.ttf|

aghtex4chrome_files:=$(aghtex4chrome_files) $(MWGTEX4CR_OUTDIR).xml
$(MWGTEX4CR_OUTDIR).xml: aghtex4chrome/update.xml aghtex4chrome/version.txt
	sed "s/%VERSION%/$$(cat aghtex4chrome/version.txt)/" $< > $@
aghtex4chrome_files:=$(aghtex4chrome_files) $(MWGTEX4CR_OUTDIR)/manifest.json
$(MWGTEX4CR_OUTDIR)/manifest.json: aghtex4chrome/manifest.json aghtex4chrome/version.txt
	sed "s/%VERSION%/$$(cat aghtex4chrome/version.txt)/" $< > $@

.PHONY: aghtex4chrome
aghtex4chrome: $(aghtex4chrome_files)

#==============================================================================
#  aghtex4thunderbird
#------------------------------------------------------------------------------
MWGTEX4TB_ID:=agh.addon.aghtex4thunderbird@kch.murase
MWGTEX4TB_OUTDIR:=$(OUTDIR)/addon/$(MWGTEX4TB_ID)
MWGTEX4TB_EXTDIR:=$(HOME)/User/AppData/Thunderbird/Profiles/15p01skq.temporary/extensions

aghtex4thunderbird_files:=$(MWGTEX4TB_OUTDIR)
$(MWGTEX4TB_OUTDIR):
	mkdir -p $@
aghtex4thunderbird_files:=$(aghtex4thunderbird_files) $(MWGTEX4TB_EXTDIR)/$(MWGTEX4TB_ID)
$(MWGTEX4TB_EXTDIR)/$(MWGTEX4TB_ID):
	cygpath -w "$(MWGTEX4TB_OUTDIR)" > $@

#..............................................................................
# install.rdf, update.xml
aghtex4thunderbird_files:=$(aghtex4thunderbird_files) $(subst @kch.murase,,$(MWGTEX4TB_OUTDIR)).xml
$(subst @kch.murase,,$(MWGTEX4TB_OUTDIR)).xml: aghtex4thunderbird/update.xml aghtex4thunderbird/version.txt
	sed "s/%VERSION%/$$(cat aghtex4thunderbird/version.txt)/" $< > $@
aghtex4thunderbird_files:=$(aghtex4thunderbird_files) $(MWGTEX4TB_OUTDIR)/install.rdf
$(MWGTEX4TB_OUTDIR)/install.rdf: aghtex4thunderbird/install.rdf aghtex4thunderbird/version.txt
	sed "s/%VERSION%/$$(cat aghtex4thunderbird/version.txt)/" $< > $@

#..............................................................................
#%define aghtex4thunderbird::mkdir (
aghtex4thunderbird_files:=$(aghtex4thunderbird_files) $(MWGTEX4TB_OUTDIR)/%FILE%
$(MWGTEX4TB_OUTDIR)/%FILE%:
	mkdir -p $@
#%)
#%define aghtex4thunderbird::copy (
aghtex4thunderbird_files:=$(aghtex4thunderbird_files) $(MWGTEX4TB_OUTDIR)/%FILE%
$(MWGTEX4TB_OUTDIR)/%FILE%: aghtex4thunderbird/%FILE%
	cp -p $< $@
#%)
#%define aghtex4thunderbird::copy_agh (
aghtex4thunderbird_files:=$(aghtex4thunderbird_files) $(MWGTEX4TB_OUTDIR)/chrome/content/agh/%FILE%
$(MWGTEX4TB_OUTDIR)/chrome/content/agh/%FILE%: $(OUTDIR)/%FILE%
	cp -p $< $@
#%)

#%expand aghtex4thunderbird::mkdir.r|%FILE%|chrome|
#%expand aghtex4thunderbird::mkdir.r|%FILE%|chrome/content|
#%expand aghtex4thunderbird::copy.r|%FILE%|chrome.manifest|
#%expand aghtex4thunderbird::copy.r|%FILE%|chrome/content/messageWindowOverlay.xul|
#%expand aghtex4thunderbird::copy.r|%FILE%|chrome/content/messageWindowOverlay.js|
#%expand aghtex4thunderbird::copy.r|%FILE%|chrome/content/messageComposeOverlay.xul|
#%expand aghtex4thunderbird::copy.r|%FILE%|chrome/content/messageComposeOverlay.js|
#%expand aghtex4thunderbird::copy.r|%FILE%|chrome/content/agh_bgpage.htm|
#%expand aghtex4thunderbird::copy.r|%FILE%|chrome/content/aghtex.js|
#%expand aghtex4thunderbird::copy.r|%FILE%|chrome/content/aghtex.css|
#%expand aghtex4thunderbird::copy.r|%FILE%|chrome/content/aghtex4thunderbird.css|
#%expand aghtex4thunderbird::copy.r|%FILE%|chrome/content/agh.icon.agh_48x48.png|

#%expand aghtex4thunderbird::mkdir.r|%FILE%|chrome/content/agh|
#%expand aghtex4thunderbird::mkdir.r|%FILE%|chrome/content/agh/latex|
#..............................................................................
# latex.fx.css
aghtex4thunderbird_files:=$(aghtex4thunderbird_files) $(MWGTEX4TB_OUTDIR)/chrome/content/agh/latex/latex.fx.css
$(MWGTEX4TB_OUTDIR)/chrome/content/agh/latex/latex.fx.css: $(OUTDIR)/latex/latex.fx.css make_latex_embedfont_css.sh
	./make_latex_embedfont_css.sh $< $(OUTDIR)/latex/ > $@
#..............................................................................
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|agh.js|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|agh.text.js|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|agh.lang.tex.js|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/int.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/oint.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/root.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/paren1l.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/paren1r.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/paren2l.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/paren2ov.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/paren2r.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/paren2ud.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/paren4l.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/paren4r.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/paren5l.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/paren5r.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_bslash.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_darr.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_darr2.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_hat.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_larr.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_lrarr.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_rarr.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_slash.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_tilde.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_uarr.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_uarr2.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_udarr.png|
#%expand aghtex4thunderbird::copy_agh.r|%FILE%|latex/stretch_udarr2.png|

.PHONY: aghtex4thunderbird
aghtex4thunderbird: $(aghtex4thunderbird_files)

#==============================================================================
#  aghtex4gmail/firefox
#------------------------------------------------------------------------------
MWGTEX4FX_ID:=agh.addon.aghtex4firefox@kch.murase
MWGTEX4FX_OUTDIR:=$(OUTDIR)/addon/$(MWGTEX4FX_ID)
MWGTEX4FX_EXTDIR:=$(HOME)/User/AppData/Mozilla/Firefox/Profiles/v2mkqyju.default/extensions

aghtex4firefox_files:=$(MWGTEX4FX_OUTDIR)
$(MWGTEX4FX_OUTDIR):
	mkdir -p $@
aghtex4firefox_files+=$(MWGTEX4FX_EXTDIR)/$(MWGTEX4FX_ID)
$(MWGTEX4FX_EXTDIR)/$(MWGTEX4FX_ID):
	cygpath -w "$(MWGTEX4FX_OUTDIR)" > $@

#..............................................................................
# install.rdf, update.xml
aghtex4firefox_files+=$(subst @kch.murase,,$(MWGTEX4FX_OUTDIR)).xml
$(subst @kch.murase,,$(MWGTEX4FX_OUTDIR)).xml: aghtex4firefox/update.xml aghtex4firefox/version.txt
	sed "s/%VERSION%/$$(cat aghtex4firefox/version.txt)/" $< > $@
aghtex4firefox_files+=$(MWGTEX4FX_OUTDIR)/install.rdf
$(MWGTEX4FX_OUTDIR)/install.rdf: aghtex4firefox/install.rdf aghtex4firefox/version.txt
	sed "s/%VERSION%/$$(cat aghtex4firefox/version.txt)/" $< > $@

#..............................................................................
#%m aghtex4firefox::mkdir (
aghtex4firefox_files+=$(MWGTEX4FX_OUTDIR)/%name%
$(MWGTEX4FX_OUTDIR)/%name%:
	mkdir -p $@
#%)
#%m aghtex4firefox::copy (
aghtex4firefox_files+=$(MWGTEX4FX_OUTDIR)/%name%
$(MWGTEX4FX_OUTDIR)/%name%: aghtex4firefox/%name%
	cp -p $< $@
#%)
#%m aghtex4firefox::copy_agh (
aghtex4firefox_files+=$(MWGTEX4FX_OUTDIR)/chrome/content/agh/%name%
$(MWGTEX4FX_OUTDIR)/chrome/content/agh/%name%: $(OUTDIR)/%name%
	cp -p $< $@
#%)

#%m 1 (

# addon files
\d chrome;
\d chrome/content;
\f chrome.manifest;
\f chrome/content/browserOverlay.xul;
\f chrome/content/browserOverlay.js;
# \f chrome/content/agh_bgpage.htm;
\f chrome/content/aghtex.js;
\f chrome/content/aghtex.css;
\f chrome/content/aghtex4gmail.js;
\f chrome/content/aghtex4firefox.js;
\f chrome/content/agh.icon.agh_48x48.png;

# ageha library
\d chrome/content/agh;
\d chrome/content/agh/latex;
# agh/latex/latex.fx.css
aghtex4firefox_files+=$(MWGTEX4FX_OUTDIR)/chrome/content/agh/latex/latex.fx.css
$(MWGTEX4FX_OUTDIR)/chrome/content/agh/latex/latex.fx.css: $(OUTDIR)/latex/latex.fx.css make_latex_embedfont_css.sh
	./make_latex_embedfont_css.sh $< $(OUTDIR)/latex/ > $@
\agh agh.js;
\agh agh.text.js;
\agh agh.lang.tex.js;
\agh latex/int.png;
\agh latex/oint.png;
\agh latex/root.png;
\agh latex/paren1l.png;
\agh latex/paren1r.png;
\agh latex/paren2l.png;
\agh latex/paren2ov.png;
\agh latex/paren2r.png;
\agh latex/paren2ud.png;
\agh latex/paren4l.png;
\agh latex/paren4r.png;
\agh latex/paren5l.png;
\agh latex/paren5r.png;
\agh latex/stretch_bslash.png;
\agh latex/stretch_darr.png;
\agh latex/stretch_darr2.png;
\agh latex/stretch_hat.png;
\agh latex/stretch_larr.png;
\agh latex/stretch_lrarr.png;
\agh latex/stretch_rarr.png;
\agh latex/stretch_slash.png;
\agh latex/stretch_tilde.png;
\agh latex/stretch_uarr.png;
\agh latex/stretch_uarr2.png;
\agh latex/stretch_udarr.png;
\agh latex/stretch_udarr2.png;

#%)
#%m 1 1.r/\\agh\s+/#%x aghtex4firefox::copy_agh.r|%name%|/
#%m 1 1.r/\\f\s+/#%x aghtex4firefox::copy.r|%name%|/
#%m 1 1.r/\\d\s+/#%x aghtex4firefox::mkdir.r|%name%|/
#%x 1.r/;/|/

.PHONY: aghtex4firefox
aghtex4firefox: $(aghtex4firefox_files)

#==============================================================================
#  aghtex4seahorse
#------------------------------------------------------------------------------
MWGTEX4SH_ID:=agh.addon.aghtex4seahorse

MWGTEX4SH_EXTDIR:=$(OUTDIR)/addon/insdir_seahorse
MWGTEX4SH_OUTDIR:=$(MWGTEX4SH_EXTDIR)/$(MWGTEX4SH_ID)
MWGTEX4SH_OUTMWG:=$(MWGTEX4SH_OUTDIR)/agh

aghtex4seahorse_files:=$(MWGTEX4SH_EXTDIR)
$(MWGTEX4SH_EXTDIR):
	mkdir -p $@
aghtex4seahorse_files+=$(MWGTEX4SH_OUTDIR)
$(MWGTEX4SH_OUTDIR):
	mkdir -p $@

#%define aghtex4seahorse::mkdir (
aghtex4seahorse_files+=$(MWGTEX4SH_OUTDIR)/%FILE%
$(MWGTEX4SH_OUTDIR)/%FILE%:
	mkdir -p $@
#%)
#%define aghtex4seahorse::copy (
aghtex4seahorse_files+=$(MWGTEX4SH_OUTDIR)/%FILE%
$(MWGTEX4SH_OUTDIR)/%FILE%: aghtex4seahorse/%FILE%
	cp -p $< $@
#%)
#%define aghtex4seahorse::copy_agh (
aghtex4seahorse_files+=$(MWGTEX4SH_OUTMWG)/%FILE%
$(MWGTEX4SH_OUTMWG)/%FILE%: $(OUTDIR)/%FILE%
	cp -p $< $@
#%)

aghtex4seahorse_files+=$(MWGTEX4SH_EXTDIR)/agh.addon.aghtex4seahorse.user.js
$(MWGTEX4SH_EXTDIR)/agh.addon.aghtex4seahorse.user.js: aghtex4seahorse/aghtex4seahorse.user.js aghtex4seahorse/version.txt
	sed "s/%VERSION%/$$(cat aghtex4seahorse/version.txt)/" $< > $@

#%x aghtex4seahorse::mkdir.r|%FILE%|agh|
#%x aghtex4seahorse::mkdir.r|%FILE%|agh/latex|
#%x aghtex4seahorse::copy.r|%FILE%|aghtex.js|
#%x aghtex4seahorse::copy.r|%FILE%|aghtex4gmail.js|
#%x aghtex4seahorse::copy.r|%FILE%|aghtex4seahorse.js|
#%x aghtex4seahorse::copy.r|%FILE%|aghtex.css|
#%x aghtex4seahorse::copy_agh.r|%FILE%|agh.js|
#%x aghtex4seahorse::copy_agh.r|%FILE%|agh.text.js|
#%x aghtex4seahorse::copy_agh.r|%FILE%|agh.lang.tex.js|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/latex.ie.css|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/int.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/oint.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/root.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/paren1l.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/paren1r.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/paren2l.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/paren2ov.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/paren2r.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/paren2ud.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/paren4l.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/paren4r.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/paren5l.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/paren5r.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_bslash.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_darr.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_darr2.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_hat.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_larr.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_lrarr.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_rarr.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_slash.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_tilde.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_uarr.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_uarr2.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_udarr.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/stretch_udarr2.png|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/aghtex_mathit.eot|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/aghtex_mathbm.eot|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/aghtex_mathrm.eot|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/aghtex_mathcal.eot|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/aghtex_mathbb.eot|
#%x aghtex4seahorse::copy_agh.r|%FILE%|latex/aghtex_mathfrak.eot|

.PHONY: aghtex4seahorse
aghtex4seahorse: $(aghtex4seahorse_files)

#==============================================================================
#  aghtex4ie
#------------------------------------------------------------------------------
MWGTEX4IE_ID:=agh.addon.aghtex4ie

MWGTEX4IE_OUTDIR:=$(OUTDIR)/addon/$(MWGTEX4IE_ID)
MWGTEX4IE_OUTMWG:=$(MWGTEX4IE_OUTDIR)/agh

aghtex4ie_files+=$(MWGTEX4IE_OUTDIR)
$(MWGTEX4IE_OUTDIR):
	mkdir -p $@

#%define aghtex4ie::mkdir (
aghtex4ie_files+=$(MWGTEX4IE_OUTDIR)/%FILE%
$(MWGTEX4IE_OUTDIR)/%FILE%:
	mkdir -p $@
#%)
#%define aghtex4ie::copy (
aghtex4ie_files+=$(MWGTEX4IE_OUTDIR)/%FILE%
$(MWGTEX4IE_OUTDIR)/%FILE%: aghtex4ie/%FILE%
	cp -p $< $@
#%)
#%define aghtex4ie::copy_agh (
aghtex4ie_files+=$(MWGTEX4IE_OUTMWG)/%FILE%
$(MWGTEX4IE_OUTMWG)/%FILE%: $(OUTDIR)/%FILE%
	cp -p $< $@
#%)
#%define aghtex4ie::copy_aghfont (
aghtex4ie_files+=$(MWGTEX4IE_OUTMWG)/%name%.ttf
$(MWGTEX4IE_OUTMWG)/%name%.ttf: $(OUTDIR)/%name%.ttf
	cp -p $< $@
	chmod 700 $@
aghtex4ie_files+=$(MWGTEX4IE_OUTMWG)/%name%.eot
$(MWGTEX4IE_OUTMWG)/%name%.eot: $(OUTDIR)/%name%.eot
	cp -p $< $@
#%)
#%define aghtex4ie::copy_dllsrc (
aghtex4ie_files+=$(MWGTEX4IE_OUTDIR)/mwgtex4ie/%name%
$(MWGTEX4IE_OUTDIR)/mwgtex4ie/%name%: aghtex4ie/mwgtex4ie/%name%
	cp -p $< $@
#%)

aghtex4ie_files+=$(MWGTEX4IE_OUTDIR)/aghtex4ie.dll
$(MWGTEX4IE_OUTDIR)/aghtex4ie.dll: aghtex4ie/mwgtex4ie/Release/aghtex4ie.dll
	cp -p $< $@
	cd $(MWGTEX4IE_OUTDIR) && regsvr32 /s aghtex4ie.dll

#%m 1 (
f version.txt;
f aghtex.js;
f aghtex.css;
f aghtex4gmail.js;
f aghtex4ie.js;

# ageha library files
d agh;
d agh/latex;
agh agh.js;
agh agh.text.js;
agh agh.lang.tex.js;
agh latex/latex.ie.css;
agh latex/int.png;
agh latex/oint.png;
agh latex/root.png;
agh latex/paren1l.png;
agh latex/paren1r.png;
agh latex/paren2l.png;
agh latex/paren2ov.png;
agh latex/paren2r.png;
agh latex/paren2ud.png;
agh latex/paren4l.png;
agh latex/paren4r.png;
agh latex/paren5l.png;
agh latex/paren5r.png;
agh latex/stretch_bslash.png;
agh latex/stretch_darr.png;
agh latex/stretch_darr2.png;
agh latex/stretch_hat.png;
agh latex/stretch_larr.png;
agh latex/stretch_lrarr.png;
agh latex/stretch_rarr.png;
agh latex/stretch_slash.png;
agh latex/stretch_tilde.png;
agh latex/stretch_uarr.png;
agh latex/stretch_uarr2.png;
agh latex/stretch_udarr.png;
agh latex/stretch_udarr2.png;
fon latex/aghtex_mathit;
fon latex/aghtex_mathbm;
fon latex/aghtex_mathrm;
fon latex/aghtex_mathcal;
fon latex/aghtex_mathbb;
fon latex/aghtex_mathfrak;

# dll file and install
f install.bat;
f noinstall.lst;
f uninstall.bat;
d mwgtex4ie;
dll dllmain.cpp;
dll dllmain.h;
dll HttpsProtocolHook.cpp;
dll HttpsProtocolHook.h;
dll mwg.mshtml.cpp;
dll mwg.mshtml.h;
dll mwgtex4ie.aps;
dll mwgtex4ie.cpp;
dll mwgtex4ie.def;
dll mwgtex4ie.idl;
dll mwgtex4ie.rc;
dll mwgtex4ie.rgs;
dll mwgtex4ie.vcproj;
dll Mwgtex4IeBho.cpp;
dll Mwgtex4IeBho.h;
dll Mwgtex4IeBho.rgs;
dll resource.h;
dll stdafx.cpp;
dll stdafx.h;
dll targetver.h;
dll ReadMe.txt;

#%)
#%m 1 1.r/agh\s+/#%x aghtex4ie::copy_agh.r|%FILE%|/     .r/;/|/
#%m 1 1.r/fon\s+/#%x aghtex4ie::copy_aghfont.r|%name%|/ .r/;/|/
#%m 1 1.r/dll\s+/#%x aghtex4ie::copy_dllsrc.r|%name%|/  .r/;/|/
#%m 1 1.r/f\s+/#%x aghtex4ie::copy.r|%FILE%|/ .r/;/|/
#%m 1 1.r/d\s+/#%x aghtex4ie::mkdir.r|%FILE%|/.r/;/|/
#%x 1

.PHONY: aghtex4ie
aghtex4ie: $(aghtex4ie_files)
