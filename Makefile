VERSION=1.2.0

all: build
	$(MAKE) run

# Default UI is Material
run: runm

###############
# Building UI #
###############

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

###############################
# Running R2 with specitic UI #
###############################

runenyo:
	r2 -q -e http.homeroot=dist -e http.ui=enyo -c=H /bin/ls

runm:
	r2 -q -e http.sandbox=false -e http.homeroot=dev -e http.ui=m -c=H /bin/ls

runt:
	r2 -q -e http.homeroot=dist -e http.ui=t -c=H /bin/ls

runp:
	r2 -q -e http.homeroot=dev -e http.ui=p -c=H /bin/ls

#####################
# Building releases #
#####################

release-root: root

release-enyo: enyo

release-material: material
	$(MAKE) -C www/m release

release-tiles: tiles

release-panel: panel
	$(MAKE) -C www/p release

release: release-root release-enyo release-material release-tiles release-panel

################################
# Making archives for releases #
################################

dist: release
	tar cJvf radare2-webui-$(VERSION).tar.xz dist

indivualdist:
	cd dist
	tar zcvf ../r2-webui-enyo.tar.gz enyo
	tar zcvf ../r2-webui-m.tar.gz m
	tar zcvf ../r2-webui-t.tar.gz t
	tar zcvf ../r2-webui-p.tar.gz p

##################
# Cleaning files #
##################

clean:
	$(MAKE) -C www/enyo clean
	rm -rf dist
	rm -rf dev

mrproper:
	git clean -xdf

.PHONY: enyo all
.ONESHELL: indivualdist
