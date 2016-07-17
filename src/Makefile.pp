# Makefile -*- Makefile -*-

all:
.PHONY: all

BASE=..
OUTDIR=$(BASE)/out

MONO:=$(shell bash -c 'type -p mono')
GZJS:=$(MONO) $(BASE)/tools/ext/gzjs.exe
MWGPP:=PPC_CPP=1 $(BASE)/tools/ext/mwg_pp.awk

all: directory jsfiles jgzfiles copy_file

.PHONY: upload
upload:
	make -C ../out upload

Makefile: Makefile.pp
	$(MWGPP) $< > $@

all: $(OUTDIR)/Makefile
$(OUTDIR)/Makefile: Makefile-out.pp
	test -d '$(OUTDIR)' || mkdir -p $(OUTDIR) && $(MWGPP) $< > $@

.PHONY: jsdoc
jsdoc:
	jsdoc -d ../out/jsdoc agh.js
#-------------------------------------------------------------------------------
# .js files
#-------------------------------------------------------------------------------
#%m agh::js
jsfiles+=$(OUTDIR)/%name%.js
$(OUTDIR)/%name%.js: %name%.js
	cp $< $@
$(OUTDIR)/%name%.js.gz: $(OUTDIR)/%name%.js
	$(GZJS) -o $@ $<
$(OUTDIR)/%name%.jgz: $(OUTDIR)/%name%.js.gz
	cp $< $@
#%end
#%m agh::js_from (
jsfiles+=$(OUTDIR)/%name%.js
$(OUTDIR)/%name%.js: %from%
	cp $< $@
$(OUTDIR)/%name%.js.gz: $(OUTDIR)/%name%.js
	$(GZJS) -o $@ $<
$(OUTDIR)/%name%.jgz: $(OUTDIR)/%name%.js.gz
	cp $< $@
#%)
#%m registerPreprocessedJs
jsfiles+=$(OUTDIR)/%file%
##%[name="%file%".replace(".js$","")]
##%x (
$(OUTDIR)/${name}.js: ${name}.js %depends%
	$(MWGPP) $< > $@
$(OUTDIR)/${name}.js.gz: $(OUTDIR)/${name}.js
	$(GZJS) -o $@ $<
$(OUTDIR)/${name}.jgz: $(OUTDIR)/${name}.js.gz
	cp $< $@
##%).i
#%end

#%x registerPreprocessedJs.r|%file%|agh.js| .r|%depends%|agh/addEventListener.js|

#%x agh::js.r#%name%#agh.regex#
#%x agh::js.r#%name%#agh.text#
#%x agh::js.r#%name%#agh.text.color#
#%x agh::js.r#%name%#agh.class#
#%x agh::js.r#%name%#agh.forms#
#%x agh::js.r#%name%#agh.debug#
#%x agh::js.r#%name%#prog.kick#
#%x agh::js.r#%name%#agh.fly#
##%x agh::js.r#%name%#agh.lang.tex#

#%x agh::js.r#%name%#agh.dom1#
#%x agh::js.r#%name%#agh.forms1#

#-------------------------------------------------------------------------------
#	.css files
#-------------------------------------------------------------------------------
#%define simple_copy_file (
copy_file+=$(OUTDIR)/%filename%
$(OUTDIR)/%filename%: %filename%
	cp -p $< $@
#%)
#%m copy_file (
copy_file+=$(OUTDIR)/%dst%
$(OUTDIR)/%dst%: %src%
	cp -p $< $@
#%)

#%x simple_copy_file.r|%filename%|.htaccess|
#%x simple_copy_file.r|%filename%|agh.text.color.css|
#%x simple_copy_file.r|%filename%|agh.debug.css|

#%x simple_copy_file.r|%filename%|agh.forms1.css|

copy_file+=$(OUTDIR)/mwg.std.css
$(OUTDIR)/mwg.std.css: mwg.std.pp.css
	PPC_C=1 $(MWGPP) $<
	mv mwg.std.css mwg.gray.css mwg.mono.css mwg.slide.css mwg.black.css $(OUTDIR)/

copy_file+=$(OUTDIR)/prog.std.css
$(OUTDIR)/prog.std.css: prog.std.pp.css
	PPC_C=1 $(MWGPP) $< > $@

#-------------------------------------------------------------------------------
# icons for forms.js
#-------------------------------------------------------------------------------
directory+=$(OUTDIR)/icons
$(OUTDIR)/icons:
	mkdir -p $@

#%x (
i file-asm.png
i file-back.png
i file-c.png
i file-cfg.png
i file-compressed.png
i file-cpp.png
i file-cs.png
i file-css.png
i file-djvu.png
i file-folder.png
i file-fon.png
i file-h.png
i file-htm.png
i file-image.png
i file-js.png
i file-pdf.png
i file-pfb.png
i file-ps.png
i file-raster.png
i file-sh.png
i file-sound.png
i file-tex.png
i file-textfile.png
i file-ttf.png
i file-unknown.png
i file-vb.png
i file-video.png
i nav-sub.png
i prog-class.png
i prog-const.png
i prog-event.png
i prog-field.png
i prog-iface.png
i prog-meth.png
i prog-ns.png
i prog-oper.png
i prog-param.png
i prog-prop.png
i prog-sentence.png
i prog-struct.png
i prog-type.png
#%).R~i ([^\r\n]+)~#%x copy_file.r|%dst%|icons/$1|.r|%src%|icons/bin/$1|~

#-------------------------------------------------------------------------------
# agh.dom
#-------------------------------------------------------------------------------
#%x agh::js_from.r|%name%|agh.dom|.r|%from%|agh.dom/agh.dom2.js|

#-------------------------------------------------------------------------------
# resources for forms.js
#-------------------------------------------------------------------------------
#%expand simple_copy_file.r|%filename%|agh.forms.clo.png|
#%expand simple_copy_file.r|%filename%|agh.forms.form.png|
#%expand simple_copy_file.r|%filename%|agh.forms.max.png|
#%expand simple_copy_file.r|%filename%|agh.forms.min.png|
#%expand simple_copy_file.r|%filename%|agh.forms.res.png|

#%expand simple_copy_file.r|%filename%|agh.forms.plus.png|
#%expand simple_copy_file.r|%filename%|agh.forms.minus.png|

#-------------------------------------------------------------------------------

.PHONY: directory
directory: $(directory)
.PHONY: jsfiles
jsfiles: $(jsfiles)
jgzfiles: $(jsfiles:.js=.js.gz) $(jsfiles:.js=.jgz)
.PHONY: copy_file
copy_file: $(copy_file)

#-------------------------------------------------------------------------------
# subdirectories
#-------------------------------------------------------------------------------

#%m subdir
.PHONY: "Name"
all: "Name"
"Name": "Dir"/Makefile "Deps"
	make -C "Dir"
"Dir"/Makefile: "Dir"/Makefile.pp
	$(MWGPP) $< > $@
#%end

#%x subdir .r/"Name"/make-addon/ .r/"Dir"/addon/           .r/"Deps"/make-latex make-ps make-encode/
#%x subdir .r/"Name"/make-latex/ .r/"Dir"/latex/           .r/"Deps"//
#%x subdir .r/"Name"/make-ps/    .r/"Dir"/agh.lang.ps/     .r/"Deps"//
#%x subdir .r/"Name"/make-encode/.r/"Dir"/agh.text.encode/ .r/"Deps"//
