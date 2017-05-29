build: node_modules
	$(shell npm bin)/gulp

node_modules:
	npm install

dist release:
	npm install
	$(shell npm bin)/gulp release

all: build

run:
	r2 -q -e scr.html=0 -e http.sandbox=false -e http.ui=p -e http.root=$(PWD)/../../dev -c=H /bin/ls

watch:
	$(shell npm bin)/gulp watch

indent:
	# TODO: use semistandard
	jsfmt -w lib/js/*.js
