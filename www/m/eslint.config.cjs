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
				dialogPolyfill: 'readonly',
				saveAs: 'readonly',
				componentHandler: 'readonly',
				r2Name: 'readonly',
				r2Expr: 'readonly',
				r2Hex: 'readonly',
				r2Quoted: 'readonly',
				r2StrToHex: 'readonly',
				r2StrToBase64: 'readonly'
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
