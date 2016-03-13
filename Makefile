all: enyo
	$(MAKE) run

run:
	r2 -q -e http.root=$(PWD)/www -e http.ui=enyo -c=H /bin/ls

enyo:
	$(MAKE) -C www/enyo

clean:
	$(MAKE) -C www/enyo clean

mrproper:
	git clean -xdf

.PHONY: enyo all
