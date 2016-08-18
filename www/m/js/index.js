var update = function() {/* nop */};
var inColor = true;
var lastView = panelDisasm;

function uiButton(href, label, type) {
	if (type == 'active') {
		return '&nbsp;<a href="' + href.replace(/"/g,'\'') + '" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-color--accent mdl-color-text--accent-contrast" style="background-color:#f04040 !important">' + label + '</a>';
	}
	return '&nbsp;<a href="' + href.replace(/"/g,'\'') + '" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-color--accent mdl-color-text--accent-contrast">' + label + '</a>';
}

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
function uiCheckList(grp, id, label) {
	return '<li> <label for="' + grp + '" class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect"> <input type="checkbox" id="' + id + '" class="mdl-checkbox__input" /><span class="mdl-checkbox__label">' + label + '</span> </label> </li>';
}

function notes() {
	var widget = widgetContainer.getWidget('Notes');
	var dom = widgetContainer.getWidgetDOMWrapper(widget);

	var out = '<br />' + uiButton('javascript:panelComments()', '&lt; Comments');
	out += '<br /><br /><textarea rows=32 style="width:100%"></textarea>';
	c.innerHTML = out;
}

function setFlagspace(fs) {
	if (!fs) fs = prompt('name');
	if (!fs) return;
	r2.cmd('fs ' + fs, function() {
		flagspaces();
	});
}

function renameFlagspace(fs) {
	if (!fs) fs = prompt('name');
	if (!fs) return;
	r2.cmd('fsr ' + fs, function() {
		flagspaces();
	});
}

function delFlagspace(fs) {
	if (!fs) fs = '.';
	if (!fs) return;
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
				if (selected) a += '<font color=\'red\'>' + line[3] + '</font>';
				else a += line[3];
				a += '</a>';
				body += uiTableRow([
				'+' + line[1], a
				]);
			}
		}
		body += uiTableEnd();
		c.innerHTML += body;
	});
}

function analyzeSymbols() {
	statusMessage('Analyzing symbols...');
	r2.cmd('aa',function() {
		statusMessage('done');
		update();
	});
}
function analyzeRefs() {
	statusMessage('Analyzing references...');
	r2.cmd('aar',function() {
		statusMessage('done');
		update();
	});
}
function analyzeCalls() {
	statusMessage('Analyzing calls...');
	r2.cmd('aac',function() {
		statusMessage('done');
		update();
	});
}
function analyzeFunction() {
	statusMessage('Analyzing function...');
	r2.cmd('af',function() {
		statusMessage('done');
		update();
	});
}
function analyzeNames() {
	statusMessage('Analyzing names...');
	r2.cmd('.afna @@ fcn.*',function() {
		statusMessage('done');
		update();
	});
}

function smallDisasm() {
	r2.cmd('e asm.bytes=false');
	r2.cmd('e asm.lines=false');
	r2.cmd('e asm.cmtright=false');
}

function mediumDisasm() {
	r2.cmd('e asm.bytes=false');
	r2.cmd('e asm.lines=true');
	r2.cmd('e asm.lineswidth=8');
	r2.cmd('e asm.cmtright=false');
}

function largeDisasm() {
	r2.cmd('e asm.bytes=true');
	r2.cmd('e asm.lines=true');
	r2.cmd('e asm.lineswidth=12');
	r2.cmd('e asm.cmtright=true');
}

function configPseudo() {
	r2.cmd('e asm.pseudo=1');
	r2.cmd('e asm.syntax=intel');
}

function configOpcodes() {
	r2.cmd('e asm.pseudo=0');
	r2.cmd('e asm.syntax=intel');
}

function configATT() {
	r2.cmd('e asm.pseudo=0');
	r2.cmd('e asm.syntax=att');
}

function panelAbout() {
	r2.cmd('?V', function(version) {
		alert('radare2 material webui by --pancake @ 2015-2016\n\n'+version.trim());
	});
}

function configColorDefault() {
	r2.cmd('ecd', function() {
		update();
	});
}
function configColorRandom() {
	r2.cmd('ecr', function() {
		update();
	});
}

function configColorTheme(theme) {
	r2.cmd('eco ' + theme, function() {
		update();
	});
}

function configPA() {
	r2.cmd('e io.va=false');
}

function configVA() {
	r2.cmd('e io.va=true');
}

function configDebug() {
	r2.cmd('e io.va=true');
	r2.cmd('e io.debug=true');
}

function configArch(name) { r2.cmd('e asm.arch=' + name); }
function configBits8() { r2.cmd('e asm.bits=8'); }
function configBits16() { r2.cmd('e asm.bits=16'); }
function configBits32() { r2.cmd('e asm.bits=32'); }
function configBits64() { r2.cmd('e asm.bits=64'); }
function configColorTrue() { inColor = true; }
function configColorFalse() { inColor = false; }

var comboId = 0;

function uiCombo(d) {
	var fun_name = 'combo' + (++comboId);
	var fun = fun_name + ' = function(e) {';
	fun += ' var sel = document.getElementById("opt_' + fun_name + '");';
	fun += ' var opt = sel.options[sel.selectedIndex].value;';
	fun += ' switch (opt) {';
	for (var a in d) {
		fun += 'case "' + d[a].name + '": ' + d[a].js + '(' + d[a].name + ');break;';
	}
	fun += '}}';
	// CSP violation here
	eval(fun);
	var out = '<select id="opt_' + fun_name + '" onchange="' + fun_name + '()">';
	for (var a in d) {
		var def = (d[a].default) ? ' default' : '';
		out += '<option' + def + '>' + d[a].name + '</option>';
	}
	out += '</select>';
	return out;
}

function uiSwitch(d) {
	// TODO: not yet done
	var out = '' + d +
	'<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect" for="switch-1">' +
	'<input type="checkbox" id="switch-1" class="mdl-switch__input" checked />' +
	'<span class="mdl-switch__label"></span>' +
	'</label>';
	return out;
}

function uiBlock(d) {
	var out = '<div class="mdl-card__supporting-text mdl-shadow--2dp mdl-color-text--blue-grey-50 mdl-cell" style="display:inline-block;margin:5px;color:black !important;background-color:white !important">';
	out += '<h3 style="color:black">' + d.name + '</h3>';
	for (var i in d.blocks) {
		var D = d.blocks[i];
		out += '<br />' + D.name + ': ';
		out += uiCombo(D.buttons);
	}
	out += '</div>';
	return out;
}

function panelSettings() {
	var out = '';

	var widget = widgetContainer.getWidget('Settings');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	updates.registerMethod(widget.getOffset(), panelSettings);

	c.style.backgroundColor = '#f0f0f0';
	out += '<div style=\'margin:10px\'>';
	out += uiBlock({ name: 'Platform', blocks: [
	{ name: 'Arch', buttons: [
	{ name: 'x86', js: 'configArch', default: true },
	{ name: 'arm', js: 'configArch' },
	{ name: 'mips', js: 'configArch' },
	{ name: 'java', js: 'configArch' },
	{ name: 'dalvik', js: 'configArch' },
	{ name: '6502', js: 'configArch' },
	{ name: '8051', js: 'configArch' },
	{ name: 'h8300', js: 'configArch' },
	{ name: 'hppa', js: 'configArch' },
	{ name: 'i4004', js: 'configArch' },
	{ name: 'i8008', js: 'configArch' },
	{ name: 'lh5801', js: 'configArch' },
	{ name: 'lm32', js: 'configArch' },
	{ name: 'm68k', js: 'configArch' },
	{ name: 'malbolge', js: 'configArch' },
	{ name: 'mcs96', js: 'configArch' },
	{ name: 'msp430', js: 'configArch' },
	{ name: 'nios2', js: 'configArch' },
	{ name: 'ppc', js: 'configArch' },
	{ name: 'rar', js: 'configArch' },
	{ name: 'sh', js: 'configArch' },
	{ name: 'snes', js: 'configArch' },
	{ name: 'sparc', js: 'configArch' },
	{ name: 'spc700', js: 'configArch' },
	{ name: 'sysz', js: 'configArch' },
	{ name: 'tms320', js: 'configArch' },
	{ name: 'v810', js: 'configArch' },
	{ name: 'v850', js: 'configArch' },
	{ name: 'ws', js: 'configArch' },
	{ name: 'xcore', js: 'configArch' },
	{ name: 'prospeller', js: 'configArch' },
	{ name: 'gb', js: 'configArch' },
	{ name: 'z80', js: 'configArch' },
	{ name: 'arc', js: 'configArch' },
	{ name: 'avr', js: 'configArch' },
	{ name: 'bf', js: 'configArch' },
	{ name: 'cr16', js: 'configArch' },
	{ name: 'cris', js: 'configArch' },
	{ name: 'csr', js: 'configArch' },
	{ name: 'dcpu16', js: 'configArch' },
	{ name: 'ebc', js: 'configArch' }
	]},
	{ name: 'Bits', buttons: [
	{ name: '64', js: 'configBits64' },
	{ name: '32', js: 'configBits32', default: true },
	{ name: '16', js: 'configBits16' },
	{ name: '8', js: 'configBits8' }
	]},
	{ name: 'OS', buttons: [
	{ name: 'Linux', js: 'configOS_LIN', default: true },
	{ name: 'Windows', js: 'configOS_W32' },
	{ name: 'OSX', js: 'configOS_OSX' }
	]}
	]
	});
	out += uiBlock({ name: 'Disassembly', blocks: [
	{
	name: 'Size', buttons: [
	{ name: 'S', js: 'smallDisasm' },
	{ name: 'M', js: 'mediumDisasm' },
	{ name: 'L', js: 'largeDisasm' }
	]},
	{
	name: 'Decoding', buttons: [
	{ name: 'Pseudo', js: 'configPseudo' },
	{ name: 'Opcodes', js: 'configOpcodes' },
	{ name: 'ATT', js: 'configATT' }
	]},
		       {
			name: 'Colors', buttons: [
			{ name: 'Yes', js: 'configColorTrue', default: true },
			{ name: 'No', js: 'configColorFalse' }
			]
		}, {
			name: 'Theme', buttons: [
				{ name: 'Default', js: 'configColorDefault' },
				{ name: 'Random', js: 'configColorRandom' },
				{ name: 'Solarized', js: 'configColorTheme("solarized")' },
				{ name: 'Ogray', js: 'configColorTheme("ogray")' },
				{ name: 'Twilight', js: 'configColorTheme("twilight")' },
				{ name: 'Rasta', js: 'configColorTheme("rasta")' },
				{ name: 'Tango', js: 'configColorTheme("tango")' },
				{ name: 'White', js: 'configColorTheme("white")' }
				]}
						]
		});
	out += uiBlock({ name: 'Core/IO', blocks: [
		{
			name: 'Mode', buttons: [
			{ name: 'PA', js: 'configPA' },
			{ name: 'VA', js: 'configVA' },
			{ name: 'Debug', js: 'configDebug' }
			]
		}
]});
	out += uiBlock({ name: 'Analysis', blocks: [
		{
			name: 'HasNext', buttons: [
			{ name: 'Yes', js: 'configAnalHasnextTrue', default: true },
			{ name: 'No', js: 'configAnalHasnextFalse' }
			]
		},{
			name: 'Skip Nops', buttons: [
			{ name: 'Yes', js: 'configAnalNopskipTrue', default: true },
			{ name: 'No', js: 'configAnalNopskipFalse' }
			]
		},{
			name: 'NonCode', buttons: [
			{ name: 'Yes', js: 'configAnalNoncodeTrue' },
			{ name: 'No', js: 'configAnalNoncodeFalse', default: true }
			]
		}
		]});
	out += '</div>';
	c.innerHTML = out;
}

function printHeaderPanel(title, cmd, grep) {
	var widget = widgetContainer.getWidget(title);
	widget.setDark();
	var dom = widgetContainer.getWidgetDOMWrapper(widget);

	// TODO, warning? panelFunction // printHeaderPanel (not a complete widget)
	updates.registerMethod(widget.getOffset(), panelFunctions);

	var c = document.createElement('div');
	dom.innerHTML = '';
	dom.appendChild(c);

	c.style.color = '#202020 !important';
	c.style.backgroundColor = '#202020';
	var out = '' ; //
	/*
	out += ''
	+' <div class="mdl-tabs mdl-js-tabs">'
	+'  <div class="mdl-tabs__tab-bar mds-js-ripple-effect">'
	+'    <a href="#tab1-panel" class="mdl-tabs__tab is-active">Headers</a>'
	+'    <a href="#tab2-panel" class="mdl-tabs__tab">Symbols</a>'
	+'    <a href="#tab3-panel" class="mdl-tabs__tab">Imports</a>'
	+'    <a href="#tab4-panel" class="mdl-tabs__tab">Relocs</a>'
	+'    <a href="#tab5-panel" class="mdl-tabs__tab">Sections</a>'
	+'    <a href="#tab6-panel" class="mdl-tabs__tab">SDB</a>'
	+'  </div>'
	+'  <div class="mdl-tabs__panel is-active" id="tab1-panel">'
	+'    <p>Tab 1 Content</p>'
	+'  </div>'
	+'  <div class="mdl-tabs__panel" id="tab2-panel">'
	+'    <p>Tab 2 Content</p>'
	+'  </div>'
	+'  <div class="mdl-tabs__panel" id="tab3-panel">'
	+'    <p>Tab 3 Content</p>'
	+'  </div>'
	+'</div>';
*/
	out += '<div style=\'position:fixed;margin:0.5em\'>';
	out += '&nbsp;' + uiRoundButton('javascript:location.href="/m"', 'undo');
	out += uiButton('javascript:panelHeaders()', 'Headers');
	out += uiButton('javascript:panelSymbols()', 'Symbols');
	out += uiButton('javascript:panelImports()', 'Imports');
	out += uiButton('javascript:panelRelocs()', 'Relocs');
	out += uiButton('javascript:panelSections()', 'Sections');
	out += uiButton('javascript:panelStrings()', 'Strings');
	out += uiButton('javascript:panelSdb()', 'Sdb');
	out += '</div><br /><br /><br /><br />';
	c.innerHTML = out;

	if (grep) {
		cmd += '~' + grep;
	}
	r2.cmd(cmd, function(d) {
		var color = '#f0f0f0';
		d = clickableOffsets(d);
		c.innerHTML += '<pre style=\'margin:1.2em;color:' + color + ' !important\'>' + d + '<pre>';
	});
}

function panelSdb() {
	printHeaderPanel('SDB', 'k bin/cur/***');
}
function panelSections() {
	printHeaderPanel('Sections', 'iSq');
}
function panelStrings() {
	printHeaderPanel('Strings', 'izq');
}
function panelImports() {
	printHeaderPanel('Imports', 'isq', ' imp.');
}

function panelRelocs() {
	printHeaderPanel('Relocs', 'ir');
}

function panelSymbols() {
	printHeaderPanel('Imports', 'isq', '!imp');
}

function panelHeaders() {
	printHeaderPanel('Headers', 'ie;i');
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
		//var dis = clickableOffsets (d);
		//c.innerHTML += "<pre style='font-family:Console,Courier New,monospace' style='color:white !important'>"+dis+"<pre>";

		var table = new Table(
			['+Address', 'Name', '+Size', '+CC'],
			[false, true, false, false],
			'functionTable');

		var lines = d.split(/\n/); //clickableOffsets (d).split (/\n/);
		for (var i in lines) {
			var line = lines[i].split(/ +/);
			if (line.length >= 3) {
				table.addRow([line[0], line[3], line[1], line[2]]);
			}
		}
		table.insertInto(c);
	});

}

var last_console_output = '';

function runCommand(text) {
	if (!text)
	text = document.getElementById('input').value;
	r2.cmd(text, function(d) {
		last_console_output = '\n' + d;
		document.getElementById('output').innerHTML = last_console_output;
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
	if (inColor) {
		c.style.backgroundColor = '#202020';
		c.innerHTML += '<input style=\'position:fixed;padding-left:10px;top:4em;height:1.8em;color:white\' onkeypress=\'consoleKey()\' class=\'mdl-card--expand mdl-textfield__input\' id=\'input\'/>';
		//c.innerHTML += uiButton('javascript:runCommand()', 'Run');
		c.innerHTML += '<div id=\'output\' class=\'pre\' style=\'color:white !important\'><div>';
	} else {
		c.style.backgroundColor = '#f0f0f0';
		c.innerHTML += '<input style=\'color:black\' onkeypress=\'consoleKey()\' class=\'mdl-card--expand mdl-textfield__input\' id=\'input\'/>';
		c.innerHTML += uiButton('javascript:runCommand()', 'Run');
		c.innerHTML += '<div id=\'output\' class=\'pre\' style=\'color:black!important\'><div>';
	}
	document.getElementById('output').innerHTML = last_console_output;
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
	if (!text) text = document.getElementById('search_input').value;
	r2.cmd('"/c ' + text + '"', function(d) {
		document.getElementById('search_output').innerHTML = clickableOffsets(d);
	});
}
function runSearchString(text) {
	if (!text) text = document.getElementById('search_input').value;
	r2.cmd('/ ' + text, function(d) {
		document.getElementById('search_output').innerHTML = clickableOffsets(d);
	});
}
function runSearchROP(text) {
	if (!text) text = document.getElementById('search_input').value;
	r2.cmd('"/R ' + text + '"', function(d) {
		document.getElementById('search_output').innerHTML = clickableOffsets(d);
	});
}

function runSearch(text) {
	if (!text)
	text = document.getElementById('search_input').value;
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
	var indented = js_beautify(str);
	document.getElementById('script').value = indented;
	localStorage['script'] = indented;
}

function runScript() {
	var str = document.getElementById('script').value;
	localStorage['script'] = str;
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
	var out = '<br />';
	out += '<input style=\'background-color:white !important;padding-left:10px;top:3.5em;height:1.8em;color:white\' onkeypress=\'searchKey()\' class=\'mdl-card--expand mdl-textfield__input\' id=\'search_input\'/>';
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

function panelComments() {
	var widget = widgetContainer.getWidget('Comments');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	updates.registerMethod(widget.getOffset(), panelComments);

	c.style.backgroundColor = '#f0f0f0';
	c.innerHTML = '<br />';
	c.innerHTML += uiButton('javascript:notes()', 'Notes');
	c.innerHTML += '<br /><br />';
	r2.cmd('CC', function(d) {
		var table = new Table(
			['+Offset', 'Comment'],
			[true, false],
			'commentsTable');

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

function up() {
	r2.cmd('s--');
	update();
}

function down() {
	r2.cmd('s++');
	update();
}

function uiRoundButton(a, b, c) {
	var out = '';
	out += '<button onclick=' + a + ' class="mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect" ' + c + '>';
	out += '<i class="material-icons" style="opacity:1">' + b + '</i>';
	out += '</button>';
	return out;
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

	c.style['overflow'] = 'none';
	var color = inColor ? 'white' : 'black';
	c.innerHTML = '<br />';
	c.innerHTML += '&nbsp;<a href="javascript:panelDisasm()" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-color--accent mdl-color-text--accent-contrast">&lt; INFO</a> <h3 color=white></h3>';
	var tail = inColor ? '@e:scr.color=1,scr.html=1' : '';
	r2.cmd('pdr' + tail, function(d) {
		c.innerHTML += '<pre style=\'color:' + color + '\'>' + d + '<pre>';
	});
}

function pdtext() {
	var widget = widgetContainer.getWidget('Function');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	c.style['overflow'] = 'none';
	var color = inColor ? 'white' : 'black';
	c.innerHTML = '<br />';
	c.innerHTML += '&nbsp;<a href="javascript:panelDisasm()" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-color--accent mdl-color-text--accent-contrast">&lt; INFO</a> <h3 color=white></h3>';
	var tail = inColor ? '@e:scr.color=1,scr.html=1,asm.lineswidth=0' : '@e:asm.lineswidth=0';
	r2.cmd('e scr.color=1;s entry0;s $S;pD $SS;e scr.color=0', function(d) {
		d = clickableOffsets(d);
		c.innerHTML += '<pre style=\'color:' + color + '\'>' + d + '<pre>';
	});
}

function pdf() {
	var widget = widgetContainer.getWidget('Function');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	c.style['overflow'] = 'none';
	var color = inColor ? 'white' : 'black';
	c.innerHTML = '<br />';
	c.innerHTML += '&nbsp;<a href="javascript:panelDisasm()" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-color--accent mdl-color-text--accent-contrast">&lt; INFO</a> <h3 color=white></h3>';
	var tail = inColor ? '@e:scr.color=1,scr.html=1,asm.lineswidth=0' : '@e:asm.lineswidth=0';
	r2.cmd('pdf' + tail, function(d) {
		c.innerHTML += '<pre style=\'color:' + color + '\'>' + d + '<pre>';
	});
}

function decompile() {
	var widget = widgetContainer.getWidget('Decompile');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	c.style['overflow'] = 'none';
	var color = inColor ? 'white' : 'black';
	c.innerHTML = '<br />';
	c.innerHTML += '&nbsp;<a href="javascript:panelDisasm()" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-color--accent mdl-color-text--accent-contrast">&lt; INFO</a> <h3 color=white></h3>';
	var tail = inColor ? '@e:scr.color=1,scr.html=1' : '';
	r2.cmd('pdc' + tail, function(d) {
		c.innerHTML += '<pre style=\'color:' + color + '\'>' + d + '<pre>';
	});
}

function graph() {
	var widget = widgetContainer.getWidget('Graph');
	widget.setDark();
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	c.style['overflow'] = 'auto';
	var color = inColor ? 'white' : 'black';
	c.innerHTML = '<br />&nbsp;<a href="javascript:panelDisasm()" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-color--accent mdl-color-text--accent-contrast">&lt; INFO</a>';
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

function updateFortune() {
	r2.cmd('fo', function(d) {
		document.getElementById('fortune').innerHTML = d;
		readFortune();
	});
}

// say a message
function speak(text, callback) {
    var u = new SpeechSynthesisUtterance();
    u.text = text;
    u.lang = 'en-US';
 
    u.onend = function () {
        if (callback) {
            callback();
        }
    };
 
    u.onerror = function (e) {
        if (callback) {
            callback(e);
        }
    };
 
    speechSynthesis.speak(u);
}

function readFortune() {
	var f = document.getElementById('fortune').innerHTML;
	speak (f);
}

function updateInfo() {
	r2.cmd('i', function(d) {
		var lines = d.split(/\n/g);
		var lines1 = lines.slice(0,lines.length / 2);
		var lines2 = lines.slice(lines.length / 2);
		var body = '';

		body += '<table style=\'width:100%\'><tr><td>';
		for (var i in lines1) {
			var line = lines1[i].split(/ (.+)?/);
			if (line.length >= 2)
			body += '<b>' + line[0] + '</b> ' + line[1] + '<br/>';
		}
		body += '</td><td>';
		for (var i in lines2) {
			var line = lines2[i].split(/ (.+)?/);
			if (line.length >= 2)
			body += '<b>' + line[0] + '</b> ' + line[1] + '<br/>';
		}
		body += '</td></tr></table>';
		document.getElementById('info').innerHTML = body;
	});
}

function updateEntropy() {
	var eg = document.getElementById('entropy-graph');
	var box = eg.getBoundingClientRect();
	var height = (0 | box.height) - 35 - 19;
	r2.cmd('p=ej 50 $s @ $M', function(d) {
		var body = '';
		var res = JSON.parse(d);
		var values = new Array();

		for (var i in res['entropy']) values.push(res['entropy'][i]['value']);

		var nbvals = values.length;
		var min = Math.min.apply(null, values);
		var max = Math.max.apply(null, values);
		var inc = 500.0 / nbvals;

		// Minimum entropy has 0.1 transparency. Max has 1.
		for (var i in values) {
			var y = 0.1 + (1 - 0.1) * ((values[i] - min) / (max - min));
			var addr = '0x' + res['entropy'][i]['addr'].toString(16);
			body += '<rect x="' + (inc * i).toString();
			body += '" y="0" width="' + inc.toString();
			body += '" height="' + height + '" style="fill:black;fill-opacity:';
			body += y.toString() + ';"><title>';
			body += addr + ' </title></rect>' ;

			if (i % 8 == 0) {
				body += '<text transform="matrix(1 0 0 1 ';
				body += (i * inc).toString();
				body += ' ' + (height + 15) + ')" fill="ff8888" font-family="\'Roboto\'" font-size="9">';
				body += addr + '</text>';
			}
		}

		eg.innerHTML = body;
		eg.onclick = function(e) {
			var box = eg.getBoundingClientRect();
			var pos = e.clientX - box.left;
			var i = 0 | (pos / (box.width / nbvals));
			var addr = '0x' + res['entropy'][i]['addr'].toString(16);
			seek(addr);
		};
	});
}

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
	onClick('menu_headers', panelHeaders);
	onClick('info_headers', panelHeaders);
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
	document.querySelector('.mdl-layout__drawer').addEventListener('click', function () {
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
		panelHeaders,
		panelSettings,
		panelSearch
		];
		if (e.charCode == 'o'.charCodeAt(0)) {
			seek();
		}
		var k = e.charCode - 0x30;
		if (k >= 0 && k < keys.length) {
			var fn = keys[k];
			if (fn) fn();
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
