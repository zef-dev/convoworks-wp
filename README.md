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

## Scoped builds

Some package dependencies within Convoworks are now scoped with [php-scoper](https://github.com/humbug/php-scoper). In order to be able to build, please install `php-scoper` globally by running
```
composer global require humbug/php-scoper
```

There are two configuration files that are used for builds. When running the build script with the `dev` flag, `scoper.inc.dev.php` is used. During production builds the file `scoper.inc.php` is used. The only notable difference between the two is that during the local development build process the files `composer-dev.json` and `composer-dev.lock` are appended to the output directory, and then renamed to facilitate composer autoloader dumping.

## Using the `build.sh` script

The `build.sh` script is a build script that allows you to automatically build the WP plugin. To run it, call it with either `dev` or `prod`, depending on which kind of build you want to run.

```shell
$ ./build.sh dev
```
***or***
```shell
$ ./build.sh prod
```

The build runs in a new directory `.workspace` that is automatically deleted after the build is finished and the results are copied into `dist/`.

Running the script with the `dev` flag will use `composer-dev.json` to build PHP dependencies. To get started, follow the instructions:

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
    **NOTE:** If you do not have a `composer-dev.json` file present, the script will copy your default `composer.json` file and rename it if you run it in `dev` mode.

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
2. Navigate to where you've cloned this git repo in your terminal and run `./build.sh dev`. The results are going to be the newly built `dist/convoworks-wp` directory and the accompanying `convoworks-wp.zip` file. You can use this zip file to update the plugin.

Running the script with `prod` instead of `dev` will use the regular `composer.json` file for PHP dependencies. You will also be prompted to enter a new version for the plugin.

As with the `dev` build type, you can find the newly built folder in `dist/convoworks-wp` and the `convoworks-wp.zip` file alongside it.

##Changelog

### 1.0
* Initial release