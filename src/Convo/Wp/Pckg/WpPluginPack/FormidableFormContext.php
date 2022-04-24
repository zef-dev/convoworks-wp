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
	private $_userId;

	public function __construct( $properties)
	{
		parent::__construct( $properties);

		$this->_id = $properties['id'];
		$this->_formId = $properties['form_id'];
		$this->_userId = $properties['user_id'];
	}

	/**
	 * @return mixed
	 */
	public function init()
	{
		$this->_logger->debug('FormidableFormContext init');

		if (!class_exists('\FrmEntry')) {
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
	    $query  =   [ 'it.form_id' => $this->getService()->evaluateString( $this->_formId), null, 10];
	    $query  =   array_merge( $query, $search);
	    $this->_logger->debug( 'Performing search ['.print_r( $query, true).']');
	    $entries = \FrmEntry::getAll( $query, ' ORDER BY it.created_at DESC', 10, true);
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
	    $meta  =   [];
	    foreach ( $entry as $key=>$val) {
	        $meta[$this->_getFieldId( $key)] = $val;
	    }
	    
	    $user_id   = $this->getService()->evaluateString( $this->_userId);
	    $form_id   = $this->getService()->evaluateString( $this->_formId);
	    
	    $this->_logger->info( 'Inserting form ['.$form_id.'] entry for user ['.$user_id.']');
	    
	    \FrmEntry::create( array(
	        'form_id' => $form_id,
// 	        'item_key' => 'entry', //change entry to a dynamic value if you would like
	        'frm_user_id' => $user_id, //change $user_ID to the id of the user of your choice (optional)
	        'item_meta' => $meta,
	    ));
	}
	
	public function deleteEntry($entryId)
	{
        $this->getEntry( $entryId);
        \FrmEntry::destroy( $entryId);
	}
	
	public function updateEntry( $entryId, $entry)
	{
	    $existing = $this->getEntry( $entryId);
	    $entry      =   array_merge( $existing, $entry);
	    $this->_checkEntry( $entry);
	    
	    foreach ( $entry as $key=>$val) 
	    {
	        $field_id = $this->_getFieldId( $key);
	        $this->_logger->debug( 'Updating field ['.$key.']['.$field_id.'] to ['.$val.']. Will try add first.    ');
	        $added = \FrmEntryMeta::add_entry_meta( $entryId, $field_id, null, $val);
	        if ( ! $added) {
	            $this->_logger->debug( 'Doing actual update.');
	            \FrmEntryMeta::update_entry_meta( $entryId, $field_id, null, $val);
	        }
	    }
	}
	
	private function _getFieldId( $field) 
	{
	    if ( is_numeric( $field)) {
	        return $field;
	    }
	    
	    $field_id = \FrmField::get_id_by_key( $field);
	    return $field_id;
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
