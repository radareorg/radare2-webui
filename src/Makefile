# GNU make; use windows/Makefile with nmake on Windows.
UNAME_S := $(shell uname -s)
SVG ?= assets/radare.svg
ifeq ($(UNAME_S),Darwin)
PLATFORM := macos
else ifeq ($(UNAME_S),Linux)
PLATFORM := linux
else
PLATFORM := windows
endif

.PHONY: all macos linux windows run clean check icons
all: $(PLATFORM)
icons:
	python3 scripts/generate-icons.py "$(SVG)"
macos linux:
	$(MAKE) -C $@
windows:
	@echo "Use an MSVC Native Tools prompt: cd windows && nmake"
	@exit 1
run:
	$(MAKE) -C $(PLATFORM) run
check:
	$(MAKE) -C $(PLATFORM) check
clean:
	$(MAKE) -C macos clean
	$(MAKE) -C linux clean
