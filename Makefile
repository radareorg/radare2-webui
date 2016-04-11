VERSION=0.10.2

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

dist:
	rm -rf radare2-webui-$(VERSION)
	git clone . radare2-webui-$(VERSION)
	rm -rf radare2-webui-$(VERSION)/.git
	tar cJvf radare2-webui-$(VERSION).tar.xz radare2-webui-$(VERSION)
	rm -rf radare2-webui-$(VERSION)

mrproper:
	git clean -xdf

.PHONY: enyo all
