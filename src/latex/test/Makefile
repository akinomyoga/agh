# -*- mode:makefile-gmake -*-

# use_pdflatex := 1

ifneq ($(use_pdflatex),)
.SUFFIXES: .tex .dvi .pdf
.tex.pdf:
	[ -d tmp ] || mkdir -p tmp; \
	pdflatex -output-directory=tmp $< && \
	mv tmp/$(<:.tex=.pdf) ./$@
else
.SUFFIXES: .tex .dvi .pdf
.tex.dvi:
	[ -d tmp ] || mkdir -p tmp; \
	platex -output-directory=tmp $< && \
	mv tmp/$(<:.tex=.dvi) ./$@
.dvi.pdf:
	dvipdfm $<
endif

texfiles := $(wildcard 20????-*.tex)
all: $(texfiles:.tex=.pdf)
$(warning Hello $(texfiles) $(use_pdflatex))
