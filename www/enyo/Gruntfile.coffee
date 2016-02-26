'use strict'

module.exports = (grunt) ->

  grunt.initConfig {

    uglify: {
      build: {
        files: [{
            expand: true,
            src: ['js/*.js', '!Gruntfile.js'],
            dest: './',
        }]
      }
    }

  }

  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.registerTask 'default',  ['uglify']
