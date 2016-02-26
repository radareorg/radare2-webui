all:
	r2 -q -e http.root=$(PWD)/www -e http.ui=enyo -c=H /bin/ls

node_modules:
	mkdir node_modules
	npm install grunt grunt-cli bower --save-dev
	cd www/enyo ; make node_modules ;$(shell npm bin)/bower install
