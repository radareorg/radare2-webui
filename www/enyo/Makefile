build:
	npm install
	$(shell npm bin)/gulp

run: build
	r2 -q -e http.ui=enyo -e http.root=$(PWD)/../ -c=H /bin/ls

watch:
	$(shell npm bin)/gulp watch

clean:
	rm -rf node_modules
	rm -rf vendors
