var hexdump;

function panelHexdump() {
	var widget = widgetContainer.getWidget('Hexdump');
	var c = widgetContainer.getWidgetDOMWrapper(widget);
	c.classList.add('hexdump');

	if (typeof hexdump === 'undefined') {
		var isBigEndian;
		r2.cmd('e cfg.bigendian', function(b) {
			isBigEndian = (b == 'true');
		});

		hexdump = new Hexdump(c, 24, isBigEndian);
		hexdump.setOnChangeCallback(function(offset, before, after) {
			console.log('changed');
		});
	} else {
		hexdump.resetContainer(c);
	}

	hexdump.draw();
	widget.setDark();

	var recall = function() {
		hexdump.refreshInitialOffset();
		hexdump.resetContainer(c);
		hexdump.draw();
		widget.setDark();
	};

	// Hexdump is "seekable", we need to define behavior before and after drawing
	updates.registerMethod(widget.getOffset(), function() {});
	lastViews.registerMethod(widget.getOffset(), recall);
};
