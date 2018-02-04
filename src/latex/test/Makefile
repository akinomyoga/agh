# -*- mode:makefile-gmake -*-

# use_pdflatex := 1

TEX := platex
DVIPDF := dvipdfmx

temporary_directory := tmp

ifneq ($(use_pdflatex),)
.SUFFIXES: .tex .pdf
.tex.pdf:
	[ -d $(temporary_directory) ] || mkdir -p $(temporary_directory); \
	pdflatex -output-directory=$(temporary_directory) $< && \
	mv $(temporary_directory)/$(<:.tex=.pdf) ./$@
else
.SUFFIXES: .tex .pdf
.tex.pdf:
	[ -d $(temporary_directory) ] || mkdir -p $(temporary_directory); \
	$(TEX) -output-directory=$(temporary_directory) $< && \
	cd $(temporary_directory) && $(DVIPDF) $(<:.tex=.dvi) && \
	mv $@ ..
endif

texfiles := $(wildcard 20????-*.tex)
all: $(texfiles:.tex=.pdf)
$(warning Hello $(texfiles) $(use_pdflatex))
