enyo.kind({
	name: 'Script',
	kind: 'Scroller',
	style: 'background-color:#c0c0c0',
	clear: function() {
		this.$.input.setValue('');
		this.$.output.setContent('');
		return true;
	},
	run: function() {
		var code = this.$.input.getValue();
		if (!code) {
			return true;
		}
		var command = this.$.language.selected.content === 'r2js'
			? 'js base64:' + btoa(unescape(encodeURIComponent(code)))
			: code;
		this.$.output.setContent('Running...');
		r2.cmd(command, function(output) {
			this.$.output.setContent(enyo.Control.escapeHtml(output || ''));
		}.bind(this));
		return true;
	},
	components: [
		{tag: 'div', classes: 'script-toolbar', components: [
			{kind: 'onyx.PickerDecorator', components: [
				{},
				{kind: 'onyx.Picker', name: 'language', components: [
					{content: 'r2', active: true},
					{content: 'r2js'}
				]}
			]},
			{kind: 'onyx.Button', content: 'Run', classes: 'sourcebutton', ontap: 'run' },
			{kind: 'onyx.Button', content: 'Clear', classes: 'sourcebutton', ontap: 'clear' }
		]},
		{tag: 'div', classes: 'sourcecode-container', components: [
			{kind: 'onyx.TextArea', name: 'input', classes: 'sourcecode' }
		]},
		{tag: 'pre', name: 'output', classes: 'script-output' }
	]
});
