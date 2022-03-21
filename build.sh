#!/bin/bash

debug() {
    echo "$(tput bold; tput setaf 4)[$(date +%H:%M:%S)]$(tput sgr 0) $1"
}

mode=$1

if [ -z "$mode" ] || [ "$mode" != "dev" ] && [ "$mode" != "prod" ]; then
    debug "Specify either dev or prod as mode when invoking the script"
    exit 1
fi

debug "Building in mode $mode"

START=$(date +%s)

debug "Cleaning pre-existing .workspace directory if any"
rm -rf ./.workspace

debug "Creating new .workspace directory"
mkdir ./.workspace

debug "Copying required files from root"
if [[ "$mode" = "dev" ]]; then cp ./composer-dev.json ./scoper.inc.dev.php ./.workspace; else cp ./composer.json ./scoper.inc.php ./.workspace; fi
cp ./package.json ./gulpfile.js ./webpack.config.wp.js ./fix-autoloader.php ./convo-plugin.php ./readme.txt ./.workspace
cp -r ./app ./assets ./lib ./public ./resources ./routes ./src ./webpack ./env ./.workspace

debug "Moving into .workspace"
cd .workspace || exit 1

debug "Updating yarn.lock"
echo -e "graceful-fs@^4.2.2:\n  version \"4.2.2\"\n  resolved \"https://registry.yarnpkg.com/graceful-fs/-/graceful-fs-4.2.2.tgz#6f0952605d0140c1cfdb138ed005775b92d67b02\"\n  integrity sha512-IItsdsea19BoLC7ELy13q1iJFNmd7ofZH5+X/pJr90/nRoPEX0DJo1dHDbgtYWOhJhcCgMDTOw84RZ72q6lB+Q==" > yarn.lock

if [ "$mode" == "dev" ] && [ ! -f "./composer-dev.json" ]; then
    debug "You do not have a composer-dev.json file. Going to copy original."
    cp ../composer.json ./composer-dev.json
fi

{
    debug "Running composer update"
    [[ "$mode" == "dev" ]] && export COMPOSER=composer-dev.json
    composer update
    CUPDATE=$!
    CUPDATE_WAIT_RES=$?
    [[ "$mode" == "dev" ]] && export COMPOSER=composer.json

    if [ $CUPDATE_WAIT_RES -ne 0 ]; then
        >&2 echo "composer update failed"
        return $CUPDATE_WAIT_RES
    fi

    debug "Running yarn"
    yarn install
    YARNINSTALL=$!
    wait $YARNINSTALL $CUPDATE
}

# echo "$(tput setaf 5; tput setab 7)Running yarn build:wp$(tput sgr 0)"
debug "Running yarn build:wp"
yarn build:wp
YARNBUILD=$!
wait $YARNBUILD

# echo "$(tput setaf 5; tput setab 7)Copying files to public/assets/js$(tput sgr 0)"
debug "Copying files to public/assets/js"
cp dist/www/main.js dist/www/vendor.js public/assets/js

# echo "$(tput setaf 5; tput setab 7)Fixing line endings$(tput sgr 0)"
debug "Fixing line endings"
yarn run gulp fixLineEndings
GULPFLE=$!
wait $GULPFLE

if [[ "$mode" == "dev" ]]; then
    debug "Going to increase RC candidate"
    yarn run gulp bumpRcVersion
    GVERSION=$!
else 
    debug "Going to increase version"
    yarn run gulp version
    GVERSION=$!
fi

wait $GVERSION

debug "Scoping PHP files"
if [[ "$mode" == "dev" ]]; then config="scoper.inc.dev.php"; else config="scoper.inc.php"; fi
yes "yes" | php-scoper add-prefix --config "$config"
SCOPE=$!
wait $SCOPE

debug "Moving into build directory"
cd build || return 1

if [[ $mode == "dev" ]]; then
    debug "Renaming composer files"
    mv composer-dev.json composer.json
    mv composer-dev.lock composer.lock
fi

debug "Dumping composer autoloaders"
composer dump-autoload

debug "Fixing required autoload file in convo-plugin.php"
sed -i -e "s/require_once __DIR__.'\/vendor\/autoload.php';/require_once __DIR__.'\/vendor\/scoper-autoload.php';/g" ./convo-plugin.php

debug "Removing unnecessary composer files"
rm composer.json
rm composer.lock

debug "Moving out of build directory"
cd ../

debug "Running autoloader fix script"
php fix-autoloader.php

debug "Copying files from build to dist/convoworks-wp"
yes "y" | cp -rf build/* dist/convoworks-wp/

debug "Zipping built files"
yarn run gulp zip

debug "Moving to root dir"
cd ../

debug "Cleaning dist directory and copying files from .workspace/dist"
rm -rf ./dist
cp -r .workspace/dist ./

debug "Copying package.json and convo-plugin.php from .workspace"
yes "y" | cp -fR .workspace/package.json .workspace/convo-plugin.php ./

debug "Build done, cleaning .workspace"
rm -rf ./.workspace

END=$(date +%s)

debug "Total execution time was $(($END - $START)) seconds."