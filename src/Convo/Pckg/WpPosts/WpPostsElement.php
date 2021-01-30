<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Pckg\WpPosts;


/**
 * @author Tole
 */
class WpPostsElement extends \Convo\Core\Workflow\AbstractWorkflowComponent implements \Convo\Core\Workflow\IConversationElement
{
    

    
    public function __construct( $properties)
    {
    	parent::__construct( $properties);
    }
    
    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IConversationElement::read()
     */
    public function read( \Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
    {
        $response->addText( 'Youlou from example!');
        return;
    }

    public function __toString() {
        return parent::__toString().'[]';
    }
}