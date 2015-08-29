# -*- makefile-gmake -*-

all:
.PHONY: all dist

dist_excludes= \
 --exclude=./$(AGHDIR)/dist \
 --exclude=./$(AGHDIR)/src/addon/aghtex4ie/mwgtex4ie/Debug/* \
 --exclude=./$(AGHDIR)/src/addon/aghtex4ie/mwgtex4ie/Release/* \
 --exclude=./$(AGHDIR)/src/addon/aghtex4ie/mwgtex4ie.ncb \
 --exclude=./$(AGHDIR)/src/latex/test/*.aux \
 --exclude=./$(AGHDIR)/src/latex/test/*.log \
 --exclude=./$(AGHDIR)/src/latex/test/*.dvi \
 --exclude=./$(AGHDIR)/src/latex/test/*.pdf \
 --exclude=./$(AGHDIR)/src/latex/.gen \
 --exclude=./$(AGHDIR)/mat \
 --exclude=./$(AGHDIR)/backup \
 --exclude=./$(AGHDIR)/*/backup \
 --exclude=./$(AGHDIR)/out \
 --exclude=./$(AGHDIR)/tools/gzjs/inflate/out/* \
 --exclude=./$(AGHDIR)/tools/*.exe \
 --exclude=./$(AGHDIR)/src/latex/aghfonts/*.sfd \
 --exclude=./$(AGHDIR)/src/latex/aghfonts/[^a]* \
 --exclude=*.20[0-9][0-9][01][0-9][0-3][0-9].* \
 --exclude=*~ 


AGHDIR:=$(shell echo $${PWD\#\#*/})
dist:
	cd ../ && tar cavf ./$(AGHDIR)/dist/agh.`date +%Y%m%d`.tar.xz ./$(AGHDIR) $(dist_excludes)

dist-aghfonts:
	cd ../ && tar cavf ./$(AGHDIR)/dist/agh-aghfonts.`date +%Y%m%d`.tar.xz ./$(AGHDIR)/src/latex/aghfonts --exclude=*~ --exclude=*/backup


ChangeLog.htm: ChangeLog.lwiki
	lwiki convert $< > $@
ChangeLog.txt: ChangeLog.htm
	w3m -T text/html -no-graph $< > $@
all: ChangeLog.txt

# --exclude=./$(AGHDIR)/out/stamp@* \
# --exclude=./$(AGHDIR)/out/addon \
# --exclude=./$(AGHDIR)/out/*.js \
# --exclude=./$(AGHDIR)/out/*.jgz \
# --exclude=./$(AGHDIR)/out/*.gz \
# --exclude=./$(AGHDIR)/out/*.png \
# --exclude=./$(AGHDIR)/out/*.css \
# --exclude=./$(AGHDIR)/out/*.eot \
# --exclude=./$(AGHDIR)/out/*.woff \
# --exclude=./$(AGHDIR)/out/*.ttf \
