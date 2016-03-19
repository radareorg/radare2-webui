all: build

node_modules:
	npm install

build: node_modules
	mkdir -p dist
	$(shell npm bin)/gulp

run:
	r2 -e http.ui=dist -e http.root=$$PWD -qc=H /bin/ls

clean:
	rm -rf dist dist.tar.gz

mrproper: clean
	rm -rf node_modules
