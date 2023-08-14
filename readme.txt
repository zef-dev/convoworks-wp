=== Convoworks WP ===
Contributors: zefdev, tole.car
Donate link: https://convoworks.com/
Tags: alexa, alexa-skills, visual-composer, gpt, openai, chatbot, viber, voice, ivr, messenger, appointment, booking, mp3, podcast, trivia, quiz, dialogflow
Requires at least: 5.0
Tested up to: 6.2
Requires PHP: 7.2
Stable tag: 0.22.32
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

The most versatile no-code solution for WordPress!

== Description ==

**Convoworks WP** is more than just a conversation tool. It's a sophisticated no-code, universal workflow builder seamlessly integrated into your WordPress. Rooted in Convoworks, an [open source PHP framework](https://github.com/zef-dev/convoworks-core), you can craft intricate workflows without typing a single line of code. 

Convoworks employs visual programming, allowing users to design workflows through a drag-and-drop interface, much like a visual flowchart. These workflows can then be executed by various triggers, including REST-based interactions and WordPress hooks.

Initially focused on Amazon Alexa, Convoworks now boasts a broader horizon, supporting platforms such as Viber, FB Messenger, and web chat. With platform adapters, Convoworks ensures seamless communication across platforms.

For users familiar with visual builders like Elementor or Divi, Convoworks is a game-changer. While these visual builders handle design and layout, Convoworks allows you to take dynamic functionality a step further. Now, without writing a line of code, you can:

* Tweak website behaviors using WordPress hooks.
* Set up custom API endpoints to communicate with external services.
* Fetch and display data from external APIs seamlessly.
* Automate processes based on specific website events or user interactions.

Convoworks bridges the gap between design and dynamic functionality, granting even non-coders the power to fully customize and automate their WordPress sites.

**Who can use this plugin and how?**

* **Website Owners**: If you're comfortable with tools like Elementor, you'll feel right at home with Convoworks. Use it to implement modifications on your website that would typically need coding knowledge. Dive into platforms like Amazon Alexa for voice interfaces or tap into the capabilities of GPT for chat functionalities and semantic searches. Now, you don't just design your site; you make it smarter and more interactive.

* **Agencies**: Convoworks offers a twofold advantage. First, with the support for service templates, agencies can rapidly deploy pre-defined solutions, cutting down the development time significantly. These ready-made solutions don't require the involvement of programmers, making deployment swift and hassle-free. Secondly, the platform is built with customization in mind. If you have unique challenges or specific problems to solve, you can easily design and integrate specialized workflow components into Convoworks. This flexibility ensures that you can simplify and optimize workflows tailored to your or your clients' needs.

* **Plugin Developers**: Elevate your plugin with the Convoworks custom package. Craft specialized components that hone in on your specific data or services, and establish a set of pre-defined service templates. These templates can cater to the most common requirements of your plugin users, allowing them to benefit from a robust, pre-configured solution.

== Frequently Asked Questions ==

= Do I need an Alexa-enabled device for development? =

While it's not essential to have an Alexa-enabled device, it's advisable if you're developing for Alexa. You can simulate some of the functionalities using the Alexa GUI simulator and Alexa apps, but to fully experience and test all features, a real device is recommended.

= Can I create Alexa skills unrelated to my website data? =

Absolutely. While Convoworks is a tool designed for WordPress, it isn’t limited to it. Whether you want to develop games for Alexa or fetch information from external sources to present as an Alexa skill, Convoworks gives you the flexibility to do so.

= Is it possible to create smart home Alexa skills? =

Currently, no. We don’t offer support for smart home interfaces and have no plans to do so in the near future.

= What is visual programming in Convoworks? =

Visual programming in Convoworks lets users design workflows by simply dragging and dropping components. With visual programming, even those without coding expertise can design complex workflows.

= How does the GPT package in Convoworks function? =

Convoworks' GPT package offers an integration with the OpenAI GPT API. Not only does it provide basic API access, but it also incorporates advanced components allowing dynamic context insertion and control over conversation length. This ensures seamless and sophisticated AI-driven capabilities in workflows.

= Can Convoworks integrate with platforms other than Amazon Alexa? =

Yes, Convoworks supports various platforms like Viber, FB Messenger, web chat, and more. Its platform adapters ensure smooth communication across different channels.

= I'm familiar with WordPress visual builders like Elementor. How does Convoworks fit into this ecosystem? =

Convoworks complements visual builders by providing a similar interface for creating workflows. It bridges the gap between visual web design and dynamic functionality, all without coding.

= How does the WordPress Hooks integration work in Convoworks? =

Convoworks allows you to handle and respond to WordPress hooks (both actions and filters), enabling modifications to websites without needing to code. Through its intuitive interface, you can set up workflows to react to specific WordPress events, creating dynamic and interactive experiences on your site.


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

= 0.22.33 =

* New functions in the convo-core package: preg_replace(), array_diff(), htmlentities(), htmlspecialchars(), html_entity_decode(), html_to_markdown()
* New functions in the convo-wp-core package: is_product_category(), get_queried_object(), get_term_children(), wp_count_posts(), get_plugins(), get_site_transient(), delete_site_transient(), set_transient(), get_page_by_path()

= 0.22.32 =

* New functions in the convo-core package: round() and number_format()
* Special role processor now has a failback flow
* Route filter now supports "*" (any) as a method too

= 0.22.31 =

* Added API Builder package which enables you to define and handle REST routes (or webhooks)
* New functions in the convo-core package: array_keys() and is_object()
* New functions in the wp-core package: get_post_type(), get_post_types(), home_url(), wp_insert_attachment(), wp_update_attachment_metadata(), wp_delete_attachment(), has_post_thumbnail(), wp_read_image_metadata()
* New functions in the wp-hooks package: add_rewrite_rule()

= 0.22.30 =

* New functions in the wp-core package: get_posts(), wp_insert_post(), update_post_meta(), wp_hash(), wp_salt(), wp_generate_password().
* New functions in the wp-hooks package: wp_next_scheduled(), wp_schedule_event().
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


== Getting Started with Alexa ==

If you are new to Alexa, we strongly recommend checking out the [Alexa skills basics](https://convoworks.com/docs/publishers/basics/alexa-skills-basics/) article.

1. Download and activate 'Convoworks WP' from the 'Plugins' menu in your WordPress installation.
2. Configure API access for Amazon Alexa at 'Convoworks WP/Settings'. Find more at [Amazon Alexa Configuration](https://convoworks.com/docs/publishers/platforms-configuration/amazon-alexa/)
3. Create a new Convoworks service (you can use one of the provided templates).
4. Enable testing for your new skill on [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask).
5. Enable your skill in your Alexa app (iOS, Android) or the [Alexa web app](https://alexa.amazon.com/spa/) - under 'My skills/dev'.


== WordPress actions and filters ==

Leverage WordPress hooks with Convoworks no-code editor. Here’s a quick guide:

1. Start a new service using the "WordPress Hooks Project" template.
2. Navigate to the Configuration view and enable the "WordPress Hooks" platform.
3. Tailor your workflows based on specific WordPress actions or filters.

== Enabling web chat component ==

1. Navigate to the Configuration view in the desired Convoworks service
2. Enable "Convo Chat" platform
3. Use shortcode to display it on the website: [convo_chat service_id="your-service-id" title="My Chat"]

== API Builder ==

1. Navigate to the Configuration view in the desired Convoworks service
2. Enable the "API Builder" platform
3. Use the drag-and-drop builder to craft API end-points
4. You can now handle API calls or trigger workflows based on incoming webhooks.


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
* [Beyond Coding: API Synchronization with WordPress](https://convoworks.com/beyond-coding-api-synchronization-with-wordpress/)


== Known Issues ==

* Convoworks administration GUI does not work in Safari browsers


