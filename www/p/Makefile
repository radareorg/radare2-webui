VERSION=0.1.1
DISTZIP=radare2-webui-p-$(VERSION).zip

build: node_modules
	npx gulp

node_modules:
	npm install

dist release:
	npm install
	npx gulp release
	rm -f $(DISTZIP)
	cd ../../dist && zip -r $(DISTZIP) p

all: build

run:
	r2 -q -e scr.html=0 -e http.sandbox=false -e http.ui=p -e http.root=$(PWD)/../../dev -c=H /bin/ls

watch:
	npx gulp watch

indent:
	# TODO: use semistandard
	jsfmt -w lib/js/*.js
