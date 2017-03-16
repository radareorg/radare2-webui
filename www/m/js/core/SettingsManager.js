export class SettingsManager {

	get keys() { return this.itemKeys };

	constructor(keys, baseConf) {
		this.itemKeys = keys;
		this.conf = baseConf;
	}

	loadAll(force = false) {
		for (let key in this.conf) {
			const curValue = this.getItem(key);
			const defaultValue = this.getItemDefaultValue(key);
			if ((!force && curValue !== defaultValue) || force) {
				this.conf[key].apply(curValue);
			}
		}
	}

	resetAll() {
		for (let key in this.conf)
			localStorage.removeItem(key);
		this.loadAll(true);
	}

	getItem(key) {
		if (!this.keyExists(key)) throw new Error(`ConfKey ${key} doesn't exist!`);
		
		var local = localStorage.getItem(key);
		if (local !== null) {
			if (local === 'false') {
				local = false;
			} else if (local === 'true') {
				local = true;
			}
			return local;
		} else {
			return this.getItemDefaultValue(key);
		}
	}

	setItem(key, value) {
		if (!this.keyExists(key)) throw new Error(`ConfKey ${key} doesn't exist!`);
		
		localStorage.setItem(key, value);
		this.conf[key].apply(value);
	}

	getItemDefaultValue(key) {
		if (!this.keyExists(key)) throw new Error(`ConfKey ${key} doesn't exist!`);

		return this.conf[key].defVal;
	}

	/** Tell if the key is defined in the declared item keys */
	keyExists(key) {
		return (typeof this.conf[key]) !== 'undefined';
	}
}
