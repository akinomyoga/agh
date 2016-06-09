# -*- makefile-gmake -*-

OSTYPE:=$(shell bash -c 'echo $OSTYPE')
OSTYPE:=$(patsubst win%,win,$(OSTYPE))
OSTYPE:=$(patsubst cygwin%,win,$(OSTYPE))
ifeq ($(OSTYPE),win)
CSC:=csc
CSFLAGS:= -r:'System.dll'
else
CSC:= dmcs
CSFLAGS:=
endif
