VERSION=$(shell jq .version package.json)
DISTZIP=radare2-webui-m-$(VERSION).zip

PM=npm
PWD=$(shell pwd)

all: build
	$(MAKE) dist

build: node_modules

dist release: node_modules
	mkdir -p ../../dist/m
	cp -f index.html ../../dist/m/index.html
	cp -rf css ../../dist/m
	npx webpack-cli -o $$PWD/www/ $$PWD/js/app.js
	npx gulp release
	cp $$PWD/www/* ../../dist/m/.
	rm -f $(DISTZIP)
	cd ../../dist && ls -la && zip -r $(DISTZIP) m
	@echo zip -r ../../dist/$(DISTZIP) m


node_modules:
	mkdir -p node_modules
	$(PM) install

watch:
	$(PM) run watch

tests:
	$(PM) run test

r:
	r2 -qe http.root=$$PWD/../../dist -e http.ui=m -c=H /bin/ls

run:
	r2 -q -e scr.html=0 -e http.sandbox=0 -e http.ui=m -e http.root=$(PWD)/../../dist -c=H /bin/ls

FILES=$(shell git ls-files .)

zip: clean
	zip -r radare2.zip $(FILES)

clean_nodes:
	rm -rf ./node_modules/
	rm package-lock.json

clean:
	rm -f *.gz *.zip

.PHONY: zip sync up update all clean dist release
