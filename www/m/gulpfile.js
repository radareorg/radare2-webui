const { src, dest, task, series, parallel, watch } = require('gulp');
var merge = require('merge-stream'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('bower'),
	replace = require('gulp-replace'),
	googleWebFonts = require('gulp-google-webfonts'),
	livereload = require('gulp-livereload'),
	uglify = require('gulp-uglify'),
	uglifycss = require('gulp-uglifycss'),
	htmlmin = require('gulp-htmlmin'),
	sourcemaps = require('gulp-sourcemaps'),
	babel = require('gulp-babel'),
	eslint = require('gulp-eslint'),
	opener = require('opener'),
	browserify = require('browserify'),
	babelify = require('babelify'),
	source = require('vinyl-source-stream');

var babelPresets = ['@babel/preset-env'];

var paths = {
	r2: '../lib/',
	dev: '../../dev/m/',
	dist: '../../dist/m/'
};

const EXT_LIBS = './node_modules' ; // ./vendors

/**
 * Dependencies management
 */
const _bowerInstall = function() {

	//return bower({ cmd: 'install'});
	return new Promise((resolve) => {
		bower.commands.install(undefined, undefined, {
			cwd: process.cwd()
		}).on('end', resolve);
	});
};

// dependencies:r2
const _depR2Js = function() {
	return src(paths.r2 + 'r2.js')
		.pipe(uglify())
		.pipe(concat('r2.js'))
		.pipe(dest(paths.dev));
};
const _copyUglifiedVendors = function() {
	return src(
		EXT_LIBS+'/dialog-polyfill/dialog-polyfill.js')
		.pipe(uglify())
		.pipe(dest(paths.dev + 'vendors/'));
};
const _copyVendors = function() {
	return src([
		EXT_LIBS+'/jquery/dist/jquery.min.js',
		EXT_LIBS+'/material-design-lite/material.min.js',
		EXT_LIBS+'/datatables.net/js/jquery.dataTables.min.js',
		EXT_LIBS+'/mdl-selectfield/dist/mdl-selectfield.min.js',
		EXT_LIBS+'/file-saver/dist/FileSaver.min.js'])
		.pipe(dest(paths.dev + 'vendors/'));
};



const _vendorsSrcmaps = function() {
	return src([
		EXT_LIBS+'/material-design-lite/material.min.js.map',
		EXT_LIBS+'/mdl-selectfield/dist/mdl-selectfield.min.js.map'])
		.pipe(dest(paths.dev + 'vendors/'));
};


//task('dependencies:vendors-srcmaps', parallel(['bower']), function() {})
// ./vendors

const _depCss = function() {
	var tasks = merge();

	tasks.add(src(
		EXT_LIBS+'/dialog-polyfill/dialog-polyfill.css')
		.pipe(uglifycss({
			"maxLineLen": 80,
			"uglyComments": true
		}))
		.pipe(dest(paths.dev + 'vendors/')));

	tasks.add(src([
		EXT_LIBS+'/mdl-selectfield/dist/mdl-selectfield.min.css',
		EXT_LIBS+'/material-design-lite/material.min.css'])
		.pipe(dest(paths.dev + 'vendors/')));

	tasks.add(src(EXT_LIBS+'/datatables.net-dt/css/jquery.dataTables.min.css')
		.pipe(replace('/images/', './images/'))
		.pipe(dest(paths.dev + 'vendors/')));

	tasks.add(src(EXT_LIBS+'/datatables.net-dt/images/*')
		.pipe(dest(paths.dev + 'vendors/images/')));

	tasks.add(src(EXT_LIBS+'/material-design-icons-iconfont/dist/material-design-icons.css')
		.pipe(replace('src: local("Material Icons"), local("MaterialIcons-Regular"), url(./fonts/MaterialIcons-Regular.woff2) format("woff2"), url(./fonts/MaterialIcons-Regular.woff) format("woff"), url(./fonts/MaterialIcons-Regular.ttf) format("truetype");', ''))
		.pipe(replace('./fonts/MaterialIcons-Regular.eot', './fonts/MaterialIcons-Regular.woff'))
		.pipe(uglifycss({
			"maxLineLen": 80,
			"uglyComments": true
		}))
		.pipe(dest(paths.dev + 'vendors/')));

	return tasks;
};

const _depFonts = function() {
	return src('./fonts.list')
		.pipe(googleWebFonts({}))
		.pipe(dest(paths.dev + 'vendors/fonts/'));
};

const _dependencies = parallel(_copyVendors, _copyUglifiedVendors, _vendorsSrcmaps, _depCss, _depFonts, _depR2Js)
/*
task('dependencies',
	parallel([
		'dependencies:vendors',
		'dependencies:vendors-srcmaps',
		'dependencies:r2',
		'dependencies:css',
		'dependencies:fonts'
	]));*/

/**
 * Checkstyle
 */

const _checkstyle = function() {
	return src(['./js/**/*.js', './workers/*.js'])
		.pipe(eslint())
		.pipe(eslint.formatEach());
};

/**
 * JS related processing
 */
/*
task('js:main', function() {
	return src('./js/main.js')
		.pipe(babel({presets: babelPresets, compact: false}))
		.pipe(dest(paths.dev))
		.pipe(livereload());
});
*/

// Will accept ES6 without export/import to ease transition
// All legacy code should be nammed with this extension *.legacy.js

const _jsLegacy = function() {
	return src('./js/*/**/*.legacy.js')
	 	.pipe(sourcemaps.init())
	 	.pipe(babel({presets: babelPresets, compact: false}))
	 	.pipe(concat('legacy.js'))
	 	.pipe(sourcemaps.write('.'))
	 	.pipe(dest(paths.dev))
	 	.pipe(livereload());
};


const _jsApp = function() {
	return browserify({entries: './js/app.js', extensions: ['.js'], debug: true})
        .transform(babelify, {presets: babelPresets})
        .bundle()
        .pipe(source('app.js'))
        .pipe(dest(paths.dev));
};


/**
 * check karma-browserify
 */
// TODO --
// task('js:workers',
const _jsWorkers = function() {
	return src(['./workers/*.js', './js/helpers/tools.legacy.js'])
		.pipe(babel({presets: babelPresets, compact: false}))
		.pipe(dest(paths.dev))
		.pipe(livereload());
}

const _js = parallel( _jsApp, _jsLegacy, _jsWorkers);

/**
 * Assets
 */


const _css = function() {
	return src('./css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(dest(paths.dev))
		.pipe(livereload());
};

const _img =  function() {
	return src(['./css/images/**', './images/*'])
		.pipe(dest(paths.dev + 'images/'));
};

const _fonts = function() {
	var task1 = src(['./fonts/*'])
		.pipe(dest(paths.dev + 'vendors/fonts/'));

	var task2 = src([EXT_LIBS+'/material-design-icons-iconfont/dist/fonts/*.woff'])
		.pipe(dest(paths.dev + 'vendors/fonts/'));

	return merge(task1, task2);
};
const _allFonts = series(_dependencies, _fonts);
const _styles = parallel( _css, _img, _allFonts);

const _html =  function() {
	return src(['./index.html'])
		.pipe(dest(paths.dev))
		.pipe(livereload());
};


const _build = parallel( _html, _dependencies, _js, _styles);
const _default = parallel( _build, _checkstyle);


const _preRelease =  function() {
	var tasks = merge();

	// Import files from dev
	[
		{ dir: 'images/', match: '*' },
		{ dir: 'vendors/', match: '**/!(*.map)' },
		{ dir: '/', match: '*.css' }
	].map(function(path) {
	    tasks.add(src(paths.dev + path.dir + path.match)
	      .pipe(dest(paths.dist + path.dir)));
	});

	// Minify JS
	tasks.add(src([paths.dev + '*.js'])
		.pipe(uglify())
		.pipe(dest(paths.dist)));

	// Minify HTML
	tasks.add(src(paths.dev + 'index.html')
		.pipe(htmlmin({collapseWhitespace: true}))
		.pipe(dest(paths.dist)));

	return tasks;
};

const _release = series( /*_bowerInstall,*/ _build, _preRelease)

// default
const _watch = function() {
	livereload.listen();
	watch('./*.html', ['html']);
	watch('./css/*.css', ['css']);
	watch(['./js/**/*.js'], ['js:app']);
	watch(['./js/**/*.legacy.js'], ['js:legacy']);
	watch(['./workers/*.js'], ['js:workers']);
};

task('test', function() {
	return opener('test/index.html');
});

exports.default = _default;
exports.release = _release;
exports.watch = _watch;