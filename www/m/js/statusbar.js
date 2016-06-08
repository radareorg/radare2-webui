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
    statusTimeout = setTimeout(function(x) {
      statusMessage ('');
    }, t * 1000);
  }
  if (x.trim()) {
    statusLog.push(x);
  }
}

function statusToggle(x) {
  var statusbar = document.getElementById('statusbar');
  statusBig = !statusBig;
  if (statusBig) {
    statusbar.style.height = '50%';
    statusbar.innerHTML = statusLog.join('<br />');
  } else {
    statusbar.style.height = '20px';
    statusbar.innerHTML = '';
  }
}

function statusInitialize() {
  var statusbar = document.getElementById('statusbar');
  statusbar.addEventListener('click', function() {
    statusToggle();
  });
  statusMessage('Loading webui...', 2);
}

statusInitialize();
