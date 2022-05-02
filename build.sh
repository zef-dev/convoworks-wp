#!/bin/bash

debug() {
    echo "$(tput bold; tput setaf 4)[$(date +%H:%M:%S)]$(tput sgr 0) $1"
}

# thanks to https://stackoverflow.com/a/14203146
for i in "$@"; do
    case $i in
        -cf=*|--composer-file=*)
            COMPOSER_FILE="${i#*=}"
            COMPOSER_LOCK="${COMPOSER_FILE/.json/.lock}"
            shift
            ;;
        -rc=*|--release-candidate=*)
            IS_RC=1
            shift
            ;;
        -d=*|--dest=*)
            DESTINATION_FOLDER="${i#*=}"
            shift
            ;;
        -*|--*)
            echo "Unknown option $i"
            exit 1
            ;;
        *)
            ;;
    esac
done

if [[ -z "${IS_RC}" ]]; then
    IS_RC=0
fi

if [[ -z "${COMPOSER_FILE}" ]]; then
    COMPOSER_FILE=composer.json
    COMPOSER_LOCK=composer.lock
fi

if [[ ! -f "${COMPOSER_FILE}" ]]; then
    debug "${COMPOSER_FILE} does not exist"
    exit 1
fi

debug "Running build with composer file ${COMPOSER_FILE}"

if [[ $SKIP_YARN -eq 1 ]]; then debug "Skipping yarn installation"; fi

START=$(date +%s)

debug "Cleaning pre-existing .workspace directory if any"
rm -rf ./.workspace

debug "Creating new .workspace directory"
mkdir -p ./.workspace/dist/convoworks-wp

debug "Copying required files from root"

cp "${COMPOSER_FILE}" ./scoper.inc.php ./.workspace;

cp ./package.json ./gulpfile.js ./webpack.config.wp.js ./fix-autoloader.php ./convo-plugin.php ./readme.txt ./.workspace
cp -r ./app ./assets ./lib ./public ./resources ./routes ./src ./webpack ./env ./.workspace

debug "Moving into .workspace"
cd .workspace || exit 1

debug "Updating yarn.lock"
echo -e "graceful-fs@^4.2.2:\n  version \"4.2.2\"\n  resolved \"https://registry.yarnpkg.com/graceful-fs/-/graceful-fs-4.2.2.tgz#6f0952605d0140c1cfdb138ed005775b92d67b02\"\n  integrity sha512-IItsdsea19BoLC7ELy13q1iJFNmd7ofZH5+X/pJr90/nRoPEX0DJo1dHDbgtYWOhJhcCgMDTOw84RZ72q6lB+Q==" > yarn.lock

debug "Running yarn"
yarn install
YARNINSTALL=$!
wait $YARNINSTALL

debug "Running composer update"
export COMPOSER="${COMPOSER_FILE}"
composer update
CUPDATE=$!
wait $CUPDATE
CUPDATE_WAIT_RES=$?
export COMPOSER=composer.json

if [[ $CUPDATE_WAIT_RES -ne 0 ]]; then
    >&2 echo "composer update failed"
    return $CUPDATE_WAIT_RES
fi

debug "Running yarn build:wp"
yarn build:wp
YARNBUILD=$!
wait $YARNBUILD

debug "Copying files to public/assets/js"
cp dist/www/main.js dist/www/vendor.js public/assets/js

debug "Fixing line endings"
yarn run gulp fixLineEndings 
GULPFLE=$!
wait $GULPFLE

if [[ $IS_RC -eq 1 ]]; then
    debug "Going to increase RC candidate"
    yarn --cwd "${YARN_CWD}" run gulp bumpRcVersion
    GVERSION=$!
else 
    debug "Going to increase version"
    yarn --cwd "${YARN_CWD}" run gulp version
    GVERSION=$!
fi

wait $GVERSION

yes "yes" | php-scoper add-prefix --config scoper.inc.php "${COMPOSER_FILE}" "${COMPOSER_LOCK}" convo-plugin.php
SCOPE=$!
wait $SCOPE

debug "Moving into build directory"
cd build || return 1

debug "Renaming composer files"
mv "${COMPOSER_FILE}" composer.json
mv "${COMPOSER_LOCK}" composer.lock

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
php fix-autoloader.php --working-dir="./build/vendor/composer"

debug "Copying files from build to dist/convoworks-wp"
yes "y" | cp -rp build/* dist/convoworks-wp/

debug "Zipping built files"
yarn run gulp zip

debug "Moving to root dir"
cd ../

debug "Cleaning dist directory and copying files from .workspace/dist"
rm -rf ./dist
cp -r .workspace/dist ./

debug "Copying package.json and convo-plugin.php from .workspace"
yes "y" | cp -rp .workspace/package.json .workspace/convo-plugin.php ./

if [[ -n "${DESTINATION_FOLDER}" ]]; then
    if [[ -d "${DESTINATION_FOLDER}" ]]; then
        debug "Directory ${DESTINATION_FOLDER} already exists, will delete"
        rm -rf "${DESTINATION_FOLDER}"
    fi
    
    debug "Copying build files to ${DESTINATION_FOLDER}"
    yes "y" | cp -rp ./dist/convoworks-wp "${DESTINATION_FOLDER}"
fi

debug "Build done, cleaning .workspace"
rm -rf ./.workspace

END=$(date +%s)

debug "Total execution time was $(($END - $START)) seconds."