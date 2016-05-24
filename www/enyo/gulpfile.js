var gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	replace = require('gulp-replace'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower');

var R2 = '../lib/';
var DEST = '../../dist/enyo/'

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

	gulp.src('js/*.js')
		.pipe(uglify())
		.pipe(concat('r2app.js'))
		.pipe(gulp.dest(DEST));

	gulp.src(['js/enyo/enyo.js', 'js/enyo/app.js'])
		.pipe(concat('enyo_app.js'))
		.pipe(gulp.dest(DEST));

	gulp.src('js/core/disassembler_old.js')
		.pipe(uglify())
		.pipe(concat('disassembler_old.js'))
		.pipe(gulp.dest(DEST));
});


gulp.task('css', function() {

	gulp.src('css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest(DEST));

	gulp.src('css/enyo/*.css')
		.pipe(replace(/\.\.\/lib\/onyx\/images\//g, ''))
		.pipe(cleanCSS())
		.pipe(concat('enyo.css'))
		.pipe(gulp.dest(DEST));

	gulp.src('css/lib/onyx/images/*.png')
		.pipe(gulp.dest(DEST));

	gulp.src('css/**/*.png')
		.pipe(gulp.dest(DEST+'enyo/'));

	gulp.src('*.png')
		.pipe(gulp.dest(DEST));
});

gulp.task('bower', function() {
	return bower({ cmd: 'install'});
})

gulp.task('vendors', ['bower'], function() {
	// Moving neccesary vendors files from bower
	gulp.src([
			'vendors/jquery/jquery.min.js',
			'vendors/jquery.scrollTo/jquery.scrollTo.min.js',
			'vendors/jquery-ui/jquery-ui.min.js',
			'vendors/jquery.layout/dist/jquery.layout-latest.min.js',
			'vendors/lodash/lodash.min.js',
			'vendors/backbone/backbone-min.js',
			'vendors/jointjs/dist/joint.min.css',
			'vendors/jointjs/dist/joint.min.js',
			'vendors/jointjs/plugins/layout/DirectedGraph/joint.layout.DirectedGraph.js'
		])
		.pipe(gulp.dest(DEST+'vendors/'));
})

gulp.task('default', ['vendors', 'js', 'css', 'common'], function() {
	gulp.src('index.html')
		.pipe(gulp.dest(DEST));
});
