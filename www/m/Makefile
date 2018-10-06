all: build

build:
	yarn
	npm run build

dist release: node_modules
	yarn run release

node_modules:
	yarn install --flat --prod

run:
	r2 -q -e http.sandbox=false -e http.root=$$PWD/../../dev -e http.ui=m -c=H /bin/ls

watch:
	yarn run watch

tests:
	yarn run test

r:
	r2 -qe http.root=$$PWD/../../dist -e http.ui=m -c=H /bin/ls

FILES=$(shell git ls-files .)

zip: clean
	zip -r radare2.zip $(FILES)

clean:
	rm -f *.gz *.zip

.PHONY: zip sync up update all clean
