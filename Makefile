all: root enyo material tiles panel
	$(MAKE) run

run:
	r2 -q -e http.root=www -e http.ui=enyo -c=H /bin/ls

root:
	$(MAKE) -C www build

enyo:
	$(MAKE) -C www/enyo build

material:
	$(MAKE) -C www/m build

tiles:
	$(MAKE) -C www/t build

panel:
	$(MAKE) -C www/p build

clean:
	$(MAKE) -C www/enyo clean

mrproper:
	git clean -xdf

.PHONY: enyo all
