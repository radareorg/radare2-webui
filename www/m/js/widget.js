function Widget(name, identifier) {
	this.name = name;
	this.identifier = identifier;

	if (typeof identifier !== 'undefined') {
		this.DOMWrapper = document.getElementById(identifier);
	}
}

Widget.prototype.binding = function(domElement) {
	this.DOMWrapper = domElement;
	if (typeof this.content !== 'undefined') {
		this.DOMWrapper.innerHTML = this.content;
	}
};

Widget.prototype.setHTMLContent = function(content) {
	this.content = content;
};

Widget.prototype.getName = function() {
	return this.name;
};

Widget.prototype.getIdentifier = function() {
	return this.identifier;
};

Widget.prototype.setOffset = function(offset) {
	this.offset = offset;
};

Widget.prototype.getOffset = function() {
	return this.offset;
};

/**
 * Identify the special case where the content is already here, in the page
 */
Widget.prototype.isAlreadyThere = function() {
	return (typeof this.identifier !== 'undefined');
};

Widget.prototype.setDark = function() {
	this.DOMWrapper.style.backgroundColor = 'rgb(32, 32, 32)';

	// Flex containers compatibility
	if (typeof this.DOMWrapper.children[1] !== 'undefined') {
		this.DOMWrapper.children[1].style.backgroundColor = 'rgb(32, 32, 32)';
	}
};
