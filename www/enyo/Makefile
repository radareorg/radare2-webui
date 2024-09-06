VERSION=0.1.2
DISTZIP=radare2-webui-enyo-$(VERSION).zip


build:
	npm install
	npx gulp

run: build
	r2 -q -e http.ui=enyo -e http.sandbox=0  -e http.root=$(PWD)/../../dist -c=H /bin/ls

watch:
	npx gulp watch

dist:
	rm -f $(DISTZIP)
	cd ../../dist && zip -r $(DISTZIP) enyo

clean:
	rm -rf node_modules
	rm -rf vendors
