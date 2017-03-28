import {r2Settings} from '../core/R2Wrapper';

export function speak(text, callback) {
	if (!r2Settings.getItem(r2Settings.keys.USE_TTS)) {
		return;
	}

	if (typeof SpeechSynthesisUtterance === 'undefined') {
		return;
	}
	
	var u = new SpeechSynthesisUtterance();
	u.text = text;
	u.lang = 'en-US';

	u.onend = function() {
		if (callback) {
			callback();
		}
	};

	u.onerror = function(e) {
		if (callback) {
			callback(e);
		}
	};

	speechSynthesis.speak(u);
}
