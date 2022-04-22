# Convoworks WordPress Plugin

## Description

Main WordPress plugin for implementing Convoworks services

## Installation

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

## Requirements
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

The `build.sh` script is a build script that allows you to automatically build the WP plugin. It supports the following arguments:

| Argument | Obligatory | Type | Description |
| - | :-: | :-: | - |
| `-m\|--mode` | Yes | `string` | Either `dev` or `prod`. Indicates whether to use local or remote deps for the build. |
| `-d\|--dest` | No | `string` | Destination folder to which to copy build files. |
| `-sy\|--skip-yarn` | No | `boolean` | If present and set to `true`, `yarn` dependencies will not be installed. |
| `-sc\|--skip-composer` | No | `boolean` | If present and set to `true`, `composer` dependencies will not be installed. |

The build runs in a new directory `.workspace` that is automatically deleted after the build is finished and the results are copied into `dist/`.

Running the script with the `-m|--mode` argument set to `dev` will use `composer-dev.json` to build PHP dependencies. To get started, follow the instructions:

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
2. Navigate to where you've cloned this git repo in your terminal and run `./build.sh -m=dev`. The results are going to be the newly built `dist/convoworks-wp` directory and the accompanying `convoworks-wp.zip` file. You can use this zip file to update the plugin.

Running the script with `prod` instead of `dev` will use the regular `composer.json` file for PHP dependencies. You will also be prompted to enter a new version for the plugin.

As with the `dev` build type, you can find the newly built folder in `dist/convoworks-wp` and the `convoworks-wp.zip` file alongside it.

## Using `quick-build.sh`

If you just want to bundle your current source files, the `quick-build` will only do the most rudimentary bundling of files to generate a build. Note however, this presumes you've already installed your dependencies (i.e., have the `vendor` directory). This script runs in the current directory instead of creating a new one.

It supports the following arguments:

| Argument | Obligatory | Type | Description |
| - | :-: | :-: | - |
| `-m\|--mode` | Yes | `string` | Either `dev` or `prod`. Used for PHP scoper purposes. |
| `-d\|--dest` | No | `string` | Destination folder to which to copy build files. |

Just like with the regular `build.sh` script, the result is `dist/convoworks-wp` and its corresponding zip file. If you supplied the `--mode` argument, then the `convoworks-wp` folder will automatically be copied there.

## `node-sass` fails with an error `python not found` on Windows systems

If you're running the build script on Windows, `node-sass` and `node-gyp` might fail during the `yarn build:wp` step of the build because they depend on `python`. If this happens, run a PowerShell window ***as an administrator***. Next, run

```ps
npm install --global windows-build-tools
```

This process will take a bit longer than your usual installation. Once that's done, follow [this guide](https://www.architectryan.com/2018/08/31/how-to-change-environment-variables-on-windows-10/) in order to access the environment variables settings editor. You should edit the `Path` variable for the current user. If it somehow doesn't already exist, create it by clicking "New" on the right hand side. 

When you have the `Path` variable selected, click "Edit". Click on "Add" and add the following snippet: `C:\Users\<Your username>\.windows-build-tools\python27`. This is where the `windows-build-tools` normally installs its requisites. You might need to change the drive letter, but the C: drive is the default.

Once that's been added, click on Ok to save your changes and exit. Remember to close your terminals and re-open them in order for the `Path` changes to take effect.

If the error persists, open the search menu and look for `manage app execution aliases`. Find all entries called "App installer" that say `python.exe` or any variation thereof underneath. These are Microsoft store versions of python and are known to cause permission errors. Disable all of these entries and restart your terminal.

## Changelog

### 1.0
* Initial release
