# -*- makefile-gmake -*-

OSTYPE:=$(shell bash -c 'case "$$OSTYPE" in (cygwin*|win*) echo win;; (*) echo "$$OSTYPE";; esac')
ifeq ($(OSTYPE),win)
CSC:=csc
CSFLAGS:= -r:'System.dll'
else
CSC:=dmcs
CSFLAGS:=
endif
