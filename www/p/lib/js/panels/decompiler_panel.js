// DECOMPILER PANEL
//
// Decompiles the current function. A combobox selects between the available
// decompilers (from `e cmd.pdc=?`) and exposes their settings, iaito style.
// The native pdc output comes from `pdcj` codemeta annotations, so every
// statement knows its offset: clicking one syncs the seek across views and
// the current address is highlighted.

var DecompilerPanel = function() {
	this.rendered_addr = null;
	this.decompiler = 'pdc';
	this.decompilers = [];
	this.show_settings = false;
};

DecompilerPanel.prototype.render = function() {
	r2ui.selected_panel = 'Decompiler';
	var self = this;
	if (this.decompilers.length === 0) {
		r2.cmd('e cmd.pdc=?|', function(x) {
			self.decompilers = x.trim().split(/\s+/).filter(function(s) {
				return s.length > 0;
			});
			if (self.decompilers.indexOf('pdc') === -1) {
				self.decompilers.unshift('pdc');
			}
		});
	}
	var addr = r2ui._dis.selected_offset;
	if (addr === null || addr === undefined) addr = 'entry0';

	var bar = '<div class="dec_bar">Decompiler: <select id="dec_select">';
	for (var i in this.decompilers) {
		var d = this.decompilers[i];
		bar += '<option value="' + d + '"' +
			(d === this.decompiler ? ' selected' : '') + '>' + d + '</option>';
	}
	bar += '</select> <input type="button" id="dec_settings_btn" value="Settings" />' +
		' <span class="dec_addr">@ ' + addr + '</span></div>';
	bar += '<div id="dec_settings" style="display:' +
		(this.show_settings ? 'block' : 'none') + '"></div>';
	$('#decompiler_tab').html(bar + '<div id="dec_out"></div>');

	$('#dec_select').on('change', function() {
		self.decompiler = $(this).val();
		r2.cmd('e cmd.pdc=' + (self.decompiler === 'pdc' ? '' : self.decompiler),
			function() {});
		self.rendered_addr = null;
		if (self.show_settings) self.render_settings();
		self.decompile();
	});
	$('#dec_settings_btn').on('click', function() {
		self.show_settings = !self.show_settings;
		if (self.show_settings) self.render_settings();
		$('#dec_settings').toggle(self.show_settings);
	});
	$('#dec_out').on('click', '.dec_stmt', function(ev) {
		ev.stopPropagation();
		r2ui.seek($(this).data('addr'), true);
	});
	this.decompile();
};

DecompilerPanel.prototype.decompile = function() {
	var self = this;
	var addr = r2ui._dis.selected_offset;
	if (addr === null || addr === undefined) addr = 'entry0';
	if (this.rendered_addr === addr) return;
	$('.dec_addr').text('@ ' + addr);
	if (this.decompiler === 'pdc') {
		r2.cmdj('pdcj @ ' + addr + '|', function(x) {
			if (x !== null && x !== undefined && x.code !== undefined) {
				$('#dec_out').html('<pre class="decompiler enyo-selectable">' +
					self.render_codemeta(x) + '</pre>');
				self.rendered_addr = addr;
				rehighlight_iaddress(addr);
			}
		});
	} else {
		r2.cmd('pdc @ ' + addr + '|', function(x) {
			$('#dec_out').html('<pre class="decompiler enyo-selectable">' +
				self.highlight(self.escape(x)) + '</pre>');
			self.rendered_addr = addr;
		});
	}
};

DecompilerPanel.prototype.escape = function(s) {
	return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

// Lightweight syntax highlighting over already-escaped text
DecompilerPanel.prototype.highlight = function(s) {
	s = s.replace(/^(\s*\/\/.*)$/gm, '<span class="ec_comment">$1</span>');
	s = s.replace(/\b(if|else|while|for|do|goto|break|continue|return|switch|case)\b/g,
		'<span class="ec_flow">$1</span>');
	s = s.replace(/\b(void|int|char|long|short|unsigned|signed|bool|float|double)\b/g,
		'<span class="ec_bin">$1</span>');
	return s;
};

// Wrap every codemeta offset annotation in a span carrying its address, so
// statements are clickable and the seek highlight follows the code
DecompilerPanel.prototype.render_codemeta = function(x) {
	var self = this;
	var code = x.code || '';
	var anns = [];
	for (var i in x.annotations) {
		var a = x.annotations[i];
		if (a.type === 'offset') anns[anns.length] = a;
	}
	anns.sort(function(a, b) { return a.start - b.start; });
	var out = '';
	var pos = 0;
	for (var j in anns) {
		var ann = anns[j];
		if (ann.start < pos) continue;
		out += this.highlight(this.escape(code.substring(pos, ann.start)));
		var addr = '0x' + ann.offset.toString(16);
		out += '<span class="dec_stmt addr_' + addr + '" data-addr="' + addr + '">' +
			this.highlight(this.escape(code.substring(ann.start, ann.end))) + '</span>';
		pos = ann.end;
	}
	out += this.highlight(this.escape(code.substring(pos)));
	return out;
};

// Settings of the selected decompiler: its `<name>.` eval namespace, plus
// the pseudo-related toggles for the native one
DecompilerPanel.prototype.render_settings = function() {
	var self = this;
	var prefixes = this.decompiler === 'pdc'
		? ['asm.pseudo', 'pdc.'] : [this.decompiler.toLowerCase() + '.'];
	r2.cmdj('e??j|', function(cfg) {
		var html = '<table class="settings_table">';
		var found = 0;
		for (var i in cfg) {
			var entry = cfg[i];
			var match = false;
			for (var p in prefixes) {
				if (entry.name.indexOf(prefixes[p]) === 0) match = true;
			}
			if (!match || entry.ro) continue;
			found++;
			var control;
			if (entry.type === 'bool') {
				control = '<input type="checkbox" class="dec_cfg_bool" data-key="' +
					entry.name + '"' + (entry.value === true ? ' checked' : '') + ' />';
			} else {
				var v = String(entry.value).replace(/&/g, '&amp;')
					.replace(/</g, '&lt;').replace(/"/g, '&quot;');
				control = '<input type="text" class="dec_cfg_text" size="18" data-key="' +
					entry.name + '" value="' + v + '" />';
			}
			html += '<tr><td>' + control + '</td><td class="cfg_name">' + entry.name +
				'</td><td class="cfg_desc">' + entry.desc + '</td></tr>';
		}
		html += '</table>';
		if (found === 0) {
			html = '<div class="prj_hint">No settings for ' + self.decompiler + '</div>';
		}
		$('#dec_settings').html(html);
		var reload = function() {
			self.rendered_addr = null;
			self.decompile();
		};
		$('#dec_settings .dec_cfg_bool').on('change', function() {
			r2.cmd('e ' + $(this).data('key') + '=' + $(this).is(':checked'), function() {});
			reload();
		});
		$('#dec_settings .dec_cfg_text').on('change', function() {
			r2.cmd('e ' + $(this).data('key') + '=' + $(this).val(), function() {});
			reload();
		});
	});
};

DecompilerPanel.prototype.seek = function(addr) {
	if (r2ui.selected_panel === 'Decompiler') {
		if ($('#dec_out .addr_' + addr).length > 0) {
			// same function: just move the highlight
			rehighlight_iaddress(addr);
		} else {
			this.rendered_addr = null;
			this.decompile();
		}
	} else {
		this.rendered_addr = null;
	}
};
