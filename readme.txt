=== Convoworks WP ===
Contributors: zefdev, tole.car
Donate link: https://convoworks.com/
Tags: alexa, alexa-skills, visual-composer, gpt, openai, chatbot, viber, voice, ivr, messenger, appointment, booking, mp3, podcast, trivia, quiz, dialogflow
Requires at least: 5.0
Tested up to: 6.1
Requires PHP: 7.2
Stable tag: 0.22.29
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

The most versatile no-code solution for WordPress!

== Description ==

**Convoworks WP** enables you to publish your content and services through voice enabled devices directly from your WordPress website. It is based on the Convoworks, [open source PHP framework](https://github.com/zef-dev/convoworks-core) for conversational service development. It is primarily used through GUI.

Convoworks works in a cross-platform manner. Right now we are focused mostly on the Amazon Alexa enabled devices. Viber, FB Messenger and Web-chat are supported but in an experimental phase.

It is highly customizable meaning that you can add additional components, functions, templates and even platform adapters through your plugin or theme.

Our conversation editor is truly unique on the market. Besides the powerful workflow components ecosystem, Convoworks editor describes conversation through some kind of sitemap making it easier to adopt for web developers.

**Who can use this plugin and how?**

* **Website owners** - With the Convoworks you can create Alexa skills or chatbots using the GUI only. Practically, any webmaster should be able to use it.
* **Agencies** - Convoworks is a rapid service development tool. Once you get familiar with it you will be able to deliver voice services to your customers at blazing speeds.
* **Plugin developers** - Enhance your plugin with Convoworks custom package. Create specialized components that can utilize your specific data/services and make a couple of predefined service templates that would fit most common needs for your plugin users.

== Frequently Asked Questions ==

= Do I have to have smart speaker to use it =

Not required, but it is desirable. You can test your services to some degree in Alexa GUI simulator and Alexa apps, but not all features are available as on real devices.

= May I create Alexa skills which are not related to my website data =

Yes. Convoworks is not tied to WordPress itself. You can create games for Alexa, fetch information from some external sources or feeds and expose as Alexa skill, whatever you want.

= Can I create smart home Alexa skills?

No. We do not support smart home interfaces and we do not plan that in close future.

= May I extend my plugin/theme with the Convoworks custom package =

Yes. Even if it is a premium one.

= Why would I create custom Convoworks package for my plugin/theme =

You can create custom components and functions that will allow your conversation services to be simpler to manage.
Inside custom packages you can define service templates which will enable your users to have usable service in no time.

== Screenshots ==

1. Connect your developer account
2. Start new service from a template
3. Workflow - read, process and failback phases of the single step
4. Workflow - IF element and working with parameters
5. Workflow - WP_Query configuration
6. Workflow - Custom step for looping the posts
7. Workflow - Reusable fragments
8. Releases and versions

== Changelog ==

= 0.22.30 =

* New functions in wp-core package: get_posts(), wp_insert_post(), update_post_meta(), wp_hash(), wp_salt(), wp_generate_password().
* New functions in wp-hooks package: wp_next_scheduled(), wp_schedule_event().
* Fixed URI building in public REST routes.
* Fixed evaluation of complex key component arguments.

= 0.22.29 =

* Load packages performance improvements
* Added unlink(), set_time_limit(), parse_url(), array_slice() and array_chunk() PHP functions to the Core package
* Added get_site_url() WP function to the WP Core package
* Added ability to return WP_Error when handling WordPress Hooks

= 0.22.28 =

* Added Echo and Exit elements to the WordPress Hooks package
* Added support for dozen new WordPress functions in wp core and hooks package

= 0.22.27 =

* Added WordPress Hooks package & platform
* Convo chat - added ability to restart session
* Few improvements in expression language

= 0.22.26 =

* Added public web chat component

= 0.22.25 =

* Added wp options functions
* Component preview changes
* Enabled test chat session reset

= 0.22.24 =

* Few improvements in Editor layout
* Added file contents and json encoding PHP functions
* Added wp_get_current_user WP function 

= 0.22.23 =

* Improved HTTP Query element
* Extended support for external platforms
* Added Simple WP Mail element
* Few GUI improvements and fixes

= 0.22.22.1 =

* Fixed plugin update url

= 0.22.22 =
* Added Dialogflow ES as NLP platform
* Updated file player template and enhanced search
* Various core improvements

= 0.22.21.1 =
* No changes - updated WordPress tested up to

= 0.22.21 =
* Added Request Log view for easier debugging and troubleshooting services
* Added support for Alexa location services
* Updated audio player templates with ability to fast forward and navigate through the current playlist

= 0.22.20 =
* Added support for child intents and Alexa dialog delegation
* Added support for Alexa PIN confirmation
* Audio player improvements

= 0.22.19 =
* Improved Crosstab synchronization
* Added dropdown with past notifications
* Slot value "?" is now considered as empty
* Fixed session handling in audio player interface

= 0.22.18 =
* Crosstab synchronization - changes done on one tab will be visible across all opened tabs
* Improved skill propagation process
* New property 'wraparound' in the Element queue and updated Trivia templates accordingly

= 0.22.17.1 =
* Include latest appointments package, with improved skill template

= 0.22.17 =
* Added Form package with support for Formidable Forms
* Added ability to redirect user to a consent page before account linking
* Improved frontend error message handling
* Removed Amazon allowed origin URL
* Updated the default skill icons
* Fixed performance issues with WP table catalog

= 0.22.16 =
* Added ability to use alternative login page for account linking
* Improved trivia quiz templates
* Added ElementGenerator element which enables dynamically feeding of the ElementRandomizer and the ElementQueue
* Added ability to seek, fast forward and rewind in audio player
* Small GUI improvements

= 0.22.15 =
* Added schedule appointments context for working with Five Star Restaurant Reservations – WordPress Booking Plugin
* Removed Freemius integration
* Added required intent slots editor
* Amazon Alexa Example Phrases is now multiline editor

= 0.22.14 =
* Support for Easy Appointments plugin
* New ElementQueue element, for better help tips handling
* New TimezoneWrapperElement, for using date functions in desired time zone
* Various small improvements

= 0.22.13 =
* Added support for Alexa reminders
* Updated Basic and Appointment Scheduling app templates
* Various GUI improvements

= 0.22.12 =
* New convo-appointments package for handling appointment scheduling scenarios
* Updated SSAAppointmentContext - "Simply Schedule Appointments" plugin implementation
* Added new block role "error_handler" that will catch any exception during service execution
* Add new flow to session start block - pre-dispatch

= 0.22.11 =
* Added new block role "default_fallback" to handle fallback flow at the global level
* Loop elements are now accepting \Iterator (was array only)
* Other GUI and component improvements

= 0.22.10 =
* Added support for getting Amazon customer profile
* Added support for Amazon Alexa skill permissions
* Service media is now saved in WordPress uploads directory
* GUI improvements and fixes

= 0.22.9 =
* Added `convoworks-simple-appointments` package
* Added new WP capability `manage_convoworks` to Administrator and Editor roles in order to access the Convoworks Plugin with the respective roles
* Added default Alexa skill icons
* Service template fixes
* Fixed navigation resetting in `WpQueryContext`
* Added two new catalog sources, one for WP posts, another for custom WP tables

= 0.22.8 =
* Add support for Alexa In-Skill Purchases
* Fixed issue with Alexa skill icon propagation
* Other bug fixes

= 0.22.7 =
* Fixed eventual conflicts with 3rd party plugin loaded libraries (e.g. Guzzle)
* Settings page improvements
* Display package information on the components
* Other GUI improvements and fixes

= 0.22.6 =
* Added WPDB Element, allowing users to directly manipulate WordPress database tables
* Added Insert WP User Element
* Added User Scope that enables to store parameters across all account's devices
* APL support
* Basic visual elements switched to APL for Alexa devices

= 0.22.5 =
* Added getting started page
* Rework oauth for admin and end WP user account linking
* Update properties of Insert Post Element

= 0.22.4 =
* Added get_user_by() WordPress function to convo-wp-core package
* Added WP Insert Post Element to convo-wp-core package
* Added new WP_Query album mp3 source context for AudioIgniter Music Player and MP3 Music Player by Sonaar to convo-wp-plugin-pack package

= 0.22.3 =
* Link account in Alexa skills with your WordPress users
* Use Quiz And Survey Master for your trivia quiz voice app - new WP Plugin Pack components package

= 0.22.2 =
* Fixes and improvements in the trivia package

= 0.22.1 =
* Switch to bootstrap 4.x
* Download service media from uploads dir

= 0.22 =
* The first WordPress repository release
* Link accounts for your WordPress users
* Added Start Video Playback element
* Improved intent and entity editors
* Other fixes and improvements


== Installation ==

If you are new with Alexa, we strongly suggest checking the [Alexa skills basics](https://convoworks.com/docs/publishers/basics/alexa-skills-basics/) article.

1. Download and activate 'Convoworks WP' from the 'Plugins' menu in your WordPress installation.
2. Configure API access for Amazon Alexa at 'Convoworks WP/Settings'. Find more at [Amazon Alexa Configuration](https://convoworks.com/docs/publishers/platforms-configuration/amazon-alexa/)
3. Create new Convoworks service (you can use one of provided templates)
4. Enable testing for you new skill on [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
5. Enable your skill in your Alexa app (iOS, Android) or the [Alexa web app](https://alexa.amazon.com/spa/) - under 'My skills/dev'


== WordPress actions and filters ==

Now you can handle WordPress hooks with Convoworks no-code editor. Here is how to start. 

1. Start new service and use the "WordPress Hooks Project" template
2. Navigate to the Configuration view and enable the "WordPress Hooks" platform
3. Your post titles now will be ucwords

== Enabling web chat component ==

1. Navigate to the Conviguration view in the desired Convoworks service
2. Enable "Convo Chat" platform
3. Use shortcode to display it on the website: [convo_chat service_id="your-service-id"]

== Registering your custom Convoworks package ==

 If you plan to [develop your custom Convoworks package](https://convoworks.com/docs/developers/develop-custom-packages/) you can register it from your theme or plugin like this
`
/**
 * @param Convo\Core\Factory\PackageProviderFactory $packageProviderFactory
 * @param Psr\Container\ContainerInterface $container
 */
function my_package_registrator( $packageProviderFactory, $container) {
    $packageProviderFactory->registerPackage( new Convo\Core\Factory\FunctionPackageDescriptor('\My\Namespace\MyPackageDefinition',
        function() use ( $container) {
            return new \My\Namespace\MyPackageDefinition( $container->get( 'logger'));
        }));
}
add_action( 'register_convoworks_package', 'my_package_registrator', 10, 2);
`


== Learn more - Basics ==

* Quick start YouTube tutorial - [Convoworks Basics](https://youtube.com/playlist?list=PL9eUOVS2fICHc7FF48opQyOWUDVvNoNFD)
* [Try Convoworks WP plugin with Amazon Alexa using InstaWP – no server, no registration required](https://convoworks.com/try-convoworks-wp-plugin-with-amazon-alexa-using-instawp-no-server-no-registration-required/)
* [Using the Convoworks log files](https://convoworks.com/using-the-convoworks-log-files/)
* [Know your users with Alexa Account Linking](https://convoworks.com/know-your-users-with-alexa-account-linking-with-php-and-wordpress/)
* How do [conversational services work](https://convoworks.com/docs/publishers/basics/basic-conversation-concepts/)
* [Alexa skills basics](https://convoworks.com/docs/publishers/basics/alexa-skills-basics/)
* Learn [Convoworks service workflow basics](https://convoworks.com/docs/publishers/tutorial-getting-started/)
* How to [configure Amazon Alexa](https://convoworks.com/docs/publishers/platforms-configuration/amazon-alexa/)
* How to use [variables and expression language](https://convoworks.com/docs/publishers/component-reference/expression-language/) in your services
* [Convoworks Documentation](https://convoworks.com/docs/)
* [Convoworks Blog](https://convoworks.com/blog/)


== Learn more - Integrations ==

* How to read your [WP Post data](https://convoworks.com/look-ma-no-hands-wordpress-loop-is-running-on-alexa/)
* Stream music from [WP Media library](https://convoworks.com/create-alexa-audioplayer-skills-with-php/)
* Appointment scheduling on your WordPress website - [Now with Amazon Alexa skill](https://convoworks.com/appointment-scheduling-on-your-wordpress-website-now-with-amazon-alexa-skill/)
* [Seriously Simple Podcasting](https://convoworks.com/seriously-simple-podcasting-for-wordpress-now-with-your-own-amazon-alexa-skill/) with Amazon Alexa skill
* Alexa music player skill [with Audioigniter or MP3 Music Player by Sonaar](https://convoworks.com/create-alexa-music-player-skill-with-audioigniter-or-mp3-music-player-by-sonaar-plugins-for-wordpress/)
* [Quiz And Survey Master or Open Trivia DB](https://convoworks.com/using-quiz-and-survey-master-for-wordpress-or-open-trivia-db-quizzes-for-your-alexa-skill/)
* Create an utility Alexa skill for yourself -[Alexa, Ask My Website How Many Bad Reviews I Have Today?](https://hackernoon.com/alexa-ask-my-website-how-many-bad-reviews-i-have-today) 
* [Create your own Alexa skill with WordPress and Formidable Forms](https://convoworks.com/create-your-own-alexa-skill-with-wordpress-and-formidable-forms/)
* [Introducing the GPT Package for Convoworks WP](https://convoworks.com/introducing-the-gpt-package-for-convoworks-wp/)
* [Harnessing the Power of WordPress Hooks with Convoworks](https://convoworks.com/harnessing-the-power-of-wordpress-hooks-with-convoworks/)
* [Experimenting With GPT, WordPress, and Convoworks to Filter Spam](https://hackernoon.com/experimenting-with-gpt-wordpress-and-convoworks-to-filter-spam)


== Known Issues ==

* Convoworks administration GUI does not work in Safari browsers

== Roadmap ==

* Multilanguage support
* Voice search for frontend web
* Package files - ability to deploy files inside component packages to be used in services (mp3 audio prompts, images ...)

