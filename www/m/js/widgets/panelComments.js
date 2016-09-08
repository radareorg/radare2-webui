function panelComments() {
	var widget = widgetContainer.getWidget('Comments');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	lastViews.registerMethod(widget.getOffset(), panelDisasm);
	updates.registerMethod(widget.getOffset(), function() {});

	c.style.backgroundColor = '#f0f0f0';
	c.innerHTML = '<br />';
	c.innerHTML += uiButton('javascript:notes()', 'Notes');
	c.innerHTML += '<br /><br />';
	r2.cmd('CC', function(d) {
		var table = new Table(
			['+Offset', '~Comment'],
			[true, false],
			'commentsTable',
			function(row, newVal) {
				var offset = row[0];

				// remove
				r2.cmd('CC- @ ' + offset);

				// add new
				r2.cmd('CCu base64:' + window.btoa(newVal) + ' @ ' + offset);

				update();
			});

		var lines = d.split(/\n/); //clickableOffsets (d).split (/\n/);
		for (var i in lines) {
			var line = lines[i].split(/ (.+)?/);
			if (line.length >= 2) {
				table.addRow([line[0], line[1]]);
			}
		}
		table.insertInto(c);
	});
}
