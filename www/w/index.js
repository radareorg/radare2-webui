
document.addEventListener('DOMContentLoaded', function () {
  dragElement(document.getElementById('alert-window-'));
  dragElement(document.getElementById('options'));
})

var newTop = 1000;

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
elmnt.style.zIndex = newTop;
newTop++;
    document.getElementById(elmnt.id + "header").classList.toggle('active')
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    var y = (elmnt.offsetTop - pos2);
    var x = (elmnt.offsetLeft - pos1);
    if (x < 0) { x = 0; }
    if (y < 29) { y = 29; }
    elmnt.style.top = y + "px";
    elmnt.style.left = x + "px";
    //elmnt.style.top = (elmnt.style.top  +2) + "px";
    //elmnt.style.left = (elmnt.style.left +2) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function ok() {
	var w = document.getElementById('alert-window-');
	w.style.visibility = 'hidden';
}

function as() {
	var inp = document.getElementById('assembler-input');
	r2.cmd("pad " + inp.value, function(res) {
		var out = document.getElementById('assembler-output');
		out.innerHTML = res;
	});
}
