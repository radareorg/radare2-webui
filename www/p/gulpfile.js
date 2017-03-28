var gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	merge = require('merge-stream'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower');

var paths = {
	r2: '../lib/',
	dev: '../../dev/p/',
	dist: '../../dist/p/'
};

gulp.task('common', function() {
	gulp.src(paths.r2+'*.js')
		.pipe(concat('r2core.js'))
		.pipe(gulp.dest(paths.dev));

	gulp.src(paths.r2+'*.css')
		.pipe(concat('r2core.css'))
		.pipe(gulp.dest(paths.dev));
});

gulp.task('js', function() {
	
	gulp.src('./lib/js/panels/*.js')
		.pipe(concat('panels.js'))
		.pipe(gulp.dest(paths.dev));

	gulp.src('./lib/js/dependencies/*.js')
		.pipe(concat('dependencies.js'))
		.pipe(gulp.dest(paths.dev));

	gulp.src('./lib/js/*.js')
		.pipe(concat('main.js'))
		.pipe(gulp.dest(paths.dev));
});

gulp.task('watch', ['default'] , function() {
	gulp.watch('./*.html', ['html']);
	gulp.watch(['./lib/js/*.js'], ['js:main']);
	gulp.watch(['./lib/js/**/*.js'], ['js:app']);
	gulp.watch(['./lib/css/**/*.css'], ['js:css']);
});

gulp.task('css', function() {

	gulp.src(['./lib/css/jquery-ui.css', './lib/css/tree.jquery.css', './lib/css/index.css'])
		.pipe(concat('dependencies.css'))
		.pipe(gulp.dest(paths.dev));
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
			'vendors/graphlib/dist/graphlib.core.js',
			'vendors/dagre/dist/dagre.core.js',
			'vendors/jointjs/dist/joint.min.js',
			'vendors/jointjs/dist/joint.layout.DirectedGraph.min.js'
		 ])
		.pipe(gulp.dest(paths.dev+'vendors/'));
});

gulp.task('default', ['vendors', 'js', 'css', 'common'], function() {
	gulp.src(['./index.html', '*.png'])
		.pipe(gulp.dest(paths.dev));
});

gulp.task('release', ['default'], function() {
	var tasks = merge();
tasks.add(
	gulp.src([paths.dev + 'index.html', paths.dev + '*.png'])
		.pipe(gulp.dest(paths.dist))
);
	
tasks.add(
	gulp.src([paths.dev + '*.css'])
		.pipe(cleanCSS())
		.pipe(gulp.dest(paths.dist))
);

tasks.add(
	gulp.src([paths.dev + '*.js'])
		.pipe(uglify())
		.pipe(gulp.dest(paths.dist))
);

tasks.add(
	gulp.src([paths.dev + 'vendors/*.*'])
		.pipe(gulp.dest(paths.dist + 'vendors/'))
);
return tasks;
});
