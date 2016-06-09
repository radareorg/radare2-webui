var gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower'),
	replace = require('gulp-replace'),
	googleWebFonts = require('gulp-google-webfonts'),
	jscs = require('gulp-jscs'),
	livereload = require('gulp-livereload');

var R2 = '../lib/';
var DEST = '../../dist/m/';

gulp.task('bower', function() {
	return bower({ cmd: 'install'});
});

gulp.task('dependencies', ['bower'], function() {
	gulp.src(R2 + 'r2.js')
		.pipe(uglify())
		.pipe(concat('r2.js'))
		.pipe(gulp.dest(DEST));

	gulp.src([
		'./vendors/jquery/dist/jquery.min.js',
		'./vendors/material-design-lite/material.min.js',
		'./vendors/dialog-polyfill/dialog-polyfill.js',
		'./vendors/datatables.net/js/jquery.dataTables.min.js'])
		.pipe(gulp.dest(DEST + 'vendors/'));
});

gulp.task('jscs', function() {
	return gulp.src(['js/autocomplete.js', 'js/uiTables.js', 'js/index.js'])
		.pipe(jscs())
		.pipe(jscs.reporter());
});

gulp.task('js', ['jscs'], function() {
	gulp.src('./js/*.js')
		//.pipe(uglify())
		.pipe(concat('index.js'))
		.pipe(gulp.dest(DEST))
		.pipe(livereload());
});

gulp.task('cssdeps', ['bower'], function() {
	gulp.src([
		'./vendors/dialog-polyfill/dialog-polyfill.css',
		'./vendors/material-design-lite/material.min.css'])
		.pipe(gulp.dest(DEST + 'vendors/'));

	gulp.src('./vendors/datatables.net-dt/css/jquery.dataTables.min.css')
		.pipe(replace('/images/', './images/'))
		.pipe(gulp.dest(DEST + 'vendors/'));

	gulp.src('./vendors/datatables.net-dt/images/*')
		.pipe(gulp.dest(DEST + 'vendors/images/'));
});

gulp.task('css', function() {
	gulp.src('./css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest(DEST))
		.pipe(livereload());

	gulp.src('./css/images/**')
		.pipe(gulp.dest(DEST + 'images/'));
});

gulp.task('fonts', ['bower'], function() {
	gulp.src('./fonts.list')
		.pipe(googleWebFonts({}))
		.pipe(gulp.dest(DEST + 'vendors/fonts/'));

	gulp.src('./vendors/material-design-icons-iconfont/dist/material-design-icons.css')
		.pipe(gulp.dest(DEST + 'vendors/'));

	gulp.src(['./fonts/*'])
		.pipe(gulp.dest(DEST + 'vendors/fonts/'));

	gulp.src(['./vendors/material-design-icons-iconfont/dist/fonts/*'])
		.pipe(gulp.dest(DEST + 'vendors/fonts/'));
});

gulp.task('html', function() {
	gulp.src(['./index.html', 'vsplit', 'hsplit'])
		.pipe(gulp.dest(DEST))
		.pipe(livereload());
});

gulp.task('default', ['html', 'dependencies', 'js', 'fonts', 'cssdeps', 'css'], function() {
	gulp.src('./images/*')
		.pipe(gulp.dest(DEST + 'images/'));
});

gulp.task('watch', ['default'] , function() {
	livereload.listen();
	gulp.watch('./*.html', ['html']);
	gulp.watch('./css/*.css', ['css']);
	gulp.watch('./js/*.js', ['js']);
});
