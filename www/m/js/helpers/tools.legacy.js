/* Native-browser replacements for the former FileSaver and dialog polyfill. */
function saveAs(blob, fileName) {
	var url = URL.createObjectURL(blob);
	var link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	link.click();
	setTimeout(function() { URL.revokeObjectURL(url); }, 0);
}

var dialogPolyfill = {
	registerDialog: function(dialog) {
		dialog.showModal = function() { dialog.setAttribute('open', ''); };
		dialog.close = function() { dialog.removeAttribute('open'); };
	}
};
