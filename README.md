# Convoworks WordPress Plugin

##Description

Main WordPress plugin for implementing Convoworks services

##Installation

1. Click Download ZIP button on the right
2. Install plugin archive through WordPress' Add plugin screen
3. Activate the plugin

## Developer version installation (not working at this moment, as repo is forked on my private account)

1. Clone Git repository inside wp-content/plugins of existing WordPress installation
2. Cd to that folder
3. Run composer install
4. Run npm install
5. Run npm run prod
6. Activate the plugin from WordPress plugin screen

##Requirements
* Requires at least: 5.0
* Stable tag: 1.0
* License: GPLv2 or later
* License URI: [http://www.gnu.org/licenses/gpl-2.0.html](http://www.gnu.org/licenses/gpl-2.0.html)

## Local build with the `wp-local-build.sh` script

The `wp-local-build.sh` script is a build script that allows you to automatically build the WP plugin out of locally sourced `@zef-dev` dependencies. Here's how to use it:

1. First, create a file called `composer-dev.json` in the root directory, where the regular `composer.json` file is located. Ideally, you would copy, rename, and edit the existing `composer.json` file.
    1. In this file, you can set which dependencies you want to be sourced from your local disk. As an example:
    ```json
    "require" : {
		/* cut for brevity */
		"zef-dev/convoworks-core": "@dev",
		"zef-dev/convoworks-data-filesystem": "@dev",
		"zef-dev/convoworks-guzzle": "@dev",
		"zef-dev/convoworks-pckg-filesystem": "@dev",
		"zef-dev/convoworks-pckg-mysqli": "@dev",
		"zef-dev/convoworks-pckg-trivia": "@dev"
	}
    ```
    2. In the same file, in the `repositories` property, add a definition object that will tell `composer` where to look for the dependencies you've marked with `@dev`. The following example assumes you've put the subdirectories containing these dependencies one level above and inside a directory called `Packages`:
    ```json
    "repositories": [
        {
            "type": "path",
            "url": "../Packages/*",
            "packagist.org": false,
            "options": {
                "symlink": false
            }
        }
	]
    ```
2. Navigate to this directory in your terminal and run `./wp-local-build.sh`. The results are going to be the newly built `dist/convoworks-wp` directory and the accompanying `convoworks-wp.zip` file. You can use this zip file to update the plugin.

##Changelog

####1.0
* Initial release