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

## Using the `build.js` script

The `build.js` script is a build script that allows you to automatically build the WP plugin. It supports the following arguments:

| Argument | Obligatory | Type | Description |
| - | :-: | :-: | - |
| `--cf\|--composer-file` | No | `string` | Name of the composer file to use. If omitted, will use `composer.json`. |
| `--yarn\|` | No | `boolean` | If true, will build yarn during a partial build. This is `true` by default, and is meant to be used as `--no-yarn` if you explicitly wish to skip yarn. |
| `--composer\|` | No | `boolean` | If true, will update composer and PHP dependencies during a partial build. This is `true` by default, and is meant to be used as `--no-composer` if you explicitly wish to skip composer. |
| `--rc\|--release-candidate` | No | `any` | If this flag is present and given any value, the build is treated as an RC. |
|`--v`\|`--verbose` | No | `boolean` | If `true`, various steps and outputs will be logged for easier inspection. Default `false`. |

The build runs in a new directory `.workspace` that is automatically created if it is currently missing. If this directory is missing, a full build will be performed, but subsequent builds can be partial. The finished zip file will be located in `.workspace/dist`.

If you wish to use local dependencies for your build, follow these steps:

1. First, create a file called `composer-dev.json` in the root directory, where the regular `composer.json` file is located. Ideally, you would copy, rename, and edit the existing `composer.json` file.
    1. 1 In this file, you can set which dependencies you want to be sourced from your local disk. As an example:
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

    1. 2 In the same file, in the `repositories` property, add a definition object that will tell `composer` where to look for the dependencies you've marked with `@dev`. The following example assumes you've put the subdirectories containing these dependencies two levels above and inside a directory called `Packages`:
        ```json
        "repositories": [
            {
                "type": "path",
                "url": "../../Packages/*",
                "packagist.org": false,
                "options": {
                    "symlink": false
                }
            }
        ]
        ```
        
        ***NOTE***: Keep in mind that the build goes on inside the `.workspace` directory. Make sure to account for that if you wish to use local dependencies, they will always have to be one directory level above.
        <br/>

2. Navigate to where you've cloned this git repo in your terminal and run `node build.js --cf=<your composer file.json>`. The results are going to be the newly built `.workspace/dist/convoworks-wp` directory and the accompanying `convoworks-wp.zip` file. You can use this zip file to update the plugin.

## `node-sass` fails with an error `python not found` on Windows systems

If you're running the build script on Windows, `node-sass` and `node-gyp` might fail during the `yarn build:wp` step of the build because they depend on `python`. If this happens, run a PowerShell window ***as an administrator***. Next, run

```ps1
npm install --global windows-build-tools
```

This process will take a bit longer than your usual installation. Once that's done, follow [this guide](https://www.architectryan.com/2018/08/31/how-to-change-environment-variables-on-windows-10/) in order to access the environment variables settings editor. You should edit the `Path` variable for the current user. If it somehow doesn't already exist, create it by clicking "New" on the right hand side. 

When you have the `Path` variable selected, click "Edit". Click on "Add" and add the following snippet: `C:\Users\<Your username>\.windows-build-tools\python27`. This is where the `windows-build-tools` normally installs its requisites. You might need to change the drive letter, but the C: drive is the default.

Once that's been added, click on Ok to save your changes and exit. Remember to close your terminals and re-open them in order for the `Path` changes to take effect.

If the error persists, open the search menu and look for `manage app execution aliases`. Find all entries called "App installer" that say `python.exe` or any variation thereof underneath. These are Microsoft store versions of python and are known to cause permission errors. Disable all of these entries and restart your terminal.

## Changelog

### 1.0
* Initial release
