.PHONY: index.js
all: index.js

node_modules/.bin/uglifyjs:
	mkdir -p node_modules
#	npm install uglify-js
	npm install grunt-contrib-uglify --save-dev

debug:
	cat js/*.js > index.js

#U=bower_components/uglify-js/bin/uglifyjs
index.js: $U

	coffee -c Gruntfile.coffee
	grunt
	cd ./js/
	cat *.js > ./js/index.js



ENYO=http://enyojs.com/sampler/latest/build
JOINT=http://www.jointjs.com/cms/downloads/

enyo-sync:
	mkdir -p build
	# ENYO UI
	wget -O build/enyo.css $(ENYO)/enyo.css
	wget -O build/enyo.js  $(ENYO)/enyo.js
	wget -O build/app.css  $(ENYO)/app.css
	wget -O build/app.js   $(ENYO)/app.js
	# Joint.JS Graph
	wget -O build/joint.min.js $(JOINT)/joint.min.js
	wget -O build/joint.min.css $(JOINT)/joint.min.css
	# jQuery
	wget -O build/jquery.min.js http://code.jquery.com/jquery-2.0.3.min.js
