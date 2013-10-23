/*
 * szyslak
 * https://github.com/ido50/szyslak
 *
 * Copyright (c) 2013 Ido Perlmuter
 * Licensed under the GPLv3 license.
 */

'use strict';

module.exports = function(grunt) {
	var fs	= require('fs');
	var path	= require('path');
	var roole	= require('roole');
	var _		= require('lodash');
	var uglify	= require('uglify-js');
	var cssmin	= require('clean-css');
	var yfm	= require('yaml-front-matter');

	grunt.registerTask('szyslak', 'static site generator with an attitude', function() {
		var options = this.options({
			templates_dir: "templates",
			vendor_dir: "vendor",
			data_dir: "data"
		});

		var data = {};
		var compiled = {};
		var i = 0;

		function merge(src, dst) {
			for (var attr in src) { dst[attr] = src[attr]; }
		}

		function compile_roole(file) {
			roole.compile(grunt.file.read('./src/'+file), null, function(err, css) {
				if (err) {
					grunt.log.warn('./src/'+file+': '+err.message+' on line '+err.line);
					grunt.fail.warn(err);
				}
				var o = file.replace(".roo", ".css");
				grunt.file.write('./dist/'+o, cssmin.process(css));
			});
		}

		function process_files(abspath, rootdir, subdir, filename) {
			var rn = ""; // will hold the relative name of the file
			var of = "./dist/"; // will hold the absolute puth to the output file
			if (typeof subdir !== 'undefined') {
				rn = subdir + "/";
				of = of + subdir + "/";
			}
			rn = rn + filename;
			of = of + filename;

			// there's no need to parse/copy data files, templates or vendor files
			var fd = rn.match(/^([^\/]+)\/?/)[1];
			if (fd === options.data_dir || fd === options.templates_dir || fd === options.vendor_dir) {
				return;
			}

			if (/\.html$/.test(filename)) {
				// this is a page we need to compile
				grunt.log.writeln("Working on page "+rn);

				// parse yaml front matter (if any)
				var parsed = yfm.loadFront(grunt.file.read(abspath));
				var contents = _.template(parsed.__content);

				var context = {
					path: rn,
					title: rn,
					base: path.basename(rn, '.html')
				};
				merge(parsed, context);
				merge(data, context);
				context.__content = contents(context);

				var html = 'layout.html' in compiled ? compiled['layout.html'](context) : context.__content;
				grunt.file.write(of, html);
			} else {
				if (/\.roo$/.test(filename)) {
					// this is a roole file, compile it to css and minify it
					grunt.log.writeln("Compiling roole file "+rn);
					compile_roole(rn);
				} else if (/\.js$/.test(filename)) {
					// this is a javascript file that needs to be minified
					grunt.log.writeln("Minifying js file "+rn);
					var js = uglify.minify(abspath).code;
					grunt.file.write(of, js);
				} else if (/\.css$/.test(filename)) {
					// this is a css file that needs to be minified
					grunt.log.writeln("Minifying css file "+rn);
					var css = grunt.file.read(abspath);
					grunt.file.write(of, cssmin.process(css));
				} else {
					grunt.log.writeln("Copying file "+rn);
					grunt.file.copy(abspath, of);
				}
			}
		}

		// load json data (if any)
		if (grunt.file.isDir('./src/'+options.data_dir)) {
			var jsons = fs.readdirSync('./src/'+options.data_dir);
			for (i = 0; i < jsons.length; i++) {
				grunt.log.writeln("Parsing data file "+jsons[i]);
				data[path.basename(jsons[i], '.json')] = grunt.file.readJSON('./src/'+options.data_dir+'/'+jsons[i]);
			}
		}

		// compile templates (if any)
		if (grunt.file.isDir('./src/'+options.templates_dir)) {
			var templates = fs.readdirSync('./src/'+options.templates_dir);
			for (i = 0; i < templates.length; i++) {
				grunt.log.writeln("Compiling template "+templates[i]);
				var html = grunt.file.read('./src/'+options.templates_dir+'/'+templates[i]);
				compiled[templates[i]] = _.template(html);
			}
		}

		// copy vendor files (if any)
		if (grunt.file.isDir('./src/'+options.vendor_dir) && options.vendor_files) {
			var srcdest = grunt.file.expandMapping(options.vendor_files, './dist/'+options.vendor_dir, {
				cwd: './src/'+options.vendor_dir,
				flatten: true
			});
			for (i = 0; i < srcdest.length; i++) {
				var file = srcdest[i];
				grunt.log.writeln("Copying vendor file "+file.src+" to "+file.dest);
				grunt.file.copy(file.src, file.dest);
			}
		}

		// go over all other files
		grunt.file.recurse('./src', process_files);
	});
};
