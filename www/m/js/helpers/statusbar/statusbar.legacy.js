/* TODO
 * - add timestamp
 * - support tabs and console
 */
var statusLog = [];
var Mode = {
	LINE: 0,
	HALF: 1,
	FULL: 2
};
var Tab = {
	LOGS: 0,
	CONSOLE: 1
};
var statusMode = Mode.LINE;
var statusTimeout = null;
var statusTab = Tab.LOGS;

function setStatusbarBody() {
	function addElement(e, id) {
		var doc = document.createElement(e);
		doc.id = id;
		doc.className = id;
		return doc;
	}
	var doc;
	try {
		var statusbar = document.getElementById('tab_terminal');
		statusbar.innerHTML = '';
		statusbar.parentNode.removeChild(statusbar);
	} catch (e) {
	}
	try {
		var statusbar = document.getElementById('tab_logs');
		statusbar.innerHTML = '';
		statusbar.parentNode.removeChild(statusbar);
	} catch (e) {
	}
	switch (statusTab) {
	case Tab.LOGS:
		var parser = new DOMParser();
		var doc = document.createElement('div');
		doc.id = 'tab_logs';
		var msg = statusLog.join('<br />');
		doc.appendChild (parser.parseFromString(msg, 'text/xml').documentElement);
		var statusbar = document.getElementById('statusbar_body');
		try {
			statusbar.parentNode.insertBefore (doc, statusbar);
		} catch (e ){
		//	statusbar.appendChild(doc);
		}
		console.log(statusbar);
		// return doc; //break;
		return;
	case Tab.CONSOLE:
		var doc = document.createElement('div');
		doc.id = 'tab_terminal';
		doc.appendChild(addElement('div', 'terminal'));
		doc.appendChild(addElement('div', 'terminal_output'));
		var pr0mpt = addElement('div', 'terminal_prompt');
		pr0mpt.appendChild(addElement('input', 'terminal_input'));
		doc.appendChild(pr0mpt);
		break;
	}
	if (typeof doc !== 'undefined') {
		/* initialize terminal if needed */
		var statusbar = document.getElementById('statusbar');
		var terminal = document.getElementById('terminal');
		if (!terminal) {
			statusbar.parentNode.insertBefore (doc, statusbar);
			if (statusTab === Tab.CONSOLE) {
				terminal_ready ();
			}
		}
	}
}

function statusMessage(x, t) {
	var statusbar = document.getElementById('statusbar');
	if (x) {
		statusLog.push(x);
	}
	if (statusMode === Mode.LINE) {
		statusbar.innerHTML = x;
		if (statusTimeout !== null) {
			clearTimeout(statusTimeout);
			statusTimeout = null;
		}
		if (typeof t !== 'undefined') {
			statusTimeout = setTimeout(function() {
				statusMessage('&nbsp;');
			}, t * 1000);
		}
	} else {
		setStatusbarBody();
	}
}

function statusToggle() {
	var statusbar = document.getElementById('statusbar');
	var container = document.getElementById('container');

	if (statusMode === Mode.HALF) {
		statusTab = Tab.LOGS;
		statusMode = Mode.LINE;
		statusbar.innerHTML = '&nbsp;';
		try {
			statusbar.parentNode.classList.remove('half');
			statusbar.parentNode.classList.remove('full');
			container.classList.remove('sbIsHalf');
			container.classList.remove('sbIsFull');
		} catch (e) {
		}
		setStatusbarBody();
	} else {
		statusMode = Mode.HALF;
		try {
			statusbar.parentNode.classList.remove('full');
			container.classList.remove('sbIsFull');
		} catch (e) {
		}
		statusbar.parentNode.classList.add('half');
		container.classList.add('sbIsHalf');
		//setStatusbarBody();
	}
}

function statusNext() {
	var statusbar = document.getElementById('statusbar');
	var container = document.getElementById('container');
	switch (statusMode) {
	case Mode.LINE:
		statusMode = Mode.HALF;
		try {
			statusbar.parentNode.classList.remove('full');
			container.classList.remove('sbIsFull');
		} catch (e) {
		}
		statusbar.parentNode.classList.add('half');
		container.classList.add('sbIsHalf');
		break;
	case Mode.HALF:
		statusMode = Mode.FULL;
		statusbar.parentNode.classList.add('full');
		container.classList.add('sbIsFull');
		/* do not clear the terminal */
		return;
		break;
	case Mode.FULL:
		statusMode = Mode.LINE;
		statusTab = Tab.LOGS;
		statusbar.innerHTML = '';
		try {
			var statusbar = document.getElementById('statusbar');
			var container = document.getElementById('container');
			statusbar.parentNode.classList.remove('half');
			statusbar.parentNode.classList.remove('full');
			container.classList.remove('sbIsHalf');
			container.classList.remove('sbIsFull');
		} catch (e) {
		}
		break;
	}
	setStatusbarBody();
}

function statusConsole() {
	var statusbar = document.getElementById('statusbar');
	var container = document.getElementById('container');
	if (statusTab === Tab.CONSOLE) {
		if (statusMode !== Mode.LINE) {
			statusToggle();
			statusMode = Mode.LINE;
			return;
		}
		statusTab = Tab.CONSOLE;
	}
	if (statusMode === Mode.HALF) {
		/* do something here */
		statusMode = Mode.LINE;
	} else if (statusMode === Mode.LINE) {
		statusTab = Mode.CONSOLE;
		statusMode = Mode.HALF;
		try {
			statusbar.parentNode.classList.remove('full');
			container.classList.remove('sbIsFull');
		} catch (e) {
		}
		try {
			statusbar.parentNode.classList.add('half');
			container.classList.add('sbIsHalf');
		} catch (e) {
		}
	}
	if (statusTab === Tab.CONSOLE) {
		statusTab = Tab.LOGS;
	} else {
		statusTab = Tab.CONSOLE;
	}
	setStatusbarBody();
}

function statusFullscreen() {
	var statusbar = document.getElementById('statusbar');
	var container = document.getElementById('container');
	if (statusMode === Mode.FULL) {
		statusMode = Mode.HALF;
		try {
			statusbar.parentNode.classList.remove('full');
			container.classList.remove('sbIsFull');
		} catch (e) {
		}
		statusbar.parentNode.classList.add('half');
		container.classList.add('sbIsHalf');
	} else {
		statusMode = Mode.FULL;
		try {
			statusbar.parentNode.classList.remove('half');
			container.classList.remove('sbIsHalf');
		} catch (e) {
			/* do nothing */
		}
		statusbar.parentNode.classList.add('full');
		container.classList.add('sbIsFull');
	}
}


function addButton(label, callback) {
	var a = document.createElement('a');
	a.href = 'javascript:'+callback+'()';
	a.innerHTML = label;
	return a;
}

function initializeStatusbarTitle() {
	return;
	var title = document.getElementById('statusbar_title');
	var div = document.createElement('div');
	title.class = 'statusbar_title';
	title.id = 'statusbar_title';
	div.className = 'statusbar_title';
	div.style.textAlign = 'right';
	div.appendChild (addButton ('v ', 'statusToggle'));
	div.appendChild (addButton ('^ ', 'statusFullscreen'));
	div.appendChild (addButton ('$ ', 'statusConsole'));
	div.appendChild (addButton ('> ', 'statusBarAtRight'));
	title.parentNode.replaceChild (div, title);
	// title.parentNode.insertBefore (div, title);
}

function statusInitialize() {
	initializeStatusbarTitle();
	var statusbar = document.getElementById('statusbar');
	statusbar.innerHTML = '';
	statusbar.parentNode.addEventListener('click', function() {
		if (statusMode === Mode.LINE) {
			statusTab = Tab.CONSOLE;
			statusToggle();
		}
	});
	statusMessage('Loading webui...', 2);
}

statusInitialize();

/* --- terminal.js --- */
function submit(cmd) {
	var output = document.getElementById('terminal_output');
	var input = document.getElementById('terminal_input');
	if (!input || !output) {
		console.error('No terminal_{input|output} found');
		return;
	}
	if (cmd === 'clear') {
		output.innerHTML = '';
		input.value = '';
		return;
	}
	r2.cmd(cmd, function(res) {
		res += '\n';
		output.innerHTML += ' > '
			+ cmd + '\n' + res;
		input.value = '';
		var bar = document.getElementById('statusbar_scroll');
		bar.scrollTop = bar.scrollHeight;
	});
}

function terminal_ready() {
	r2.cmd('e scr.color=true');
	var input = document.getElementById('terminal_input');
	if (!input) {
		console.error('Cannot find terminal_input');
		return;
	}
	input.focus();
	input.onkeypress = function(e){
		if (e.keyCode === 13) {
			submit(input.value);
		}
	}
}

/* --- terminal.js --- */
