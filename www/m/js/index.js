var update = function() {/* nop */};
var inColor = true;
var lastView = panelDisasm;

function write() {
	var str = prompt('hexpairs, quoted string or :assembly');
	if (str != '') {
		switch (str[0]) {
			case ':':
				str = str.substring(1);
				r2.cmd('"wa ' + str + '"', update);
				break;
			case '"':
				str = str.replace(/"/g, '');
				r2.cmd('w ' + str, update);
				break;
			default:
				r2.cmd('wx ' + str, update);
				break;
		}
	}
}

function comment() {
	var addr = prompt('comment');
	if (addr) {
		if (addr == '-') {
			r2.cmd('CC-');
		} else {
			r2.cmd('"CC ' + addr + '"');
		}
		update();
	}
}

function flag() {
	var addr = prompt('flag');
	if (addr) {
		if (addr == '-') {
			r2.cmd('f' + addr);
		} else {
			r2.cmd('f ' + addr);
		}
		update();
	}
}

function block() {
	var size = prompt('block');
	if (size && size.trim()) {
		r2.cmd('b ' + size);
		update();
	}
}

function flagsize() {
	var size = prompt('size');
	if (size && size.trim()) {
		r2.cmd('fl $$ ' + size);
		update();
	}
}

var seekAction = new ActionListener(function(x) {
	if (x === undefined) {
		var addr = prompt('address');
	} else {
		var addr = x;
	}
	if (addr && addr.trim() != '') {
		r2.cmd('s ' + addr);
		lastView();
		document.getElementById('content').scrollTop = 0;
		update();
	}
});

var seek = function(x) {
	return seekAction.apply(x);
};

function analyze() {
	r2.cmd('af', function() {
		panelDisasm();
	});
}

function notes() {
	var widget = widgetContainer.getWidget('Notes');
	var dom = widgetContainer.getWidgetDOMWrapper(widget);

	var out = '<br />' + uiButton('javascript:panelComments()', '&lt; Comments');
	out += '<br /><br /><textarea rows=32 style="width:100%"></textarea>';
	c.innerHTML = out;
}

function setFlagspace(fs) {
	if (!fs) {
		fs = prompt('name');
	}
	if (!fs) {
		return;
	}
	r2.cmd('fs ' + fs, function() {
		flagspaces();
	});
}

function renameFlagspace(fs) {
	if (!fs) {
		fs = prompt('name');
	}
	if (!fs) {
		return;
	}
	r2.cmd('fsr ' + fs, function() {
		flagspaces();
	});
}

function delFlagspace(fs) {
	if (!fs) {
		fs = '.';
	}
	if (!fs) {
		return;
	}
	r2.cmd('fs-' + fs, function() {
		flagspaces();
	});
}

function delAllFlags() {
	r2.cmd('f-*', function() {
		panelFlags();
	});
}

function setNullFlagspace(fs) {
	updates.registerMethod(widgetContainer.getFocus(), fs ? panelFlags : flagspaces);
	r2.cmd('fs *', function() {
		flagspaces();
	});
}

/* rename to panelFlagSpaces */
function flagspaces() {

	var widget = widgetContainer.getWidget('Flag Spaces');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	updates.registerMethod(widget.getOffset(), flagspaces);

	c.innerHTML = '<br />&nbsp;' + uiRoundButton('javascript:panelFlags()', 'undo');
	c.innerHTML += '&nbsp;' + uiButton('javascript:setNullFlagspace()', 'Deselect');
	c.innerHTML += '&nbsp;' + uiButton('javascript:setFlagspace()', 'Add');
	c.innerHTML += '&nbsp;' + uiButton('javascript:delFlagspace()', 'Delete');
	c.innerHTML += '&nbsp;' + uiButton('javascript:renameFlagspace()', 'Rename');
	c.innerHTML += '<br /><br />';
	r2.cmd('fs', function(d) {
		var lines = d.split(/\n/);
		var body = uiTableBegin(['+Flags', 'Flagspace']);
		for (var i in lines) {
			var line = lines[i].split(/ +/);
			if (line.length >= 4) {
				var selected = line[2].indexOf('.') == -1;
				var a = '';
				a += '<a href="javascript:setFlagspace(\'' + line[3] + '\')">';
				if (selected) {
					a += '<font color=\'red\'>' + line[3] + '</font>';
				} else {
					a += line[3];
				}
				a += '</a>';
				body += uiTableRow(['+' + line[1], a]);
			}
		}
		body += uiTableEnd();
		c.innerHTML += body;
	});
}

function analyzeSymbols() {
	statusMessage('Analyzing symbols...');
	r2.cmd('aa', function() {
		statusMessage('done');
		update();
	});
}
function analyzeRefs() {
	statusMessage('Analyzing references...');
	r2.cmd('aar', function() {
		statusMessage('done');
		update();
	});
}
function analyzeCalls() {
	statusMessage('Analyzing calls...');
	r2.cmd('aac', function() {
		statusMessage('done');
		update();
	});
}
function analyzeFunction() {
	statusMessage('Analyzing function...');
	r2.cmd('af', function() {
		statusMessage('done');
		update();
	});
}
function analyzeNames() {
	statusMessage('Analyzing names...');
	r2.cmd('.afna @@ fcn.*', function() {
		statusMessage('done');
		update();
	});
}

function panelAbout() {
	r2.cmd('?V', function(version) {
		alert('radare2 material webui by --pancake @ 2015-2016\n\n' + version.trim());
	});
}

function panelFunctions() {
	var widget = widgetContainer.getWidget('Functions');
	widget.setDark();
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	updates.registerMethod(widget.getOffset(), panelFunctions);

	c.style.backgroundColor = '#f0f0f0';
	var body = '<br />';
	body += uiButton('javascript:analyzeSymbols()', 'Symbols');
	body += uiButton('javascript:analyzeCalls()', 'Calls');
	body += uiButton('javascript:analyzeFunction()', 'Function');
	body += uiButton('javascript:analyzeRefs()', 'Refs');
	body += uiButton('javascript:analyzeNames()', 'AutoName');
	body += '<br /><br />';
	c.innerHTML = body;
	r2.cmd('e scr.utf8=false');
	r2.cmd('afl', function(d) {
		var table = new Table(
			['+Address', 'Name', '+Size', '+CC'],
			[false, true, false, false],
			'functionTable');

		var lines = d.split(/\n/); //clickableOffsets (d).split (/\n/);
		for (var i in lines) {
			var items = lines[i].match(/^(0x[0-9a-f]+)\s+([0-9]+)\s+([0-9]+(\s+\-&gt;\s+[0-9]+)?)\s+(.+)$/);
			if (items !== null) {
				table.addRow([items[1], items[5], items[2], items[3]]);
			}
		}
		table.insertInto(c);
	});

}

var lastConsoleOutput = '';

function runCommand(text) {
	if (!text) {
		text = document.getElementById('input').value;
	}
	r2.cmd(text, function(d) {
		lastConsoleOutput = '\n' + d;
		document.getElementById('output').innerHTML = lastConsoleOutput;
	});
}

function consoleKey(e) {
	var inp = document.getElementById('input');
	if (!e) {
		inp.onkeypress = consoleKey;
	} else {
		if (e.keyCode == 13) {
			runCommand(inp.value);
			inp.value = '';
		}
	}
}

function panelConsole() {
	var widget = widgetContainer.getWidget('Console');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	updates.registerMethod(widget.getOffset(), panelConsole);

	c.innerHTML = '<br />';
	var common = 'onkeypress=\'consoleKey()\' class=\'mdl-card--expand mdl-textfield__input\' id=\'input\'';
	if (inColor) {
		c.style.backgroundColor = '#202020';
		var styles = 'position:fixed;padding-left:10px;top:4em;height:1.8em;color:white';
		c.innerHTML += '<input style=\'' + styles + '\' ' + common + ' />';
		//c.innerHTML += uiButton('javascript:runCommand()', 'Run');
		c.innerHTML += '<div id=\'output\' class=\'pre\' style=\'color:white !important\'><div>';
	} else {
		c.style.backgroundColor = '#f0f0f0';
		c.innerHTML += '<input style=\'color:black\' ' + common + '/>';
		c.innerHTML += uiButton('javascript:runCommand()', 'Run');
		c.innerHTML += '<div id=\'output\' class=\'pre\' style=\'color:black!important\'><div>';
	}
	document.getElementById('output').innerHTML = lastConsoleOutput;
}

function searchKey(e) {
	var inp = document.getElementById('search_input');
	if (!e) {
		inp.onkeypress = searchKey;
	} else {
		if (e.keyCode == 13) {
			runSearch(inp.value);
			inp.value = '';
		}
	}
}
function runSearchMagic() {
	r2.cmd('/m', function(d) {
		document.getElementById('search_output').innerHTML = clickableOffsets(d);
	});
}
function runSearchCode(text) {
	if (!text) {
		text = document.getElementById('search_input').value;
	}
	r2.cmd('"/c ' + text + '"', function(d) {
		document.getElementById('search_output').innerHTML = clickableOffsets(d);
	});
}
function runSearchString(text) {
	if (!text) {
		text = document.getElementById('search_input').value;
	}
	r2.cmd('/ ' + text, function(d) {
		document.getElementById('search_output').innerHTML = clickableOffsets(d);
	});
}
function runSearchROP(text) {
	if (!text) {
		text = document.getElementById('search_input').value;
	}
	r2.cmd('"/R ' + text + '"', function(d) {
		document.getElementById('search_output').innerHTML = clickableOffsets(d);
	});
}

function runSearch(text) {
	if (!text) {
		text = document.getElementById('search_input').value;
	}
	if (text[0] == '"') {
		r2.cmd('"/ ' + text + '"', function(d) {
			document.getElementById('search_output').innerHTML = clickableOffsets(d);
		});
	} else {
		r2.cmd('"/x ' + text + '"', function(d) {
			document.getElementById('search_output').innerHTML = clickableOffsets(d);
		});
	}
}

function indentScript() {
	var str = document.getElementById('script').value;
	var indented = /* NOT DEFINED js_beautify*/ (str);
	document.getElementById('script').value = indented;
	localStorage.script = indented;
}

function runScript() {
	var str = document.getElementById('script').value;
	localStorage.script = str;
	document.getElementById('scriptOutput').innerHTML = '';
	try {
		var msg = '"use strict";' +
		'function log(x) { var a = ' +
		'document.getElementById(\'scriptOutput\'); ' +
		'if (a) a.innerHTML += x + \'\\n\'; }\n';
		// CSP violation here
		eval(msg + str);
	} catch (e) {
		alert(e);
	}
}

var foo = '';
function toggleScriptOutput() {
	var o = document.getElementById('scriptOutput');
	if (o) {
		if (foo == '') {
			foo = o.innerHTML;
			o.innerHTML = '';
		} else {
			o.innerHTML = foo;
			foo = '';
		}
	}
}

function panelScript() {
	var widget = widgetContainer.getWidget('Script');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	updates.registerMethod(widget.getOffset(), panelScript);

	c.style.backgroundColor = '#f0f0f0';
	var localScript = localStorage.getItem('script');
	var out = '<br />' + uiButton('javascript:runScript()', 'Run');
	out += '&nbsp;' + uiButton('javascript:indentScript()', 'Indent');
	out += '&nbsp;' + uiButton('javascript:toggleScriptOutput()', 'Output');
	out += '<br /><div class="output" id="scriptOutput"></div><br />';
	out += '<textarea rows=32 id="script" class="pre" style="width:100%">';
	if (!localScript) {
		localScript = 'r2.cmd("?V", log);';
	}
	out += localScript + '</textarea>';
	c.innerHTML = out;
}

function panelSearch() {
	var widget = widgetContainer.getWidget('Search');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	updates.registerMethod(widget.getOffset(), panelSearch);

	c.style.backgroundColor = '#f0f0f0';
	var style = 'background-color:white !important;padding-left:10px;top:3.5em;height:1.8em;color:white';
	var classes = 'mdl-card--expand mdl-textfield__input';
	var out = '<br />';
	out += '<input style=\'' + style + '\' onkeypress=\'searchKey()\' class=\'' + classes + '\' id=\'search_input\'/>';
	out += '<br />';
	out += uiButton('javascript:runSearch()', 'Hex');
	out += uiButton('javascript:runSearchString()', 'String');
	out += uiButton('javascript:runSearchCode()', 'Code');
	out += uiButton('javascript:runSearchROP()', 'ROP');
	out += uiButton('javascript:runSearchMagic()', 'Magic');
	out += '<br /><br />';
	out += '<div id=\'search_output\' class=\'pre\' style=\'color:black!important\'><div>';
	c.innerHTML = out;
}

function panelFlags() {
	var widget = widgetContainer.getWidget('Flags');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	updates.registerMethod(widget.getOffset(), panelFlags);

	c.style.backgroundColor = '#f0f0f0';
	c.innerHTML = '<br />';
	c.innerHTML += uiButton('javascript:flagspaces()', 'Spaces');
	c.innerHTML += uiButton('javascript:delAllFlags()', 'DeleteAll');
	c.innerHTML += '<br /><br />';
	r2.cmd('f', function(d) {

		var table = new Table(
			['+Offset', '+Size', 'Name'],
			[true, true, false],
			'flagsTable');

		var lines = d.split(/\n/); //clickableOffsets (d).split (/\n/);
		for (var i in lines) {
			var line = lines[i].split(/ /);
			if (line.length >= 3) {
				table.addRow([line[0], line[1], line[2]]);
			}
		}
		table.insertInto(c);
	});
}

function up() {
	r2.cmd('s--');
	update();
}

function down() {
	r2.cmd('s++');
	update();
}

var nativeDebugger = false;

function srpc() {
	r2.cmd('sr pc', update);
}
function stepi() {
	if (nativeDebugger) {
		r2.cmd('ds', update);
	} else {
		r2.cmd('aes', update);
	}
}
function cont() {
	if (nativeDebugger) {
		r2.cmd('dc', update);
	} else {
		r2.cmd('aec', update);
	}
}
function setbp() {
	r2.cmd('db $$', update);
}
function setreg() {
	var expr = prompt('register=value');
	if (expr != '') {
		if (nativeDebugger) {
			r2.cmd('dr ' + expr + ';.dr*', update);
		} else {
			r2.cmd('aer ' + expr + ';.ar*', update);
		}
	}
}

function panelDebug() {
	r2.cmd('e cfg.debug', function(x) {
		nativeDebugger = (x.trim() == 'true');
	});

	var widget = widgetContainer.getWidget('Debugger');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	updates.registerMethod(widget.getOffset(), panelDebug);
	lastViews.registerMethod(widget.getOffset(), panelDebug);

	if (inColor) {
		c.style.backgroundColor = '#202020';
	}
	var out = '<div style=\'position:fixed;margin:0.5em\'>';
	out += uiRoundButton('javascript:up()', 'keyboard_arrow_up');
	out += uiRoundButton('javascript:down()', 'keyboard_arrow_down');
	out += '&nbsp;';
	out += uiButton('javascript:srpc()', 'PC');
	out += uiButton('javascript:stepi()', 'Step');
	out += uiButton('javascript:cont()', 'Cont');
	out += uiButton('javascript:setbp()', 'BP');
	out += uiButton('javascript:setreg()', 'REG');
	out += '</div><br /><br /><br /><br />';
	c.innerHTML = out;
	var tail = '';
	if (inColor) {
		tail = '@e:scr.color=1,scr.html=1';
	}
	// stack
	if (nativeDebugger) {
		var rcmd = 'dr';
	} else {
		var rcmd = 'ar';
	}
	r2.cmd('f cur;.' + rcmd + '*;sr sp;px 64', function(d) {
		var dis = clickableOffsets(d);
		c.innerHTML += '<pre style=\'margin:10px;color:grey\'>' + dis + '<pre>';
	});
	r2.cmd(rcmd + '=;s cur;f-cur;pd 128' + tail, function(d) {
		var dis = clickableOffsets(d);
		c.innerHTML += '<pre style=\'color:grey\'>' + dis + '<pre>';
	});
}

function saveProject() {
	r2.cmd('Ps', function() {
		alert('Project saved');
	});
}
function deleteProject() {
	alert('Project deleted');
	location.href = 'open.html';
}
function closeProject() {
	alert('Project closed');
	location.href = 'open.html';
}
function rename() {
	var name = prompt('name');
	if (name && name.trim() != '') {
		r2.cmd('afn ' + name);
		r2.cmd('f ' + name);
		update();
	}
}
function info() {
	var widget = widgetContainer.getWidget('Info');
	widget.setDark();
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	var color = inColor ? 'white' : 'black';
	var out = '<br />'; //Version: "+d;
	out += uiRoundButton('javascript:panelDisasm()', 'undo');
	out += '&nbsp;';
	out += uiButton('javascript:pdtext()', 'Full');
	out += uiButton('javascript:pdf()', 'Func');
	out += uiButton('javascript:graph()', 'Graph');
	out += uiButton('javascript:blocks()', 'Blocks');
	out += uiButton('javascript:decompile()', 'Decompile');
	c.innerHTML = out;
	r2.cmd('afi', function(d) {
		c.innerHTML += '<pre style=\'color:' + color + '\'>' + d + '<pre>';
	});
}

function blocks() {
	var widget = widgetContainer.getWidget('Blocks');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	c.style.overflow = 'none';
	var color = inColor ? 'white' : 'black';
	var cl = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect ';
	cl += 'mdl-color--accent mdl-color-text--accent-contrast';
	c.innerHTML = '<br />';
	c.innerHTML += '&nbsp;<a href="javascript:panelDisasm()" class="' + cl + '">&lt; INFO</a> <h3 color=white></h3>';
	var tail = inColor ? '@e:scr.color=1,scr.html=1' : '';
	r2.cmd('pdr' + tail, function(d) {
		c.innerHTML += '<pre style=\'color:' + color + '\'>' + d + '<pre>';
	});
}

function pdtext() {
	var widget = widgetContainer.getWidget('Function');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	c.style.overflow = 'none';
	var color = inColor ? 'white' : 'black';
	var cl = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect ';
	cl += 'mdl-color--accent mdl-color-text--accent-contrast';
	c.innerHTML = '<br />';
	c.innerHTML += '&nbsp;<a href="javascript:panelDisasm()" class="' + cl + '">&lt; INFO</a> <h3 color=white></h3>';
	var tail = inColor ? '@e:scr.color=1,scr.html=1,asm.lineswidth=0' : '@e:asm.lineswidth=0';
	r2.cmd('e scr.color=1;s entry0;s $S;pD $SS;e scr.color=0', function(d) {
		d = clickableOffsets(d);
		c.innerHTML += '<pre style=\'color:' + color + '\'>' + d + '<pre>';
	});
}

function pdf() {
	var widget = widgetContainer.getWidget('Function');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	c.style.overflow = 'none';
	var color = inColor ? 'white' : 'black';
	var cl = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect ';
	cl += 'mdl-color--accent mdl-color-text--accent-contrast';
	c.innerHTML = '<br />';
	c.innerHTML += '&nbsp;<a href="javascript:panelDisasm()" class="' + cl + '">&lt; INFO</a> <h3 color=white></h3>';
	var tail = inColor ? '@e:scr.color=1,scr.html=1,asm.lineswidth=0' : '@e:asm.lineswidth=0';
	r2.cmd('pdf' + tail, function(d) {
		c.innerHTML += '<pre style=\'color:' + color + '\'>' + d + '<pre>';
	});
}

function decompile() {
	var widget = widgetContainer.getWidget('Decompile');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	c.style.overflow = 'none';
	var color = inColor ? 'white' : 'black';
	var cl = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect ';
	cl += 'mdl-color--accent mdl-color-text--accent-contrast';
	c.innerHTML = '<br />';
	c.innerHTML += '&nbsp;<a href="javascript:panelDisasm()" class="' + cl + '">&lt; INFO</a> <h3 color=white></h3>';
	var tail = inColor ? '@e:scr.color=1,scr.html=1' : '';
	r2.cmd('pdc' + tail, function(d) {
		c.innerHTML += '<pre style=\'color:' + color + '\'>' + d + '<pre>';
	});
}

function graph() {
	var widget = widgetContainer.getWidget('Graph');
	widget.setDark();
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	c.style.overflow = 'auto';
	var color = inColor ? 'white' : 'black';
	var cl = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect ';
	cl += 'mdl-color--accent mdl-color-text--accent-contrast';
	c.innerHTML = '<br />&nbsp;<a href="javascript:panelDisasm()" class="' + cl + '">&lt; INFO</a>';
	var tail = inColor ? '@e:scr.color=1,scr.html=1' : '';
	r2.cmd('agf' + tail, function(d) {
		d = clickableOffsets(d);
		c.innerHTML += '<pre style=\'color:' + color + '\'>' + d + '<pre>';
	});
}

//-------------

Array.prototype.forEach.call(document.querySelectorAll('.mdl-card__media'), function(el) {
	var link = el.querySelector('a');
	if (!link) {
		return;
	}
	var target = link.getAttribute('href');
	if (!target) {
		return;
	}
	el.addEventListener('click', function() {
		location.href = target;
	});
});

function onClick(a, b) {
	var h = document.getElementById(a);
	if (h) {
		h.addEventListener('click', function() {
			b();
		});
	} else {
		console.error('onclick-error', a);
	}
}

function panelHelp() {
	alert('TODO');
}

function analyzeButton() {
	function cb() {
		updateFortune();
		updateInfo();
		updateEntropy();
	}
	if (E('anal_calls').checked) {
		r2.cmd('e anal.calls=true;aac', cb);
	} else {
		r2.cmd('e anal.calls=false');
	}
	if (E('anal_prelude').checked) {
		r2.cmd('aap', cb);
	}
	if (E('anal_emu').checked) {
		r2.cmd('e asm.emu=1;aae;e asm.emu=0', cb);
	} else {
		r2.cmd('e asm.emu=false');
	}
	if (E('anal_autoname').checked) {
		r2.cmd('aan', cb);
	}
	if (E('anal_symbols').checked) {
		r2.cmd('aa', cb); // aaa or aaaa
	}
}

var twice = false;
var widgetContainer = undefined;
var updates = undefined;
var lastViews = undefined;
function ready() {
	if (twice) {
		return;
	}
	twice = true;

	// Loading configuration from localStorage (see panelSettings)
	applyConf();

	updates = new UpdateManager();
	lastViews = new UpdateManager();

	// Define Widget container
	widgetContainer = new ContainerZone('content', 'ruler', 'title');
	widgetContainer.fallbackWidget(panelDisasm);
	widgetContainer.addFocusListener(updates);
	widgetContainer.addFocusListener(lastViews);

	update = function() {
		updates.apply();
	};

	lastView = function() {
		lastViews.apply();
	};

	// Defining default situation
	panelOverview();

	/* left menu */
	onClick('analyze_button', analyzeButton);
	onClick('menu_overview', panelOverview);
	onClick('menu_disasm', panelDisasm);
	onClick('menu_debug', panelDebug);
	onClick('menu_hexdump', panelHexdump);
	onClick('menu_functions', panelFunctions);
	onClick('menu_flags', panelFlags);
	onClick('menu_search', panelSearch);
	onClick('menu_comments', panelComments);
	//onClick('menu_console', panelConsole);
	onClick('menu_script', panelScript);
	onClick('menu_help', panelHelp);

	/* left sub-menu */
	onClick('menu_project_save', saveProject);
	onClick('menu_project_delete', deleteProject);
	onClick('menu_project_close', closeProject);

	/* right menu */
	onClick('menu_seek', seek);
	//onClick('menu_console', panelConsole);
	onClick('menu_settings', panelSettings);
	onClick('menu_about', panelAbout);
	onClick('menu_mail', function() {
		window.location = 'mailto:pancake@nopcode.org';
	});

	// Set autocompletion
	var autocompletion = new Autocompletion('search', 'search_autocomplete', 'fs *;fj');
	autocompletion.setPrepareView(function() {
		// If not splitted we split the view
		if (!widgetContainer.isSplitted()) {
			widgetContainer.split(widgetContainer.Layout.VERTICAL);
		}
		panelDisasm();
	});

	// Close the drawer on click with small screens
	document.querySelector('.mdl-layout__drawer').addEventListener('click', function() {
		document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');
		this.classList.remove('is-visible');
	}, false);
}

window.onload = ready;

document.addEventListener('DOMContentLoaded', ready, false);

document.body.onkeypress = function(e) {
	if (e.ctrlKey) {
		const keys = [
		panelConsole,
		panelDisasm,
		panelDebug,
		panelHexdump,
		panelFunctions,
		panelFlags,
		panelOverview,
		panelSettings,
		panelSearch
		];
		if (e.charCode == 'o'.charCodeAt(0)) {
			seek();
		}
		var k = e.charCode - 0x30;
		if (k >= 0 && k < keys.length) {
			var fn = keys[k];
			if (fn) {
				fn();
			}
		}
	}
};

/* global keybindings are dangerous */
/*
document.body.onkeypress = function(e){
	if (e.keyCode == ':'.charCodeAt(0)) {
		statusConsole();
	}
}
*/
