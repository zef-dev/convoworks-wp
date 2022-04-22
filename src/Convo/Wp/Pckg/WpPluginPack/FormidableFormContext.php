<?php

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Pckg\Forms\IFormsContext;

class FormidableFormContext extends AbstractBasicComponent implements IServiceContext, IFormsContext
{
	private $_id;
	private $_formId;

	public function __construct( $properties)
	{
		parent::__construct( $properties);

		$this->_id = $properties['id'];
		$this->_formId = $properties['form_id'];
	}

	/**
	 * @return mixed
	 */
	public function init()
	{
		$this->_logger->debug('FormidableFormContext init');

		if (!class_exists('FrmEntry')) {
			throw new \Exception('Formidable forms WordPress Plugin is not installed!');
		}
	}

	/**
	 * @return mixed
	 */
	public function getComponent()
	{
		return $this;
	}

	public function getId()
	{
		return $this->_id;
	}
	
    // FORMS
	public function searchEntries( $search)
	{
// 	    $entries = FrmEntry::getAll(array('it.form_id' => 5), ' ORDER BY it.created_at DESC', 8);
	    $entries = \FrmEntry::getAll( $search);
	    $this->_logger->debug( 'Got entries ['.print_r( $entries, true).']');
	    return $entries;
	}
	
	public function validateEntry( $entry)
	{
	    $errors = \FrmEntryValidate::validate( $entry );
	    $this->_logger->debug( 'Got errors ['.print_r( $errors, true).']');
	    // TODO: check errors format
	    return $errors;
	}
	
	public function createEntry( $entry)
	{
	    global $user_ID;
	    \FrmEntry::create( array(
	        'form_id' => $this->getService()->evaluateString( $this->_formId),
	        'item_key' => 'entry', //change entry to a dynamic value if you would like
	        'frm_user_id' => $user_ID, //change $user_ID to the id of the user of your choice (optional)
	        'item_meta' => array(
	            25 => 'value', //change 25 to your field ID and 'value' to your value
	            26 => 'value',
	            27 => 'value',
	            //add any field ids here with the value to insert into it
	        ),
	    ));
	}
	
	public function deleteEntry($entryId)
	{
        $this->getEntry( $entryId);
        \FrmEntry::destroy( $entryId);
	}
	
	public function updateEntry($entryId, $entry)
	{
	    $existing = $this->getEntry( $entryId);
	    $entry      =   array_merge( $existing, $entry);
	    // TODO: update fields
	    $this->_checkEntry( $entry);
	}
	
	public function getEntry( $entryId)
	{
	    $entry = \FrmEntry::getOne( $entryId);
	    if ( empty( $entry)) {
	        throw new DataItemNotFoundException( 'Entry ['.$entryId.'] not found');
	    }
	    return $entry;
	}
	
	// UTIL
	public function __toString()
	{
	    return parent::__toString().'['.$this->_id.']['.$this->_formId.']';
	}


}
