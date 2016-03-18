build:
	npm install
	$(shell npm bin)/gulp

all: build
	r2 -e http.ui=t -e http.root=$$PWD -qc=H /bin/ls

