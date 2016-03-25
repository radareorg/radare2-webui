all: build

build:
	npm install
	$(shell npm bin)/gulp

run: build
	r2 -qe http.root=$$PWD/.. -e http.ui=m -c=H /bin/ls

FILES=$(shell git ls-files .)

zip: clean
	zip -r radare2.zip $(FILES)

dist:
	cd .. ; tar czvf r2mat.tar.gz m

clean:
	rm -f *.gz *.zip

.PHONY: zip dist sync up update all clean
