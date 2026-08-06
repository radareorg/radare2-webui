var myLayout;

// Propagate the r2 `eco` color theme to the UI chrome through CSS variables
// consumed by panels.css. Only background/widget hues are taken verbatim:
// the palette's semantic colors (comment red, addr green...) are meant for
// disassembly text, so foregrounds are neutral tones computed against the
// theme background and the accent uses the calm `flow` hue.
function apply_theme() {
	r2.cmdj('ecj|', function(p) {
		if (p === null || p === undefined) return;
		var root = document.documentElement.style;
		var rgb = function(c) {
			return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
		};
		var mix = function(a, b, t) {
			return [Math.round(a[0] + (b[0] - a[0]) * t),
				Math.round(a[1] + (b[1] - a[1]) * t),
				Math.round(a[2] + (b[2] - a[2]) * t)];
		};
		var dist = function(a, b) {
			return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
		};
		var bg = p['gui.background'] || [20, 20, 20];
		var is_dark = (bg[0] + bg[1] + bg[2]) / 3 < 128;
		var fg = is_dark ? [212, 212, 212] : [35, 35, 35];
		// use widget.bg for raised surfaces only when it is a near-neutral
		// tone; saturated values (e.g. from `ecr`) would tint all the chrome
		var bg2 = p['widget.bg'];
		var saturation = bg2 === undefined ? 999
			: Math.max(bg2[0], bg2[1], bg2[2]) - Math.min(bg2[0], bg2[1], bg2[2]);
		if (bg2 === undefined || saturation > 40 || dist(bg2, bg) < 24) {
			bg2 = mix(bg, fg, 0.08);
		}
		var accent = p['flow'] || p['widget.sel'] || fg;
		root.setProperty('--r2-bg', rgb(bg));
		root.setProperty('--r2-bg2', rgb(bg2));
		root.setProperty('--r2-border', rgb(mix(bg, fg, 0.22)));
		root.setProperty('--r2-fg', rgb(fg));
		root.setProperty('--r2-fg-muted', rgb(mix(fg, bg, 0.42)));
		root.setProperty('--r2-accent', rgb(accent));
		root.setProperty('--r2-accent2', rgb(p['fname'] || accent));
	});
}

$(document).ready(function() {

	r2.cmd('e scr.html=false');
	// create tabs FIRST so elems are correct size BEFORE Layout measures them
	$('#main_panel').tabs({
		// the 'select' event was removed in jQuery UI 1.10, use 'activate'
		activate: function(event, ui) {
			var label = ui.newTab.text();
			if (label.indexOf('Disas') > -1) r2ui._dis.render();
			else if (label.indexOf('Decompiler') > -1) r2ui._dec.render();
			else if (label.indexOf('Comments') > -1) r2ui._cmt.render();
			else if (label.indexOf('Entropy') > -1) r2ui._ent.render();
			else if (label.indexOf('Strings') > -1) r2ui._str.render();
			else if (label.indexOf('Types') > -1) r2ui._typ.render();
			else if (label.indexOf('Settings') > -1) r2ui._set.render();
			else if (label.indexOf('Projects') > -1) r2ui._prj.render();
			else if (label.indexOf('Hex') > -1) r2ui._hex.render();
			else if (label.indexOf('Logs') > -1) r2ui._log.render();
		}
	});

	// jquery.layout's resizePaneAccordions callback plugin is not part of the
	// bundled build, so refresh the accordions ourselves whenever a side pane
	// changes size (window resize included)
	var resizeAccordions = function() {
		$('#accordion1, #accordion2').each(function() {
			if ($(this).data('ui-accordion')) $(this).accordion('refresh');
		});
	};

	// Layout
	myLayout = $('body').layout({
		west__size:     200,
		east__size:     200,
		south__size:    200,
		north__resizable: false,
		center__onresize: function() {if (r2ui._dis.display == 'graph' && r2ui._dis.minimap) update_minimap();},
		west__onresize:   resizeAccordions,
		east__onresize:   resizeAccordions
	});
	// myLayout.disableClosable("north", true);
	$('#accordion1').accordion({ heightStyle:  'fill' });
	$('#accordion2').accordion({ heightStyle:  'fill' });

	// Boot r2 analysis, settings, ....
	r2.update_flags();
	r2.analAll();
	r2.load_mmap();
	r2ui.load_colors();
	apply_theme();
	r2.load_settings();
	load_binary_details();

	// Create panels
	var disasm_panel = new DisasmPanel();
	var decompiler_panel = new DecompilerPanel();
	var comments_panel = new CommentsPanel();
	var hex_panel = new HexPanel();
	var entropy_panel = new EntropyPanel();
	var strings_panel = new StringsPanel();
	var types_panel = new TypesPanel();
	var settings_panel = new SettingsPanel();
	var projects_panel = new ProjectsPanel();
	var logs_panel = new LogsPanel();
	r2ui._ent = entropy_panel;
	r2ui._dis = disasm_panel;
	r2ui._dec = decompiler_panel;
	r2ui._cmt = comments_panel;
	r2ui._str = strings_panel;
	r2ui._typ = types_panel;
	r2ui._set = settings_panel;
	r2ui._hex = hex_panel;
	r2ui._prj = projects_panel;
	r2ui._log = logs_panel;

	// For enyo compatibility
	r2ui.ra = {};
	r2ui.mp = {};
	r2ui.ra.getIndex = function() {};
	r2ui.ra.setIndex = function() {};
	r2ui.mp.openPage = function() {};

	var console_history = [];
	var console_history_idx = 0;

	// Handle commands in console
	$('#command').keypress(function(inEvent) {
		var key = inEvent.keyCode || inEvent.charCode || inEvent.which || 0;
		if (key === 13) {
			var cmd = inEvent.target.value.trim();
			var reloadUI = cmd == '';

			console_history[console_history.length] = cmd;
			console_history_idx += 1;
			/* empty input reloads UI */
			if (cmd != '') {
				if (r2ui.console_lang == 'r2') {
					r2.cmd(inColor(cmd), function(x) {
						var old_value = $('#cmd_output').text();
						$('#cmd_output').html(old_value + '\n> ' + cmd + '\n' + x);
						$('#cmd_output').scrollTo($('#cmd_output')[0].scrollHeight);
					});
					if (cmd.indexOf('s ') === 0) {
						r2ui.history_push(r2ui._dis.selected_offset);
					}
				} else if (r2ui.console_lang == 'js') {
					x = eval(cmd);
					var old_value = $('#cmd_output').text();
					$('#cmd_output').html(old_value + '\n> ' + cmd + '\n' + x);
					$('#cmd_output').scrollTo($('#cmd_output')[0].scrollHeight);
				}
			}
			inEvent.target.value = '';
			/* if command starts with :, do not reload */
			if (reloadUI && r2ui.console_lang == 'r2') {
				r2.load_settings();
				r2ui.load_colors();
				update_binary_details();
				r2ui.seek('$$', false);
				scroll_to_element(r2ui._dis.selected);
			}
		}
	});

	$('input').bind('keydown', function(e) {
			if (e.keyCode == '38' || e.keyCode == '40') {
				e.preventDefault();
			}
		});
	$('#command').keydown(function(inEvent) {
		var key = inEvent.keyCode || inEvent.charCode || inEvent.which || 0;
		if (key === 40) {
			console_history_idx++;
			if (console_history_idx > console_history.length - 1) console_history_idx = console_history.length;
			inEvent.target.value = console_history[console_history_idx] === undefined ? '' : console_history[console_history_idx];
		}
		if (key === 38) {
			console_history_idx--;
			if (console_history_idx < 0) console_history_idx = 0;
			inEvent.target.value = console_history[console_history_idx] === undefined ? '' : console_history[console_history_idx];
		}
	});

	// Console menu
	$('#console_panel').contextmenu({
		menu: [
			{title: 'clear buffer<kbd></kbd>', cmd: 'clearbuffer'},
			{title: 'switch r2/JS<kbd>s</kbd>', cmd: 'switchlang'}
		],
		preventSelect: true,
		taphold: true,
		preventContextMenuForPopup: true,
		show: false,
		select: function(event, ui) {
			$(document).contextmenu('close');
			switch (ui.cmd) {
				case 'clearbuffer': $('#cmd_output').html(''); break;
				case 'switchlang': r2ui.toggle_console_lang(); break;
			}
		}
	});

	// Project notes
	r2.cmdj('Pnj', function(x) {
		if (x !== null) $('#pnotes').html(atob(x));
	});
	$('#pnotes').donetyping(function() {
		r2.cmd('Pnj ' + btoa($('#pnotes').val()));
		r2.cmd('Po', function(x) {
			if (x === '') {
			alert('Notes won\'t be persited until a project is opened. Use Project\'s tab or \'Ps name\' to save current project');
			}
		});
	});

	$('#switch_button').click(function() {do_switchview();});

	// Render Disasm Panel
	r2ui._dis.render();
});

function scroll_to_element(element) {
	if (element === undefined || element === null) return;
	var top = Math.max(0, element.documentOffsetTop() - (window.innerHeight / 2));
	$('#center_panel').scrollTo(top, {axis: 'y'});
	r2ui._dis.scroll_offset = top;
}

function store_scroll_offset() {
	r2ui._dis.scroll_offset = $('#center_panel').scrollTop();
}
function scroll_to_last_offset() {
	if (r2ui._dis.scroll_offset !== null) $('#center_panel').scrollTo(r2ui._dis.scroll_offset, {axis: 'y'});
}

function load_binary_details() {
	// <div id="symbols"></div>
	r2.cmdj('isj', function(x) {
		render_symbols(x);
	});
	// <div id="functions"></div>
	r2.cmdj('aflj', function(x) {
		render_functions(x);
	});
	// <div id="imports"></div>
	r2.cmdj('iij', function(x) {
		render_imports(x);
	});
	// <div id="relocs"></div>
	r2.cmdj('irj', function(x) {
		render_relocs(x);
	});
	// <div id="flags"></div>
	// TODO: replace with individual fetches of spaces so we can add a class saying what type of flag it is (for renaming)
	r2.cmdj('fs *;fj', function(x) {
		render_flags(x);
	});
	// <div id="information"></div>
	r2.cmd('i', function(x) {
		$('#information').html('<pre>' + x + '</pre>');
	});
	// <div id="sections"></div>
	r2.cmdj('iSj', function(x) {
		render_sections(x);
	});
	render_history();
}

function update_binary_details() {
	// <div id="symbols"></div>
	r2.cmdj('isj', function(x) {
		render_symbols(x);
	});
	// <div id="functions"></div>
	r2.cmdj('aflj', function(x) {
		render_functions(x);
	});
	// <div id="imports"></div>
	r2.cmdj('iij', function(x) {
		render_imports(x);
	});
	// <div id="relocs"></div>
	r2.cmdj('irj', function(x) {
		render_relocs(x);
	});
	// <div id="flags"></div>
	// TODO: replace with individual fetches of spaces so we can add a class saying what type of flag it is (for renaming)
	r2.cmdj('fs *;fj', function(x) {
		render_flags(x);
	});
	render_history();
}

function render_functions(functions) {
	var imports = null;
	r2.cmdj('iij', function(x) {
		imports = x;
	});
	var fcn_data = [];
	for (var i in functions) {
		var f = functions[i];
		if (f.name !== undefined) {
			var is_import = false;
			for (var k in imports) if (f.addr === imports[k].plt) is_import = true;
			if (is_import) continue;
			var fd = {
				offset: f.addr,
				label: '<span class=\'flag function addr addr_' + '0x' + f.addr.toString(16) + '\'>' + f.name + '</span>',
				children: [{label: 'offset: ' + '0x' + f.addr.toString(16)},  {label: 'size: ' + f.size}]
			};
			if (f.callrefs && f.callrefs.length > 0) {
				var xrefs = {label: 'xrefs:', children: []};
				for (var j in f.callrefs) {
					xrefs.children[xrefs.children.length] = '<span class=\'xref addr addr_0x' + f.callrefs[j].addr.toString(16)  + '\'>0x' + f.callrefs[j].addr.toString(16) + '</span> (' + (f.callrefs[j].type == 'C' ? 'call' : 'jump') + ')';
				}
				fd.children[fd.children.length] = xrefs;
			}
			fcn_data[fcn_data.length] = fd;
		}
	}
	fcn_data = fcn_data.sort(function(a, b) {return a.offset - b.offset;});
	$('#functions').tree({data: [],selectable: false,slide: false,useContextMenu: false, autoEscape: false});
	$('#functions').tree('loadData', fcn_data);
	$('#functions_label').html('Functions <span class=\'right_label\'>' + fcn_data.length + '</span>');
}

function render_imports(imports) {
	var imp_data = [];
	for (var i in imports) {
		var f = imports[i];
		if (f.name !== undefined) {
			var id = {
				label: '<span class=\'flag import addr addr_' + '0x' + f.plt.toString(16) + '\'>' + f.name + '</span>',
				children: [{label: 'plt: ' + '0x' + f.plt.toString(16)}, {label: 'ord: ' + i}]
			};
			imp_data[imp_data.length] = id;
		}
	}
	$('#imports').tree({data: [],selectable: false,slide: false,useContextMenu: false, autoEscape: false});
	$('#imports').tree('loadData', imp_data);
	$('#imports_label').html('Imports <span class=\'right_label\'>' + imp_data.length + '</span>');
}

function render_symbols(symbols) {
	var data = [];
	for (var i in symbols) {
		var s = symbols[i];
		var sd = {
			offset: s.vaddr,
			label: '<span class=\'flag symbol addr addr_' + '0x' + s.vaddr.toString(16) + '\'>' + s.name + '</span>',
			children: [{label: 'offset: ' + '0x' + s.vaddr.toString(16)}, {label: 'size: ' + s.size}] };
		data[data.length] = sd;
	}
	data = data.sort(function(a, b) {return a.offset - b.offset;});
	$('#symbols').tree({data: data,selectable: false,slide: false,useContextMenu: false, autoEscape: false});
	$('#symbols_label').html('Symbols <span class=\'right_label\'>' + data.length + '</span>');
}
function render_relocs(relocs) {
	var data = [];
	for (var i in relocs) {
		var r = relocs[i];
		var rd = {
			offset: r.vaddr,
			label: '<span class=\'flag reloc addr addr_' + '0x' + r.vaddr.toString(16) + '\'>' + r.name + '</span>',
			children: [{label: 'offset: ' + '0x' + r.vaddr.toString(16)}, {label: 'type: ' + r.type}] };
		data[data.length] = rd;
	}
	data = data.sort(function(a, b) {return a.offset - b.offset;});
	$('#relocs').tree({data: [],selectable: false,slide: false,useContextMenu: false, autoEscape: false});
	$('#relocs').tree('loadData', data);
	$('#relocs_label').html('Relocs <span class=\'right_label\'>' + data.length + '</span>');
}
function render_flags(flags) {
	var data = [];
	for (var i in flags) {
		var f = flags[i];
		var fd = {
			offset: f.addr,
			label: '<span class=\'flag addr addr_' + '0x' + f.addr.toString(16) + '\'>' + f.name + '</span>',
			children: [{label: 'offset: ' + '0x' + f.addr.toString(16)}, {label: 'size: ' + f.size}] };
		data[data.length] = fd;
	}
	data = data.sort(function(a, b) {return a.offset - b.offset;});
	$('#flags').tree({data: [],selectable: false,slide: false,useContextMenu: false, autoEscape: false});
	$('#flags').tree('loadData', data);
	$('#flags_label').html('Flags <span class=\'right_label\'>' + data.length + '</span>');
}
function render_sections(sections) {
	var data = [];
	for (var i in sections) {
		var f = sections[i];
		var fd = {
			offset: f.paddr,
			label: '0x' + f.vaddr.toString(16) + ': ' + f.name,
			children: [
				{label: 'vaddr: ' + '0x' + f.vaddr.toString(16)},
				{label: 'paddr: ' + '0x' + f.paddr.toString(16)},
				{label: 'flags: ' + f.flags},
				{label: 'size: ' + f.size},
				{label: 'vsize: ' + f.vsize}
			]
		};
		data[data.length] = fd;
	}
	data = data.sort(function(a, b) {return a.offset - b.offset;});
	$('#sections').tree({data: [],selectable: false,slide: false,useContextMenu: false});
	$('#sections').tree('loadData', data);
	$('#sections_label').html('Sections <span class=\'right_label\'>' + data.length + '</span>');
}
function render_history() {
	var html = '<div>';
	for (var i in r2ui.history) {
		if (i > r2ui.history_idx - 8 && i < r2ui.history_idx + 3) {
			var flag = r2.get_flag_names(r2ui.history[i]);
			if (flag.length > 0) flag = flag[0];
			else flag = r2ui.history[i];
			if (i == r2ui.history_idx - 1) html += ' &gt; <span class=\'history history_idx addr addr_' + r2ui.history[i] + ' history_idx_' + i + '\'>' + flag + '</span>';
			else html += ' &gt;  <span class=\'history addr addr_' + r2ui.history[i] + ' history_idx_' + i + '\'>' + flag + '</span>';
		}
	}
	html += '</div>';
	$('#history').html(html);

}
