var gulp = require('gulp'),
	tar = require('gulp-tar'),
	gzip = require('gulp-gzip'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower'),
	replace = require('gulp-replace'),
	googleWebFonts = require('gulp-google-webfonts'),
	jscs = require('gulp-jscs');

var R2 = '../lib/';
var DEST = '../../dist/m/';

gulp.task('bower', function() {
	return bower({ cmd: 'install'});
});

gulp.task('jscs', function() {
	return gulp.src("js/*")
		.pipe(jscs())
		.pipe(jscs.reporter());
});

gulp.task('js', ['jscs', 'bower'], function() {
	gulp.src(R2+'r2.js')
		.pipe(uglify())
		.pipe(concat('r2.js'))
		.pipe(gulp.dest(DEST));

	gulp.src(['./js/index.js', './vendors/material-design-lite/material.min.js'])
		.pipe(uglify())
		.pipe(concat('index.js'))
		.pipe(gulp.dest(DEST));
});

gulp.task('css', ['bower'], function() {
	gulp.src([
			'./css/*.css',
			'./vendors/material-design-lite/material.min.css',
			'./vendors/material-design-icons-iconfont/dist/material-design-icons.css'])
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest(DEST));

	gulp.src('./css/images/**')
		.pipe(gulp.dest(DEST+'images/'));
});

gulp.task('fonts', ['bower'], function() {
	gulp.src('./fonts.list')
		.pipe(googleWebFonts({}))
		.pipe(gulp.dest(DEST+'fonts/'));

	gulp.src(['./fonts/*'])
		.pipe(gulp.dest(DEST+'fonts/'));

	gulp.src(['./vendors/material-design-icons-iconfont/dist/fonts/*'])
		.pipe(gulp.dest(DEST+'fonts/'));
});

gulp.task('default', ['js', 'fonts', 'css'], function() {
	gulp.src('./images/*')
		.pipe(gulp.dest(DEST+'images/'));

	gulp.src('./index.html')
		.pipe(gulp.dest(DEST));
});
