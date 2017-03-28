import {r2Wrapper} from '../core/R2Wrapper';

const offsetRegex = new RegExp(/(0x[a-zA-Z0-9]+|(?:sym|fcn|str)\.[\.a-zA-Z0-9_]+)/, "g");

/** Takes a block and makes all offsets clickables */
export function formatOffsets(str, navigateTo = null) {
	const chunks = str.split(offsetRegex);
	const node = document.createElement('span');

	for (const chunk of chunks) {
		node.appendChild(formatOffset(chunk, navigateTo));
	}

	return node;
}

/** Read the value and format if it's exactly an offset */
export function formatOffset(str, navigateTo = null) {
	let chunkNode;
	if (offsetRegex.test(str)) {
		chunkNode = document.createElement('a');
		chunkNode.innerHTML = str;
		applySeek(chunkNode, str, navigateTo);
	} else {
		chunkNode = document.createElement('span');
		chunkNode.innerHTML = str;
	}

	return chunkNode;
}

/** Consider node's content as seekable, apply events to trigger seek event */
export function applySeek(node, dest = null, navigateTo = null) {
	dest = dest || node.textContent;
	node.addEventListener('click', () => r2Wrapper.seek(dest, navigateTo));
	node.title = 'Seek ' + dest;
	node.href = '#' + dest;
}
