var gulp = require('gulp'),
	merge = require('merge-stream'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower'),
	replace = require('gulp-replace'),
	googleWebFonts = require('gulp-google-webfonts'),
	jscs = require('gulp-jscs'),
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

var babelPresets = ['es2015'];

var paths = {
	r2: '../lib/',
	dev: '../../dev/m/',
	dist: '../../dist/m/'
};


/**
 * Dependencies management
 */

gulp.task('bower', function() {
	return bower({ cmd: 'install'});
});

gulp.task('dependencies:r2', function() {
	return gulp.src(paths.r2 + 'r2.js')
		.pipe(uglify())
		.pipe(concat('r2.js'))
		.pipe(gulp.dest(paths.dev));
});

gulp.task('dependencies:vendors', ['bower'], function() {
	var task1 = gulp.src(
		'./vendors/dialog-polyfill/dialog-polyfill.js')
		.pipe(uglify())
		.pipe(gulp.dest(paths.dev + 'vendors/'));

	var task2 = gulp.src([
		'./vendors/jquery/dist/jquery.min.js',
		'./vendors/material-design-lite/material.min.js',
		'./vendors/datatables.net/js/jquery.dataTables.min.js',
		'./vendors/mdl-selectfield/dist/mdl-selectfield.min.js',
		'./vendors/file-saver/FileSaver.min.js'])
		.pipe(gulp.dest(paths.dev + 'vendors/'));

	return merge(task1, task2);
});

gulp.task('dependencies:vendors-srcmaps', ['bower'], function() {
	return gulp.src([
		'./vendors/material-design-lite/material.min.js.map',
		'./vendors/mdl-selectfield/dist/mdl-selectfield.min.js.map'])
		.pipe(gulp.dest(paths.dev + 'vendors/'));
})

gulp.task('dependencies:css', ['bower'], function() {
	var tasks = merge();

	tasks.add(gulp.src(
		'./vendors/dialog-polyfill/dialog-polyfill.css')
		.pipe(uglifycss({
			"maxLineLen": 80,
			"uglyComments": true
    	}))
		.pipe(gulp.dest(paths.dev + 'vendors/')));

	tasks.add(gulp.src([
		'./vendors/mdl-selectfield/dist/mdl-selectfield.min.css',
		'./vendors/material-design-lite/material.min.css'])
		.pipe(gulp.dest(paths.dev + 'vendors/')));

	tasks.add(gulp.src('./vendors/datatables.net-dt/css/jquery.dataTables.min.css')
		.pipe(replace('/images/', './images/'))
		.pipe(gulp.dest(paths.dev + 'vendors/')));

	tasks.add(gulp.src('./vendors/datatables.net-dt/images/*')
		.pipe(gulp.dest(paths.dev + 'vendors/images/')));

	tasks.add(gulp.src('./vendors/material-design-icons-iconfont/dist/material-design-icons.css')
		.pipe(replace('src: local("Material Icons"), local("MaterialIcons-Regular"), url(./fonts/MaterialIcons-Regular.woff2) format("woff2"), url(./fonts/MaterialIcons-Regular.woff) format("woff"), url(./fonts/MaterialIcons-Regular.ttf) format("truetype");', ''))
		.pipe(replace('./fonts/MaterialIcons-Regular.eot', './fonts/MaterialIcons-Regular.woff'))
		.pipe(uglifycss({
			"maxLineLen": 80,
			"uglyComments": true
			}))
		.pipe(gulp.dest(paths.dev + 'vendors/')));

	return tasks;
});

gulp.task('dependencies:fonts', ['bower'], function() {
	return gulp.src('./fonts.list')
		.pipe(googleWebFonts({}))
		.pipe(gulp.dest(paths.dev + 'vendors/fonts/'));
});

gulp.task('dependencies',
	[
		'dependencies:vendors',
		'dependencies:vendors-srcmaps',
		'dependencies:r2',
		'dependencies:css',
		'dependencies:fonts'
	]);

/**
 * Checkstyle
 */

gulp.task('checkstyle', function() {
    return gulp.src(['./js/**/*.js', './workers/*.js'])
        .pipe(eslint())
        .pipe(eslint.formatEach());
});

/**
 * JS related processing
 */
/*
gulp.task('js:main', function() {
	return gulp.src('./js/main.js')
		.pipe(babel({presets: babelPresets, compact: false}))
		.pipe(gulp.dest(paths.dev))
		.pipe(livereload());
});
*/

// Will accept ES6 without export/import to ease transition
// All legacy code should be nammed with this extension *.legacy.js
gulp.task('js:legacy', function() {
	return gulp.src('./js/*/**/*.legacy.js')
	 	.pipe(sourcemaps.init())
	 	.pipe(babel({presets: babelPresets, compact: false}))
	 	.pipe(concat('legacy.js'))
	 	.pipe(sourcemaps.write('.'))
	 	.pipe(gulp.dest(paths.dev))
	 	.pipe(livereload());
});

gulp.task('js:app', function() {
	return browserify({entries: './js/app.js', extensions: ['.js'], debug: true})
        .transform(babelify, {presets: ["es2015"]})
        .bundle()
        .pipe(source('app.js'))
        .pipe(gulp.dest(paths.dev));
});
/**
 * check karma-browserify
 */
// TODO --
gulp.task('js:workers', function() {
	return gulp.src(['./workers/*.js', './js/helpers/tools.js'])
		.pipe(babel({presets: babelPresets, compact: false}))
		.pipe(gulp.dest(paths.dev))
		.pipe(livereload());
});

gulp.task('js', 
	[
		'js:app',
		'js:legacy',
		'js:workers'
	]);

/**
 * Assets
 */

gulp.task('css:stylesheets', function() {
	return gulp.src('./css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest(paths.dev))
		.pipe(livereload());
});

gulp.task('css:images', function() {
	return gulp.src(['./css/images/**', './images/*'])
		.pipe(gulp.dest(paths.dev + 'images/'));
});


gulp.task('css:fonts', ['bower', 'dependencies:fonts'], function() {
	var task1 = gulp.src(['./fonts/*'])
		.pipe(gulp.dest(paths.dev + 'vendors/fonts/'));

	var task2 = gulp.src(['./vendors/material-design-icons-iconfont/dist/fonts/*.woff'])
		.pipe(gulp.dest(paths.dev + 'vendors/fonts/'));

	return merge(task1, task2);
});

gulp.task('css', 
	[
		'css:stylesheets',
		'css:images',
		'css:fonts'
	]);

gulp.task('html', function() {
	return gulp.src(['./index.html'])
		.pipe(gulp.dest(paths.dev))
		.pipe(livereload());
});

gulp.task('build', 	[
		'html',
		'dependencies',
		'js',
		'css'
	]);

gulp.task('default',
	[
		'build',
//		'checkstyle'
	]);

gulp.task('release', ['build'], function() {
	var tasks = merge();

	// Import files from dev
	[
		{ dir: 'images/', match: '*' },
		{ dir: 'vendors/', match: '**/!(*.map)' },
		{ dir: '/', match: '*.css' }
	].map(function(path) {
	    tasks.add(gulp.src(paths.dev + path.dir + path.match)
	      .pipe(gulp.dest(paths.dist + path.dir)));
	});

	// Minify JS
	tasks.add(gulp.src([paths.dev + '*.js'])
		.pipe(uglify())
		.pipe(gulp.dest(paths.dist)));

	// Minify HTML
	tasks.add(gulp.src(paths.dev + 'index.html')
		.pipe(htmlmin({collapseWhitespace: true}))
		.pipe(gulp.dest(paths.dist)));

	return tasks;
});

gulp.task('watch', ['default'] , function() {
	livereload.listen();
	gulp.watch('./*.html', ['html']);
	gulp.watch('./css/*.css', ['css']);
	gulp.watch(['./js/**/*.js'], ['js:app']);
	gulp.watch(['./js/**/*.legacy.js'], ['js:legacy']);
	gulp.watch(['./workers/*.js'], ['js:workers']);
});

gulp.task('test', function() {
	return opener('test/index.html');
});
