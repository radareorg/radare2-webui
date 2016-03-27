all: build

build:
	npm install
	$(shell npm bin)/gulp

run: build
	r2 -qe http.root=$$PWD/.. -e http.ui=m -c=H /bin/ls


r:
	r2 -qe http.root=$$PWD/dist -e http.ui=. -c=H /bin/ls

FILES=$(shell git ls-files .)

zip: clean
	zip -r radare2.zip $(FILES)

clean:
	rm -f *.gz *.zip

.PHONY: zip sync up update all clean
