#!/bin/bash

debug() {
    echo "$(tput bold; tput setaf 4)[$(date +%H:%M:%S)]$(tput sgr 0) $1"
}

# thanks to https://stackoverflow.com/a/14203146
for i in "$@"; do
    case $i in
        -cf=*|--composer-file=*)
            COMPOSER_FILE="${i#*=}"
            COMPOSER_LOCK_FILE="${COMPOSER_FILE/.json/.lock}"
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

debug "Running quick build with composer file ${COMPOSER_FILE}"

START=$(date +%s)

if [[ -d .workspace ]]; then
    debug "Removing previous workspace dir"
    rm -rf .workspace
fi

debug "Creating temporary work folder"
mkdir .workspace
cd .workspace || exit 1

mkdir -p lib/common

debug "Copying ../src and ../vendor for scoping purposes"
cp -r ../src ../vendor .

cp -r ../lib/common/* lib/common

debug "Copying required files for update"
cp ../convo-plugin.php "../${COMPOSER_FILE}" scoper.inc.php .

debug "Running composer update"
export composer="${COMPOSER_FILE}"
composer update
CUPDATE=$!
wait $CUPDATE
export COMPOSER=composer.json

debug "Scoping PHP files"
yes "yes" | php-scoper add-prefix --config scoper.inc.php "${COMPOSER_FILE}" "${COMPOSER_LOCK_FILE}" convo-plugin.php
SCOPE=$!
wait $SCOPE

debug "Moving into build directory"
cd build || return 1

debug "Renaming composer files"
mv "${COMPOSER_FILE}" composer.json
mv "${COMPOSER_LOCK_FILE}" composer.lock

debug "Dumping composer autoloaders"
composer dump-autoload

debug "Fixing required autoload file in convo-plugin.php"
sed -i -e "s/require_once __DIR__.'\/vendor\/autoload.php';/require_once __DIR__.'\/vendor\/scoper-autoload.php';/g" ./convo-plugin.php

debug "Removing unnecessary composer files"
rm composer.json
rm composer.lock

debug "Running autoloader fix script"
php ../fix-autoloader.php --working-dir="./vendor/composer"

debug "Copying build files to parent folder"
yes "y" | cp -rp ./* ../

debug "Moving out of build directory"
cd ../

rm -rf build/

if [[ -n "${DESTINATION_FOLDER}" ]]; then
    if [[ ! -d "${DESTINATION_FOLDER}" ]]; then
        mkdir -p "${DESTINATION_FOLDER}"
    fi

    debug "Copying build files to ${DESTINATION_FOLDER}"
    
    rm "${COMPOSER_FILE}" "${COMPOSER_LOCK_FILE}" scoper.inc.php "fix-autoloader.php"

    yes "y" | cp -rp ./* "${DESTINATION_FOLDER}"

    debug "Moving out of workspace and cleaning up files"
    cd ../
    # rm -rf .workspace
fi

debug "Build done."

END=$(date +%s)
debug "Total execution time was $(($END - $START)) seconds."