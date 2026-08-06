const { src, dest, series, parallel, watch } = require('gulp');
const fs = require('fs');
const path = require('path');
const csstree = require('css-tree');
const CleanCSS = require('clean-css');
var cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	htmlmin = require('gulp-html-minifier-terser'),
	eslint = require('gulp-eslint-new');


var paths = {
	r2: '../lib/',
	dev: '../../dev/m/',
	dist: '../../dist/m/'
};

const EXT_LIBS = './node_modules' ; // ./vendors
const MATERIAL_JS = [
	'/material-design-lite/src/mdlComponentHandler.js',
	'/material-design-lite/src/layout/layout.js',
	'/material-design-lite/src/menu/menu.js',
	'/material-design-lite/src/checkbox/checkbox.js',
	'/material-design-lite/src/switch/switch.js',
	'/material-design-lite/src/textfield/textfield.js',
	'/material-design-lite/src/tabs/tabs.js'
].map(file => EXT_LIBS + file);

/**
 * Dependencies management
 */
const _depR2Js = function() {
	return src(paths.r2 + 'r2.js')
		.pipe(uglify())
		.pipe(concat('r2.js'))
		.pipe(dest(paths.dev));
};
const _copyMaterialJs = function() {
	return src(MATERIAL_JS)
		.pipe(concat('material.min.js'))
		.pipe(uglify())
		.pipe(dest(paths.dev + 'vendors/'));
};

const _copyMaterialCss = async function() {
	const sourceFiles = [
		'index.html',
		...findFiles('js', '.js')
	];
	const used = new Set();
	for (const file of sourceFiles) {
		for (const word of fs.readFileSync(file, 'utf8').match(/[a-zA-Z_][a-zA-Z0-9_-]*/g) || []) {
			used.add(word);
		}
	}
	for (const className of [
		'has-drawer', 'has-placeholder', 'is-active', 'is-animating',
		'is-casting-shadow', 'is-checked', 'is-dirty', 'is-disabled',
		'is-focused', 'is-invalid', 'is-small-screen', 'is-upgraded', 'is-visible',
		'mdl-checkbox__box-outline', 'mdl-checkbox__focus-helper',
		'mdl-checkbox__tick-outline', 'mdl-layout__container',
		'mdl-layout__drawer-button', 'mdl-layout__obfuscator', 'mdl-menu__container',
		'mdl-menu__outline', 'mdl-switch__focus-helper', 'mdl-switch__thumb',
		'mdl-switch__track'
	]) used.add(className);

	const ast = csstree.parse(fs.readFileSync(
		EXT_LIBS + '/material-design-lite/material.min.css', 'utf8'));
	csstree.walk(ast, {
		visit: 'Rule',
		enter: function(node, item, ruleList) {
			if (node.prelude.type !== 'SelectorList') return;
			node.prelude.children.forEach((selector, item, list) => {
				let keep = true;
				csstree.walk(selector, child => {
					if ((child.type === 'ClassSelector' || child.type === 'IdSelector') &&
						!used.has(child.name)) keep = false;
				});
				if (!keep) list.remove(item);
			});
			if (node.prelude.children.isEmpty && ruleList) ruleList.remove(item);
		}
	});
	const css = new CleanCSS({ level: 2 }).minify(csstree.generate(ast));
	if (css.errors.length) throw new Error(css.errors.join('\n'));
	fs.mkdirSync(paths.dev + 'vendors', { recursive: true });
	fs.writeFileSync(paths.dev + 'vendors/material.min.css', css.styles);
};

const _dependencies = parallel(_copyMaterialJs, _copyMaterialCss, _depR2Js);

function findFiles(dir, extension) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
		const file = path.join(dir, entry.name);
		return entry.isDirectory() ? findFiles(file, extension) :
			(file.endsWith(extension) ? [file] : []);
	});
}


/**
 * Checkstyle
 */

const _checkstyle = function() {
	return src(['./js/**/*.js', './workers/*.js'])
		.pipe(eslint())
		.pipe(eslint.formatEach());
};

// Will accept ES6 without export/import to ease transition
// All legacy code should be nammed with this extension *.legacy.js

const _jsLegacy = function() {
	return src(['./js/*/**/*.legacy.js', '!./js/helpers/uiTables.legacy.js'])
		.pipe(concat('legacy.js'))
		.pipe(dest(paths.dev));
};



/**
 * check karma-browserify
 */
// TODO --
// task('js:workers',
const _jsWorkers = function() {
	return src(['./workers/*.js', './js/helpers/tools.legacy.js'])
		.pipe(dest(paths.dev));
};

//const _js = parallel( _jsApp, _jsLegacy, _jsWorkers);
const _js = parallel(  _jsLegacy, _jsWorkers);

/**
 * Assets
 */


const _css = function() {
	return src('./css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(dest(paths.dev));
};

const _img =  function() {
	return src('./images/icon.png', {encoding: false})
		.pipe(dest(paths.dev + 'images/'));
};
const _styles = parallel(_css, _img);

const _html =  function() {
	return src(['./index.html'])
		.pipe(dest(paths.dev));
};


const _cleanBuild = function(done) {
	fs.rmSync(paths.dev, { recursive: true, force: true });
	done();
};

const _build = series(_cleanBuild, parallel( _html, _dependencies, _js, _styles));
const _default = parallel( _build, _checkstyle);


const _copyReleaseAssets = function() {
	return src([
		paths.dev + 'images/*',
		paths.dev + 'vendors/**/*',
		paths.dev + '*.css'
	], {
		base: paths.dev,
		encoding: false
	})
		.pipe(dest(paths.dist));
};
const _minifyReleaseJs = function() {
	return src([paths.dev + '*.js'])
		.pipe(uglify())
		.pipe(dest(paths.dist));
};
const _minifyReleaseHtml = function() {
	return src(paths.dev + 'index.html')
		.pipe(htmlmin({collapseWhitespace: true, removeComments: true}))
		.pipe(dest(paths.dist));
};
const _preRelease = parallel(_copyReleaseAssets, _minifyReleaseJs, _minifyReleaseHtml);

const _release = series(_build, _preRelease);

// default
const _watch = function() {
	watch('./*.html', _html);
	watch('./css/*.css', _css);
	watch(['./js/**/*.legacy.js'], _jsLegacy);
	watch(['./workers/*.js'], _jsWorkers);
};
/*
task('test', function() {
	return opener('test/index.html');
});
*/
exports.default = _default;
exports.release = _release;
exports.watch = _watch;
