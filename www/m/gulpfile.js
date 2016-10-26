var gulp = require('gulp'),
	runSequence = require('run-sequence'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower'),
	replace = require('gulp-replace'),
	googleWebFonts = require('gulp-google-webfonts'),
	jscs = require('gulp-jscs'),
	livereload = require('gulp-livereload'),
	uglifycss = require('gulp-uglifycss'),
	htmlmin = require('gulp-htmlmin');


var paths = {
	r2: '../lib/',
	dev: '../../dev/m/',
	dist: '../../dist/m/'
};


gulp.task('bower', function() {
	return bower({ cmd: 'install'});
});

gulp.task('dependencies', ['bower'], function() {
	gulp.src(paths.r2 + 'paths.r2.js')
		.pipe(uglify())
		.pipe(concat('paths.r2.js'))
		.pipe(gulp.dest(paths.dev));

	gulp.src(
		'./vendors/dialog-polyfill/dialog-polyfill.js')
		.pipe(uglify())
		.pipe(gulp.dest(paths.dev + 'vendors/'));

	gulp.src([
		'./vendors/jquery/dist/jquery.min.js',
		'./vendors/material-design-lite/material.min.js',
		'./vendors/datatables.net/js/jquery.dataTables.min.js',
		'./vendors/mdl-selectfield/dist/mdl-selectfield.min.js',
		'./vendors/file-saver/FileSaver.min.js'])
		.pipe(gulp.dest(paths.dev + 'vendors/'));
});

gulp.task('jscs', function() {
	return gulp.src(['js/autocomplete.js', 'js/uiTables.js', 'js/index.js'])
		.pipe(jscs())
		.pipe(jscs.reporter());
});

gulp.task('js', ['jscs'], function() {
	gulp.src(['./js/*.js', './js/**/*.js'])
		.pipe(concat('index.js'))
		.pipe(gulp.dest(paths.dev))
		.pipe(livereload());
	gulp.src(['./workers/*.js', './js/tools.js'])
		.pipe(gulp.dest(paths.dev))
		.pipe(livereload());
});

gulp.task('cssdeps', ['bower'], function() {
	gulp.src(
		'./vendors/dialog-polyfill/dialog-polyfill.css')
		.pipe(uglifycss({
			"maxLineLen": 80,
			"uglyComments": true
    	}))
		.pipe(gulp.dest(paths.dev + 'vendors/'));

	gulp.src([
		'./vendors/mdl-selectfield/dist/mdl-selectfield.min.css',
		'./vendors/material-design-lite/material.min.css'])
		.pipe(gulp.dest(paths.dev + 'vendors/'));

	gulp.src('./vendors/datatables.net-dt/css/jquery.dataTables.min.css')
		.pipe(replace('/images/', './images/'))
		.pipe(gulp.dest(paths.dev + 'vendors/'));

	gulp.src('./vendors/datatables.net-dt/images/*')
		.pipe(gulp.dest(paths.dev + 'vendors/images/'));
});

gulp.task('css', function() {
	gulp.src('./css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest(paths.dev))
		.pipe(livereload());

	gulp.src('./css/images/**')
		.pipe(gulp.dest(paths.dev + 'images/'));
});

gulp.task('fonts', ['bower'], function() {
	gulp.src('./fonts.list')
		.pipe(googleWebFonts({}))
		.pipe(gulp.dest(paths.dev + 'vendors/fonts/'));

	gulp.src('./vendors/material-design-icons-iconfont/dist/material-design-icons.css')
		.pipe(uglifycss({
			"maxLineLen": 80,
			"uglyComments": true
			}))
		.pipe(gulp.dest(paths.dev + 'vendors/'));

	gulp.src(['./fonts/*'])
		.pipe(gulp.dest(paths.dev + 'vendors/fonts/'));

	gulp.src(['./vendors/material-design-icons-iconfont/dist/fonts/*'])
		.pipe(gulp.dest(paths.dev + 'vendors/fonts/'));
});

gulp.task('html', function() {
	gulp.src(['./index.html'])
		.pipe(gulp.dest(paths.dev))
		.pipe(htmlmin({collapseWhitespace: true}))
		.pipe(gulp.dest(paths.dev))
		.pipe(livereload());
});

gulp.task('default', ['html', 'dependencies', 'js', 'fonts', 'cssdeps', 'css'], function() {
	gulp.src('./images/*')
		.pipe(gulp.dest(paths.dev + 'images/'));
});

gulp.task('importDev', function() {
	[
		{ dir: 'images/', match: '*' },
		{ dir: 'vendors/', match: '**/*' },
		{ dir: '/', match: '*.html' },
		{ dir: '/', match: '*.css' }
	].map(function(path) {
	    return gulp.src(paths.dev + path.dir + path.match)
	      .pipe(gulp.dest(paths.dist + path.dir));
	});
});

gulp.task('minify', function() {
	gulp.src([paths.dev + '*.js'])
		.pipe(uglify())
		.pipe(gulp.dest(paths.dist));
})

gulp.task('release', ['default'], function() {
	return runSequence(
		'importDev',
		'minify'
	);
});

gulp.task('watch', ['default'] , function() {
	livereload.listen();
	gulp.watch('./*.html', ['html']);
	gulp.watch('./css/*.css', ['css']);
	gulp.watch(['./js/*.js', './js/**/*.js', './workers/*.js'], ['js']);
});
