export class AnalysisCard {

	get DOM() { return this.card; }
	set onAnalysis(value ) { this.analysisCallback = value; }

	constructor() {
		this.analysisMethods = [
			{ id: 'symbols', name: 'Analyse symbols', cmd: 'aa' },
			{ id: 'ref', name: 'Analyse References', cmd: 'aar' },
			{ id: 'calls', name: 'Analyse calls', cmd: 'e anal.calls=true;aac', disabledCmd: 'e anal.calls=false'  },
			{ id: 'emu', name: 'Emulate code', cmd: 'e asm.emu=1;aae;e asm.emu=0', disabledCmd: 'e asm.emu=false' },
			{ id: 'prelude', name: 'Find preludes', cmd: 'aap' },
			{ id: 'autoname', name: 'Autoname fcns', cmd: 'aan' },
		];

		this.build();
	}

	build() {
		this.card = document.createElement('div');
		this.card.className = 'demo-options mdl-card mdl-color--teal-300 mdl-shadow--2dp mdl-cell mdl-cell--4-col mdl-cell--3-col-tablet mdl-cell--12-col-desktop';

		const title = document.createElement('div');
		title.className = 'mdl-card__title mdl-card--expand mdl-color--teal-300';
		title.innerHTML = '<h2 class="mdl-card__title-text">Analysis Options</h2>';
		this.card.appendChild(title);

		const content = document.createElement('div');
		content.className = 'mdl-card__supporting-text mdl-color-grey-600';
		this.card.appendChild(content);

		const choiceList = document.createElement('ul');
		content.appendChild(choiceList);

		const action = document.createElement('div');
		action.className = 'mdl-card__actions mdl-card--border';
		this.card.appendChild(action);

		const analyseButton = document.createElement('a');
		analyseButton.className = 'mdl-button mdl-js-button mdl-js-ripple-effect mdl-color--blue-grey-50 mdl-color-text--blue-greu-50';
		analyseButton.textContent = 'Analyse',
		analyseButton.addEventListener('click', () => this.analyse());
		action.appendChild(analyseButton);

		const spacer = document.createElement('div');
		spacer.className = 'mdl-layout-spacer';
		action.appendChild(spacer);

		const icon = document.createElement('i');
		icon.className = 'material-icons';
		icon.textContent = 'room';
		action.appendChild(icon);

		this.addAnalysisOptions(choiceList);
	}

	addAnalysisOptions(dom) {
		for (let i in this.analysisMethods)
		{
			const method = this.analysisMethods[i];
			const methodId = 'anal_' + method.id;
			const li = document.createElement('li');
			dom.appendChild(li);

			const label = document.createElement('label');
			label.className = 'mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect';
			label.for = methodId;
			li.appendChild(label);

			const checkbox = document.createElement('input');
			checkbox.className = 'mdl-checkbox__input';
			checkbox.id = methodId;
			checkbox.type = 'checkbox';
			label.appendChild(checkbox);

			const text = document.createElement('span');
			text.className = 'mdl-checkbox__label';
			text.innerHTML = method.name;
			label.appendChild(text);
		}
	}

	refresh() {
		var collection = [].slice.call(this.card.getElementsByTagName('input'));
		collection.forEach((checkbox) => checkbox.checked = false);
	}

	analyse() {
		let atLeastOneChecked = false;
		for (let i in this.analysisMethods)
		{
			const method = this.analysisMethods[i];
			const methodId = 'anal_' + method.id;
			const element = document.getElementById(methodId);

			if (element.checked) {
				r2.cmd(method.cmd);
				atLeastOneChecked = true;
			} else if (typeof method.disabledCmd !== 'undefined') {
				r2.cmd(method.cmd);
			}
		}

		if (atLeastOneChecked && typeof this.analysisCallback !== 'undefined') {
			this.analysisCallback();
		}
	}
}
