SWIFTC = swiftc
BUILD = build
APP = $(BUILD)/r2webui.app
BIN = $(APP)/Contents/MacOS/r2webui
WEBUI_DIR = $(APP)/Contents/Resources/webui
ICON = $(APP)/Contents/Resources/r2webui.icns
SWIFTFLAGS ?= -O -target $(shell uname -m)-apple-macosx11.0
export CLANG_MODULE_CACHE_PATH := $(abspath $(BUILD)/module-cache)

.PHONY: all run clean check check-ui
all: $(BIN) $(ICON) webui
$(ICON): ../assets/icons/r2webui.icns
	mkdir -p $(APP)/Contents/Resources
	cp $< $@
$(BIN): App.swift Main.swift Session.swift Info.plist
	mkdir -p $(APP)/Contents/MacOS
	$(SWIFTC) $(SWIFTFLAGS) -framework Cocoa -framework WebKit Session.swift App.swift Main.swift -o $@
	cp Info.plist $(APP)/Contents/Info.plist
run: all
	$(BIN) $(FILE)
$(BUILD)/session-test: Session.swift SessionTest.swift
	mkdir -p $(BUILD)
	$(SWIFTC) $(SWIFTFLAGS) Session.swift SessionTest.swift -o $@
$(BUILD)/ui-test: Session.swift App.swift UITest.swift
	mkdir -p $(BUILD)
	$(SWIFTC) $(SWIFTFLAGS) -framework Cocoa -framework WebKit Session.swift App.swift UITest.swift -o $@
check: webui $(BUILD)/session-test
	R2_WEBUI_ROOT="$(abspath $(WEBUI_DIR))" $(BUILD)/session-test
check-ui: webui $(BUILD)/ui-test
	R2_WEBUI_ROOT="$(abspath $(WEBUI_DIR))" $(BUILD)/ui-test
clean:
	rm -rf $(BUILD)

include ../webui.mk
