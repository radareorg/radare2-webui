// SETTINGS PANEL
var output = [];
var logger = null;

var LogsPanel = function() {
	// TODO: move here
	//this.logger = null;
	//this.output = [];
};

LogsPanel.prototype.render = function() {
	function encode(r) {
		return r.replace(/[\x26\x0A\<>'"]/g, function(r) {return '&#' + r.charCodeAt(0) + ';';});
	}
	var self = this;
	$('#logs_tab').html(
			'<div>' +
			'<table width="100%"><tr>' +
			'<td><input class="input" id="logs_nick" style="width:4em" value="user" /></td>' +
			'<td width="100%"><input class="input" id="logs_input" style="width:100%" /></td>' +
			'<td><input type="button" class="button" id="logs_button" value="send" style="z-index:-20" /></td>' +
			'</tr></table>' +
			'<div id="logs_out" class="consoleout" style="z-index:-20"> </div></div>');
	r2ui.selected_panel = 'Logs';
	function loginit() {
		console.log('loginit', logger);
		var out = document.getElementById('logs_out');
		if (logger === null) {
			logger = r2.getTextLogger();
		}
		logger.render = function() {
			out.innerHTML = output.join('<br />');
		};
		logger.on('message', function(msg) {
			output.push(encode(msg.text));
			logger.render();
		});
		logger.render();
		logger.autorefresh(3);
	}
	function sendmsg() {
		var nick = document.getElementById('logs_nick').value.trim();
		var msg = document.getElementById('logs_input').value.trim();
		//if (!logger) {
		loginit();
		//}
		if (msg && logger) {
			if (nick) {
				msg = '<' + nick + '> ' + msg;
			}
			logger.send(msg);
		}
		document.getElementById('logs_input').value = '';
	}
	//		loginit();
	$(document).ready(loginit);
	$('#logs_input').keypress(function(e) {
		if (e.which == 13) {
			sendmsg();
		}
	});
	$('#logs_button').click(sendmsg);
	//	$('#logs_tab').css('color', "rgb(127,127,127);");
};
