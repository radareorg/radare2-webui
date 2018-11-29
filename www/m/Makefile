YARN=$(shell npm bin)/yarn

all: build

build:
	$(YARN)
	npm run build

dist release: node_modules
	mkdir -p ../../dist/m
	ln -fs ../../dist/m dist
	cp -f index.html dist/index.html
	cp -rf css dist
	$(shell npm bin)/webpack-cli js/app.js
	#$(shell npm bin)/gulp release

node_modules:
	$(YARN) install --flat --prod

watch:
	$(YARN) run watch

tests:
	$(YARN) run test

r:
	r2 -qe http.root=$$PWD/../../dist -e http.ui=m -c=H /bin/ls

run:
	r2 -q -e http.sandbox=false -e http.root=$$PWD/../../dev -e http.ui=m -c=H /bin/ls

FILES=$(shell git ls-files .)

zip: clean
	zip -r radare2.zip $(FILES)

clean:
	rm -f *.gz *.zip

.PHONY: zip sync up update all clean dist release
