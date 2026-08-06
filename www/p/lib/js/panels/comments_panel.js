// COMMENTS PANEL
//
// Lists every comment in the session (CCj); clicking an address seeks to it.

var CommentsPanel = function() {
};

CommentsPanel.prototype.render = function() {
	r2ui.selected_panel = 'Comments';
	r2.cmdj('CCj|', function(comments) {
		var esc = function(s) {
			return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
		};
		var rows = '';
		var n = 0;
		for (var i in comments) {
			var c = comments[i];
			var addr = '0x' + c.offset.toString(16);
			rows += '<tr><td><span class="addr xref addr_' + addr + '">' + addr +
				'</span></td><td class="comment_text">' + esc(c.name) + '</td></tr>';
			n++;
		}
		var html = '<div class="comments"><h3>Comments (' + n + ')</h3>';
		if (n > 0) {
			html += '<table class="comments_table">' + rows + '</table>';
		} else {
			html += '<div class="prj_hint">No comments. Add one from the ' +
				'disassembly context menu or with `CC text @ addr` in the console.</div>';
		}
		html += '</div>';
		$('#comments_tab').html(html);
	});
};
