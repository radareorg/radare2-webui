all:
	r2 -q -e http.root=$(PWD)/www -e http.ui=enyo -c=H /bin/ls

node_modules:
	mkdir node_modules
	npm install grunt-cli bower
	cd www/enyo ; $(shell npm bin)/bower install
