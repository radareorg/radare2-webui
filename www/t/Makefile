VERSION=0.1.1

GLOBALS=
GLOBALS+=--global _
GLOBALS+=--global r2
GLOBALS+=--global alert
GLOBALS+=--global prompt
GLOBALS+=--global Tiled
GLOBALS+=--global html

DISTZIP=radare2-webui-t-$(VERSION).zip

all: build
	$(MAKE) dist

node_modules:
	npm install

build: node_modules
	mkdir -p dist/t
	rm -rf dist
	$(shell npm bin)/gulp

dist:
	rm -f $(DISTZIP)
	cd ../../dist && zip -r $(DISTZIP) t

run:
#	r2 -e http.ui=dist -e http.root=$$PWD -qc=H /bin/ls
	r2 -qcq -e http.verbose=true -e http.root=$$PWD/dist -e http.ui=t -e http.sandbox=0 -c=H /bin/ls

watch:
	$(shell npm bin)/gulp watch

mrproper: clean
	rm -rf node_modules


indent:
	node_modules/.bin/semistandard $(GLOBALS) --fix js/*.js
