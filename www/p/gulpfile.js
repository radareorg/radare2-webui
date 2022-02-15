const { src, watch, series, dest } = require('gulp');

var uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('bower');

var paths = {
	r2: '../lib/',
	dev: '../../dev/p/',
	dist: '../../dist/p/'
};

const _concatCommonJs = function() {
	return src(paths.r2 + '*.js')
		.pipe(concat('r2core.js'))
		.pipe(dest(paths.dev));
}
const _concatCommonCss = function() {
	return src(paths.r2 + '*.css')
		.pipe(concat('r2core.css'))
		.pipe(dest(paths.dev));
}

const _concatPanelJs = function() {
	return src('./lib/js/panels/*.js')
		.pipe(concat('panels.js'))
		.pipe(dest(paths.dev));
}
const _concatDepsJs = function() {
	return src('./lib/js/dependencies/*.js')
		.pipe(concat('dependencies.js'))
		.pipe(dest(paths.dev));
}
const _concatMainJs = function() {
	return src('./lib/js/*.js')
		.pipe(concat('main.js'))
		.pipe(dest(paths.dev));
}

const _common = series(
	_concatCommonJs,
	_concatCommonCss
);

const _js = series(
	_concatPanelJs,
	_concatDepsJs,
	_concatMainJs
);


const _watch =  function() {
	watch('./*.html', ['html']);
	watch(['./lib/js/*.js'], ['js:main']);
	watch(['./lib/js/**/*.js'], ['js:app']);
	watch(['./lib/css/**/*.css'], ['js:css']);
	done();
};

const _css = function() {

	return src(['./lib/css/jquery-ui.css', './lib/css/tree.jquery.css'])
		.pipe(concat('dependencies.css'))
		.pipe(dest(paths.dev));
};

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
			'vendors/jquery.layout/dist/layout-default-latest.css',
			'vendors/jointjs/dist/joint.min.css',
			'vendors/onoff/dist/jquery.onoff.css',
			'vendors/jquery/dist/jquery.min.js',
			'vendors/jquery.scrollTo/jquery.scrollTo.min.js',
			'vendors/jquery.layout/dist/jquery.layout-latest.min.js',
			'vendors/jquery-ui/ui/minified/jquery-ui.min.js',
			'vendors/jquery-ui-contextmenu/jquery.ui-contextmenu.min.js',
			'vendors/onoff/dist/jquery.onoff.min.js',
			'vendors/lodash/lodash.min.js',
			'vendors/backbone/backbone-min.js',
			'vendors/graphlib/dist/graphlib.core.js',
			'vendors/dagre/dist/dagre.core.js',
			'vendors/jointjs/dist/joint.min.js',
			'vendors/jointjs/dist/joint.layout.DirectedGraph.min.js'
		 ])
		.pipe(dest(paths.dev+'vendors/'));
};

const _default = function() {
	return src(['./index.html', '*.png'])
		.pipe(dest(paths.dev));
};

const _releaseHtml = function() {
	return src([paths.dev + 'index.html', paths.dev + '*.png'])
		.pipe(dest(paths.dist));
}
const _releaseCss = function() {
	return src([paths.dev + '*.css'])
		.pipe(cleanCSS())
		.pipe(dest(paths.dist));
}
const _releaseJs = function() {
	return src([paths.dev + '*.js'])
		.pipe(uglify())
		.pipe(dest(paths.dist));
}
const _releaseVendor = function() {
	return src([paths.dev + 'vendors/*.*'])
		.pipe(dest(paths.dist + 'vendors/'));
}

const _release = series(
	_releaseHtml,
	_releaseCss,
	_releaseJs,
	_releaseVendor
);

exports.default = series( _bowerInstall, _copyVendors, _js, _css, _common, _default);
exports.release = series( exports.default, _release)
exports.watch = series( exports.default, _watch)



