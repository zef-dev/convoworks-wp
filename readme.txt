=== Convoworks WP ===
Contributors: tole.car
Donate link: https://convoworks.com/
Tags: alexa, voice, assistant, dialogflow, chatbot
Requires at least: 5.0
Tested up to: 5.7
Requires PHP: 7.2
Stable tag: 0.22
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Publish your WordPress content through voice enabled devices (Amazon Alexa, Google Assistant)
 
== Description ==

**Convoworks WP** enables you to publish your post based content to voice enabled devices directly from your WordPress website. It is based on the Convoworks, [open source PHP framework](https://github.com/zef-dev/convoworks-core) for conversational service development. It is primarily used through GUI.

Convoworks works in a cross-platform manner. Right now we are focused mostly on the Amazon Alexa enabled devices. Google Assistant, Viber, FB Messenger and Web-chat are supported but in an experimental phase.

It is highly customizable meaning that you can add additional components, functionalities and even service templates through your plugin or theme.

**Who can use this plugin and how?**

* **Website owners** - With the Convoworks you can create Alexa skills using the GUI only. Practically, any webmaster should be able to use it. For more advanced and complex services you might seek help from your usual WordPress developers.
* **Agencies** - Convoworks is a rapid service development tool. Once you get familiar with it you will be able to deliver voice services to your customers at blazing speeds.
* **Plugin developers** - Enhance your plugin with Convoworks custom package. Create specialized components that can utilize your specific data/services and make a couple of predefined service templates that would fit most common needs for your plugin users.

== Frequently Asked Questions ==
 
= Do I have to have smart speaker to use it =

Not required, but it is desirable. You can test your services to some degree in Alexa GUI simulator and Alexa apps, but not all features are available as on real devices.
 
= May I create Alexa skills which are not related to my website data =

Yes. Convoworks is not tied to WordPress itself. You can create games for Alexa, fetch information from some external sources or feeds and expose as Alexa skill, whatever you want.

= Can I create smart home Alexa skills?

No. We do not support smart home interfaces and we do not plan that in close future. 

= I configured Amazon Alexa but I can't test service on my Echo device =

Right now you have to manually turn on development mode for Alexa skill. You can do it on the Test tab of your skill at [Amazon Alexa ASK GUI](https://developer.amazon.com/alexa/console/ask).
After that you have to enable dev skill in your Alexa app (iOS, Android, Web).

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

= 0.22 =
* The first WordPress repository release
* Link accounts for your WordPress users
* Added Start Video Playback element
* Improved intent and entity editors
* Other fixes and improvements

= 0.21 =
* Added WP Media Context for accessing media library audio files (mp3s)
* Fixed simple list and card elements in `convo-visuals` package
* Alexa configuration extended with "Distribution Information" and "Skill Account Linking"
* Copy/paste components works across multiple tabs now
* Various small fixes


== Installation ==

If you are new with Alexa, we strongly suggest checking the [Alexa skills basics](https://convoworks.com/docs/publishers/basics/alexa-skills-basics/) article.
 
1. Download and activate 'Convoworks WP' from the 'Plugins' menu in your WordPress installation.
2. Configure API access for Amazon Alexa at 'Convoworks WP/Settings'. Find more at [Amazon Alexa Configuration](https://convoworks.com/docs/publishers/platforms-configuration/amazon-alexa/)
3. Create new Convoworks service (you can use one of provided templates)
4. Enable testing for you new skill on [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
5. Enable your skill in your Alexa app (iOS, Android) or the [Alexa web app](https://alexa.amazon.com/spa/) - under 'My skills/dev'
 
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


== Learn more ==

* How do [conversational services work](https://convoworks.com/docs/publishers/basics/basic-conversation-concepts/)
* [Alexa skills basics](https://convoworks.com/docs/publishers/basics/alexa-skills-basics/)
* Learn [Convoworks service workflow basics](https://convoworks.com/docs/publishers/tutorial-getting-started/)
* How to [configure Amazon Alexa](https://convoworks.com/docs/publishers/platforms-configuration/amazon-alexa/)
* How to read your [WP Post data](https://convoworks.com/look-ma-no-hands-wordpress-loop-is-running-on-alexa/)
* Stream music from [WP Media library](https://convoworks.com/create-alexa-audioplayer-skills-with-php/)
* How to use [variables and expression language](https://convoworks.com/docs/publishers/component-reference/expression-language/) in your services
* [Using the Convoworks log files](https://convoworks.com/using-the-convoworks-log-files/)
* Or just check for more at [Convoworks Documentation](https://convoworks.com/docs/)


== Roadmap ==

* Support for APL on Alexa devices
* Package files - ability to deploy files inside component packages to be used in services (mp3 audio prompts, images ...)
