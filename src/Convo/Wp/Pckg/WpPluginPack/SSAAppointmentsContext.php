<?php

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Pckg\Appointments\IAppointmentsContext;
use Convo\Pckg\Appointments\SlotNotAvailableException;
use Convo\SimplyScheduleAppointmentsWrapper;

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

	/**
	 * @param $time
	 * @return mixed
	 */
	public function isSlotAvailable($time)
	{
		$targetAppointmentType = $this->_getAppointmentType();
		$isAppointmentAvailable = false;

		if (empty($targetAppointmentType)) {
			return false;
		}

		$timezone = $this->_getTimezoneOfAppointmentType($targetAppointmentType['id']);
		$time->setTimezone(new \DateTimeZone($timezone));
		$this->_logger->info("Got appointment of type [" . $targetAppointmentType['title'] . "]");

		$time->setTimezone(new \DateTimeZone('UTC'));
		$appointment_date_time = $time->format(self::DATE_TIME_FORMAT);

		if (!is_numeric($targetAppointmentType['id'])) {
			$this->_logger->notice("Could not find valid appointment type with your query.");
			return false;
		}

		if ($this->_ssaAvailabilityFunctions->is_period_available(intval($targetAppointmentType[0]['id']), ['start_date' => $appointment_date_time])) {
			$isAppointmentAvailable = true;
		}

		$isAvailableText = $isAppointmentAvailable ? 'is available' : 'is not available';
		$this->_logger->info('Appointment type [' . $targetAppointmentType[0]['title'] . '] at the UTC date and time [' . $appointment_date_time . '] ' . $isAvailableText . '.');

		return $isAppointmentAvailable;
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

		if (empty($appointmentType)) {
			throw new SlotNotAvailableException('Could not create an appointment due to invalid appointment type!');
		}

		$appointmentTypeID = $appointmentType['id'];
		$timezone = $this->_getTimezoneOfAppointmentType($appointmentTypeID);
		$time->setTimezone(new \DateTimeZone($timezone));
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
			'customer_timezone' => $timezone,
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

		if (empty($appointmentType)) {
			throw new DataItemNotFoundException('Could not update appointment due to invalid appointment type.');
		}

		$this->_sanitizeIncomingAdditionalAppointmentDataArray($payload);
		$this->_validateIncomingAdditionalAppointmentData($appointmentType, $payload);

		$timezone = $this->_getTimezoneOfAppointmentType($appointmentType['id']);
		$data = [
			'start_date' => $time->format(self::DATE_TIME_FORMAT),
			'customer_information' => $payload['customer_data'],
			'customer_timezone' => $timezone
		];
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
		$appointmentType = $this->_getAppointmentType();

		if (empty($appointmentType)) {
			throw new DataItemNotFoundException('Could not update appointment due to invalid appointment type.');
		}

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
		$appointmentType = $this->_getAppointmentType();

		if (empty($appointmentType)) {
			throw new DataItemNotFoundException('Could not update appointment due to invalid appointment type.');
		}

		$appointmentData = $this->_ssaAppointmentModel->get($appointmentId);

		if (!$appointmentData) {
			throw new DataItemNotFoundException('Appointment with id [' . $appointmentId . '] could not be found.');
		}

		return [
			'appointment_id' => $appointmentData['id'],
			'timestamp' => $appointmentData['timestamp'],
			'timezone' => $appointmentData['timezone'],
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
		$appointmentType = $this->_getAppointmentType();

		if (empty($appointmentType)) {
			throw new DataItemNotFoundException('Appointments could not be loaded due to invalid appointment tzype.');
		}

		$appointments = [];
		// TODO maybe check how esc_sql() will behave
		$attributes = [
			'number' => $count
		];

		if (is_email($email)) {
			$attributes['append_where_sql'] = [
				esc_sql(" AND `customer_information` LIKE '%Email%:%{$email}%'")
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

		return $appointments;
	}

	/**
	 * @param $startTime
	 * @return mixed
	 */
	public function getFreeSlotsIterator($startTime = null)
	{
		$appointmentType = $this->_getAppointmentType();
		$timezone = $this->_getTimezoneOfAppointmentType($appointmentType['id']);

		if ($startTime === null) {
			$startTime = new \DateTime('now');
		}

		$startTime->setTimezone(new \DateTimeZone($timezone));
		$startTime->setTimezone(new \DateTimeZone('UTC'));

		$endTime = new \DateTime();
		$endTime->setTimestamp($appointmentType['availability']);
		$endTime->setTimezone(new \DateTimeZone('UTC'));

		$args = [
			'start_date_min' => $startTime->format(self::DATE_TIME_FORMAT),
			'start_date_max' => $endTime->format(self::DATE_TIME_FORMAT)
		];

		$availableSlots = [];

		foreach ($this->_ssaAvailabilityFunctions->get_bookable_appointments($appointmentType, $args) as $availableSlot) {
			$availableSlots[] = [
				'timestamp' => $availableSlot['timestamp'],
				'timezone' => $availableSlot['timezone']
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
			return [];
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
					throw new SlotNotAvailableException($field . ' is not valid [' . $additionalAppointmentDataFieldValue . ']');
				} else if ($field !== 'Email' && empty($additionalAppointmentDataFieldValue)) {
					throw new SlotNotAvailableException($field . ' must not be empty [' . $additionalAppointmentDataFieldValue . ']');
				}
			}
		}

		if (!empty($requiredFieldsMissing)) {
			throw new SlotNotAvailableException('Invalid customer data. The following fields are missing [' . implode(', ', $requiredFieldsMissing) . '] for the appointment type [' . $appointmentType['title'] . ']');
		}
	}

	private function _getTimezoneOfAppointmentType($id) {
		return $this->_getAppointmentTypeObject($id)->get_timezone();
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
}