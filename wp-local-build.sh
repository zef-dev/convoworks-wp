#!/bin/bash

echo "$(tput setaf 5; tput setab 7)Removing /vendor$(tput sgr 0)"
rm -rf ./vendor
RMVENDOR=$!
wait $RMVENDOR

echo "$(tput setaf 5; tput setab 7)Removing composer-dev.lock$(tput sgr 0)"
rm -rf ./composer-dev.lock
RMLOCK=$!
wait $RMLOCK

echo "$(tput setaf 5; tput setab 7)Setting the COMPOSER envvar to composer-dev.json$(tput sgr 0)"
export COMPOSER=composer-dev.json
composer install
CINSTALL=$!
wait $CINSTALL
export COMPOSER=composer.json

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

echo "$(tput setaf 5; tput setab 7)Scoping PHP files$(tput sgr 0)"
yes "yes" | php-scoper add-prefix --config scoper.inc.dev.php
SCOPE=$!
wait $SCOPE

echo "$(tput setaf 5; tput setab 7)Moving into build dir$(tput sgr 0)"
cd build

echo "$(tput setaf 5; tput setab 7)Renamind composer files$(tput sgr 0)"
mv composer-dev.json composer.json
mv composer-dev.lock composer.lock
composer dump-autoload
cd ../

echo "$(tput setaf 5; tput setab 7)Copying files from build to dist/convoworks-wp$(tput sgr 0)"
yes "y" | cp -rf build/* dist/convoworks-wp/

echo "$(tput setaf 5; tput setab 7)Zipping files$(tput sgr 0)"
yarn run gulp zip

# echo "$(tput setaf 5; tput setab 7)Running yarn run gulp prod$(tput sgr 0)"
# yes "" | yarn run gulp prod
# GULPPROD=$!
# wait $GULPPROD