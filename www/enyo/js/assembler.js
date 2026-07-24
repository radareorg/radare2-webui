enyo.kind({
	name: 'Assembler',
	kind: 'Scroller',
	classes: 'r2panel',
	style: 'background-color:#c0c0c0;',
	components: [
		{tag: 'form', style: 'margin-top:8px;margin-left:8px', attributes: {action: 'javascript:#'}, components: [
			{kind: 'FittableRows', fit: true, components: [
				{kind: 'onyx.InputDecorator', classes: 'r2ui-input', components: [
					{tag: 'font', content: 'opcode', style: 'width:64px;font-weight:bold'},
					{kind: 'Input', value: '', style: 'width:60%', onkeydown: 'assembleOpcode', attributes: {autocapitalize: 'off'}, name: 'opcode'}
				]},
				{kind: 'onyx.InputDecorator', classes: 'r2ui-input', components: [
					{tag: 'font', content: 'bytes', style: 'width:64px;font-weight:bold'},
					{kind: 'Input', value: '', style: 'width:120px', onkeydown: 'assembleOpcode', attributes: {autocapitalize: 'off'}, name: 'bytes'}
				]},
				{kind: 'onyx.InputDecorator', classes: 'r2ui-input', components: [
					{tag: 'font', content: 'address', style: 'width:64px;font-weight:bold'},
					{kind: 'Input', value: 'entry0', style: 'width:120px', onkeydown: 'assembleOpcode', attributes: {autocapitalize: 'off'}, name: 'address'}
				]}
			]}
		]},
		{tag: 'form', style: 'margin-top:8px;margin-left:8px', attributes: {action: 'javascript:#'}, components: [
		{tag: 'h2', content: 'Calculator' },
				{kind: 'onyx.InputDecorator', classes: 'r2ui-input', components: [
					{kind: 'Input', name: 'ivalue', value: '', placeholder: 'Expression', style: 'width:300px',
					 onkeydown: 'calculateValue', attributes: {autocapitalize: 'off'} }
				]},
				{tag: 'div', classes: 'calculator-log-header', components: [
					{tag: 'span', content: 'History'},
					{kind: 'onyx.Button', content: 'Clear', ontap: 'clearCalculatorLog'}
				]},
				{tag: 'pre', name: 'calculatorLog', classes: 'calculator-log'}
			]}
	],
	calculatorEntries: [],
	calculateValue: function(inSender, inEvent) {
		if (inEvent.keyCode === 13) {
			var val = inSender.getValue();
			if (!val) {
				return true;
			}
			r2.cmd('?v ' + val, function(x) {
				this.calculatorEntries.push(enyo.Control.escapeHtml(val) + ' = ' + enyo.Control.escapeHtml(x.trim()));
				this.$.calculatorLog.setContent(this.calculatorEntries.join('\n'));
			}.bind(this));
		}
	},
	clearCalculatorLog: function() {
		this.calculatorEntries = [];
		this.$.calculatorLog.setContent('');
		return true;
	},
	assembleOpcode: function(inSender, inEvent) {
		if (inEvent.keyCode === 13) {
			var arg = inSender.getValue();
			var address = this.$.address.getValue();
			switch (inSender.name) {
			case 'opcode':
				var hex = this.$.bytes;
				r2.assemble(address, arg, function(bytes) {
					hex.setValue(bytes); // ? s/\n/;/g
				});
				break;
			case 'bytes':
				var op = this.$.opcode;
				//r2.cmd ("pi 1@b:"+arg, function (x) {
				r2.disassemble(address, arg, function(x) {
					op.setValue(x); // ? s/\n/;/g
				});
				break;
			case 'address':
				break;
		}
		}
	}
});
