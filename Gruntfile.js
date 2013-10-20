/*
 * szyslak
 * https://github.com/ido50/szyslak
 *
 * Copyright (c) 2013 Ido Perlmuter
 * Licensed under the GPLv3 license.
 */

'use strict';

module.exports = function(grunt) {
	grunt.initConfig({
		jshint: {
			all: [
				'Gruntfile.js',
				'tasks/*.js'
			],
			options: {
				jshintrc: '.jshintrc'
			}
		},
		clean: {
			tests: ['tmp']
		}
	});

	grunt.loadTasks('tasks');

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-clean');

	grunt.registerTask('test', ['clean', 'szyslak']);
	grunt.registerTask('default', ['jshint']);
};
