const { src, series, dest } = require('gulp');

var uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	replace = require('gulp-replace'),
	concat = require('gulp-concat'),
	bower = require('bower');

var paths = {
	r2: '../lib/',
	dev: '../../dev/enyo/',
	dist: '../../dist/enyo/'
};



const _concatCommonJs = function() {
	return src(paths.r2 + '*.js')
		.pipe(uglify())
		.pipe(concat('r2core.js'))
		.pipe(dest(paths.dist));
}
const _concatCommonCss = function() {
	return src(paths.r2 + '*.css')
		.pipe(cleanCSS())
		.pipe(concat('r2core.css'))
		.pipe(dest(paths.dist));
}


const _concatR2appJs = function() {
	return src('js/*.js')
		.pipe(uglify())
		.pipe(concat('r2app.js'))
		.pipe(dest(paths.dist));
}
const _concatEnyoAppJs = function() {
	return src(['js/enyo/enyo.js', 'js/enyo/app.js'])
		.pipe(concat('enyo_app.js'))
		.pipe(dest(paths.dist));
}
const _concatMainJs = function() {
	return src('js/core/disassembler_old.js')
		.pipe(uglify())
		.pipe(concat('disassembler_old.js'))
		.pipe(dest(paths.dist));
}

const _common = series(
	_concatCommonJs,
	_concatCommonCss
);

const _js = series(
	_concatR2appJs,
	_concatEnyoAppJs,
	_concatMainJs
);


const _concatAllCss = function() {
	return src('css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(dest(paths.dist));
}
const _concatEnyoCss = function() {
	return src('css/enyo/*.css')
		.pipe(replace(/\.\.\/lib\/onyx\/images\//g, ''))
		.pipe(cleanCSS())
		.pipe(concat('enyo.css'))
		.pipe(dest(paths.dist));
}
const _copyNestedPng = function() {
	return src('css/**/*.png')
		.pipe(dest(paths.dist+'enyo/'));
}
const _copyPng = function() {
	return src(['css/lib/onyx/images/*.png','*.png'])
		.pipe(dest(paths.dist))
}

const _css = series(
	_concatAllCss,
	_concatEnyoCss,
	_copyNestedPng,
	_copyPng
);

const _bowerInstall = function() {
	//return bower({ cmd: 'install'});
	return new Promise((resolve) => {
		bower.commands.install(undefined, undefined, {
			cwd: process.cwd()
		}).on('end', resolve);
	});
};

const _copyVendors = function() {
	// Moving neccesary vendors files from bower
	return src([
			'vendors/jquery/dist/jquery.min.js',
			'vendors/jquery.scrollTo/jquery.scrollTo.min.js',
			'vendors/jquery-ui/jquery-ui.min.js',
			'vendors/jquery.layout/dist/jquery.layout-latest.min.js',
			'vendors/lodash/dist/lodash.min.js',
			'vendors/backbone/backbone-min.js',
			'vendors/jointjs/dist/joint.min.css',
			'vendors/jointjs/dist/joint.min.js',
			'vendors/jointjs/plugins/layout/DirectedGraph/joint.layout.DirectedGraph.js'
		])
		.pipe(dest(paths.dist+'vendors/'));
}

const _default = () => {
  return src('index.html').pipe(dest(paths.dist))
}

exports.default = series( _bowerInstall, _copyVendors, _js, _css, _common, _default);


