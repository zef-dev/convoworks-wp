<?php

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Pckg\Appointments\BadRequestException;
use Convo\Pckg\Appointments\IAppointmentsContext;
use Convo\Pckg\Appointments\OutOfBusinessHoursException;
use Convo\Pckg\Appointments\SlotNotAvailableException;

class EasyAppointmentsContext extends AbstractBasicComponent implements IServiceContext, IAppointmentsContext
{
    const DATE_TIME_FORMAT = 'Y-m-d H:i:s';
    const DATE_FORMAT = 'Y-m-d';
    const TIME_FORMAT = 'H:i';
    const MAX_TIMESTAMP = 2147483647;

    /**
     * @var mixed
     */
    private $_id;

    /**
     * @var mixed
     */
    private $_location;

    /**
     * @var mixed
     */
    private $_service;

    /**
     * @var mixed
     */
    private $_worker;

    /**
     * @var \EALogic
     */
    private $_easyAppointmentsLogic;

    /**
     * @var \EADBModels
     */
    private $_easyAppointmentsDbModels;

    /**
     * @var \EAOptions
     */
    private $_easyAppointmentsOptions;

    public function __construct($properties)
    {
        parent::__construct($properties);
        $this->_id = $properties['id'];
        $this->_location = $properties['location'] ?? '1';
        $this->_service = $properties['service'] ?? '1';
        $this->_worker = $properties['worker'] ?? '1';
    }

    public function init()
    {
        $this->_logger->debug('EasyAppointmentsContext init');
        if (!class_exists('EasyAppointment')) {
            throw new \Exception('Missing Easy Appointments Plugin!');
        }

        $easyAppointments = new \EasyAppointment();
        $easyAppointments->init_container();
        $this->_easyAppointmentsLogic = $easyAppointments->get_container()['logic'];
        $this->_easyAppointmentsOptions = $easyAppointments->get_container()['options'];
        $this->_easyAppointmentsDbModels = $easyAppointments->get_container()['db_models'];
    }

    public function getComponent()
    {
        return $this;
    }

    public function getId()
    {
        return $this->_id;
    }

    public function isSlotAvailable($time)
    {
        if (($time->getTimestamp()) <= time()) {
            $this->_logger->info('['.$time->format(self::DATE_TIME_FORMAT).'] can not be in the past.');
            return false;
        }

        if ($this->_isWorkerOnVacationForTimeSlot($time)) {
            $this->_logger->info('Worker is on vacation for the specified time ['.$time->format(self::DATE_TIME_FORMAT).'].');
            return false;
        }

        $slots = $this->_getEasyAppointmentsOpenSlots($time);
        if (!in_array($time->format(self::TIME_FORMAT), $this->_getWorkingHoursOfAnDay($time))) {
            throw new OutOfBusinessHoursException('['.$time->format(self::DATE_TIME_FORMAT).'] is out of business hours.');
        }

        foreach ($slots as $slot) {
            if ($slot['value'] === $time->format(self::TIME_FORMAT) && $slot['count'] === 0) {
                $this->_logger->info('['.$time->format(self::DATE_TIME_FORMAT).'] is already taken.');
                return false;
            }
        }

        return true;
    }

    public function createAppointment($email, $time, $payload = [])
    {
        $this->_logger->info('Going to create an appointment for ['.$email.'] with data ['.json_encode($payload).']');
        $isSlotAvailable = $this->isSlotAvailable($time);
        if (!$isSlotAvailable) {
            throw new SlotNotAvailableException('The time slot ['.$time->format(self::DATE_TIME_FORMAT).'] is already taken');
        }

        if (is_email($email)) {
            $payload['email'] = $email;
        }
        $this->_validatePayload($payload);

        $convo_service = $this->getService();

        $data['location'] = $convo_service->evaluateString($this->_location);
        $data['service'] = $convo_service->evaluateString($this->_service);
        $data['worker'] = $convo_service->evaluateString($this->_worker);

        $service = $this->_easyAppointmentsDbModels->get_row('ea_services', $data['service']);

        $data['date'] = $time->format('Y-m-d');
        $data['start'] = $time->format('H:i');
        $data['end'] = date('H:i', strtotime("{$data['start']} + {$service->duration} minute"));
        $data['end_date'] = $time->format('Y-m-d');

        $data['status'] = $this->_getDefaultAppointmentStatus();

        $data['created'] = date('Y-m-d H:i:s', time());
        $data['price'] = $service->price;
        $data['session'] = session_id();

        $createdAppointmentId = $this->_easyAppointmentsDbModels->replace('ea_appointments', $data);

        $metaFields = $this->_easyAppointmentsDbModels->get_all_rows('ea_meta_fields');

        foreach ($metaFields as $field) {
            $fields = array();
            $fields['app_id'] = $createdAppointmentId;
            $fields['field_id'] = $field->id;

            if (array_key_exists($field->slug, $payload)) {
                // remove slashes and convert special chars
                $fields['value'] = stripslashes($payload[$field->slug]);
            } else {
                $fields['value'] = '';
            }

            $this->_easyAppointmentsDbModels->replace('ea_fields', $fields, true, true);
        }

        return $createdAppointmentId;
    }

    public function updateAppointment($email, $appointmentId, $time, $payload = [])
    {
        $this->_validatePayload($payload, false);

        // step 1 prepare appointment data to be updated
        $data['id'] = $appointmentId;

        $existingAppointment = $this->_easyAppointmentsDbModels->get_row('ea_appointments', $data['id'], ARRAY_A);
        if (empty($existingAppointment)) {
            throw new DataItemNotFoundException('Appointment with ID ['.$appointmentId.'] could no be found.');
        }
        $this->_logger->info('Printing existing appointment ['.json_encode($existingAppointment).']');

        $service = $this->_easyAppointmentsDbModels->get_row('ea_services', $existingAppointment['service']);
        $this->_logger->info('Printing service from existing appointment ['.json_encode($service).']');

        $isSlotAvailable = $this->isSlotAvailable($time);
        if ($isSlotAvailable) {
            $data['date'] = $time->format('Y-m-d');
            $data['start'] = $time->format('H:i');
            $data['end'] = date('H:i', strtotime("{$data['start']} + {$service->duration} minute"));
            $data['end_date'] = $time->format('Y-m-d');
        }

        if ($this->_easyAppointmentsLogic->can_update_reservation($existingAppointment, $data)) {
            // step 2 update the data in appointment table if reservation can be updated
            $this->_logger->info('Going to update appointments table.');
            $updatedAppointmentId = $this->_easyAppointmentsDbModels->replace('ea_appointments', $data);
            if (!$updatedAppointmentId) {
                $this->_logger->info('Appointment table was not updated.');
                $updatedAppointmentId = $data['id'];
            }

            // step 3 update the data in fields table of an appointment
            $metaFields = $this->_easyAppointmentsDbModels->get_all_rows('ea_meta_fields');
            $this->_logger->info('Going to update appointment fields table with the payload ['.json_encode($payload).']');
            foreach ($metaFields as $field) {
                $fields = array();
                $fieldToBeUpdated = $this->_getFieldForAppointmentByAppointmentIdAndFieldId($updatedAppointmentId, $field->id);

                $this->_logger->info('Printing field to be updated ['.json_encode($fieldToBeUpdated).']');
                $this->_logger->info('Going to update meta field ['.$fieldToBeUpdated->slug.']'.'['.$fieldToBeUpdated->id.']');
                if ($fieldToBeUpdated && array_key_exists($fieldToBeUpdated->slug, $payload)) {
                    $fields['id'] = $fieldToBeUpdated->id;
                    $fields['value'] = sanitize_text_field($payload[$fieldToBeUpdated->slug]);
                    $this->_logger->info('Updating field ['.json_encode($fieldToBeUpdated).'] of appointment ['.$appointmentId.']');
                    $this->_easyAppointmentsDbModels->replace('ea_fields', $fields, false, true);
                }
            }

            return $updatedAppointmentId;
        }

        throw new BadRequestException('Appointment with id ['.$appointmentId.'] could not be updated.');
    }

    public function cancelAppointment($email, $appointmentId)
    {
        $data['id'] = $appointmentId;
        $data['status'] = 'canceled';
        return $this->_easyAppointmentsDbModels->replace('ea_appointments', $data);
    }

    public function getAppointment($email, $appointmentId)
    {
        $this->_logger->info('Getting easy appointment with id [' . $appointmentId . ']');
        $appointment = $this->_easyAppointmentsDbModels->get_appintment_by_id($appointmentId);
        if (!$appointment) {
            throw new DataItemNotFoundException('Appointment with id [' . $appointmentId . '] could not be found.');
        }

        return $this->_marshalAppointment($appointment);
    }

    public function loadAppointments($email, $mode = self::LOAD_MODE_CURRENT, $count = self::DEFAULT_APPOINTMENTS_COUNT)
    {
        $data['from'] = date('Y-m-d', 0);
        $data['to'] = date('Y-m-d', self::MAX_TIMESTAMP);
        if (is_email($email)) {
            $data['search'] = $email;
        }

        $appointments = [];
        $easy_appointments = $this->_easyAppointmentsDbModels->get_all_appointments($data);
        foreach ($easy_appointments as $easy_appointment) {
            $appointment = (array) $easy_appointment;
            $appointments[] = $this->_marshalAppointment($appointment);
        }

        return $appointments;
    }

    public function getFreeSlotsIterator($startTime)
    {
        $this->_logger->info('Getting slots for day ['.$startTime->format(self::DATE_FORMAT).']');
        $slotsOfDay[$startTime->format(self::DATE_FORMAT)] = $this->_getEasyAppointmentsOpenSlots($startTime);

        for ($i = 1; $i < 15; $i++) {
            $nextDate = new \DateTimeImmutable($startTime->format(self::DATE_FORMAT)." +$i day");
            $this->_logger->info('Getting slots for day ['.$nextDate->format(self::DATE_FORMAT).']');
            $slotsOfDay[$nextDate->format(self::DATE_FORMAT)] = $this->_getEasyAppointmentsOpenSlots($nextDate);
        }

        foreach ($slotsOfDay as $day => $timeSlots) {
            $this->_logger->info('Getting time slots for day ['.$day.']');
            foreach ($timeSlots as $timeSlot) {
                if (isset($timeSlot['count']) && $timeSlot['count'] > 0) {
                    $date = new \DateTimeImmutable($day.' '.$timeSlot['value']);
                    if ($this->_isWorkerOnVacationForTimeSlot($date)) {
                        $this->_logger->info('Worker is on vacation for the following day ['.$date->format(self::DATE_FORMAT).']');
                        continue;
                    }
                    $this->_logger->info('Got time slot ['.$date->format(self::DATE_TIME_FORMAT).'] for day ['.$day.']');
                    yield  [
                        'timestamp' => $date->getTimestamp()
                    ];
                }
            }
        }
    }

    public function getDefaultTimezone()
    {
        return new \DateTimeZone(wp_timezone_string());
    }

    // UTIL
    private function _marshalAppointment( $appointment)
    {
        $time = new \DateTime($appointment['date'].' '.$appointment['start']);

        $this->_logger->debug( 'Marshalled appointment ['.$time->format( self::DATE_TIME_FORMAT).'] out of ['.$appointment['date'].']['.$appointment['start'].']');

        $appointmentFields = $this->_easyAppointmentsDbModels->get_fields_for_apps([$appointment['id']]);
        $payload = [];

        foreach ($appointmentFields as $appointmentField) {
            $payload[$appointmentField->slug] = $appointmentField->value;
        }

        return [
            'appointment_id' => $appointment['id'],
            'email' => $appointment['email'],
            'timestamp' => $time->getTimestamp(),
            'timezone' => $time->getTimezone()->getName(),
            'payload' => $payload
        ];
    }

    private function _getDefaultAppointmentStatus() {
        return $this->_easyAppointmentsOptions->get_option_value('default.status', 'pending');
    }

    private function _getEasyAppointmentsOpenSlots($time) {

        $convo_service = $this->getService();

        return $this->_easyAppointmentsLogic->get_open_slots(
            $convo_service->evaluateString($this->_location),
            $convo_service->evaluateString($this->_service),
            $convo_service->evaluateString($this->_worker),
            $time->format(self::DATE_FORMAT),
            null,
            true,
            (int)$this->_easyAppointmentsOptions->get_option_value('block.time', 0)
        );
    }

    private function _validatePayload($payload, $shouldCheckMissingFiled = true)
    {
        $metaFields = $this->_easyAppointmentsDbModels->get_all_rows('ea_meta_fields');

        foreach ($metaFields as $field) {
            if ($shouldCheckMissingFiled && $field->required && !isset($payload[$field->slug])) {
                throw new BadRequestException($field->label.' is missing.');
            }
            if (isset($payload[$field->slug]) && $field->validation === 'email' && !is_email($payload[$field->slug])) {
                throw new BadRequestException($field->label.'['.$payload[$field->slug].'] is not valid.');
            }
        }
    }

    private function _getFieldForAppointmentByAppointmentIdAndFieldId($appointmentId, $fieldId)
    {
        $meta = $this->_easyAppointmentsDbModels->get_wpdb()->prefix . 'ea_meta_fields';
        $fields = $this->_easyAppointmentsDbModels->get_wpdb()->prefix . 'ea_fields';

        $query = "SELECT f.id, f.app_id, m.slug, f.value FROM {$meta} m JOIN {$fields} f ON (m.id = f.field_id) WHERE f.app_id = $appointmentId AND f.field_id = $fieldId";

        return $this->_easyAppointmentsDbModels->get_wpdb()->get_row($query);
    }

    private function _getVacationDaysOfWorker() {
        $vacations = $this->_easyAppointmentsOptions->get_option_value('vacations');
        $workerId = $this->getService()->evaluateString($this->_worker);

        $workerVacationDays = [];

        foreach (json_decode($vacations, true) as $vacation) {
            foreach ($vacation['workers'] as $worker) {
                if ($worker['id'] == $workerId) {
                    $workerVacationDays[] = $vacation['days'];
                }
            }
        }

        return $workerVacationDays;
    }

    private function _isWorkerOnVacationForTimeSlot($time) {
        $timeSlot = $time->format(self::DATE_FORMAT);

        foreach ($this->_getVacationDaysOfWorker() as $workerVacationDay) {
            if (in_array($timeSlot, $workerVacationDay)) {
                return true;
            }
        }

        return false;
    }

    private function _getWorkingHoursOfAnDay($time) {
        $slots = $this->_getEasyAppointmentsOpenSlots($time);
        $workingHours = [];

        foreach ($slots as $slot) {
            $workingHours[] = $slot['value'];
        }

        return $workingHours;
    }
}
