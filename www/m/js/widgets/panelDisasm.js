/*function panelDisasm() {
	var widget = widgetContainer.getWidget('Disassembly');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	updates.registerMethod(widget.getOffset(), panelDisasm);
	lastViews.registerMethod(widget.getOffset(), panelDisasm);

	if (inColor) {
		c.style.backgroundColor = '#202020';
	}
	var out = '<div style=\'position:fixed;margin:0.5em\'>';
	out += uiRoundButton('javascript:up()', 'keyboard_arrow_up');
	out += uiRoundButton('javascript:down()', 'keyboard_arrow_down');
	out += '&nbsp;';
	out += uiButton('javascript:analyze()', 'ANLZ');
	out += uiButton('javascript:comment()', 'CMNT');
	out += uiButton('javascript:info()', 'Info');
	out += uiButton('javascript:rename()', 'RNME');
	out += uiButton('javascript:write()', 'Wrte');
	out += '</div><br /><br /><br />';

	c.innerHTML = out;
	c.style['font-size'] = '12px';
	var tail = '';
	if (inColor) {
		tail = '@e:scr.color=1,scr.html=1';
	}

	r2.cmd('pd 128' + tail, function(d) {
		var dis = clickableOffsets(d);
		ret = '';
		ret += '<center>' + uiRoundButton('javascript:up()', 'keyboard_arrow_up') + uiRoundButton('javascript:down()', 'keyboard_arrow_down') + '</center>';
		ret += '<pre style=\'color:grey\'>' + dis + '<pre>';
		ret += '<center>' + uiRoundButton('javascript:down()', 'keyboard_arrow_down') + '</center><br /><br />';

		c.innerHTML += ret;
	});
}*/

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
