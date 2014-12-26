# -*- mode:makefile-gmake -*-

all: Makefile
.PHONY: all

Makefile: Makefile.pp
	mwg_pp.awk $< > $@

ifeq ($(PREFIX),tkynt2)
OUTDIR:=/cygdrive/Q/tkynt2/public_html/test/ps
index.html:=index-tkynt2.htm
else
OUTDIR:=../../../out/demo/ps
index.html:=index.htm
endif

#--------------------------------------
# index.html
ifeq ($(PREFIX),tkynt2)
index.html:=index-tkynt2.htm
index-tkynt2.htm: index.htm
	cat $< | sed 's;"\(http://localhost\)\?/~murase/agh\|"\.\./\.\./\.\./out;"http://tkynt2.phys.s.u-tokyo.ac.jp/~murase/agh;' > $@
else
index.html:=index.htm
endif

outputfiles:=$(OUTDIR)/index.html
$(OUTDIR)/index.html: $(index.html)
	~/.mwg/cp+1 $< $@

#--------------------------------------
# ps files

#%m upload_file (
outputfiles+=$(OUTDIR)/%%file%%
$(OUTDIR)/%%file%%: %%file%%
	~/.mwg/cp+1 $< $@
#%)

#%x upload_file.r/%%file%%/alphabet.ps/
#%x upload_file.r/%%file%%/chess.ps/
#%x upload_file.r/%%file%%/colorcir.ps/
#%x upload_file.r/%%file%%/doretree.ps/
#%x upload_file.r/%%file%%/escher.ps/
#%x upload_file.r/%%file%%/golfer.eps/
#%x upload_file.r/%%file%%/grayalph.ps/
#%x upload_file.r/%%file%%/ridt91.eps/
#%x upload_file.r/%%file%%/snowflak.ps/
#%x upload_file.r/%%file%%/tiger.eps/
#%x upload_file.r/%%file%%/vasarely.ps/
#%x upload_file.r/%%file%%/waterfal.ps/
#%x upload_file.r/%%file%%/dbg-exp.ps/
#%x upload_file.r/%%file%%/dbg-ea.ps/
#%x upload_file.r/%%file%%/dbg-show.eps/
#%x upload_file.r/%%file%%/dbg-opt.ps/

#%x upload_file.r/%%file%%/test.eexec/


#%x upload_file.r/%%file%%/Tiny_RayTracing_Fast.ps/
#%x upload_file.r/%%file%%/Tiny_RayTracing_Fast-r1.ps/
#%x upload_file.r/%%file%%/Tiny_RayTracing_Fast-r2.ps/
#%x upload_file.r/%%file%%/Tiny_RayTracing_Fast-r6.ps/
#%x upload_file.r/%%file%%/Tiny_RayTracing_Fast-r9.ps/
Tiny_RayTracing_Fast-r1.ps: Tiny_RayTracing_Fast.ps
	sed 's/^3 def/1 def/' $< > $@
Tiny_RayTracing_Fast-r2.ps: Tiny_RayTracing_Fast.ps
	sed 's/^3 def/2 def/' $< > $@
Tiny_RayTracing_Fast-r6.ps: Tiny_RayTracing_Fast.ps
	sed 's/^3 def/6 def/' $< > $@
Tiny_RayTracing_Fast-r9.ps: Tiny_RayTracing_Fast.ps
	sed 's/^3 def/9 def/' $< > $@

#%x upload_file.r/%%file%%/Tiny_RayTracing.ps/
#%x upload_file.r/%%file%%/Tiny_RayTracing-r1.ps/
#%x upload_file.r/%%file%%/Tiny_RayTracing-r3.ps/
#%x upload_file.r/%%file%%/Tiny_RayTracing-r6.ps/
#%x upload_file.r/%%file%%/Tiny_RayTracing-r9.ps/
Tiny_RayTracing-r1.ps: Tiny_RayTracing.ps
	sed 's/^T translate(V2L/T translate(V1L/' $< > $@
Tiny_RayTracing-r3.ps: Tiny_RayTracing.ps
	sed 's/^T translate(V2L/T translate(V3L/' $< > $@
Tiny_RayTracing-r6.ps: Tiny_RayTracing.ps
	sed 's/^T translate(V2L/T translate(V6L/' $< > $@
Tiny_RayTracing-r9.ps: Tiny_RayTracing.ps
	sed 's/^T translate(V2L/T translate(V9L/' $< > $@

#%x upload_file.r/%%file%%/Tiny_RayTracing_ShapeUp.ps/

.PHONY: upload
upload: $(outputfiles)
