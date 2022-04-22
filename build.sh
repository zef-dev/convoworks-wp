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
        -sc=*|--skip-composer=*)
            SKIP_COMPOSER=1
            shift
            ;;
        -sy=*|--skip-yarn=*)
            SKIP_YARN=1
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

if [[ $SKIP_YARN -eq 1 ]]; then YARN_CWD="./"; else YARN_CWD="./"; fi

if [ -z "${MODE}" ] || [ "${MODE}" != "dev" ] && [ "${MODE}" != "prod" ]; then
    debug "Specify either dev or prod as -m|--mode when invoking the script"
    exit 1
fi

debug "Building in mode ${MODE}"

if [[ $SKIP_YARN -eq 1 ]]; then debug "Skipping yarn installation"; fi

START=$(date +%s)

debug "Cleaning pre-existing .workspace directory if any"
rm -rf ./.workspace

debug "Creating new .workspace directory"
mkdir -p ./.workspace/dist/convoworks-wp

debug "Copying required files from root"
if [[ "${MODE}" = "dev" ]]; then cp ./composer-dev.json ./scoper.inc.dev.php ./.workspace; else cp ./composer.json ./scoper.inc.php ./.workspace; fi
cp ./package.json ./gulpfile.js ./webpack.config.wp.js ./fix-autoloader.php ./convo-plugin.php ./readme.txt ./.workspace
cp -r ./app ./assets ./lib ./public ./resources ./routes ./src ./webpack ./env ./.workspace

debug "Moving into .workspace"
cd .workspace || exit 1

if [[ $SKIP_YARN -ne 1 ]]; then 
    debug "Updating yarn.lock"
    echo -e "graceful-fs@^4.2.2:\n  version \"4.2.2\"\n  resolved \"https://registry.yarnpkg.com/graceful-fs/-/graceful-fs-4.2.2.tgz#6f0952605d0140c1cfdb138ed005775b92d67b02\"\n  integrity sha512-IItsdsea19BoLC7ELy13q1iJFNmd7ofZH5+X/pJr90/nRoPEX0DJo1dHDbgtYWOhJhcCgMDTOw84RZ72q6lB+Q==" > yarn.lock
    
    debug "Running yarn"
    yarn install
    YARNINSTALL=$!
    wait $YARNINSTALL
else
    debug "Symlinking node_modules"
    ln -s ../node_modules ./node_modules
fi

if [[ "${MODE}" == "dev" ]] && [[ ! -f "./composer-dev.json" ]]; then
    debug "You do not have a composer-dev.json file. Going to copy original."
    cp ../composer.json ./composer-dev.json
fi

if [[ $SKIP_COMPOSER -ne 1 ]]; then
    debug "Running composer update"
    [[ "${MODE}" == "dev" ]] && export COMPOSER=composer-dev.json
    composer update
    CUPDATE=$!
    wait $CUPDATE
    CUPDATE_WAIT_RES=$?
    [[ "${MODE}" == "dev" ]] && export COMPOSER=composer.json

    if [[ $CUPDATE_WAIT_RES -ne 0 ]]; then
        >&2 echo "composer update failed"
        return $CUPDATE_WAIT_RES
    fi
else
    debug "Symlinking vendor folder"
    ln -s ../vendor ./vendor

    debug "Copying composer lock file"
    if [[ "${MODE}" == "dev" ]]; then
        cp ../composer-dev.lock ./
    else
        cp ../composer.lock ./
    fi
fi

# echo "$(tput setaf 5; tput setab 7)Running yarn build:wp$(tput sgr 0)"
debug "Running yarn build:wp"
yarn --cwd "${YARN_CWD}" build:wp
YARNBUILD=$!
wait $YARNBUILD

# echo "$(tput setaf 5; tput setab 7)Copying files to public/assets/js$(tput sgr 0)"
debug "Copying files to public/assets/js"
cp "${YARN_CWD}dist/www/main.js" "${YARN_CWD}dist/www/vendor.js" public/assets/js

# echo "$(tput setaf 5; tput setab 7)Fixing line endings$(tput sgr 0)"
debug "Fixing line endings"
yarn --cwd "${YARN_CWD}" run gulp fixLineEndings 
GULPFLE=$!
wait $GULPFLE

if [[ "${MODE}" == "dev" ]]; then
    debug "Going to increase RC candidate"
    yarn --cwd "${YARN_CWD}" run gulp bumpRcVersion
    GVERSION=$!
else 
    debug "Going to increase version"
    yarn --cwd "${YARN_CWD}" run gulp version
    GVERSION=$!
fi

wait $GVERSION

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
yarn --cwd "${YARN_CWD}" run gulp zip

debug "Moving to root dir"
cd ../

debug "Cleaning dist directory and copying files from .workspace/dist"
rm -rf ./dist
cp -r .workspace/dist ./

if [[ $SKIP_YARN -ne 1 ]]; then
    debug "Copying package.json and convo-plugin.php from .workspace"
    yes "y" | cp -fR .workspace/package.json .workspace/convo-plugin.php ./
fi

if [[ -n "${DESTINATION_FOLDER}" ]]; then
    if [[ -d "${DESTINATION_FOLDER}" ]]; then
        debug "Directory ${DESTINATION_FOLDER} already exists, will delete"
        rm -rf "${DESTINATION_FOLDER}"
    fi
    
    debug "Copying build files to ${DESTINATION_FOLDER}"
    cp -r ./dist/convoworks-wp "${DESTINATION_FOLDER}"
fi

debug "Build done, cleaning .workspace"
rm -rf ./.workspace

END=$(date +%s)

debug "Total execution time was $(($END - $START)) seconds."