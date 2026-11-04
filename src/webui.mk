# The default tiles UI needs no JS toolchain: its assets are already plain JS/CSS.
WEBUI_SOURCE = ../../www/t
.PHONY: webui
webui: $(WEBUI_DIR)/t/index.html $(WEBUI_DIR)/t/app.js $(WEBUI_DIR)/t/stylesheet.css
	@for ui in m p enyo; do \
		for base in ../../dist ../../dev; do \
			if test -f "$$base/$$ui/index.html"; then \
				mkdir -p "$(WEBUI_DIR)/$$ui"; \
				cp -R "$$base/$$ui/." "$(WEBUI_DIR)/$$ui/"; \
				break; \
			fi; \
		done; \
	done
$(WEBUI_DIR)/t/index.html: $(WEBUI_SOURCE)/index.html
	mkdir -p $(WEBUI_DIR)/t
	cp $< $@
$(WEBUI_DIR)/t/app.js: $(WEBUI_SOURCE)/js/t.js $(WEBUI_SOURCE)/js/tools.js ../webui.mk
	mkdir -p $(WEBUI_DIR)/t
	cat $(WEBUI_SOURCE)/js/t.js $(WEBUI_SOURCE)/js/tools.js > $@
$(WEBUI_DIR)/t/stylesheet.css: $(WEBUI_SOURCE)/css/style.css
	mkdir -p $(WEBUI_DIR)/t
	cp $< $@
