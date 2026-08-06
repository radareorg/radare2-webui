import { src, series, dest } from 'gulp';
import gulp from 'gulp';
import uglify from 'gulp-uglify';
import concat from 'gulp-concat';
import cleanCSS from 'gulp-clean-css';

import bower from 'bower';
import { promises as fs } from 'fs';

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
	gulp.watch('./*.html', ['html']);
	gulp.watch(['./lib/js/*.js'], ['js:main']);
	gulp.watch(['./lib/js/**/*.js'], ['js:app']);
	gulp.watch(['./lib/css/**/*.css'], ['js:css']);
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
	// Moving neccesary vendors files from bower; prefer the minified "core"
	// builds (the app defines its own joint.shapes.html, so the full shapes
	// bundle is not needed)
	return src([
			'vendors/jquery.layout/dist/layout-default-latest.css',
			'vendors/jointjs/dist/joint.core.min.css',
			'vendors/onoff/dist/jquery.onoff.css',
			'vendors/jquery/dist/jquery.min.js',
			'vendors/jquery.scrollTo/jquery.scrollTo.min.js',
			'vendors/jquery.layout/dist/jquery.layout-latest.min.js',
			'vendors/jquery-ui-contextmenu/jquery.ui-contextmenu.min.js',
			'vendors/onoff/dist/jquery.onoff.min.js',
			'vendors/lodash/lodash.min.js',
			'vendors/backbone/backbone-min.js',
			'vendors/graphlib/dist/graphlib.core.min.js',
			'vendors/dagre/dist/dagre.core.min.js',
			'vendors/jointjs/dist/joint.core.min.js',
			'vendors/jointjs/dist/joint.layout.DirectedGraph.min.js'
		 ])
		.pipe(dest(paths.dev+'vendors/'));
};

// Bundle only the jQuery UI modules the panels actually use (tabs, accordion,
// menu for the context menu and draggable for the graph minimap) instead of
// shipping the whole 250KB jquery-ui.min.js
const _buildJqueryUi = function() {
	var base = 'vendors/jquery-ui/ui/';
	return src([
			'version', 'data', 'disable-selection', 'escape-selector',
			'focusable', 'form', 'ie', 'keycode', 'labels', 'plugin',
			'position', 'safe-active-element', 'safe-blur', 'scroll-parent',
			'tabbable', 'unique-id', 'widget',
			'widgets/mouse', 'widgets/draggable', 'widgets/accordion',
			'widgets/menu', 'widgets/tabs'
		].map(function(m) { return base + m + '.js'; }))
		.pipe(concat('jquery-ui.min.js'))
		.pipe(uglify())
		.pipe(dest(paths.dev+'vendors/'));
};

// joint.core.min.css embeds a 42KB lato-light woff that no selector uses
const _stripJointFont = async function() {
	var file = paths.dev + 'vendors/joint.core.min.css';
	var css = await fs.readFile(file, 'utf8');
	css = css.replace(/@font-face\{font-family:lato-light[^}]*\}/g, '');
	await fs.writeFile(file, css);
};

const _cleanDev = function() {
	return fs.rm(paths.dev, { recursive: true, force: true });
};
const _cleanDist = function() {
	return fs.rm(paths.dist, { recursive: true, force: true });
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
const _releaseVendorJs = function() {
	return src([paths.dev + 'vendors/*.js'])
		.pipe(dest(paths.dist + 'vendors/'));
}
const _releaseVendorCss = function() {
	return src([paths.dev + 'vendors/*.css'])
		.pipe(cleanCSS({level: 2}))
		.pipe(dest(paths.dist + 'vendors/'));
}

const _release = series(
	_cleanDist,
	_releaseHtml,
	_releaseCss,
	_releaseJs,
	_releaseVendorJs,
	_releaseVendorCss
);

export const defaultTask = series(_cleanDev, _bowerInstall, _copyVendors, _buildJqueryUi, _stripJointFont, _js, _css, _common, _default);
export default defaultTask;
export const release = series(defaultTask, _release);
export const watch = series(defaultTask, _watch);


