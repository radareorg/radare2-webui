.PHONY: all debug enyo-sync index.js

all: index.js

node_modules:
	npm install

debug:
	cat js/*.js > index.js

GRUNT=$(shell npm bin)/grunt
BOWER=$(shell npm bin)/bower

index.js: node_modules
	$(BOWER) install
	$(GRUNT)
	cat build/*.js ugly/js/*.js > index.js

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

run:
	r2 -q -e http.root=$(PWD)/../ -c=H /bin/ls

clean:
	rm -rf node_modules
