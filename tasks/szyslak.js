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

	grunt.registerTask('szyslak', 'static site generator with an attitude', function() {
		var options = this.options({
			templates_dir: "templates",
			vendor_dir: "vendor",
			data_dir: "data"
		});

		// load json data (if any)
		var data = {};
		if (fs.existsSync('./src/'+options.data_dir)) {
			var jsons = fs.readdirSync('./src/'+options.data_dir);
			for (var i = 0; i < jsons.length; i++) {
				grunt.log.writeln("Parsing data file "+jsons[i]);
				data[path.basename(jsons[i], '.json')] = grunt.file.readJSON('./src/'+options.data_dir+'/'+jsons[i]);
			}
		}

		// compile templates (if any)
		var compiled = {};
		if (fs.existsSync('./src/'+options.templates_dir)) {
			var templates = fs.readdirSync('./src/'+options.templates_dir);
			for (i = 0; i < templates.length; i++) {
				grunt.log.writeln("Compiling template "+templates[i]);
				var html = grunt.file.read('./src/'+options.templates_dir+'/'+templates[i]);
				compiled[templates[i]] = _.template(html);
			}
		}

		// copy vendor files (if any)
		if (fs.existsSync('./src/'+options.vendor_dir) && options.vendor_files) {
			for (i = 0; i < options.vendor_files.length; i++) {
				var inf = options.vendor_files[i];
				var otf = path.basename(inf);
				grunt.log.writeln("Copying vendor file "+inf+" to "+otf);
				grunt.file.copy('./src/'+options.vendor_dir+'/'+inf, './dist/'+options.vendor_dir+'/'+otf);
			}
		}

		// go over pages
		var pagesFunc = function(dir) {
			var pages = fs.readdirSync('./src/'+dir);
			for (var i = 0; i < pages.length; i++) {
				if (fs.lstatSync('./src/'+dir+pages[i]).isDirectory()) {
					if (
						dir+pages[i] === options.templates_dir ||
						dir+pages[i] === options.data_dir ||
						dir+pages[i] === options.vendor_dir
					) {
						continue;
					}

					fs.mkdirSync('./dist/'+dir+pages[i]+"/");
					pagesFunc(dir+pages[i]+"/");
				} else if (/\.html$/.test(pages[i])) {
					// this is a page we need to compile
					grunt.log.writeln("Working on page "+dir+pages[i]);

					// parse yaml front matter (if any)
					var parsed = yfm.loadFront(grunt.file.read('./src/'+dir+pages[i]));
					var contents = _.template(parsed.__content);

					var context = {
						path: dir+pages[i],
						title: dir+pages[i],
						base: path.basename(dir+pages[i], '.html')
					};
					merge(parsed, context);
					merge(data, context);
					context.__content = contents(context);

					var html = 'layout.html' in compiled ? compiled['layout.html'](context) : context.__content;
					grunt.file.write('./dist/'+dir+pages[i], html);
				} else {
					if (/\.roo$/.test(pages[i])) {
						// this is a roole file, compile it to css and minify it
						grunt.log.writeln("Compiling roole file "+dir+pages[i]);
						compile_roole(dir+pages[i]);
					} else if (/\.js$/.test(pages[i])) {
						// this is a javascript file that needs to be minified
						grunt.log.writeln("Minifying js file "+dir+pages[i]);
						var js = uglify.minify('./src/'+dir+pages[i]).code;
						grunt.file.write('./dist/'+dir+pages[i], js);
					} else if (/\.css$/.test(pages[i])) {
						// this is a css file that needs to be minified
						grunt.log.writeln("Minifying css file "+dir+pages[i]);
						var css = grunt.file.read('./src/'+dir+pages[i]);
						grunt.file.write('./dist/'+dir+pages[i], cssmin.process(css));
					} else {
						if (/traveling/.test(dir+pages[i])) {
							continue;
						}
						grunt.log.writeln("Copying file "+dir+pages[i]);
						grunt.file.copy('./src/'+dir+pages[i], './dist/'+dir+pages[i]);
					}
				}
			}
		};
		pagesFunc('');
	});
};
