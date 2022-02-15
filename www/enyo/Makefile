build:
	npm install
	$(shell npm bin)/gulp

run: build
	r2 -q -e http.ui=enyo -e http.sandbox=0  -e http.root=$(PWD)/../../dist -c=H /bin/ls

watch:
	$(shell npm bin)/gulp watch


dist:
	rm -f $(DISTZIP)
	cd ../../dist && zip -r $(DISTZIP) enyo

clean:
	rm -rf node_modules
	rm -rf vendors
