module.exports = function (grunt) {
  'use strict';

  // Project configuration.
  grunt.initConfig({
    meta : {
      src   : 'src/**/*.js',
      specs : 'spec/**/*.js'
    },
    watch: {
      test : {
        files: ['<%= meta.src %>', '<%= meta.specs %>'],
        tasks: 'test'
      }
    },
    jasmine : {
      src : '<%= meta.src %>',
      options : {
        specs : '<%= meta.specs %>',
        vendor: ['components/document.register/src/document.register.js'],
        outfile: '_spec_results.html'
      }
    },
    jshint: {
      all: [
        'Gruntfile.js',
        '<%= meta.src %>',
        '<%= meta.specs %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    concat: {
      all:{
        src:[
          'components/document.register/src/document.register.js',
          'src/core.js'
        ],
        dest: 'dist/x-tag-core.js'
      }
    },
    uglify: {
      all: {
        files :{
          'dist/x-tag-core.min.js': ['dist/x-tag-core.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  //grunt.registerTask('test', ['jshint', 'jasmine']);
  grunt.registerTask('test', ['jshint']);

  // Default task.
  grunt.registerTask('default', ['test']);
  grunt.registerTask('build', ['test','concat','uglify']);

};
