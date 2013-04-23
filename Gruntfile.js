module.exports = function (grunt) {
  'use strict';

var googleCustomElements = [
    'lib/GoogleCustomElements/src/sidetable.js',
    'lib/GoogleCustomElements/MutationObservers/MutationObserver.js',
    'lib/GoogleCustomElements/src/CustomElements.js',
    'lib/GoogleCustomElements/src/HTMLElementElement.js'
  ];
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
      core: {
        files :{
          'dist/x-tag-core.min.js': ['dist/x-tag-core.js']
        }
      },
      googleCustomElements: {
        options: {
          compress: false,
          mangle: false,
          beautify: true
        },
        files:{
          'lib/google.custom.elements.js': googleCustomElements
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
  grunt.registerTask('build', ['test','concat','uglify:core']);
  grunt.registerTask('buildce', ['uglify:googleCustomElements']);

};
