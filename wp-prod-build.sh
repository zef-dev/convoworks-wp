#!/bin/bash

echo "$(tput setaf 5; tput setab 7)Removing /vendor$(tput sgr 0)"
rm -rf ./vendor
RMVENDOR=$!
wait $RMVENDOR

echo "$(tput setaf 5; tput setab 7)Removing composer.lock$(tput sgr 0)"
rm -rf ./composer.lock
RMLOCK=$!
wait $RMLOCK

echo "$(tput setaf 5; tput setab 7)Setting the COMPOSER envvar to composer.json$(tput sgr 0)"
composer update
CINSTALL=$!
wait $CINSTALL

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

rm -rf build/

echo "$(tput setaf 5; tput setab 7)Scoping PHP files$(tput sgr 0)"
yes "yes" | php-scoper add-prefix --config scoper.inc.php
SCOPE=$!
wait $SCOPE

echo "$(tput setaf 5; tput setab 7)Moving into build dir$(tput sgr 0)"
cd build

echo "$(tput setaf 5; tput setab 7)Dumping composer autoload$(tput sgr 0)"
composer dump-autoload

echo "$(tput setaf 5; tput setab 7)Updating plugin autoload include to scoper autoload$(tput sgr 0)"
sed -i -e "s/require_once __DIR__.'\/vendor\/autoload.php';/require_once __DIR__.'\/vendor\/scoper-autoload.php';/g" ./convo-plugin.php

rm composer.json
rm composer.lock

cd ../

echo "$(tput setaf 5; tput setab 7)Copying files from build to dist/convoworks-wp$(tput sgr 0)"
yes "y" | cp -rf build/* dist/convoworks-wp/

echo "$(tput setaf 5; tput setab 7)Zipping files$(tput sgr 0)"
yarn run gulp prod