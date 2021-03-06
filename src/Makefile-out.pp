# -*- mode:makefile-gmake -*-

all:
.PHONY: all

BASE:=..

Makefile: $(BASE)/src/Makefile-out.pp
	$(MWGPP) $< > $@

MWGPP:=$(BASE)/tools/ext/mwg_pp.awk
CP:=cp

ifeq ($(USER)@$(HOSTNAME),koichi@gauge)
  CP:= ~/.mwg/cp+1

  #TKYNT2MWG3:=/cygdrive/q/tkynt2/public_html/agh3
  TKYNT2MWG3:=agh@padparadscha
  ifeq ($(PREFIX),)
    PREFIX:=$(TKYNT2MWG3)
  endif
endif

#==============================================================================
#  definitions
#==============================================================================

FTPPASS :=
ifeq ($(USER)@$(HOSTNAME),murase@vaio2016)
  FTPPASS := $(shell test -f ~/.ssh/ftppass.txt && awk -F: '$$1=="myoga.web.fc2.com"{printf("%s",$$2)}' ~/.ssh/ftppass.txt)
endif
export FTPPASS

myogaftpfiles:=stamp@myoga.web.fc2.com
stamp@myoga.web.fc2.com:
	mkdir $@

myogaftpfiles+=stamp@myoga.web.fc2.com/aghdir.stamp
stamp@myoga.web.fc2.com/aghdir.stamp:
	ftpput . "myoga@myoga.web.fc2.com:agh" $$FTPPASS
	touch $@

#%m dir
#------------------------------------------------------------------------------
uploadfiles+=$(PREFIX)/%path%
$(PREFIX)/%path%:
	mkdir -p $@
#%%[stamp="%path%".replace("/","%")+"%.touch"]
#%%x
myogaftpfiles+=stamp@myoga.web.fc2.com/${stamp}
stamp@myoga.web.fc2.com/${stamp}:
	ftpput "%path%" "myoga@myoga.web.fc2.com:agh/%path%" $$FTPPASS
	touch $@
#%%end.i
#%end
#%define file
#------------------------------------------------------------------------------
uploadfiles+=$(PREFIX)/%file%
$(PREFIX)/%file%: %file%
	$(CP) $< $@
##%[stamp="%file%".replace("/","%")+"%.touch"]
##%x
myogaftpfiles+=stamp@myoga.web.fc2.com/${stamp}
stamp@myoga.web.fc2.com/${stamp}: %file%
	ftpput "%file%" "myoga@myoga.web.fc2.com:agh/%file%" $$FTPPASS
	touch $@
##%end.i
#%end
#------------------------------------------------------------------------------
#%m directory
##%expand dir.r|%path%|%name%|
#%end
#%m jsfile
files+=$(PREFIX)/%name%.js
##%x file.r|%file%|%name%.js|
#%end
#%m fontfile
##%x file.r|%file%|%name%.ttf|
##%x file.r|%file%|%name%.woff|
##%x file.r|%file%|%name%.eot|
#%end
#---------------------------------------------------------------------
#%m filelist (
d latex;
d addon;
d icons;
d res;

j agh;
j agh.regex;
j agh.text;
j agh.class;
j agh.dom;

j agh.text.color;
f agh.text.color.css;

j agh.forms;
f agh.forms.max.png;
f agh.forms.min.png;
f agh.forms.res.png;
f agh.forms.plus.png;
f agh.forms.minus.png;
f agh.forms.form.png;
f agh.forms.clo.png;

j agh.debug;
f agh.debug.css;

j agh.lang.ps;
j prog.kick;
j agh.fly;

f mwg.std.css;
f mwg.gray.css;
f mwg.mono.css;
f mwg.black.css;
f mwg.slide.css;
f prog.std.css;

# obsoleted
j agh.dom1;
j agh.forms1;
f agh.forms1.css;

# latex scripts
j agh.lang.tex;
# j latex/latex.cor;
# j latex/latex.ctx;
# j latex/latex.cls;

# latex resources
f latex/paren5l.png;
f latex/paren5r.png;
f latex/stretch_bslash.png;
f latex/stretch_darr.png;
f latex/stretch_darr2.png;
f latex/stretch_larr.png;
f latex/stretch_lrarr.png;
f latex/stretch_rarr.png;
f latex/stretch_slash.png;
f latex/stretch_uarr.png;
f latex/stretch_uarr2.png;
f latex/stretch_udarr.png;
f latex/stretch_udarr2.png;
f latex/stretch_lparen.svg;
f latex/stretch_rparen.svg;
f latex/stretch_lbrace.svg;
f latex/stretch_rbrace.svg;
f latex/stretch_langle.svg;
f latex/stretch_rangle.svg;
f latex/stretch_sqrt.svg;
F latex/aghtex_mathit;
F latex/aghtex_mathbm;
F latex/aghtex_mathrm;
F latex/aghtex_mathcal;
F latex/aghtex_mathbb;
F latex/aghtex_mathfrak;
F latex/aghtex_mathbf;
F latex/aghtex_mathscr;
f latex/latex.fx.css;
f latex/latex.ie.css;
f latex/latex.op.css;
f latex/latex.sf.css;
f latex/.htaccess;

# latex resources
f icons/file-asm.png;
f icons/file-back.png;
f icons/file-c.png;
f icons/file-cfg.png;
f icons/file-compressed.png;
f icons/file-cpp.png;
f icons/file-cs.png;
f icons/file-css.png;
f icons/file-djvu.png;
f icons/file-folder.png;
f icons/file-fon.png;
f icons/file-h.png;
f icons/file-htm.png;
f icons/file-image.png;
f icons/file-js.png;
f icons/file-pdf.png;
f icons/file-pfb.png;
f icons/file-ps.png;
f icons/file-raster.png;
f icons/file-sh.png;
f icons/file-sound.png;
f icons/file-tex.png;
f icons/file-textfile.png;
f icons/file-ttf.png;
f icons/file-unknown.png;
f icons/file-vb.png;
f icons/file-video.png;
f icons/nav-sub.png;
f icons/prog-class.png;
f icons/prog-const.png;
f icons/prog-event.png;
f icons/prog-field.png;
f icons/prog-iface.png;
f icons/prog-meth.png;
f icons/prog-ns.png;
f icons/prog-oper.png;
f icons/prog-param.png;
f icons/prog-prop.png;
f icons/prog-sentence.png;
f icons/prog-struct.png;
f icons/prog-type.png;

# resources
f res/agh.icon.mwg_16x16.png;
f res/agh.icon.mwg_128x128.png;
f res/agh.icon.agh_16x16.png;
f res/agh.icon.agh_48x48.png;
f res/agh.icon.agh_128x128.png;
#%)
#%m filelist filelist.r/d /#%expand directory.r|%name%|/.r/;/|/
#%m filelist filelist.r/f /#%expand file.r|%file%|/.r/;/|/
#%m filelist filelist.r/F /#%expand fontfile.r|%name%|/
#%m filelist filelist.r/j /#%expand jsfile.r|%name%|/
#%x filelist

#%x file.r|%file%|addon/index.html|
#%x file.r|%file%|addon/agh.addon.aghtex4chrome.tar.xz|
ifneq ($(wildcard addon/agh.addon.aghtex4chrome.crx),)
#%x file.r|%file%|addon/agh.addon.aghtex4chrome.crx|
endif
#%x file.r|%file%|addon/agh.addon.aghtex4chrome.xml|
addon_dist_files+=addon/agh.addon.aghtex4chrome.tar.xz addon/agh.addon.aghtex4chrome.zip
addon/agh.addon.aghtex4chrome.tar.xz: addon/agh.addon.aghtex4chrome/manifest.json
	cd addon && tar cavf agh.addon.aghtex4chrome.tar.xz agh.addon.aghtex4chrome
addon/agh.addon.aghtex4chrome.zip: addon/agh.addon.aghtex4chrome/manifest.json
	cd addon/agh.addon.aghtex4chrome && zip -r ../agh.addon.aghtex4chrome.zip *

#%x file.r|%file%|addon/agh.addon.aghtex4thunderbird.tar.xz|
#%x file.r|%file%|addon/agh.addon.aghtex4thunderbird.xpi|
#%x file.r|%file%|addon/agh.addon.aghtex4thunderbird.xml|
addon_dist_files+=addon/agh.addon.aghtex4thunderbird.xpi
addon/agh.addon.aghtex4thunderbird.xpi: addon/agh.addon.aghtex4thunderbird@kch.murase/install.rdf
	cd addon/agh.addon.aghtex4thunderbird@kch.murase && zip -r ../agh.addon.aghtex4thunderbird.xpi *
addon_dist_files+=addon/agh.addon.aghtex4thunderbird.tar.xz
addon/agh.addon.aghtex4thunderbird.tar.xz: addon/agh.addon.aghtex4thunderbird@kch.murase/install.rdf
	cd addon && tar cavf agh.addon.aghtex4thunderbird.tar.xz agh.addon.aghtex4thunderbird@kch.murase

#%x file.r|%file%|addon/agh.addon.aghtex4firefox.tar.xz|
#%x file.r|%file%|addon/agh.addon.aghtex4firefox.xpi|
#%x file.r|%file%|addon/agh.addon.aghtex4firefox.xml|
addon_dist_files+=addon/agh.addon.aghtex4firefox.xpi
addon/agh.addon.aghtex4firefox.xpi: addon/agh.addon.aghtex4firefox@kch.murase/install.rdf
	cd addon/agh.addon.aghtex4firefox@kch.murase && zip -r ../agh.addon.aghtex4firefox.xpi *
addon_dist_files+=addon/agh.addon.aghtex4firefox.tar.xz
addon/agh.addon.aghtex4firefox.tar.xz: addon/agh.addon.aghtex4firefox@kch.murase/install.rdf
	cd addon && tar cavf agh.addon.aghtex4firefox.tar.xz agh.addon.aghtex4firefox@kch.murase

ifneq ($(wildcard addon/agh.addon.aghtex4ie/version.txt),)
#%x file.r|%file%|addon/agh.addon.aghtex4ie.zip|
#%x file.r|%file%|addon/agh.addon.aghtex4ie.tar.xz|
addon_dist_files+=addon/agh.addon.aghtex4ie.zip
addon/agh.addon.aghtex4ie.zip: addon/agh.addon.aghtex4ie/version.txt
	cd addon && zip -r agh.addon.aghtex4ie.zip agh.addon.aghtex4ie -x 'agh.addon.aghtex4ie/mwgtex4ie/*'
addon_dist_files+=addon/agh.addon.aghtex4ie.tar.xz
addon/agh.addon.aghtex4ie.tar.xz: addon/agh.addon.aghtex4ie/version.txt
	cd addon && tar cavf agh.addon.aghtex4ie.tar.xz agh.addon.aghtex4ie --exclude=agh.addon.aghtex4ie/aghtex4ie.dll
endif

#%x file.r|%file%|addon/agh.addon.aghtex4seahorse.zip|
#%x file.r|%file%|addon/agh.addon.aghtex4seahorse.tar.xz|
addon_dist_files+=addon/agh.addon.aghtex4seahorse.tar.xz
addon/agh.addon.aghtex4seahorse.tar.xz: addon/insdir_seahorse/agh.addon.aghtex4seahorse.user.js
	cd addon/insdir_seahorse && tar cavf agh.addon.aghtex4seahorse.tar.xz agh.addon.aghtex4seahorse agh.addon.aghtex4seahorse.user.js
	mv addon/insdir_seahorse/agh.addon.aghtex4seahorse.tar.xz addon/
addon_dist_files+=addon/agh.addon.aghtex4seahorse.zip
addon/agh.addon.aghtex4seahorse.zip: addon/insdir_seahorse/agh.addon.aghtex4seahorse.user.js
	cd addon/insdir_seahorse && zip -r agh.addon.aghtex4seahorse.zip agh.addon.aghtex4seahorse agh.addon.aghtex4seahorse.user.js
	mv addon/insdir_seahorse/agh.addon.aghtex4seahorse.zip addon/

.PHONY: addon_dist
addon_dist: $(addon_dist_files)

all: addon_dist

ifneq ($(FTPPASS),)
  .PHONY: myoga
  myoga: $(myogaftpfiles)
endif

ifneq ($(PREFIX),)
  .PHONY: upload install
  upload: $(uploadfiles)
  install: upload
endif
