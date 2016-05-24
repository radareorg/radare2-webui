var gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower');


var R2 = '../lib/';
var DEST = '../../dist/p/'

gulp.task('common', function() {
	gulp.src(R2+'*.js')
		.pipe(uglify())
		.pipe(concat('r2core.js'))
		.pipe(gulp.dest(DEST));

	gulp.src(R2+'*.css')
		.pipe(cleanCSS())
		.pipe(concat('r2core.css'))
		.pipe(gulp.dest(DEST));
});

gulp.task('js', function() {
	
	gulp.src('./lib/js/panels/*.js')
		.pipe(uglify())
		.pipe(concat('panels.js'))
		.pipe(gulp.dest(DEST));

	gulp.src('./lib/js/dependencies/*.js')
		.pipe(uglify())
		.pipe(concat('dependencies.js'))
		.pipe(gulp.dest(DEST));

	gulp.src('./lib/js/*.js')
		.pipe(uglify())
		.pipe(concat('main.js'))
		.pipe(gulp.dest(DEST));
});


gulp.task('css', function() {

	gulp.src(['./lib/css/jquery-ui.css', './lib/css/tree.jquery.css', './lib/css/index.css'])
		.pipe(cleanCSS())
		.pipe(concat('dependencies.css'))
		.pipe(gulp.dest(DEST));
});

gulp.task('bower', function() {
	return bower({ cmd: 'install'});
});

gulp.task('vendors', ['bower'], function() {
	// Moving neccesary vendors files from bower
	gulp.src([
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
			'vendors/jointjs/dist/joint.min.js',
			'vendors/jointjs/plugins/layout/DirectedGraph/joint.layout.DirectedGraph.js'
		 ])
		.pipe(gulp.dest(DEST+'vendors/'));
});

gulp.task('default', ['vendors', 'js', 'css', 'common'], function() {
	gulp.src(['./index.html', '*.png'])
		.pipe(gulp.dest(DEST));
});
