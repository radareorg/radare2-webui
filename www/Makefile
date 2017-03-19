build:
	npm install
	$(shell npm bin)/gulp

dist release:
	$(shell npm bin)/gulp
	$(MAKE) -C p release
	$(MAKE) -C m release
