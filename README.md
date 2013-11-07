# Szyslak

> Static site generator with an attitude

Szyslak is a static site generated based on [Node.JS](http://nodejs.org/) and [Grunt](http://gruntjs.com/). It is designed for my personal needs and website building habits. While quite a lot of static site generators are available out there, I find that adapting yourself to them makes absolutely no sense. Having to structure my site's code according to the generator's own directory structure requirements alone kills these for me.

In my opinion, it is much better to have a framework that is adapted to your particular needs and methodologies. If you need a static site generator, I encourage you to create your own. Don't use this (unless it really fits your needs). If anything, use this as a reference for creating your own static site generator (not that I claim this one is properly written).

## Current Features

* Automatic rendering of HTML files with [Lo-Dash](http://lodash.com/) templates.
* Template nesting is supported.
* Automatic compilation of [Roole](http://roole.org/) files into CSS.
* Automatic minification of CSS files (with [clean-css](https://github.com/GoalSmashers/clean-css)) and JS files (with [UglifyJS](https://github.com/mishoo/UglifyJS2)).
* Automatic parsing of JSON files and YAML/JSON Front Matter (with [yaml-front-matter](https://github.com/dworthen/js-yaml-front-matter)) in HTML files. JSON files are turned into objects that are available inside all HTML pages/templates. YAML/JSON Front Matter is available inside the specific HTML file only.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install szyslak --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('szyslak');
```

### Directory Structure

Szyslak projects have a directory structure of source files in a directory called `src/`, and the generated site is generated into a directory called `dist/`.

Inside the source directory, the structure is basically whatever you want it to be, with the following three exceptions:

* If you want to use JSON data files (you don't have to), they should be placed in a directory of their own. This directory can be named however you want and doesn't have to be at the top of `src/`. By default, Szyslak searches for them in `src/data/`.
* The same goes for templates. You don't have to use them, and by default they're expected to be in `src/templates/`.
* And the same goes for vendor/third-party/bower-managed files. By default, they're expected to be in `src/vendor/`.

Here's an example directory structure:

	src/
		vendor/
			bootstrap/
				...
			jquery/
				...
		templates/
			layout.html
			whatever.html
		css/
			styles.css
		js/
			main.js
			other.js
		blog/
			post1.html
			post2.html
		index.html
	dist/

## The "szyslak" task

The szyslak task is the only task provided by this package. To use this task, add a section named `szyslak` to the data object passed into `grunt.initConfig()`. I recommended using the `clean` task from [grunt-contrib-clean](https://github.com/gruntjs/grunt-contrib-clean) to automatically purge the destination directory when running `grunt`.

Here's an example Gruntfile:

```js
module.exports = function(grunt) {
	// Project configuration.
	grunt.initConfig({
		szyslak: {
			options: {
				templates_dir: "templates", // this is the default
				data_dir: "data", // this is the default
				vendor_dir: "bower_components", // the default is "vendor"
				vendor_files: [
					'jquery/jquery.min.js',
					'knockout.js/knockout.js'
				]
			}
		},

		// Before generating any new files,
		// remove any previously-created files.
		clean: ['dist/*']
	});

	// Load npm plugins to provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('szyslak');

	// Default task to be run.
	grunt.registerTask('default', ['clean', 'szyslak']);
};
```

### Options

#### options.templates_dir
Type: `String`
Default value: `'templates'`

The directory, inside `src/`, where template files reside.

#### options.data_dir
Type: `String`
Default value: `'data'`

The directory, inside `src/`, where JSON data files reside.

#### options.vendor_dir
Type: `String`
Default value: `'vendor'`

The directory, inside `src/`, where third-party source files reside.

#### options.vendor_files
Type: `Array`
Default value: none

A list of files to copy from the vendor directory to the destination tree. Only these files are copied, and if this configuration option is not provided, no files are copied.

There are two ways to list files in this array:

1. An item in this array can either be a simple string (Grunt's globbing patterns are supported), in which case the file(s) are copied directly to the vendor directory in the destination tree (e.g. `dist/vendor/`), flattened (so `'src/vendor/jquery/jquery.min.js'` in the vendor directory is copied to `'dist/vendor/jquery.min.js'`).
2. An item can be an object, with two properties: `src`, which is an array of source files (again, globbing patterns are supported), and `dest`, which is a destination directory __inside__ the output vendor directory.

For example:

```js
szyslak: {
	options: {
		vendor_directory: "bower",
		vendor_files: [
			'jquery/jquery.min.js',
			'knockout.js/knockout.js',
			{ src: ['bootstrap/dist/{css,js}/bootstrap.min.{css,js}'], dest: 'bootstrap' }
		]
	}
}
```

In the above example, the following file copies will be made:

- **_src/bower/jquery/jquery.min.js => dist/bower/jquery.min.js_**
- **_src/bower/knockout.js/knockout.js => dist/bower/knockout.js_**
- **_src/bower/bootstrap/dist/css/bootstrap.min.css => dist/bower/bootstrap/bootstrap.min.css_**
- **_src/bower/bootstrap/dist/js/bootstrap.min.js => dist/bower/bootstrap/bootstrap.min.css_**

### Generation Process

The `szyslak` tasks employs the following process to generate the site:

1. If a data directory exists, all JSON files in it are parsed into objects named like the files (minus the `.json` extension).
2. If a templates directory exists, all HTML files in it are pre-processed with Lo-Dash, and the resulting template functions are saved into an object.
3. If a vendor directory exists, and vendor files have been configured, they are copied to the site's `dist/` directory.
4. Szyslak goes over all other files and directories under `src/` (recursively of course), and performs the following:
	- If a file has an `.html` extension, its front matter (either YAML or JSON) is parsed (it doesn't have to have any), and the HTML content is rendered with Lo-Dash.
	
	  A context object is available inside the template, which includes all data objects from step 1, all fields from the front matter (if any), and the following four keys:
	
		- `path` - the relative path of the file inside `dist/`.
		- `base` - the same as `path` but minus the extension.
		- `title` - the same as `path`, it's just there to make sure every page has a title even if one was not provided in the front matter.
		- `cwd` - the directory of the current file, including `src/` at the head.
		- `include(template_name)` - this function renders a template from the templates directory and embeds the output (example usage: `<%= include('header.html') %>`). The same context object will be available to the embedded template.
		- `fs` - an object of the [NodeJS File System Class](http://nodejs.org/api/fs.html).
		- `os` - an object of the [NodeJS Operating System Class](http://nodejs.org/api/os.html).
		- `grunt` - the grunt object, so you can use the [Grunt API](http://gruntjs.com/api/grunt), like `grunt.file`.
	
	  The resulting content is again rendered into the `layout.html` template (with the same context object). The resulting content is copied to the appropriate location in the `dist/` directory.
	- If the file has a `.roo` extension, it is compiled to CSS and minified, before being copied.
	- If the file has a `.js` or `.css` extension, it is minified and copied.
	- All other files are simply copied as is.

Note that apart from vendor files (see explanation above), directory structures are maintained. Paths are not flattened before copying.

## Release History

* 2013-11-08   v1.2.0   Added the cwd, fs, os and grunt context variables.
* 2013-10-28   v1.1.0   Added support for template nesting with the include function.
* 2013-10-23   v1.0.1   Small bugfix with the base context variable.
* 2013-10-23   v1.0.0   Initial release.
