<?php

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Pckg\Forms\IFormsContext;
use Convo\Pckg\Forms\FormValidationException;
use Convo\Pckg\Forms\FormValidationResult;

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
	    $query  =   [ 'it.form_id' => $this->getService()->evaluateString( $this->_formId)];
	    //$query  =   array_merge( $query, $search);
	    //	    $query = \array_merge($query, ['field_id'=>'32', 'meta_value'=>'4']);
	    $this->_logger->debug( 'Performing search ['.print_r( $query, true).']');
	    
	    //	    $entries = \FrmEntryMeta::getAll( $query);
	    
	    $entries = \FrmEntry::getAll( $query, ' ORDER BY it.created_at DESC', 10, true);
	    $this->_logger->debug( 'Got entries ['.print_r( $entries, true).']');
	    
	    $data = [];
	    foreach ($entries as $entry) {
	        $row = ['id' => $entry->id, 'item_key' => $entry->item_key];
	        foreach ($entry->metas as $key => $val) {
	            $row[\FrmField::get_key_by_id($key)] = $val;
	        }
	        $data[] = $row;
	    }
	    return $data;
	}
	
	public function validateEntry( $entry)
	{
	    $entry     =   $this->_prepareEntry( $entry);
	    $this->_logger->debug( 'Got prepared entry ['.print_r( $entry, true).']');
	    $result    =   new FormValidationResult();
	    $errors    =   \FrmEntryValidate::validate( $entry);
	    
	    $this->_logger->debug( 'Got errors ['.print_r( $errors, true).']');
	    
	    foreach ( $errors as $key=>$val) {
	        if ( $key === 'form') {
	            throw new \Exception( $val);
	        }
	        if ( $key === 'spam') {
	            $this->_logger->warning( 'Ignoring antispam message ['.$val.']');	
	            continue;
	        }
	        $result->addError( $key, $val);
	    }
	    return $result;
	}
	
	public function createEntry( $entry)
	{
	    $this->_checkEntry( $entry);
	    
	    $entry =   $this->_prepareEntry( $entry);
	    
	    $this->_logger->info( 'Inserting form ['.print_r( $entry, true).']');
	    
	    $entry_id = \FrmEntry::create( $entry);
	    
	    return $entry_id;
	}
	
	public function deleteEntry($entryId)
	{
        $this->getEntry( $entryId);
        \FrmEntry::destroy( $entryId);
	}
	
	public function updateEntry( $entryId, $entry)
	{
	    $existing = $this->getEntry( $entryId);
	    $this->_logger->debug( 'Got original entry ['.print_r( $existing, true).']');
	    $entry      =   array_merge( $existing, $entry);
	    $this->_logger->debug( 'Got merged entry ['.print_r( $existing, true).']');
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
	
	public function getEntry( $entryId)
	{
	    $entry = \FrmEntry::getOne( $entryId, true);
	    $this->_logger->debug( 'Got original entry ['.print_r( $entry, true).'].');
	    
	    if ( empty( $entry)) {
	        throw new DataItemNotFoundException( 'Entry ['.$entryId.'] not found');
	    }
	    
	    $data  =   $this->_entryToData( $entry);
	    
	    $this->_logger->debug( 'Got flatterned entry data ['.print_r( $data, true).'].');
	    
	    return $data;
	}
	
	private function _entryToData( $entry)
	{
	    $data  =   [
	        'entry_id' => $entry->id,
	        'user_id' => $entry->user_id,
	        'form_id' => $entry->form_id,
	    ];
	    
	    foreach ( $entry->metas as $key=>$val) {
	        $data[$this->_getFieldKey( $key)]   =   $val;
	    }
	    
	    return $data;
	}
	
	private function _getFieldId( $field)
	{
	    if ( is_numeric( $field)) {
	        return $field;
	    }
	    
	    $field_id = \FrmField::get_id_by_key( $field);
	    return $field_id;
	}
	
	private function _getFieldKey( $field)
	{
	    if ( !is_numeric( $field)) {
	        return $field;
	    }
	    
	    $key = \FrmField::get_key_by_id( $field);
	    return $key;
	}
	
	/**
	 * Throw an exception if not valid
	 * @param array $entry
	 * @throws FormValidationException
	 */
	private function _checkEntry( $entry)
	{
	    $result =   $this->validateEntry( $entry);
	    if ( !$result->isValid()) {
	        throw new FormValidationException( $result);
	    }
	}
	
	private function _prepareEntry( $data)
	{
	    $meta  =   [];
	    foreach ( $data as $key=>$val) {
	        $meta[$this->_getFieldId( $key)] = $val;
	    }
	    
	    $user_id   = $this->getService()->evaluateString( $this->_userId);
	    $form_id   = $this->getService()->evaluateString( $this->_formId);
	    
	    
	    return [
	        'form_id' => $form_id,
	        'frm_user_id' => $user_id,
	        'item_meta' => $meta,
	    ];
	}
	
	// UTIL
	public function __toString()
	{
	    return parent::__toString().'['.$this->_id.']['.$this->_formId.']';
	}


}
