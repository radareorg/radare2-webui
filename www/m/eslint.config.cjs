const globals = require('globals');

module.exports = [
	{
		files: ['js/**/*.js', 'workers/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.browser,
				r2: 'readonly',
				componentHandler: 'readonly'
			}
		},
		rules: {
			indent: ['error', 'tab'],
			'eol-last': ['error', 'always'],
			'no-undefined': 'error',
			'no-undef': 'error',
			eqeqeq: ['error', 'always', { null: 'ignore' }],
			quotes: ['warn', 'single']
		}
	}
];
