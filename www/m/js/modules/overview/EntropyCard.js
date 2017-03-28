import {r2Wrapper} from '../../core/R2Wrapper';
import {Widgets} from '../../widgets/Widgets';

const xmlns = "http://www.w3.org/2000/svg";

export class EntropyCard {

	get DOM() { return this.card; }

	constructor(width, height) {
		this.width = width;
		this.height = height;
		this.entropy = [];
		this.build();
		this.refreshEntropy();
		this.draw();
	}

	build() {
		this.card = document.createElement('div');
		this.card.className = 'demo-charts mdl-color--white mdl-shadow--2dp mdl-cell mdl-cell--12-col mdl-grid';
		this.card.style.textAlign = 'center';
		
		this.svg = document.createElementNS(xmlns, 'svg');
		this.card.appendChild(this.svg);
		this.svg.style.display = 'block';
		this.svg.style.margin = 'auto';
		this.svg.setAttribute('fill', 'currentColor');
		this.svg.setAttribute('viewBox', '0 0 ' + this.width + ' ' + this.height);
		this.svg.setAttribute('width', this.width + 'px');
		this.svg.setAttribute('height',  this.height + 'px');
		this.svg.setAttribute('title', 'Entropy graph');
	}

	refreshEntropy() {
		r2.cmdj('p=ej 50 $s @ $M|', (d) => {
			if (d && d.entropy) {
				this.entropy = d.entropy;
			}
		});
	}

	draw() {
		const nbVals = this.entropy.length;
		if (nbVals < 1) {
			return;
		}
		const minVal = this.entropy.reduce((prev, curr) => (prev.value < curr.value) ? prev : curr).value;
		const maxVal = this.entropy.reduce((prev, curr) => (prev.value > curr.value) ? prev : curr).value;
		const width = this.width / nbVals;
		const height = this.height;

		this.svg.innerHTML = '';
		for (let i in this.entropy)
		{
			const cur = this.entropy[i];
			const opacity = 0.1 + (1 - 0.1) * ((cur.value - minVal) / (maxVal - minVal));

			const g = document.createElementNS(xmlns, 'g');
			g.addEventListener('click', () => { r2Wrapper.seek(cur.addr, Widgets.DISASSEMBLY); });
			this.svg.appendChild(g);

			const title = document.createElementNS(xmlns, 'title');
			title.textContent = '0x' + cur.addr.toString(16);
			g.appendChild(title);

			const rect = document.createElementNS(xmlns, 'rect');
			rect.setAttribute('x', width * i);
			rect.setAttribute('y', 0);
			rect.setAttribute('width', width);
			rect.setAttribute('height', height);
			rect.setAttribute('fill', '#000');
			rect.setAttribute('fill-opacity', opacity);

			const text = document.createElementNS(xmlns, 'text');
			const color = (opacity > 0.4) ? '#EEEEEE' : 'black';
			text.setAttribute('x', width * i + 2);
			text.setAttribute('y', height + 10);
			text.setAttribute('fill', color);
			text.setAttribute('font-family', 'Roboto');
			text.setAttribute('font-size', 12);
			text.setAttribute('transform', 'rotate(-90, ' + width * i + ', ' + height + ')');
			text.textContent = '0x' + cur.addr.toString(16);

			g.appendChild(rect);   
			g.appendChild(text);   
		}
	}

	refresh() {
		this.refreshEntropy();
		this.draw();
	}
}
