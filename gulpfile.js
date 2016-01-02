/*
 * szyslak
 * https://github.com/ido50/szyslak
 *
 * Copyright (c) 2013-2015 Ido Perlmuter
 * Licensed under the GPLv3 license.
 */

"use strict";

var gulp	= require("gulp");
var gutil	= require("gulp-util");
var changed	= require("gulp-changed");
var less	= require("gulp-less");
var uglify	= require("gulp-uglify");
var csso	= require("gulp-csso");
var argv	= require('yargs').argv;
var del	= require("del");
var merge	= require("merge-stream");
var fs	= require("fs");
var through = require("through2");
var os	= require("os");
var path	= require("path");
var _		= require("lodash");
var yfm	= require("yaml-front-matter");

function isDirectory(dir) {
	var stats = fs.statSync(dir);
	return stats.isDirectory();
}

function isFile(file) {
	var stats = fs.statSync(file);
	return stats.isFile();
}

var options = {
	templates_dir: "templates",
	vendor_dir: "vendor",
	data_dir: "data",
	vendor_files: [
		{
			src: ["jquery/jquery.*", "bootstrap/js/bootstrap.*"],
			dest: "js"
		},
		{
			src: ["bootstrap/css/bootstrap.*", "font-awesome/css/font-awesome.*"],
			dest: "css"
		},
		{
			src: ["font-awesome/fonts/fontawesome-webfont.*"],
			dest: "fonts"
		}
	]
};

var target = argv.target || argv.t || "localhost";
var data = {};
var compiled = {};

gutil.log("Target is "+target);

gulp.task("clean", function() {
	return del([target]);
});

gulp.task("json", function() {
	if (isDirectory("src/"+options.data_dir)) {
		var jsons = fs.readdirSync("src/"+options.data_dir);
		for (var i = 0; i < jsons.length; i++) {
			data[path.basename(jsons[i], ".json")] = require("./src/"+options.data_dir+'/'+jsons[i]);
		}
	}
});

gulp.task("templates", ["json"], function() {
	if (isDirectory("src/"+options.templates_dir)) {
		var templates = fs.readdirSync("src/"+options.templates_dir);
		for (var i = 0; i < templates.length; i++) {
			compiled[templates[i]] = _.template(
				fs.readFileSync("src/"+options.templates_dir+'/'+templates[i], {
					encoding: "utf8"
				})
			);
		}
	}
});

gulp.task("vendor", function(cb) {
	if (_.has(options, "vendor_dir") && _.has(options, "vendor_files")) {
		// options.vendor_files can either have strings, that are simply
		// files to copy flattened into the vendor destination directory,
		// or objects that define their own destinations
		var streams = [];
		var flat = [];
		_.forEach(options.vendor_files, function(file) {
			if (_.isPlainObject(file)) {
				streams.push(
					gulp
						.src(_.map(file.src, function(f) { return "src/"+options.vendor_dir+'/'+f }))
						.pipe(changed(target+'/'+options.vendor_dir+'/'+file.dest))
						.pipe(gulp.dest(target+'/'+options.vendor_dir+'/'+file.dest))
				);
			} else {
				flat.push("src/"+options.vendor_dir+'/'+file);
			}
		});

		if (flat.length) {
			streams.push(
				gulp.src(flat, { base: "src" })
				    .pipe(changed(target))
				    .pipe(gulp.dest(target))
			);
		}

		return merge(streams);
	}
});

gulp.task("html", ["json", "templates"], function() {
	gulp	.src(["src/**/*.html", "!src/"+options.templates_dir+"/**/*.html"])
		.pipe(changed(target))
		.pipe(through.obj(function(file, enc, cb) {
			if (file.isNull()) {
				return cb(null, file);
			}

			var rn = path.relative(file.base, file.path);
			var cwd = path.dirname(rn);

			// parse yaml front matter (if any)
			var parsed = yfm.loadFront(file.contents.toString());

			// did the page ask for child data?
			if (parsed.needs_children) {
				parsed.children = {};
				_.forEach(fs.readdirSync("./src/"+cwd), function(dir) {
					var fdir = "./src/"+cwd+'/'+dir;
					if (isDirectory(fdir) && isFile(fdir+"/index.html")) {
						parsed.children[dir] = yfm.loadFront(fs.readFileSync(fdir+"/index.html"));
					}
				});
			}

			// process content
			var contents = _.template(parsed.__content);

			// create the context object
			var context = {
				target:	target,
				path:		rn,
				title:	rn,
				base:		rn.replace(".html", ""),
				cwd:		"src/"+cwd,
				relcwd: 	cwd,
				include:	function(template) { return compiled[template](this) },
				fs:		fs,
				os:		os
			};
			_.merge(context, parsed, data);
			context.__content = contents(context);

			if (context.template) {
				context.__content = compiled[context.template](context);
			}

			file.contents = new Buffer(_.has(compiled, "layout.html") ? compiled['layout.html'](context) : context.__content);

			return cb(null, file);
		}))
		.pipe(gulp.dest(target));
});

gulp.task("less", function() {
	return gulp.src(["src/**/*.less", "!src/"+options.vendor_dir+"/**/*.less"])
		     .pipe(changed(target, { extension: ".css" }))
		     .pipe(less())
		     .pipe(csso())
		     .pipe(gulp.dest(target));
});

gulp.task("css", function() {
	return gulp.src(["src/**/*.css", "!src/"+options.vendor_dir+"/**/*.css"])
		     .pipe(changed(target))
		     .pipe(csso())
		     .pipe(gulp.dest(target));
});

gulp.task("js", function() {
	return gulp.src(["src/**/*.js", "!src/"+options.vendor_dir+"/**/*.js"])
		     .pipe(changed(target))
		     .pipe(uglify())
		     .pipe(gulp.dest(target));
});

gulp.task("copy", function() {
	return gulp.src(["src/**/*", "!src/"+options.vendor_dir+"/**/*", "!src/"+options.data_dir+"/**/*", "!src/"+options.templates_dir+"/**/*", "!src/**/*.less", "!src/**/*.js", "!src/**/*.css", "!src/**/*.html"])
		     .pipe(changed(target))
		     .pipe(gulp.dest(target));
});

gulp.task("default", ["json", "templates", "vendor", "html", "less", "css", "js", "copy"]);