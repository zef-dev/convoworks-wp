#!/bin/bash

echo "$(tput setaf 5; tput setab 7)Removing /vendor$(tput sgr 0)"
rm -rf ./vendor
RMVENDOR=$!
wait $RMVENDOR

if [ ! -f "./composer-dev.json" ]; then
    echo "You do not have a composer-dev.json file. Going to copy original."
    cp ./composer.json ./composer-dev.json
fi

echo "$(tput setaf 5; tput setab 7)Removing composer-dev.lock$(tput sgr 0)"
rm -rf ./composer-dev.lock
RMLOCK=$!
wait $RMLOCK

echo "$(tput setaf 5; tput setab 7)Setting the COMPOSER envvar to composer-dev.json$(tput sgr 0)"
export COMPOSER=composer-dev.json
composer update
CUPDATE=$!
wait $CUPDATE
CUPDATE_WAIT_RES=$?
export COMPOSER=composer.json

if [ $CUPDATE_WAIT_RES -ne 0 ] then;
    exit "composer update failed"
fi

echo "$(tput setaf 5; tput setab 7)Updating npm-shrinkwrap.json$(tput sgr 0)"
echo '{"dependencies":{"graceful-fs":{"version": "4.2.2"}}}' > 'npm-shrinkwrap.json'

echo "$(tput setaf 5; tput setab 7)Running npm install$(tput sgr 0)"
npm install
NPMINSTALL=$!
wait $NPMINSTALL

echo "$(tput setaf 5; tput setab 7)Running yarn build:wp$(tput sgr 0)"
yarn build:wp
YARNBUILD=$!
wait $YARNBUILD

echo "$(tput setaf 5; tput setab 7)Copying files to public/assets/js$(tput sgr 0)"
cp dist/www/main.js dist/www/vendor.js public/assets/js

echo "$(tput setaf 5; tput setab 7)Fixing line endings$(tput sgr 0)"
yarn run gulp fixLineEndings
GULPFLE=$!
wait $GULPFLE

yarn run gulp bumpRcVersion
GVERSION=$!
wait $GVERSION

rm -rf build/

echo "$(tput setaf 5; tput setab 7)Scoping PHP files$(tput sgr 0)"
yes "yes" | php-scoper add-prefix --config scoper.inc.dev.php
SCOPE=$!
wait $SCOPE

echo "$(tput setaf 5; tput setab 7)Moving into build dir$(tput sgr 0)"
cd build

echo "$(tput setaf 5; tput setab 7)Renaming composer files$(tput sgr 0)"
mv composer-dev.json composer.json
mv composer-dev.lock composer.lock
composer dump-autoload

sed -i -e "s/require_once __DIR__.'\/vendor\/autoload.php';/require_once __DIR__.'\/vendor\/scoper-autoload.php';/g" ./convo-plugin.php

rm composer.json
rm composer.lock

cd ../

php fix-autoloader.php

echo "$(tput setaf 5; tput setab 7)Copying files from build to dist/convoworks-wp$(tput sgr 0)"
yes "y" | cp -rf build/* dist/convoworks-wp/

echo "$(tput setaf 5; tput setab 7)Zipping files$(tput sgr 0)"
yarn run gulp zip