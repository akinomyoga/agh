# -*- makefile-gmake -*-

OSTYPE := $(shell bash -c 'case "$$OSTYPE" in (cygwin*|win*) echo win;; (*) echo "$$OSTYPE";; esac')
ifeq ($(OSTYPE),win)
  CSC := csc
  CSFLAGS := -r:'System.dll'
else
  CSC := $(shell which mcs 2>/dev/null)
  ifeq ($(CSC),)
    CSC := $(shell which dmcs 2>/dev/null)
  endif
  CSFLAGS :=
endif
