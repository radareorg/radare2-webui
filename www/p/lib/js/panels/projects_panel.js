// PROJECTS PANEL
//
// File-based projects using the modern `prj` command: every project is a
// single .r2prj file inside dir.projects. Legacy directory-based projects
// (the old `P` system) are still listed and can be opened.

var ProjectsPanel = function() {
	this.dir = '';
};

ProjectsPanel.prototype.render = function() {
	r2ui.selected_panel = 'Projects';
	var self = this;
	r2.cmd('e dir.projects|', function(x) { self.dir = x.trim(); });
	var binname = '';
	r2.cmdj('ij|', function(x) {
		if (x && x.core && x.core.file) binname = String(x.core.file).split('/').pop();
	});
	var suggested = r2.project_name || binname || 'project';
	var html = '<div class="projects">';
	html += '<h3>Save current session</h3>';
	html += '<div class="prj_save">' +
		'<input id="prj_name" type="text" value="' + suggested + '" /> ' +
		'<input id="prj_save_btn" type="button" value="Save project" /> ' +
		'<span class="prj_hint">' + this.dir + '/&lt;name&gt;.r2prj</span></div>';
	html += '<h3>Projects</h3><div id="prj_list" class="prj_list"></div>';
	html += '</div>';
	$('#projects_tab').html(html);
	$('#prj_save_btn').on('click', function() {
		var name = $('#prj_name').val().trim().replace(/[^\w.-]/g, '_');
		if (name === '') return;
		r2.cmd('prj save ' + self.dir + '/' + name + '.r2prj', function() {});
		r2.project_name = name;
		self.list();
	});
	this.list();
};

ProjectsPanel.prototype.list = function() {
	var self = this;
	r2.cmdj('ls -j ' + this.dir + '|', function(files) {
		var html = '';
		var i, f;
		for (i in files) {
			f = files[i];
			if (f.isdir || String(f.name).indexOf('.r2prj') === -1) continue;
			var name = String(f.name).replace('.r2prj', '');
			html += '<div class="prj_card" data-file="' + self.dir + '/' + f.name + '">' +
				'<div class="prj_title">' + name + '</div>' +
				'<div class="prj_meta">' + (f.size / 1024).toFixed(1) + ' KB</div>' +
				'<div class="prj_actions">' +
				'<input type="button" class="prj_open" value="Open" title="Close the current session and open this project" /> ' +
				'<input type="button" class="prj_merge" value="Merge" title="Merge the project into the current session" /> ' +
				'<input type="button" class="prj_info_btn" value="Info" /></div>' +
				'<pre class="prj_info" style="display:none"></pre></div>';
		}
		for (i in files) {
			f = files[i];
			if (!f.isdir || f.name === '.' || f.name === '..') continue;
			html += '<div class="prj_card prj_legacy" data-name="' + f.name + '">' +
				'<div class="prj_title">' + f.name + '</div>' +
				'<div class="prj_meta">legacy</div>' +
				'<div class="prj_actions"><input type="button" class="prj_open_legacy" value="Open" /></div></div>';
		}
		if (html === '') {
			html = '<div class="prj_hint">No projects yet. Save the current session above.</div>';
		}
		$('#prj_list').html(html);
		$('#prj_list .prj_open').on('click', function() {
			r2.cmd('prj open ' + $(this).closest('.prj_card').data('file'), function() {});
			window.location.reload();
		});
		$('#prj_list .prj_merge').on('click', function() {
			r2.cmd('prj load ' + $(this).closest('.prj_card').data('file'), function() {});
			window.location.reload();
		});
		$('#prj_list .prj_info_btn').on('click', function() {
			var card = $(this).closest('.prj_card');
			var pre = card.find('.prj_info');
			if (pre.is(':visible')) {
				pre.hide();
				return;
			}
			r2.cmd('prj info ' + card.data('file') + '|', function(x) {
				pre.text(x).show();
			});
		});
		$('#prj_list .prj_open_legacy').on('click', function() {
			r2.cmd('P ' + $(this).closest('.prj_card').data('name'), function() {});
			window.location.reload();
		});
	});
};
