<?php

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Pckg\Appointments\BadRequestException;
use Convo\Pckg\Appointments\IAppointmentsContext;
use Convo\Pckg\Appointments\SlotNotAvailableException;
use Convo\SimplyScheduleAppointmentsWrapper;
use League\Period\Period;

class SSAAppointmentsContext extends AbstractBasicComponent implements IServiceContext, IAppointmentsContext
{
	private $_id;

	private $_appointmentTypeQuery;

	/**
	 * @var \SSA_Availability_Functions
	 */
	private $_ssaAvailabilityFunctions;
	/**
	 * @var \SSA_Appointment_Model
	 */
	private $_ssaAppointmentModel;

	/**
	 * @var SimplyScheduleAppointmentsWrapper
	 */
	private $_simplyScheduleAppointmentsWrapper;

	/**
	 * @var \SSA_Settings
	 */
	private $_ssaSettings;

	const DATE_TIME_FORMAT = 'Y-m-d H:i:s';

	public function __construct($properties)
	{
		parent::__construct($properties);

		$this->_id = $properties['id'];
		$this->_appointmentTypeQuery = $properties['appointment_type'];
	}

	/**
	 * @return mixed
	 */
	public function init()
	{
		$this->_logger->debug('SimplyScheduleAppointmentsContext init');

		$this->_simplyScheduleAppointmentsWrapper = new SimplyScheduleAppointmentsWrapper($this->_logger);
		$this->_ssaAvailabilityFunctions = $this->_simplyScheduleAppointmentsWrapper->getSsaAvailabilityFunctions();
		$this->_ssaAppointmentModel = $this->_simplyScheduleAppointmentsWrapper->getSsaAppointmentModelInstance();
		$this->_ssaSettings = new \SSA_Settings(ssa());
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

	public function isSlotAvailable( $time)
	{
		$targetAppointmentType = $this->_getAppointmentType();

// 		$this->_logger->debug('Getting info from appointment type [' . json_encode($targetAppointmentType) . ']');

		$this->_logger->info( "Got appointment of type [" . $targetAppointmentType['title'] . "]");

		if ($this->_ssaAvailabilityFunctions->is_period_available( intval( $targetAppointmentType['id']), ['start_date' => $time->getTimestamp()])) {
		    $this->_logger->info( 'Time slot [' . $time->format( self::DATE_TIME_FORMAT) . '] is available.');
			return true;
		}

		$this->_logger->info( 'Time slot [' . $time->format( self::DATE_TIME_FORMAT) . '] is not available.');
		return false;
	}

	/**
	 * @param $email
	 * @param $time
	 * @param $payload
	 * @return mixed
	 */
	public function createAppointment($email, $time, $payload = [])
	{
		$appointmentType = $this->_getAppointmentType();

		$appointmentTypeID = $appointmentType['id'];
		$this->_updateTimezoneOfIncomingDateTime($appointmentType, $time);
		$customerTimezone = $time->getTimezone();
			$this->_logger->info('Checking if appointment could be created at the time [' . $time->format(self::DATE_TIME_FORMAT) . ']');
		$time->setTimezone(new \DateTimeZone('UTC'));
		$appointmentDateTime = $time->format(self::DATE_TIME_FORMAT);

		if (!$this->_ssaAvailabilityFunctions->is_period_available(intval($appointmentTypeID), ['start_date' => $appointmentDateTime])) {
			throw new SlotNotAvailableException('The time slot is not available for [' . $appointmentDateTime . ']');
		}

		if (!is_email($email)) {
			throw new SlotNotAvailableException('The provided email [' . $email . '] is not valid.');
		}

		$payload['Email'] = $email;

		$this->_sanitizeIncomingAdditionalAppointmentDataArray($payload);
		$this->_validateIncomingAdditionalAppointmentData($appointmentType, $payload);

		$customer_information = $payload;

		$data = [
			'appointment_type_id' => $appointmentTypeID,
			'start_date' => $appointmentDateTime,
			'customer_information' => $customer_information,
			'customer_timezone' => $customerTimezone->getName(),
			'status' => 'booked'
		];
		$appointmentId = $this->_ssaAppointmentModel->insert($data);

		if (is_wp_error($appointmentId)) {
			throw new SlotNotAvailableException(json_encode($appointmentId->get_all_error_data()));
		}

		return $appointmentId;
	}

	/**
	 * @param $email
	 * @param $appointmentId
	 * @param $time
	 * @param $payload
	 * @return mixed
	 */
	public function updateAppointment($email, $appointmentId, $time, $payload = [])
	{
		$appointmentType = $this->_getAppointmentType();

		$this->_updateTimezoneOfIncomingDateTime($appointmentType, $time);
		$customerTimezone = $time->getTimezone();
		$time->setTimezone(new \DateTimeZone('UTC'));

		$appointmentDateTime = $time->format(self::DATE_TIME_FORMAT);

		if (!$this->_ssaAvailabilityFunctions->is_period_available(intval($appointmentType['id']), ['start_date' => $appointmentDateTime])) {
			throw new SlotNotAvailableException('The time slot is not available for [' . $appointmentDateTime . ']');
		}

		$data = [
			'start_date' => $appointmentDateTime,
			'customer_timezone' => $customerTimezone->getName()
		];

		if (!empty($payload)) {
			$this->_sanitizeIncomingAdditionalAppointmentDataArray($payload);
			$data['customer_information'] = $payload;
		}

		$this->_ssaAppointmentModel->update($appointmentId, $data);
		return $this->getAppointment($email, $appointmentId);
	}

	/**
	 * @param $email
	 * @param $appointmentId
	 * @return void
	 * @throws DataItemNotFoundException
	 */
	public function cancelAppointment($email, $appointmentId)
	{
		$updatedAppointment = $this->_ssaAppointmentModel->update($appointmentId, ['status' => 'canceled']);

		if (!$updatedAppointment) {
			throw new DataItemNotFoundException('Could not update appointment due to invalid appointment id.');
		}
	}

	/**
	 * @param $email
	 * @param $appointmentId
	 * @return mixed
	 */
	public function getAppointment($email, $appointmentId)
	{
		$appointmentData = $this->_ssaAppointmentModel->get($appointmentId);

		if (!$appointmentData) {
			throw new DataItemNotFoundException('Appointment with id [' . $appointmentId . '] could not be found.');
		}

		return [
			'appointment_id' => $appointmentData['id'],
			'timestamp' => strtotime($appointmentData['start_date']),
			'timezone' => $appointmentData['customer_timezone'],
			'payload' => $appointmentData['customer_information']
		];
	}

	/**
	 * @param $email
	 * @param $mode
	 * @param $count
	 * @return mixed
	 */
	public function loadAppointments($email, $mode = self::LOAD_MODE_CURRENT, $count = self::DEFAULT_APPOINTMENTS_COUNT)
	{
		$appointments = [];
		// TODO maybe check how esc_sql() will behave
		$attributes = [
			'number' => $count
		];

		if (is_email($email)) {
			$attributes['append_where_sql'] = [
				" AND `customer_information` LIKE '%Email%:%{$email}%'"
			];
		}

		switch ($mode) {
			case self::LOAD_MODE_ALL:
				$attributes['order'] = 'DESC';
				break;
			case self::LOAD_MODE_PAST:
				$attributes['order'] = 'DESC';
				$attributes['date_created_max'] = 'now';
				break;
			default:
				$attributes['order'] = 'ASC';
				$attributes['status'] = 'booked';
				break;
		}

		$request = new \WP_REST_Request('', '', $attributes);
		$response = $this->_ssaAppointmentModel->get_items($request);;

		if (!is_wp_error($response)) {
			$appointments = $response->get_data()['data'];
		}
		$loadedAppointments = [];

		foreach ($appointments as $appointment) {
			$loadedAppointments[] = $this->getAppointment($appointment['customer_information']['Email'], $appointment['id']);
		}

		return $loadedAppointments;
	}

	/**
	 * @param $startTime
	 * @return mixed
	 */
	public function getFreeSlotsIterator($startTime = null)
	{
		$appointmentType = $this->_getAppointmentType();

		$this->_updateTimezoneOfIncomingDateTime($appointmentType, $startTime);

		if ($startTime === null) {
			$startTime = new \DateTime('now');
		}

		if ($startTime instanceof \DateTime) {
			$incomingTimezone = $startTime->getTimezone();
		} else {
			$incomingTimezone = new \DateTimeZone('UTC');
		}

		$startTime->setTimezone(new \DateTimeZone('UTC'));

		$args = [
			'start_date_min' => $startTime->format('Y-m-d')
		];

		$this->_logger->info('Printing args [' . json_encode($args) . ']');

		$availableSlots = [];

		foreach ($this->_ssaAvailabilityFunctions->get_bookable_appointments($appointmentType['id'], $args) as $availableSlot) {
			/**
			 * @var $bookableAppointmentPeriod Period
			 */
			$bookableAppointmentPeriod = $availableSlot['period'];
			$bookableAppointmentValue = $bookableAppointmentPeriod->jsonSerialize();

			$startDate = $bookableAppointmentValue['startDate'];
			$startDate->setTimezone($incomingTimezone);

			$this->_logger->info('Adding available slot [' . json_encode($availableSlot) . ']');
			$availableSlots[] =  [
				'timestamp' => $startDate->getTimestamp(),
				'timezone' => $startDate->getTimezone()->getName()
			];
		}

		return new \ArrayIterator($availableSlots);
	}

	private function _getAppointmentTypes()
	{
		$appointmentTypes = [];
		$request = new \WP_REST_Request();
		$response = $this->_simplyScheduleAppointmentsWrapper->getSsaAppointmentTypeModelInstance()->get_items($request);

		if (!is_wp_error($response)) {
			$appointmentTypes = $response->get_data()['data'];
		}

		return $appointmentTypes;
	}

	private function _getAppointmentType() {
		$availableAppointmentTypes = $this->_getAppointmentTypes();
		$appointmentTypeQuery = sanitize_text_field($this->getService()->evaluateString($this->_appointmentTypeQuery));

		if (is_numeric($appointmentTypeQuery)) {
			$targetAppointmentType = array_filter($availableAppointmentTypes, function ($appointmentTypeValue) use ($appointmentTypeQuery) {
				return ($appointmentTypeValue['id'] == $appointmentTypeQuery);
			});
		} else {
			$targetAppointmentType = array_filter($availableAppointmentTypes, function ($appointmentTypeValue) use ($appointmentTypeQuery) {
				return (strtolower(trim($appointmentTypeValue['title'])) === strtolower(trim($appointmentTypeQuery)));
			});
		}

		if (empty($targetAppointmentType)) {
			throw new DataItemNotFoundException('Appointment could not be loaded.');
		}

		return array_values($targetAppointmentType)[0];
	}

	private function _sanitizeIncomingAdditionalAppointmentDataArray(&$additionalAppointmentData) {
		$this->_logger->info('Going to sanitize incoming additional appointment data keys [' . json_encode($additionalAppointmentData) . ']');
		$this->_sanitizeAdditionalAppointmentDataKeys($additionalAppointmentData);

		$this->_logger->info('Going to sanitize incoming additional appointment data [' . json_encode($additionalAppointmentData) . ']');
		$this->_sanitizeAdditionalAppointmentData($additionalAppointmentData);
		$this->_logger->info('Printing sanitized additional appointment data [' . json_encode($additionalAppointmentData) . ']');
	}

	private function _sanitizeAdditionalAppointmentDataKeys(&$additionalAppointmentData) {
		$keys = [];
		foreach ($additionalAppointmentData as $key => $value) {
			if( ! array_key_exists( $key, $additionalAppointmentData ) ) {
				continue;
			}
			$keys = array_keys( $additionalAppointmentData );
			$keys[array_search($key, $keys)] = sanitize_text_field($key);
		}

		$additionalAppointmentData = array_combine($keys, $additionalAppointmentData);
	}

	private function _getAppointmentTypeObject($id) {
		return $this->_simplyScheduleAppointmentsWrapper->getSsaAppointmentTypeObjectInstance($id);
	}

	private function _validateIncomingAdditionalAppointmentData($appointmentType, $additionalAppointmentData) {
		$requiredFieldsMissing = [];

		foreach ($appointmentType['customer_information'] as $customerInformationField) {
			$field = $customerInformationField['field'];
			$isFieldRequired = $customerInformationField['required'];

			$this->_logger->debug('Is customer information field [' . $field . ']' . ' required? [' . $isFieldRequired . ']');

			if ($isFieldRequired && !isset($additionalAppointmentData[$field])) {
				$this->_logger->debug('Adding field [' . $field . ']' . ' to missing fields.');
				$requiredFieldsMissing[] = $field;
			} else if ($isFieldRequired && isset($additionalAppointmentData[$field])) {
				$additionalAppointmentDataFieldValue = $additionalAppointmentData[$field];

				if ($field === 'Email' && !is_email($additionalAppointmentDataFieldValue)) {
					throw new BadRequestException($field . ' is not valid [' . $additionalAppointmentDataFieldValue . ']');
				} else if ($field !== 'Email' && empty($additionalAppointmentDataFieldValue)) {
					throw new BadRequestException($field . ' must not be empty [' . $additionalAppointmentDataFieldValue . ']');
				}
			}
		}

		if (!empty($requiredFieldsMissing)) {
			throw new BadRequestException('Invalid customer data. The following fields are missing [' . implode(', ', $requiredFieldsMissing) . '] for the appointment type [' . $appointmentType['title'] . ']');
		}
	}

	private function _getTimezoneOfAppointmentType($id) {
		return $this->_getAppointmentTypeObject($id)->get_timezone();
	}

	private function _getTimezoneStyleOfAppointmentType($appointmentType) {
		return $appointmentType['timezone_style'];
	}

	private function _getSsaTimezoneString() {
		$ssaSettings = $this->_ssaSettings->get();
		$timezoneString = 'UTC';
		if (isset($ssaSettings['global']['timezone_string'])) {
			$timezoneString = $ssaSettings['global']['timezone_string'];
		}

		$this->_logger->info('Returning configured SSA timezone [' . $timezoneString . ']');

		return $timezoneString;
	}

	private function _isTimezoneLocked($targetAppointmentType) {
		return $this->_getTimezoneStyleOfAppointmentType($targetAppointmentType) === 'locked';
	}

	private function _updateTimezoneOfIncomingDateTime($targetAppointmentType, &$time) {
		if ($this->_isTimezoneLocked($targetAppointmentType)) {
			$this->_logger->info('Changing client timezone to server timezone.');
			$timezoneString = $this->_getSsaTimezoneString();

			$time = new \DateTime($time->format(self::DATE_TIME_FORMAT), new \DateTimeZone($timezoneString));
			$appointment_date_time = $time->format(self::DATE_TIME_FORMAT);

			$this->_logger->info('Checking time [' . $appointment_date_time . '] for timezone [' . $timezoneString);
		}
	}

	private function _sanitizeAdditionalAppointmentData(&$additionalAppointmentData) {
		foreach ($additionalAppointmentData as $key => &$value ) {
			if (is_array($value)) {
				$value = $this->_sanitizeAdditionalAppointmentData($value);
			} else {
				$value = sanitize_text_field($value);
			}
		}
		return $additionalAppointmentData;
	}
	
	public function getDefaultTimezone()
	{
	    return new \DateTimeZone( $this->_getSsaTimezoneString());
	}

}