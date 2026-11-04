VALAC ?= valac
PACKAGES = --pkg gtk4 --pkg webkitgtk-6.0 --pkg libsoup-3.0 --pkg posix
VALAFLAGS ?= -X -Os -X -s
WEBUI_DIR = build/webui

.PHONY: all run check clean
all: build/r2webui webui
build/r2webui: App.vala Session.vala
	pkg-config --exists gtk4 webkitgtk-6.0 libsoup-3.0
	mkdir -p build
	$(VALAC) $(VALAFLAGS) $(PACKAGES) -o $@ Session.vala App.vala
run: all
	./build/r2webui $(FILE)
build/session-test: Session.vala SessionTest.vala
	mkdir -p build
	$(VALAC) $(VALAFLAGS) --pkg gio-2.0 --pkg libsoup-3.0 --pkg posix -o $@ $^
check: webui build/session-test
	R2_WEBUI_ROOT="$(abspath $(WEBUI_DIR))" ./build/session-test
clean:
	rm -rf build

include ../webui.mk
