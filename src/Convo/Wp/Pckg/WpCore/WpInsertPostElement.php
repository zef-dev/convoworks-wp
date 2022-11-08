<?php


namespace Convo\Wp\Pckg\WpCore;


use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;

class WpInsertPostElement extends \Convo\Core\Workflow\AbstractWorkflowContainerComponent implements \Convo\Core\Workflow\IConversationElement
{
	/**
	 * @var \Convo\Core\Workflow\IConversationElement[]
	 */
	private $_onSuccess = array();

	/**
	 * @var \Convo\Core\Workflow\IConversationElement[]
	 */
	private $_onFailure = array();

	/**
	 * @var string
	 */
	private $_postInsertionResultName;

	/**
	 * @var bool
	 */
	private $_fireAfterHooks = true;

	private $_postArrayArgs;
	private $_postTaxArgs;
	private $_postMetaArgs;

	public function __construct( $properties)
	{
		parent::__construct( $properties);

		foreach ( $properties['on_success'] as $element) {
			$this->_onSuccess[]        =   $element;
			$this->addChild( $element);
		}

		foreach ( $properties['on_failure'] as $element) {
			$this->_onFailure[]        =   $element;
			$this->addChild( $element);
		}

		$this->_postInsertionResultName =   $properties['created_post_var'];

		$this->_postArrayArgs 	=   $properties['post_args'];
		$this->_postTaxArgs 	=   $properties['post_tax_input'];
		$this->_postMetaArgs 	=   $properties['post_meta_input'];

		$this->_fireAfterHooks 	=   $properties['fire_after_hooks'] ?? true;
	}

	/**
	 * @param IConvoRequest $request
	 * @param IConvoResponse $response
	 */
	public function read(IConvoRequest $request, IConvoResponse $response)
	{
		$params = $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
		$name = $this->evaluateString($this->_postInsertionResultName);

		$post_array_args = $this->getService()->evaluateArgs( $this->_postArrayArgs, $this);
		$post_tax_args = $this->getService()->evaluateArgs( $this->_postTaxArgs, $this);
		$post_meta_args = $this->getService()->evaluateArgs( $this->_postMetaArgs, $this);

		$fire_after_hooks = $this->_fireAfterHooks;

		$post_arr = $post_array_args;
		if (!empty($post_tax_args)) {
			$post_arr['tax_input'] = $post_tax_args;
		}
		if (!empty($post_meta_args)) {
			$post_arr['meta_input'] = $post_meta_args;
		}

		$this->_logger->debug("Args ready to pass to wp_insert_post(" . print_r($post_arr, true) . ")");

		if ( isset( $post_arr['ID']) && $post_arr['ID']) {
		    $inserted_post = wp_update_post( $post_arr, true, $fire_after_hooks);
		} else {
		    $inserted_post = wp_insert_post( $post_arr, true, $fire_after_hooks);
		}
		
		if (!is_wp_error($inserted_post)) {
			$params->setServiceParam($name, ['post' => get_post($inserted_post)]);
			$this->_logger->info( 'Inserted new post with id ['.$inserted_post.']');
			foreach ($this->_onSuccess as $element) {
				$element->read( $request, $response);
			}
		} else {
			$params->setServiceParam($name, ['wp_error' => $inserted_post]);
			$this->_logger->info( 'Could not insert new post due to errors ['.print_r($inserted_post->errors, true).']');
			foreach ( $this->_onFailure as $element) {
				$element->read( $request, $response);
			}
		}
	}

}