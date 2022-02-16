VERSION=0.1.1
DISTZIP=radare2-webui-m-$(VERSION).zip

YARN=$(shell npm bin)/yarn
PWD=$(shell pwd)

all: build

build: node_modules
	$(YARN)
	npm run build

dist release: node_modules
	mkdir -p ../../dist/m
	ln -fs ../../dist/m dist
	cp -f index.html dist/index.html
	cp -rf css dist
	$(shell npm bin)/webpack-cli -o $$PWD/www/ $$PWD/js/app.js
	$(shell npm bin)/gulp release
	rm -f $(DISTZIP)
	cd ../../dist && zip -r $(DISTZIP) m


node_modules:
	$(YARN) install --flat --prod

watch:
	$(YARN) run watch

tests:
	$(YARN) run test

r:
	r2 -qe http.root=$$PWD/../../dist -e http.ui=m -c=H /bin/ls

run:
	r2 -q -e scr.html=0 -e http.sandbox=0 -e http.ui=m -e http.root=$(PWD)/../../dist -c=H /bin/ls

FILES=$(shell git ls-files .)

zip: clean
	zip -r radare2.zip $(FILES)

clean:
	rm -f *.gz *.zip

.PHONY: zip sync up update all clean dist release
