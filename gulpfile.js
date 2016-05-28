'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var rename = require('gulp-rename');

gulp.task('default', ['js', 'css', 'images', 'watch']);

gulp.task('watch', function() {
  gulp.watch('src/**/*', ['js', 'css']);
});

gulp.task('css', function () {
  var cssimport = require('gulp-cssimport');
  var cssnano = require('gulp-cssnano');

  return gulp.src('src/demo.css')
    .pipe(cssimport())
    .pipe(cssnano({
      zindex: false // Do not allow postcss to rebase z-index values
    }))
    .pipe(rename({
      extname: '.min.css'
    }))
    .pipe(gulp.dest('site/'));
});

gulp.task('js', function () {
  var browserify = require('browserify');
  var source = require('vinyl-source-stream')
  var buffer = require('vinyl-buffer');
  var uglify = require('gulp-uglify');
  var sourcemaps = require('gulp-sourcemaps');

  var b = browserify({
    entries: 'src/demo.js',
    debug: true
  });

  return b.bundle()
    .pipe(source('src/demo.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
      // Add transformation tasks to the pipeline here.
      .pipe(uglify())
      .pipe(rename({
        dirname: '',
        extname: '.min.js'
      }))
      .on('error', gutil.log)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('site/'));
});

// Copy leaflet images to an accessible place.
gulp.task('images', function () {
  return gulp.src([
      'node_modules/leaflet/dist/images/*',
      'node_modules/leaflet-geocoder-mapzen/dist/images/*',
      // 'node_modules/drmonty-leaflet-awesome-markers/css/images/*',
    ])
    .pipe(gulp.dest('site/images/'));
});
