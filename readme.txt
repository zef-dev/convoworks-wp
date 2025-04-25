=== Convoworks WP ===
Contributors: zefdev, tole.car
Donate link: https://convoworks.com/
Tags: gpt, automation, chatbot, wordpress hooks, custom api
Requires at least: 5.0
Tested up to: 6.8
Requires PHP: 7.2
Stable tag: 0.22.44
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

The most versatile no-code solution for WordPress!

== Description ==

**Convoworks WP** is more than just a conversation tool. It's a sophisticated no-code, universal workflow builder seamlessly integrated into your WordPress. Rooted in Convoworks, an [open source PHP framework](https://github.com/zef-dev/convoworks-core), you can craft intricate workflows without typing a single line of code.

Convoworks employs visual programming, allowing users to design workflows through a drag-and-drop interface, much like a visual flowchart. These workflows can then be executed by various triggers, including REST-based interactions and WordPress hooks.

For users familiar with visual builders like Elementor or Divi, Convoworks is a game-changer. While these visual builders handle design and layout, Convoworks allows you to take dynamic functionality a step further. Now, without writing a line of code, you can:

* Tweak website behaviors using WordPress hooks.
* Set up custom API endpoints to communicate with external services.
* Fetch and display data from external APIs seamlessly.
* Automate processes based on specific website events or user interactions.

Convoworks bridges the gap between design and dynamic functionality, granting even non-coders the power to fully customize and automate their WordPress sites.

**Who can use this plugin and how?**

* **Website Owners**: If you're comfortable with tools like Elementor, you'll feel right at home with Convoworks. Use it to implement modifications on your website that would typically need coding knowledge.

* **Agencies**: Convoworks offers a twofold advantage. First, with the support for service templates, agencies can rapidly deploy pre-defined solutions, cutting down the development time significantly. These ready-made solutions don't require the involvement of programmers, making deployment swift and hassle-free. Secondly, the platform is built with customization in mind. If you have unique challenges or specific problems to solve, you can easily design and integrate specialized workflow components into Convoworks. This flexibility ensures that you can simplify and optimize workflows tailored to your or your clients' needs.

* **Plugin Developers**: Elevate your plugin with the Convoworks custom package. Craft specialized components that hone in on your specific data or services, and establish a set of pre-defined service templates. These templates can cater to the most common requirements of your plugin users, allowing them to benefit from a robust, pre-configured solution.

== Frequently Asked Questions ==

= What is visual programming in Convoworks? =

Visual programming in Convoworks lets users design workflows by simply dragging and dropping components. With visual programming, even those without coding expertise can design complex workflows.

= How does the GPT package in Convoworks function? =

[Convoworks' GPT package](https://github.com/zef-dev/convoworks-gpt) offers an integration with the OpenAI GPT API. Not only does it provide basic API access, but it also incorporates advanced components allowing dynamic context insertion and control over conversation length. This ensures seamless and sophisticated AI-driven capabilities in workflows.


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


= 0.22.44 =

* Removed Dialogflow and Facebook Messenger platforms from the configuration view.
* Fixed an issue with nested function scopes.

= 0.22.43 =

* Minor fixes
* Start of deprecation for legacy platforms (Alexa).

= 0.22.42 =

* Reworked and improved `call_user_func()` handling to support both global functions and object instances.
* Registered the WordPress function `sanitize_text_field()`.
* Registered the WordPress (Hooks package) functions: `wp_schedule_single_event()`, `wp_clear_scheduled_hook()`, and `wp_get_scheduled_event()`.
* Registered the PHP functions `gettype()` and `get_class()`.

= 0.22.41 =

* Added function scope, for managing variables inside functions
* Add response streaming to the test view chat
* Registered PHP `sleep()` and `usleep()` functions.

= 0.22.40 =

* Added the Function Element, which enables you to define custom functions using Convoworks elements and expose them as functions in the expression language.
* Registered WordPress `apply_filters()`, `do_action()`, `get_bloginfo()`, `get_post_title()`, `get_post_field()`, `is_user_logged_in()`, and `wp_upload_dir()` functions.
* Registered PHP `array_map()` and `str_word_count()` functions.
* Made smaller improvements to the preview of some elements.

= 0.22.39 =

* Registered the WordPress `sanitize_title()`
* Registered the PHP `constant()` function.
* Improved `wp_call_user_func()` function with better support for accessing global objects like $wpdb.

= 0.22.38.2 =

* Add support for timezones in webchat

= 0.22.38.1 =

* Removed nonce check from public API calls

= 0.22.38 =

* Registered the PHP `array_reverse()` function in the core package.
* Improvements in the Log Element.
* Added Markdown support to chat responses.
* Added support for `wpdb::` and `wp::` calls when using `wp_call_user_func()`.
* Fixed handling of expired nonces.

= 0.22.37 =

* Registered wp_call_user_func_array() and call_user_func_array() functions.
* Fixed wp_call_user_func() and call_user_func() behavior when called with no arguments.

= 0.22.36 =

* Forced no body for GET requests in the Http Query Element
* Fixed detection of indexed arrays in the call_user_func()
* Registered PHP functions in the core package: is_string(), is_float(), is_long(), is_countable(), is_null()
* Registered wp_call_user_func() function in the convo-wp-core, which works as call_user_func() with a difference that it is able to load additional WordPress specific includes.

= 0.22.35 =

* Registered the WordPress function wp_unschedule_event().
* Several GUI enhancements.

= 0.22.34 =

* Registered WordPress functions in the convo-wp-core: wp_set_object_terms(), get_term_by(), wp_insert_term(), is_wp_error().
* Registered PHP functions in the core package: rawurlencode(), base64_encode(), hash_hmac(), uniqid(), http_build_query().
* Registered call_user_func() as a custom function. The difference is that arguments are passed as a single array (not spread).
* Added parse_csv_file() custom function, which internally uses fgetcsv().

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


== Learn more - Integrations ==

* [A No-Code Experiment: Bringing Deep Research to WordPress](https://convoworks.com/a-no-code-experiment-bringing-deep-research-to-wordpress/)
* [A Dead Simple RAG Setup for WordPress: AI Chatbots for Small Websites](https://convoworks.com/a-dead-simple-rag-setup-for-wordpress-ai-chatbots-for-small-websites/)
* [The GPT Site Assistant: A New Era of AI Integration with WordPress](https://convoworks.com/the-gpt-site-assistant-a-new-era-of-ai-integration-with-wordpress/)
* [Semantic Search in WordPress: Creating Embeddings with Convoworks, Pinecone, and OpenAI GPT](https://convoworks.com/leveraging-semantic-search-in-wordpress-creating-embeddings-with-convoworks-pinecone-and-openai-gpt/)
* [Step-by-Step: Building a GPT-Enhanced Twitter Bot with WordPress and Convoworks](https://convoworks.com/step-by-step-building-a-gpt-enhanced-twitter-bot-with-wordpress-and-convoworks/)
* [Harnessing the Power of GPT Functions in Convoworks](https://convoworks.com/harnessing-the-power-of-gpt-functions-in-convoworks/)
* [Harnessing the Power of WordPress Hooks with Convoworks](https://convoworks.com/harnessing-the-power-of-wordpress-hooks-with-convoworks/)
* [Beyond Coding: API Synchronization with WordPress](https://convoworks.com/beyond-coding-api-synchronization-with-wordpress/)



== Learn more - Basics ==

* Quick start YouTube tutorial - [Convoworks Basics](https://youtube.com/playlist?list=PL9eUOVS2fICHc7FF48opQyOWUDVvNoNFD)
* Learn [Convoworks service workflow basics](https://convoworks.com/docs/publishers/tutorial-getting-started/)
* How to use [variables and expression language](https://convoworks.com/docs/publishers/component-reference/expression-language/) in your services
* [Using the Convoworks log files](https://convoworks.com/using-the-convoworks-log-files/)
* [Convoworks Documentation](https://convoworks.com/docs/)
* [Convoworks Blog](https://convoworks.com/blog/)


== Known Issues ==

* Convoworks administration GUI does not work in Safari browsers


