all: enyo
	r2 -q -e http.root=$(PWD)/www -e http.ui=enyo -c=H /bin/ls

enyo:
	cd www/enyo ; npm install
	cd www/enyo ; $(shell npm bin)/bower install
