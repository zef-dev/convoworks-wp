#!/bin/bash

debug() {
    echo "$(tput bold; tput setaf 4)[$(date +%H:%M:%S)]$(tput sgr 0) $1"
}

# thanks to https://stackoverflow.com/a/14203146
for i in "$@"; do
    case $i in
        -m=*|--mode=*)
            MODE="${i#*=}"
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

if [ -z "${MODE}" ] || [ "${MODE}" != "dev" ] && [ "${MODE}" != "prod" ]; then
    debug "Specify either dev or prod as -m|--mode when invoking the script"
    exit 1
fi

# if [[ -z "${DESTINATION_FOLDER}" ]]; then
#     debug "Missing destination folder. Please provide a path with the -d|--dest argument."
#     exit 1
# fi

debug "Running quick build in mode ${MODE} with destination ${DESTINATION_FOLDER}"

START=$(date +%s)

debug "Running yarn build:wp"
yarn build:wp
YARNBUILD=$!
wait $YARNBUILD

if [[ ! -d dist/convoworks-wp ]]; then
    debug "dist/convoworks-wp does not exist"
    mkdir -p dist/convoworks-wp
fi

debug "Copying files to public/assets/js"
cp "${YARN_CWD}dist/www/main.js" "${YARN_CWD}dist/www/vendor.js" public/assets/js

debug "Fixing line endings"
yarn --cwd "${YARN_CWD}" run gulp fixLineEndings 
GULPFLE=$!
wait $GULPFLE

debug "Scoping PHP files"
if [[ "${MODE}" == "dev" ]]; then config="scoper.inc.dev.php"; else config="scoper.inc.php"; fi
yes "yes" | php-scoper add-prefix --config "$config"
SCOPE=$!
wait $SCOPE

debug "Moving into build directory"
cd build || return 1

if [[ ${MODE} == "dev" ]]; then
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

if [[ -n "${DESTINATION_FOLDER}" ]]; then
    if [[ -d "${DESTINATION_FOLDER}" ]]; then
        debug "Directory ${DESTINATION_FOLDER} already exists, will delete"
        rm -rf "${DESTINATION_FOLDER}"
    fi

    debug "Copying build files to ${DESTINATION_FOLDER}"
    cp -r ./dist/convoworks-wp "${DESTINATION_FOLDER}"
fi

END=$(date +%s)
debug "Total execution time was $(($END - $START)) seconds."