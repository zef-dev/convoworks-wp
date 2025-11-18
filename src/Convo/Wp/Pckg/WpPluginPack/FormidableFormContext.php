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

    public function __construct($properties, $wpdb)
    {
        parent::__construct($properties);

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
    public function searchEntries($search, $offset = 0, $limit = self::DEFAULT_LIMIT, $orderBy = [])
    {
        $limit_clause = null;
        $order_clause = null;

        if ($limit || $offset) {
            $limit_clause = 'LIMIT ' . $offset . ', ' . $limit;
        }

        if (!empty($orderBy)) {
            $order_clause = ' ORDER BY';
            foreach ($orderBy as $key => $val) {
                $order_clause .= ' ' . $key . ' ' . $this->_sanitizeOrderDirection($val);
            }
        }

        $result = \FrmEntry::getAll($this->_initWhere($search), $order_clause, $limit_clause, true);

        $entries = [];
        foreach ($result as $entry) {
            $entries[] = $this->_entryToData($entry);
        }
        return $entries;
    }

    private function _sanitizeOrderDirection($dir)
    {
        $dir = strtoupper($dir);
        if ($dir === 'ASC' || $dir === 'DESC') {
            return $dir;
        }
        return '';
    }

    private function _initWhere($search)
    {
        $where = '';
        if (!empty($search)) {
            $where = $search . ' AND ';
        }
        $where .= ' it.form_id = ' . $this->getContextFormId();
        return $where;
    }

    public function getSearchCount($search)
    {
        $count = \FrmEntry::getRecordCount($this->_initWhere($search));
        return $count;
    }

    public function validateEntry($entry)
    {
        $entry = $this->_prepareEntry($entry);
        $result = new FormValidationResult();
        $errors = \FrmEntryValidate::validate($entry);

        foreach ($errors as $key => $val) {
            if ($key === 'form') {
                throw new \Exception($val);
            }
            if ($key === 'spam') {
                $this->_logger->warning('Ignoring antispam message [' . $val . ']');
                continue;
            }
            $result->addError($key, $val);
        }
        return $result;
    }

    public function createEntry($entry)
    {
        $this->_checkEntry($entry);

        $entry = $this->_fillEntryDefaults($entry);
        $entry = $this->_prepareEntry($entry);

        add_filter('frm_time_to_check_duplicates', function ($time_limit, $entry_values) {
            return 0;
        }, 10, 2);

        $entry_id = \FrmEntry::create($entry);

        if (!$entry_id) {
            if ($this->_wpdb->last_error) {
                throw new \Exception($this->_wpdb->last_error);
            }
            throw new \Exception('Error while inserting entry');
        }

        return $entry_id;
    }

    private function _fillEntryDefaults($entry)
    {
        $fields = \FrmField::get_all_for_form($this->getContextFormId());

        foreach ($fields as $field) {
            if (!isset($entry[$field->field_key])) {
                if (isset($field->field_options['calc']) && !empty($field->field_options['calc'])) {
                    $this->_logger->debug('Field not set but has calc [' . $field->field_key . ']');
                } elseif (trim($field->default_value) !== '') {
                    $this->_logger->info('Field not set but has default_value [' . $field->default_value . ']');
                    $entry[$field->id] = $field->default_value;
                } else {
                    $this->_logger->debug('Skipping field [' . $field->name . '][' . $field->type . '][' . $field->field_key . '][' . $field->required . ']');
                }
            }
        }
        return $entry;
    }

    public function deleteEntry($entryId)
    {
        $this->_logger->info('Deleting entry [' . $entryId . ']');

        $this->getEntry($entryId);
        \FrmEntry::destroy($entryId);

        $this->_logger->debug('Entry deleted [' . $entryId . ']');
    }

    public function updateEntry($entryId, $entry)
    {
        $existing = $this->getEntry($entryId);
        $this->_logger->info('Updating entry [' . $entryId . ']');
        $entry = array_merge($existing, $entry);
        $this->_logger->debug('Got merged entry [' . $entryId . ']');
        $this->_checkEntry($entry);

        foreach ($entry as $key => $val) {
            $field_id = self::getFieldId($key);
            $this->_logger->debug('Updating field [' . $key . '][' . $field_id . '] to [' . $val . ']. Will try add first.    ');
            $added = \FrmEntryMeta::add_entry_meta($entryId, $field_id, null, $val);
            if (! $added) {
                $this->_logger->debug('Doing actual update.');
                \FrmEntryMeta::update_entry_meta($entryId, $field_id, null, $val);
            }
        }
    }

    public function getEntry($entryId)
    {
        $entry = \FrmEntry::getOne($entryId, true);

        if (empty($entry)) {
            throw new DataItemNotFoundException('Entry [' . $entryId . '] not found');
        }

        $data = $this->_entryToData($entry);

        $this->_logger->debug('Got flatterned entry data [' . $entryId . '].');

        return $data;
    }

    // FORMIDABLE CUSTOM
    public function getContextFormId()
    {
        $form_id = $this->getService()->evaluateString($this->_formId);
        if (!is_numeric($form_id)) {
            $form_id = \FrmForm::get_id_by_key($form_id);
        }
        return $form_id;
    }

    public static function getFormId($form)
    {
        if (is_numeric($form)) {
            return $form;
        }

        $formId = \FrmForm::get_id_by_key($form);
        if (!$formId) {
            throw new \Exception('Failed to get form id from [' . $form . ']');
        }
        return $formId;
    }

    public static function getFieldId($field)
    {
        if (is_numeric($field)) {
            return $field;
        }

        $field_id = \FrmField::get_id_by_key($field);
        if (!$field_id) {
            throw new \Exception('Failed to get field id from [' . $field . ']');
        }
        return $field_id;
    }

    public static function getFieldKey($field)
    {
        if (!is_numeric($field)) {
            return $field;
        }

        $key = \FrmField::get_key_by_id($field);
        if (!$key) {
            throw new \Exception('Failed to get field key from [' . $field . ']');
        }
        return $key;
    }

    // COMMON
    private function _entryToData($entry)
    {
        $data = get_object_vars($entry);
        $data['meta_values'] = [];

        foreach ($entry->metas as $field_id => $value) {
            $data['meta_values'][self::getFieldKey($field_id)] = $value;
        }

        return $data;
    }

    /**
     * Throw an exception if not valid
     * @param array $entry
     * @throws FormValidationException
     */
    private function _checkEntry($entry)
    {
        $result = $this->validateEntry($entry);
        if (!$result->isValid()) {
            throw new FormValidationException($result);
        }
    }

    private function _prepareEntry($data)
    {
        $meta = [];
        foreach ($data as $key => $val) {
            $meta[self::getFieldId($key)] = $val;
        }

        $user_id = $this->getService()->evaluateString($this->_userId);

        return [
            'form_id' => $this->getContextFormId(),
            'frm_user_id' => $user_id,
            'item_meta' => $meta,
        ];
    }

    // UTIL
    public function __toString()
    {
        return parent::__toString() . '[' . $this->_id . '][' . $this->_formId . '][' . $this->_userId . ']';
    }
}
