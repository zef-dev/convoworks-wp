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
	/**
	 * @var \wpdb
	 */
	private $_wpdb;

	public function __construct( $properties, $wpdb)
	{
		parent::__construct( $properties);

		$this->_id = $properties['id'];
		$this->_formId = $properties['form_id'];
		$this->_userId = $properties['user_id'];
		$this->_wpdb = $wpdb;
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
	public function searchEntries( $search, $offset=0, $limit=self::DEFAULT_LIMIT, $orderBy=[])
	{
	    //$query  =   array_merge( $query, $search);
	    //	    $query = \array_merge($query, ['field_id'=>'32', 'meta_value'=>'4']);
	    //	    $entries = \FrmEntryMeta::getAll( $query);
        $query      =   '
    SELECT fi.*
    FROM '.$this->_wpdb->prefix.'frm_items fi';
       
        $query =    $query.' '. $this->_buildWhere( $search).
        $query =    '
    LIMIT '.$offset.', '.$limit;
        $this->_logger->debug( 'Got query ['.$query.']');
//         error_log( 'Got query ['.$query.']');

        $data = $this->_wpdb->get_results( $query, ARRAY_A);
        
        $this->_logger->debug( 'Got last result ['.print_r( $data, true).']');

        $entries  =    [];
        foreach ($data as $row) {
            $entries[] = $this->getEntry( $row['id']);
        }
        return $entries;
	}
	
	public function getSearchCount( $search)
	{
	    $query      =   '
    SELECT COUNT( fi.id) as CNT
    FROM '.$this->_wpdb->prefix.'frm_items fi';
	    
	    $query =   $query.' '. $this->_buildWhere( $search).
	    
	    $this->_logger->debug( 'Got query ['.$query.']');
	    
	    $row = $this->_wpdb->get_row( $query, ARRAY_A);
	    
	    return intval( $row['CNT']);
	}
	
	private function _buildWhere( $search) 
	{
	    $join       =   '';
	    $where      =   '';
	    
	    foreach ( $search as $key=>$val)
	    {
	        $field_id = self::getFieldId( $key);
	        
	        $join .= '
    INNER JOIN '.$this->_wpdb->prefix.'frm_item_metas as meta_'.$field_id.'
     ON meta_'.$field_id.'.item_id = fi.id
     AND meta_'.$field_id.'.field_id = '.$field_id.' ';
	        
	        if ( empty( $where)) {
	            $where .= '
    WHERE ';
	        } else {
	            $where .= '
    AND ';
	        }
	        $where .= ' meta_'.$field_id.'.meta_value = \''.$this->_wpdb->_real_escape( $val).'\' ';
	    }
	    
	    return $join.' '.$where;
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
	    
	    if ( !$entry_id) {
	        throw new \Exception( 'Error while inserting entry');
	    }
	    
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
	        $field_id = self::getFieldId( $key);
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
	
	// FORMIDABLE CUSTOM
	public function getFormId() 
	{
	    $form_id   = $this->getService()->evaluateString( $this->_formId);
	    if ( !is_numeric( $form_id)) {
	        $form_id = \FrmForm::get_id_by_key( $form_id);
	    }
	    return $form_id;
	}
	
	public static function getFieldId( $field)
	{
	    if ( is_numeric( $field)) {
	        return $field;
	    }
	    
	    $field_id = \FrmField::get_id_by_key( $field);
	    if ( !$field_id) {
	        throw new \Exception( 'Failed to get field id from ['.$field.']');
	    }
	    return $field_id;
	}
	
	public static function getFieldKey( $field)
	{
	    if ( !is_numeric( $field)) {
	        return $field;
	    }
	    
	    $key = \FrmField::get_key_by_id( $field);
	    if ( !$key) {
	        throw new \Exception( 'Failed to get field key from ['.$field.']');
	    }
	    return $key;
	}
	
	// COMMON
	private function _entryToData( $entry)
	{
	    $data  =   [
	        'entry_id' => $entry->id,
	        'user_id' => $entry->user_id,
	        'form_id' => $entry->form_id,
	    ];
	    
	    foreach ( $entry->metas as $key=>$val) {
	        $data[self::getFieldKey( $key)]   =   $val;
	    }
	    
	    return $data;
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
	        $meta[self::getFieldId( $key)] = $val;
	    }
	    
	    $user_id   = $this->getService()->evaluateString( $this->_userId);
	    
	    return [
	        'form_id' => $this->getFormId(),
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
