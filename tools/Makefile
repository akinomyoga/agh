# Makefile

KCHBIN=$(shell cygpath -u c:/usr/koichi/bin)

all: csscompat.exe ctxc.exe reptxt.exe

csscompat.exe: csscompat.cs
	csc '-r:System.dll' $<

ctxc.exe: ctxc.frame.js ctxc.cs
	csc -r:'System.dll' /res:ctxc.frame.js ctxc.cs

gzjs.exe:
	make -C gzjs

reptxt.exe: reptxt.cs
	csc -r:'System.dll' $<
	cp reptxt.exe $(KCHBIN)
