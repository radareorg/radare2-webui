all: build

build:
	npm install
	npm run build

release:
	npm run release

run: build
	r2 -qe http.root=$$PWD/../../dist -e http.ui=m -c=H /bin/ls

watch:
	npm run watch

tests:
	npm run test

r:
	r2 -qe http.root=$$PWD/../../dist -e http.ui=m -c=H /bin/ls

FILES=$(shell git ls-files .)

zip: clean
	zip -r radare2.zip $(FILES)

clean:
	rm -f *.gz *.zip

.PHONY: zip sync up update all clean
