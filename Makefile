VERSION=0.10.2

all: build
	$(MAKE) run

run: runm

runenyo:
	r2 -q -e http.homeroot=dist -e http.ui=enyo -c=H /bin/ls

runm:
	r2 -q -e http.homeroot=dist -e http.ui=m -c=H /bin/ls

runt:
	r2 -q -e http.homeroot=dist -e http.ui=t -c=H /bin/ls

runp:
	r2 -q -e http.homeroot=dist -e http.ui=p -c=H /bin/ls


build: root enyo material tiles panel

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
	rm -rf dist

dist: build
	tar cJvf radare2-webui-$(VERSION).tar.xz dist

indivualdist:
	cd dist
	tar zcvf ../r2-webui-enyo.tar.gz enyo
	tar zcvf ../r2-webui-m.tar.gz m
	tar zcvf ../r2-webui-t.tar.gz t
	tar zcvf ../r2-webui-p.tar.gz p

mrproper:
	git clean -xdf

.PHONY: enyo all
.ONESHELL: indivualdist
