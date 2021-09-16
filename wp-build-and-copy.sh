#!/bin/bash

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

sed -i -e "s/require_once __DIR__.'\/vendor\/autoload.php';/require_once __DIR__.'\/vendor\/scoper-autoload.php';/g" ./convo-plugin.php

rm composer.json
rm composer.lock

cd ../

echo "$(tput setaf 5; tput setab 7)Copying files from build to dist/convoworks-wp$(tput sgr 0)"
yes "y" | cp -rf build/* dist/convoworks-wp/

echo "$(tput setaf 5; tput setab 7)Zipping files$(tput sgr 0)"
yarn run gulp zip