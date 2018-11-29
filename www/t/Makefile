all: build

node_modules:
	npm install

dist release build: node_modules
	ln -fs ../../dist/t dist
	$(shell npm bin)/gulp

run:
	r2 -e http.ui=dist -e http.root=$$PWD -qc=H /bin/ls

watch:
	$(shell npm bin)/gulp watch

clean:
	rm -rf dist dist.tar.gz

mrproper: clean
	rm -rf node_modules
