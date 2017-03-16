export class UpdateManager {

	constructor() {
		this.updateMethods = [{}, {}];
		this.currentFocus;
	}

	registerMethod(offset, method) {
		this.updateMethods[offset] = method;
	}

	focusHasChanged(offset) {
		this.currentFocus = offset;
	}

	apply() {
		if (typeof this.currentFocus === 'undefined') {
			return;
		}
		this.updateMethods[this.currentFocus]();
	}
}
