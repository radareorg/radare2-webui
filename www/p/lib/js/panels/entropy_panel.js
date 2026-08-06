// ENTROPY PANEL
//
// Renders `p=ej` (Shannon entropy per block) as an SVG bar chart:
// single hue, y axis in bits per byte, hover tooltip, click a bar to seek.

var EntropyPanel = function() {
};

EntropyPanel.prototype.render = function() {
	r2ui.selected_panel = 'Entropy';
	var self = this;
	r2.cmdj('p=ej 160|', function(x) {
		if (x === null || x === undefined || !x.entropy || x.entropy.length === 0) {
			$('#entropy_tab').html('<div class="entropy_title">No entropy data</div>');
			return;
		}
		self.draw(x);
	});
};

EntropyPanel.prototype.draw = function(data) {
	var e = data.entropy;
	var W = 960, H = 300, padL = 34, padR = 10, padT = 12, padB = 32;
	var plotW = W - padL - padR, plotH = H - padT - padB;
	var n = e.length;
	var step = plotW / n;
	var bw = Math.max(1, step - 2);
	var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="entropy_svg">';
	for (var b = 0; b <= 8; b += 2) {
		var gy = padT + plotH - (b / 8) * plotH;
		svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) +
			'" y2="' + gy + '" class="entropy_grid"/>';
		svg += '<text x="' + (padL - 6) + '" y="' + (gy + 3) +
			'" text-anchor="end" class="entropy_axis">' + b + '</text>';
	}
	for (var i = 0; i < n; i++) {
		var v = e[i].value / 255;
		var bh = Math.max(1, v * plotH);
		var addr = '0x' + e[i].addr.toString(16);
		svg += '<rect x="' + (padL + i * step) + '" y="' + (padT + plotH - bh) +
			'" width="' + bw + '" height="' + bh + '" rx="1" class="entropy_bar"' +
			' data-addr="' + addr + '" data-bits="' + (v * 8).toFixed(2) + '"/>';
	}
	var labels = [0, n >> 1, n - 1];
	for (var li in labels) {
		var i2 = labels[li];
		var anchor = i2 === 0 ? 'start' : (i2 === n - 1 ? 'end' : 'middle');
		svg += '<text x="' + (padL + i2 * step + step / 2) + '" y="' + (H - 12) +
			'" text-anchor="' + anchor + '" class="entropy_axis">0x' +
			e[i2].addr.toString(16) + '</text>';
	}
	svg += '</svg>';
	$('#entropy_tab').html('<div class="entropy_panel">' +
		'<div class="entropy_title">Entropy in bits per byte, one bar per ' +
		data.blocksize + ' bytes. Click a bar to seek.</div>' + svg +
		'<div id="entropy_tip" class="entropy_tip" style="display:none"></div></div>');
	$('#entropy_tab .entropy_bar').on('mousemove', function(ev) {
		$('#entropy_tip').show().css({left: ev.clientX + 14, top: ev.clientY - 26})
			.text($(this).data('addr') + ' — ' + $(this).data('bits') + ' bits');
	}).on('mouseleave', function() {
		$('#entropy_tip').hide();
	}).on('click', function() {
		$('#entropy_tip').hide();
		r2ui.seek($(this).data('addr'), true);
		$('#main_panel').tabs('option', 'active', 0);
	});
};
