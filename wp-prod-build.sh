#!/bin/bash

echo "$(tput setaf 5; tput setab 7)Removing /vendor$(tput sgr 0)"
rm -rf ./vendor
RMVENDOR=$!
wait $RMVENDOR

echo "$(tput setaf 5; tput setab 7)Removing composer.lock$(tput sgr 0)"
rm -rf ./composer.lock
RMLOCK=$!
wait $RMLOCK

echo "$(tput setaf 5; tput setab 7)Running composer install$(tput sgr 0)"
composer install
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

echo "$(tput setaf 5; tput setab 7)Running yarn run gulp prod$(tput sgr 0)"
yarn run gulp prod
GULPPROD=$!
wait $GULPPROD