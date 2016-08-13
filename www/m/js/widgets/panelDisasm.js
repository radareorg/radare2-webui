var disasm;

function panelDisasm() {
	var widget = widgetContainer.getWidget('Disassembly');
	var c = widgetContainer.getWidgetDOMWrapper(widget);
	c.classList.add('disasmPanel');

	if (typeof disasm === 'undefined') {
		disasm = new Disasm(c, 24);
	} else {
		disasm.resetContainer(c);
	}

	disasm.draw();

	var recall = function() {
		disasm.refreshInitialOffset();
		disasm.resetContainer(c);
		disasm.draw();
	};

	// Disasm is "seekable", we need to define behavior before and after drawing
	updates.registerMethod(widget.getOffset(), function() {});
	lastViews.registerMethod(widget.getOffset(), recall);
}
