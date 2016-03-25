build:
	npm install
	$(shell npm bin)/gulp

all: build

run: build
	r2 -q -e http.ui=p -e http.root=$(PWD)/../ -c=H /bin/ls

indent:
	jsfmt -w lib/js/*.js
