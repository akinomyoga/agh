

## agh.addon.aghtex4chrome v1.1.9.*

**Fixes**

- aghtex4chrome: fix a problem that a margin is added to the end of the markdown body
- aghtex (pkg:color): fix a bug in the color specification by CMYK 6245593
- aghtex (css): fix a bug that the CSS rule for `tr.aghtex-css-tr` was ineffective (reported by @miidas) 6314c6d
- Makefile: add a workaround for GNU make 4.3.0 quote removal in `var := $(shell)` (reported by @miidas) a7c47f4
- tools/Makefile: fix rules for `ttf2eot` and `sfnt2woff` 0edd251 4f8d9df
- aghtex: support `\hskip`, `\kern`, `\mskip`, `\mkern`, `\mspace` 0000000

## 2019-12-25 agh.addon.aghtex4chrome v1.1.8.1253

- aghtex: miscellaneous adjustments and fixes to LaTeX engine
- aghtex4chrome: add support to GitHub
- aghtex4chrome: add an option page to switch on/off features
