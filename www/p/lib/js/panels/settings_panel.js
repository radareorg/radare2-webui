// SETTINGS PANEL
//
// Built dynamically from `e??j` so it always matches the running radare2:
// a curated section with the settings that affect the views, plus a search
// box over the complete configuration.

var SettingsPanel = function() {
	this.config = [];
};

var SETTINGS_TOGGLES = [
	'asm.bytes', 'asm.flags', 'asm.lines', 'asm.xrefs', 'asm.cmt.right',
	'asm.pseudo', 'asm.describe', 'asm.emu', 'asm.esil', 'asm.varsub',
	'scr.utf8', 'io.cache'
];

SettingsPanel.prototype.render = function() {
	r2ui.selected_panel = 'Settings';
	var self = this;
	r2.cmdj('e??j|', function(cfg) {
		self.config = (cfg !== null && cfg !== undefined) ? cfg : [];
		self.build();
	});
};

SettingsPanel.prototype.get = function(key) {
	for (var i in this.config) {
		if (this.config[i].name === key) return this.config[i];
	}
	return null;
};

SettingsPanel.prototype.apply = function(key, value) {
	var entry = this.get(key);
	if (entry) entry.value = value;
	r2.cmd('e ' + key + '=' + value, function() {});
	// Refresh the views that depend on rendering settings
	if (key.indexOf('asm.') === 0 || key.indexOf('emu.') === 0) {
		r2.load_settings();
		// Rendering happens client-side from pdj data, and the r2 http
		// server pins some display vars (e.g. asm.bytes) per request, so
		// the UI choice is authoritative for these
		r2.settings[key] = value;
		if (r2ui._dis) {
			r2ui._dis.instructions = [];
			r2ui._dis.seek(r2ui._dis.selected_offset);
		}
		if (r2ui._dec) r2ui._dec.rendered_addr = null;
	}
};

SettingsPanel.prototype.control_for = function(entry, compact) {
	var v = entry.value;
	var esc = function(s) {
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
	};
	if (entry.type === 'bool') {
		return '<input type="checkbox" class="cfg_bool" data-key="' + entry.name + '"' +
			(v === true || v === 'true' ? ' checked' : '') + ' />';
	}
	return '<input type="text" class="cfg_text" data-key="' + entry.name +
		'" value="' + esc(v) + '"' + (compact ? ' size="12"' : '') + ' />';
};

SettingsPanel.prototype.build = function() {
	var self = this;
	var html = '<div class="settings">';

	// --- curated section
	html += '<h3>Disassembly</h3><table class="settings_table">';
	for (var i in SETTINGS_TOGGLES) {
		var entry = this.get(SETTINGS_TOGGLES[i]);
		if (entry === null) continue;
		html += '<tr><td>' + this.control_for(entry, true) + '</td>' +
			'<td class="cfg_name">' + entry.name + '</td>' +
			'<td class="cfg_desc">' + entry.desc + '</td></tr>';
	}
	// arch / bits / syntax selectors
	var selects = [
		{key: 'asm.arch', values: null},
		{key: 'asm.bits', values: ['8', '16', '32', '64']},
		{key: 'asm.syntax', values: ['intel', 'att', 'masm', 'jz', 'regnum']}
	];
	for (var s in selects) {
		var sel = selects[s];
		var entry = this.get(sel.key);
		if (entry === null) continue;
		if (sel.values === null) {
			html += '<tr><td>' + this.control_for(entry, true) + '</td>';
		} else {
			var opts = '';
			for (var o in sel.values) {
				var val = sel.values[o];
				opts += '<option value="' + val + '"' +
					(String(entry.value) === val ? ' selected' : '') + '>' + val + '</option>';
			}
			html += '<tr><td><select class="cfg_select" data-key="' + sel.key + '">' +
				opts + '</select></td>';
		}
		html += '<td class="cfg_name">' + sel.key + '</td>' +
			'<td class="cfg_desc">' + entry.desc + '</td></tr>';
	}
	html += '</table>';

	// --- search over the whole config
	html += '<h3>All settings</h3>';
	html += '<input id="settings_search" type="text" placeholder="search ' +
		this.config.length + ' evaluable configuration variables..." />';
	html += '<table id="settings_results" class="settings_table"></table>';

	// --- colors: native theme selector and palette editor
	html += '<h3>Colors</h3>';
	html += '<div class="colors_bar">Theme: <select id="settings_theme"></select> ' +
		'<input value="Randomize" type="button" id="settings_ecr" /> ' +
		'<input value="Default" type="button" id="settings_ecd" /></div>';
	html += '<div id="settings_palette" class="palette"></div>';
	html += '</div>';

	$('#settings_tab').html(html);

	var wire = function(root) {
		$(root).find('.cfg_bool').off('change').on('change', function() {
			self.apply($(this).data('key'), $(this).is(':checked'));
		});
		$(root).find('.cfg_text').off('change').on('change', function() {
			self.apply($(this).data('key'), $(this).val());
		});
		$(root).find('.cfg_select').off('change').on('change', function() {
			self.apply($(this).data('key'), $(this).val());
		});
	};
	wire('#settings_tab');

	$('#settings_search').on('input', function() {
		var q = $(this).val().toLowerCase().trim();
		var out = '';
		var shown = 0;
		if (q.length > 1) {
			for (var i in self.config) {
				var entry = self.config[i];
				if (entry.name.toLowerCase().indexOf(q) === -1 &&
					String(entry.desc).toLowerCase().indexOf(q) === -1) continue;
				if (entry.ro) continue;
				out += '<tr><td>' + self.control_for(entry, true) + '</td>' +
					'<td class="cfg_name">' + entry.name + '</td>' +
					'<td class="cfg_desc">' + entry.desc + '</td></tr>';
				if (++shown >= 60) {
					out += '<tr><td></td><td colspan="2" class="cfg_desc">...more matches, refine the search</td></tr>';
					break;
				}
			}
		}
		$('#settings_results').html(out);
		wire('#settings_results');
	});

	r2.cmdj('ecoj|', function(themes) {
		var opts = '<option value=""></option>';
		for (var i in themes) {
			opts += '<option value="' + themes[i] + '">' + themes[i] + '</option>';
		}
		$('#settings_theme').html(opts);
	});
	var refresh_colors = function() {
		r2ui.load_colors();
		if (typeof apply_theme === 'function') apply_theme();
		self.render_palette();
	};
	$('#settings_theme').on('change', function() {
		var theme = $(this).val();
		if (theme === '') return;
		r2.cmd('eco ' + theme, function() {});
		refresh_colors();
	});
	$('#settings_ecr').on('click', function() {
		r2.cmd('ecr', function() {});
		refresh_colors();
	});
	$('#settings_ecd').on('click', function() {
		r2.cmd('ecd', function() {});
		refresh_colors();
	});
	this.render_palette();
};

SettingsPanel.prototype.render_palette = function() {
	var to_hex = function(rgb) {
		var s = '#';
		for (var i = 0; i < 3; i++) {
			var h = (rgb[i] | 0).toString(16);
			s += (h.length === 1 ? '0' : '') + h;
		}
		return s;
	};
	r2.cmdj('ecj|', function(palette) {
		var html = '';
		for (var key in palette) {
			html += '<label class="swatch"><input type="color" data-key="' + key +
				'" value="' + to_hex(palette[key]) + '" /> ' + key + '</label>';
		}
		$('#settings_palette').html(html);
		$('#settings_palette input[type=color]').on('change', function() {
			r2.cmd('ec ' + $(this).data('key') + ' ' + $(this).val(), function() {});
			r2ui.load_colors();
		});
	});
};
