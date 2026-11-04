# GNU make; use windows/Makefile with nmake on Windows.
UNAME_S := $(shell uname -s)
SVG ?= assets/radare.svg
R2PM_BINDIR ?= $(shell r2pm -H R2PM_BINDIR)
BINDIR ?= $(R2PM_BINDIR)
APPDIR = $(BINDIR)/../share/r2wui
ifeq ($(UNAME_S),Darwin)
PLATFORM := macos
INSTALL_FILES = macos/build/r2webui.app
INSTALL_BINARY = r2webui.app/Contents/MacOS/r2webui
else ifeq ($(UNAME_S),Linux)
PLATFORM := linux
INSTALL_FILES = linux/build/r2webui linux/build/webui
INSTALL_BINARY = r2webui
else ifneq ($(filter MINGW% MSYS% CYGWIN%,$(UNAME_S)),)
PLATFORM := windows
else
PLATFORM := unsupported
endif

.PHONY: all macos linux windows unsupported run clean check icons user-install user-uninstall check-bindir
all: $(PLATFORM)
icons:
	python3 scripts/generate-icons.py "$(SVG)"
macos linux:
	$(MAKE) -C $@
windows:
	@echo "Use an MSVC Native Tools prompt: cd windows && nmake"
	@exit 1
unsupported:
	@echo "Unsupported OS: $(UNAME_S)"
	@exit 1
run:
	$(MAKE) -C $(PLATFORM) run
check:
	$(MAKE) -C $(PLATFORM) check
clean:
	$(MAKE) -C macos clean
	$(MAKE) -C linux clean

check-bindir:
	@test -n "$(BINDIR)" || { echo "Set R2PM_BINDIR or BINDIR, or install r2pm."; exit 1; }

user-install: check-bindir all
	mkdir -p "$(BINDIR)" "$(APPDIR)"
	cp -R $(INSTALL_FILES) "$(APPDIR)/"
	appdir=$$(cd "$(APPDIR)" && pwd) && \
		printf '#!/bin/sh\nexec "%s" "$$@"\n' "$$appdir/$(INSTALL_BINARY)" > "$(BINDIR)/r2wui"
	chmod 755 "$(BINDIR)/r2wui"

user-uninstall: check-bindir
	rm -f "$(BINDIR)/r2wui"
	rm -rf "$(APPDIR)"
