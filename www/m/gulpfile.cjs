const { src, dest, task, series, parallel, watch } = require('gulp');
var cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	replace = require('gulp-replace'),
	uglify = require('gulp-uglify'),
	uglifycss = require('gulp-uglifycss'),
	htmlmin = require('gulp-html-minifier-terser'),
	eslint = require('gulp-eslint-new');


var paths = {
	r2: '../lib/',
	dev: '../../dev/m/',
	dist: '../../dist/m/'
};

const EXT_LIBS = './node_modules' ; // ./vendors

/**
 * Dependencies management
 */
const _depR2Js = function() {
	return src(paths.r2 + 'r2.js')
		.pipe(uglify())
		.pipe(concat('r2.js'))
		.pipe(dest(paths.dev));
};
const _copyUglifiedVendors = function() {
	return src(
		EXT_LIBS+'/dialog-polyfill/dist/dialog-polyfill.js')
		.pipe(uglify())
		.pipe(dest(paths.dev + 'vendors/'));
};
const _copyVendors = function() {
	return src([
		EXT_LIBS+'/jquery/dist/jquery.min.js',
		EXT_LIBS+'/material-design-lite/material.min.js',
		EXT_LIBS+'/mdl-selectfield/dist/mdl-selectfield.min.js',
		EXT_LIBS+'/file-saver/dist/FileSaver.min.js'])
		.pipe(dest(paths.dev + 'vendors/'));
};
const _copyDataTables = function() {
	return src(EXT_LIBS+'/datatables.net/js/dataTables.min.js')
		.pipe(concat('jquery.dataTables.min.js'))
		.pipe(dest(paths.dev + 'vendors/'));
};


/*
const _vendorsSrcmaps = function() {
	return src([
		EXT_LIBS+'/material-design-lite/material.min.js.map',
		EXT_LIBS+'/mdl-selectfield/dist/mdl-selectfield.min.js.map'])
		.pipe(dest(paths.dev + 'vendors/'));
};
*/

//task('dependencies:vendors-srcmaps', parallel(['bower']), function() {})
// ./vendors

const _copyDialogCss = function() {
	return src(EXT_LIBS+'/dialog-polyfill/dialog-polyfill.css')
		.pipe(uglifycss({
			"maxLineLen": 80,
			"uglyComments": true
		}))
		.pipe(dest(paths.dev + 'vendors/'));
};
const _copyMaterialCss = function() {
	return src([
		EXT_LIBS+'/mdl-selectfield/dist/mdl-selectfield.min.css',
		EXT_LIBS+'/material-design-lite/material.min.css'])
		.pipe(dest(paths.dev + 'vendors/'));
};
const _copyDataTablesCss = function() {
	return src(EXT_LIBS+'/datatables.net-dt/css/dataTables.dataTables.min.css')
		.pipe(concat('jquery.dataTables.min.css'))
		.pipe(dest(paths.dev + 'vendors/'));
};
const _copyMaterialIconsCss = function() {
	return src(EXT_LIBS+'/material-design-icons-iconfont/dist/material-design-icons.css')
		.pipe(uglifycss({
			"maxLineLen": 80,
			"uglyComments": true
		}))
		.pipe(dest(paths.dev + 'vendors/'));
};
const _depCss = parallel(_copyDialogCss, _copyMaterialCss, _copyDataTablesCss, _copyMaterialIconsCss);

const _copyRobotoCss = function() {
	return src([
		EXT_LIBS+'/@fontsource/roboto/latin-{100,300,400,500,700,900}.css',
		EXT_LIBS+'/@fontsource/roboto/latin-{400,700}-italic.css'
	])
		.pipe(concat('fonts.css'))
		.pipe(dest(paths.dev + 'vendors/fonts/'));
};
const _copyRobotoFonts = function() {
	return src([
		EXT_LIBS+'/@fontsource/roboto/files/roboto-latin-{100,300,400,500,700,900}-normal.woff{,2}',
		EXT_LIBS+'/@fontsource/roboto/files/roboto-latin-{400,700}-italic.woff{,2}'
	], {
		base: EXT_LIBS + '/@fontsource/roboto/',
		encoding: false
	})
		.pipe(dest(paths.dev + 'vendors/fonts/'));
};
const _copyMaterialIconFonts = function() {
	return src(
		EXT_LIBS+'/material-design-icons-iconfont/dist/fonts/*.{eot,ttf,woff,woff2}',
		{encoding: false})
		.pipe(dest(paths.dev + 'vendors/fonts/'));
};
const _depFonts = parallel(_copyRobotoCss, _copyRobotoFonts, _copyMaterialIconFonts);

const _dependencies = parallel(_copyVendors, _copyDataTables, _copyUglifiedVendors, /* _vendorsSrcmaps, */ _depCss, _depFonts, _depR2Js);


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
	return src('./js/*/**/*.legacy.js')
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
	return src('./images/*', {encoding: false})
		.pipe(dest(paths.dev + 'images/'));
};
//const _allFonts = series(_dependencies);
const _styles = parallel(_css, _img);

const _html =  function() {
	return src(['./index.html'])
		.pipe(dest(paths.dev));
};


const _build = parallel( _html, _dependencies, _js, _styles);
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
		.pipe(htmlmin({collapseWhitespace: true}))
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
