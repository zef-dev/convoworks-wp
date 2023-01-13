<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Workflow\AbstractWorkflowComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;

class SimpleWpMailElement extends AbstractWorkflowComponent implements IConversationElement
{
    private $_from;
    private $_to;
    private $_subject;
    private $_message;

    
    public function __construct( $properties)
    {
        parent::__construct( $properties);
        $this->_from    =   $properties['from'];
        $this->_to      =   $properties['to'];
        $this->_subject =   $properties['subject'];
        $this->_message =   $properties['message'];
    }
    
    public function read( IConvoRequest $request, IConvoResponse $response)
    {
        $from       =   $this->evaluateString( $this->_from);
        $to         =   $this->evaluateString( $this->_to);
        $subject    =   $this->evaluateString( $this->_subject);
        $message    =   $this->evaluateString( $this->_message);
        
        $headers    =   [];
        
        if ( empty( $from)) {
            $from = get_option('admin_email');
        }
        
        $headers[] = 'From:'.$from;
        
        $this->_logger->info( 'Sending email to ['.$to.']['.$subject.']');
        
        $res = wp_mail( $to, $subject, $message, $headers);
        
        if ( !$res) {
            throw new \Exception( 'Could not send email ['.$subject.'] to ['.$to.']');
        }
    }
    
    
    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.$this->_from.']['.$this->_to.']['.$this->_subject.']['.$this->_message.']';
    }


}
