all: build

build:
	npm install
	$(shell npm bin)/gulp

run:
	r2 -e http.ui=dist -e http.root=$$PWD -qc=H /bin/ls
