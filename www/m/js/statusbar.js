/* TODO
 * - add timestamp
 * - support tabs and console
 */
var statusLog = [];
var statusBig = false;
var statusTimeout = null;

function statusMessage(x, t) {
	var statusbar = document.getElementById('statusbar');
	statusbar.innerHTML = x;
	if (statusTimeout !== null) {
		clearTimeout(statusTimeout);
		statusTimeout = null;
	}
	if (t !== undefined) {
		statusTimeout = setTimeout(function() {
			statusMessage('');
		}, t * 1000);
	}
	if (x.trim()) {
		statusLog.push(x);
	}
}

function statusToggle() {
	var statusbar = document.getElementById('statusbar');
	statusBig = !statusBig;
	if (statusBig) {
		statusbar.parentNode.classList.add('bigger');
		console.log('toggle >big');

		statusbar.innerHTML = statusLog.join('<br />');
	} else {
		statusbar.parentNode.classList.remove('bigger');
		statusbar.innerHTML = '';
	}
}

function statusInitialize() {
	var statusbar = document.getElementById('statusbar');
	console.log(statusbar.parentNode);
	statusbar.parentNode.addEventListener('click', function() {
		statusToggle();
	});
	statusMessage('Loading webui...', 2);
}

statusInitialize();
