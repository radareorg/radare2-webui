// SETTINGS PANEL
var LogsPanel = function () {
};

LogsPanel.prototype.render = function() {
	var logger = null;
	r2ui.selected_panel = "Logs";
	function loginit () {
		logger = r2.getTextLogger ().on ("message", function (msg) {
			var out = document.getElementById ("out");
			out.innerHTML += "<br />"+msg.text;
		});
		// logger.send ("hello world");
		logger.autorefresh (3);

	}
	function sendmsg() {
		var msg = document.getElementById ("inputlog").value;
		if (logger) logger.send (msg);
		//alert(msg);
	}
	$(document).ready(loginit);
	$("#logb").click(sendmsg);
	$('#logs_tab').css('color', "rgb(127,127,127);");
	//$('input[type=checkbox]').onoff();
};
