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

Convoworks WP enables you to publish your post based content to the voice enabled devices directly from your website. 
It is based on the Convoworks, [open source PHP framework](https://github.com/zef-dev/convoworks-core) for creating conversational service through GUI.

It works in a cross-platform manner and we are currently supporting Amazon Alexa. Google Assistant, Viber and FB Messenger are supported but in an experimental phase.

Convoworks is highly customizable and you can add additional components and functionalities through your plugin or theme.

Learn more about

* How do [conversational services work](https://convoworks.com/docs/publishers/basics/basic-conversation-concepts/)
* Learn [Convoworks service workflow basics](https://convoworks.com/docs/publishers/tutorial-getting-started/)
* How to [configure Amazon Alexa](https://convoworks.com/docs/publishers/platforms-configuration/amazon-alexa/)
* How to read your [WP Post data](https://convoworks.com/look-ma-no-hands-wordpress-loop-is-running-on-alexa/)
* Stream music from [WP Media library](https://convoworks.com/create-alexa-audioplayer-skills-with-php/)
* How to use [variables and expression language](https://convoworks.com/docs/publishers/component-reference/expression-language/) in your services
* Or just check for more at [Convoworks Docuemntation](https://convoworks.com/docs/)

 
== Frequently Asked Questions ==
 
= I configured Amazon Alexa but I can't test service on my Echo device =

Right now you have to manually turn on development mode for Alexa skill. You can do it on the Test tab of your skill at [Amazon Alexa ASK GUI](https://developer.amazon.com/alexa/console/ask).
 
== Screenshots ==
 
[https://convoworks.com/wp-content/uploads/2021/01/devices.png  Description for the first screenshot]

 
== Changelog ==

= 0.30 =
* WordPress repository release
* Link accounts for your WordPress users
* Improved intent and entity editors
 
= 0.21 =
* Added WP Media Context for accessing media library audio files (mp3s)
* Fixed simple list and card elements in `convo-visuals` package
* Alexa configuration extended with "Distribution Information" and "Skill Account Linking"
* Copy/paste components works across multiple tabs now
* Various small fixes

= 0.20 =
* Preview improvements
* Debug service parameters on test view now includes component parameters and has better json support
* Other GUI improvements
* `convo-wp-core` package added – WP specific components for reading posts in the loop manner

== Installation ==
 
Download and activate 'Convoworks WP' from your 'Plugins' menu in WordPress.
 
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
== Roadmap ==

* Support for APL on Alexa devices
* Package files - ability to deploy files inside component packages to be used in services (mp3 audio prompts, images ...)
* Multilanguage support for services
