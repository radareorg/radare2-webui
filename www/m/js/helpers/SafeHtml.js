/**
 * Allowlist based sanitizer for the HTML produced by r2 (`|H` filter) and the
 * disassembly worker. Only formatting markup survives, everything else is
 * unwrapped (elements) or dropped (attributes), so text coming from the
 * analyzed binary can never inject scripts, handlers or links.
 */

const allowedTags = ['A', 'B', 'BR', 'FONT', 'I', 'PRE', 'SPAN', 'STRONG', 'U'];
const allowedClasses = ['fcn', 'offset', 'r2seek', 'var'];
const allowedStyles = ['background-color', 'border-bottom', 'color', 'font-style', 'font-weight', 'text-decoration'];
const cssValueRegex = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|[\w\- ]+)$/;

function cleanStyle(style) {
	return style.split(';').map((decl) => decl.split(':').map((x) => x.trim()))
		.filter(([prop, value, ...rest]) => !rest.length && allowedStyles.includes(prop.toLowerCase()) && cssValueRegex.test(value))
		.map(([prop, value]) => prop + ':' + value)
		.join(';');
}

function cleanNode(src, dst, linkify) {
	for (const child of Array.from(src.childNodes)) {
		if (child.nodeType === Node.TEXT_NODE) {
			const inLink = dst.closest && dst.closest('a');
			dst.appendChild(linkify && !inLink ? linkify(child.nodeValue) : document.createTextNode(child.nodeValue));
			continue;
		}
		if (child.nodeType !== Node.ELEMENT_NODE) {
			continue;
		}
		if (!allowedTags.includes(child.tagName)) {
			cleanNode(child, dst, linkify);
			continue;
		}
		const el = document.createElement(child.tagName.toLowerCase());
		// Only offsets, so names from the binary can't clobber ids used by the UI
		el.id = /^(block)?\d+$/.test(child.id) ? child.id : '';
		el.title = child.title;
		el.className = Array.from(child.classList).filter((c) => allowedClasses.includes(c)).join(' ');
		const color = (child.getAttribute('color') || '').trim();
		const style = cleanStyle(child.getAttribute('style') || '');
		cssValueRegex.test(color) && el.setAttribute('color', color);
		style && el.setAttribute('style', style);
		['id', 'title', 'class'].forEach((attr) => el.getAttribute(attr) || el.removeAttribute(attr));
		dst.appendChild(el);
		cleanNode(child, el, linkify);
	}
}

/**
 * Parses an HTML string in an inert document and rebuilds it with the allowlist
 * @param {string} html - untrusted HTML
 * @param {function} [linkify] - optional, maps a text chunk to a DOM node
 * @returns {DocumentFragment}
 */
export function sanitizeHtml(html, linkify = null) {
	const doc = new DOMParser().parseFromString('<body>' + html, 'text/html');
	const frag = document.createDocumentFragment();
	cleanNode(doc.body, frag, linkify);
	return frag;
}
