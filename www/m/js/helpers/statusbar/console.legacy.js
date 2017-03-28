var lastConsoleOutput = '';

function console_submit(cmd) {
	var term = document.getElementById('console_terminal');
	var output = document.getElementById('console_output');
	var input = document.getElementById('console_input');

	var widget = widgetContainer.getWidget('Console');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	if (cmd === 'clear') {
		output.innerHTML = '';
		input.value = '';
		return;
	}
	r2.cmd(cmd, function(res) {
		output.innerHTML += ' > ' + cmd + '\n' + res;
		input.value = '';
		setTimeout(function() {
			window.scrollTo('console_input');
		}, 1000);
	});
}

function console_ready() {
	var input = document.getElementById('console_input');
	if (input === null) {
		return;
	}
	r2.cmd('e scr.color=true');
	input.focus();
	input.onkeypress = function(e){
		if (e.keyCode === 13) {
			console_submit(input.value);
		}
	}
}

function consoleKey(e) {
	var inp = document.getElementById('console_input');
	if (!e) {
		inp.onkeypress = consoleKey;
	} else {
		if (e.keyCode === 13) {
			runCommand(inp.value);
			inp.value = '';
		}
	}
}

function panelConsole() {
	var widget = widgetContainer.getWidget('Console');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	updates.registerMethod(widget.getOffset(), panelConsole);

/*
	c.innerHTML = '<br />';
	var common = 'onkeypress=\'consoleKey()\' class=\'mdl-card--expand mdl-textfield__input\' id=\'console_input\'';
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
*/
	const html = '<br />'
		+ '<div id="console_terminal" class="console_terminal">'
		+ '<div id="console_output" class=console_output></div>'
		+ '<div id="console_prompt" class=console_prompt>'
		+ '&nbsp;&gt;&nbsp;<input name="console_input" class="console_input" id="console_input"></input>'
		+ '</div>'
		+ '</div><br /><br />'
	c.innerHTML = html;
	c.style.backgroundColor = '#303030';
	c.style.height = '100%';
	document.getElementById('console_output').innerHTML = lastConsoleOutput;
	console_ready();
}

function runCommand(text) {
	if (!text) {
		text = document.getElementById('input').value;
	}
	r2.cmd(text, function(d) {
		lastConsoleOutput = '\n' + d;
		document.getElementById('output').innerHTML = lastConsoleOutput;
	});
}
