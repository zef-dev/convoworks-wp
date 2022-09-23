<?php

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Pckg\Appointments\BadRequestException;
use Convo\Pckg\Appointments\IAppointmentsContext;
use Convo\Pckg\Appointments\SlotNotAvailableException;
use League\Period\Period;

class SSAAppointmentsContext extends AbstractBasicComponent implements IServiceContext, IAppointmentsContext
{
	private $_id;

	private $_appointmentTypeQuery;


	const DATE_TIME_FORMAT = 'Y-m-d H:i:s';

	/**
	 * @var \Simply_Schedule_Appointments
	 */
	private $_plugin;

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

		if (!class_exists('Simply_Schedule_Appointments')) {
			throw new \Exception('Simply Schedule Appointments WordPress Plugin is not installed!');
		}

		$this->_plugin    =   ssa();
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

	public function isSlotAvailable($time)
	{
		$targetAppointmentType = $this->_getAppointmentType();

		// 		$this->_logger->debug('Getting info from appointment type [' . json_encode($targetAppointmentType) . ']');

		$this->_logger->info("Got appointment of type [" . $targetAppointmentType['title'] . "][" . $time->format(self::DATE_TIME_FORMAT) . "]");

		if ($this->_plugin->availability_functions->is_period_available(
			intval($targetAppointmentType['id']),
			['start_date' => gmdate(self::DATE_TIME_FORMAT, $time->getTimestamp())]
		)) {
			$this->_logger->info('Time slot [' . $time->format(self::DATE_TIME_FORMAT) . ' ' . $time->getTimezone()->getName() . '] is available.');
			return true;
		}

		$this->_logger->info('Time slot [' . $time->format(self::DATE_TIME_FORMAT) . ' ' . $time->getTimezone()->getName() . '] is not available.');
		return false;
	}

	public function createAppointment($email, $time, $payload = [])
	{
		$appointmentType = $this->_getAppointmentType();
		$appointmentTypeID = $appointmentType['id'];

        $this->_logger->info('Going to create appointment of type [' . $appointmentType['title'] . '] for [' . $email . '] at ['.$time->format(self::DATE_TIME_FORMAT).'] with payload ['.json_encode($payload).']');
		$this->_logger->info('Checking if appointment could be created at the time [' . $time->format(self::DATE_TIME_FORMAT) . ']');

		if (!is_email($email)) {
			throw new BadRequestException('The provided email [' . $email . '] is not valid.');
		}

		$payload['Email'] = $email;

		$this->_sanitizeIncomingAdditionalAppointmentDataArray($payload);
		$this->_validateIncomingAdditionalAppointmentData($appointmentType, $payload);

		$request = new \WP_REST_Request();
		$request->set_param('appointment_type_id', $appointmentTypeID);
		$request->set_param('start_date', gmdate(self::DATE_TIME_FORMAT, $time->getTimestamp()));
		$request->set_param('customer_information', $payload);
		$request->set_param('customer_timezone', $time->getTimezone()->getName());
		$request->set_param('status', 'booked');

		$appointmentId = $this->_plugin->appointment_model->create_item($request);

		if (is_array($appointmentId) && isset($appointmentId['error'])) {
			throw new SlotNotAvailableException($appointmentId['error']['message']);
		}

		/**
		 * @var $appointmentId \WP_REST_Response
		 */
		$response = $appointmentId;
		self::_checkWpResponse($response);

		$this->_logger->debug('Got appointment result [' . print_r($appointmentId->get_data(), true) . ']');

		return $response->get_data()['data']['id'];
	}

	public function updateAppointment($email, $appointmentId, $time, $payload = [])
	{
        if (!is_email($email)) {
            throw new BadRequestException('The provided email [' . $email . '] is not valid.');
        }
        $this->_doesTheAppointmentBelongToEmailAddress($email, $appointmentId);
        $this->_logger->info('Going to update appointment [' . $appointmentId . '] for [' . $email . '] with time ['.$time->format(self::DATE_TIME_FORMAT).'] with payload ['.json_encode($payload).']');
		if (!$this->isSlotAvailable($time)) {
			throw new SlotNotAvailableException('The time slot is not available for [' . $time->format(self::DATE_TIME_FORMAT) . ']');
		}

		// check if exists
		$appointment = $this->getAppointment($email, $appointmentId);
		$appointmentType = $this->_getAppointmentType();

		$payload = array_merge($appointment['payload'], $payload);

		$request = new \WP_REST_Request();
		$request['id'] = $appointmentId;
		$request->set_param('appointment_type_id', $appointmentType['id']);
		$request->set_param('start_date', gmdate(self::DATE_TIME_FORMAT, $time->getTimestamp()));
		$request->set_param('customer_timezone', $time->getTimezone()->getName());
		$request->set_param('customer_information', $payload);

		$this->_sanitizeIncomingAdditionalAppointmentDataArray($payload);

		$response = $this->_plugin->appointment_model->update_item($request);
		self::_checkWpResponse($response);
	}

	/**
	 * @param $email
	 * @param $appointmentId
	 * @return void
	 * @throws DataItemNotFoundException
	 */
	public function cancelAppointment($email, $appointmentId)
	{
        if (!is_email($email)) {
            throw new BadRequestException('The provided email [' . $email . '] is not valid.');
        }
		// check if exists
        $this->_doesTheAppointmentBelongToEmailAddress($email, $appointmentId);
        $this->_logger->info('Going to cancel appointment [' . $appointmentId . '] for [' . $email . ']');
		$appointment = $this->getAppointment($email, $appointmentId);

		$request = new \WP_REST_Request();
		$request['id'] = $appointmentId;
		$request->set_param('status', 'canceled');
		/**
		 * @var \WP_REST_Response $updatedAppointment
		 */
		$updatedAppointment = $this->_plugin->appointment_model->update_item($request);

		self::_checkWpResponse($updatedAppointment);
	}

	public function getAppointment($email, $appointmentId)
	{
        if (!is_email($email)) {
            throw new BadRequestException('The provided email [' . $email . '] is not valid.');
        }
        $this->_doesTheAppointmentBelongToEmailAddress($email, $appointmentId);
        $this->_logger->info('Getting appointment [' . $appointmentId . '] for [' . $email . ']');
		$appointment = $this->_plugin->appointment_model->get($appointmentId);

		if (!$appointment) {
			throw new DataItemNotFoundException('Appointment with id [' . $appointmentId . '] could not be found.');
		}

		return $this->_marshalAppointment($appointment);
	}

	public function loadAppointments($email, $mode = self::LOAD_MODE_CURRENT, $count = self::DEFAULT_APPOINTMENTS_COUNT)
	{
		$appointmentType = $this->_getAppointmentType();
		$this->_logger->info('Loading appointments [' . $email . '][' . $mode . '][' . $count . ']');

		$sql_where    =   [" AND `customer_information` LIKE '%Email%:%{$email}%' AND `appointment_type_id` = {$appointmentType['id']}"];

		$request = new \WP_REST_Request();
		$request->set_param('number', $count);
		$request->set_param('orderby', 'start_date');

		switch ($mode) {
			case self::LOAD_MODE_ALL:
				$request->set_param('order', 'DESC');
				break;
			case self::LOAD_MODE_PAST:
				$request->set_param('order', 'DESC');
				$sql_where[] = " AND end_date < UTC_TIMESTAMP()";
				break;
			case self::LOAD_MODE_CURRENT:
				$request->set_param('order', 'ASC');
				$sql_where[] = " AND status = 'booked' AND end_date >= UTC_TIMESTAMP()";
				break;
			default:
				throw new \Exception('Unexpected load mode [' . $mode . ']');
		}

		$request->set_param('append_where_sql', $sql_where);

		$response = $this->_plugin->appointment_model->get_items($request);;

		self::_checkWpResponse($response);

		$appointments = [];

		foreach ($response->get_data()['data'] as $appointment) {
			$appointments[] = $this->_marshalAppointment($appointment);
		}

		return $appointments;
	}


	private function _marshalAppointment($appointment)
	{
		$time =   new \DateTime($appointment['start_date'], new \DateTimeZone($appointment['customer_timezone']));

		$this->_logger->debug('Marshalled appointment [' . $time->format(self::DATE_TIME_FORMAT) . '] out of [' . $appointment['start_date'] . '][' . $appointment['customer_timezone'] . ']');

		return [
			'appointment_id' => $appointment['id'],
			'email' => $appointment['customer_information']['Email'],
			'timestamp' => $time->getTimestamp() + $time->getOffset(),
			'timezone' => $time->getTimezone()->getName(),
			'payload' => $appointment['customer_information']
		];
	}


	/**
	 * {@inheritDoc}
	 * @see \Convo\Pckg\Appointments\IAppointmentsContext::getFreeSlotsIterator()
	 */
	public function getFreeSlotsIterator($startTime)
	{
		$appointmentType = $this->_getAppointmentType();
		$end_time        =  clone $startTime;
		$end_time        =  $end_time->add(new \DateInterval('P15D'));
		$args = [
			'start_date_min' => gmdate('Y-m-d', time()),
			'start_date_max' => gmdate('Y-m-d', $end_time->getTimestamp()),
			// 		    'start_date' => $startTime->format('Y-m-d'),
		];

		// 		$this->_logger->info( 'Printing args [' . json_encode( $args) . ']');

		$iterator   =   $this->_plugin->availability_functions->get_bookable_appointments($appointmentType['id'], $args);
		foreach ($iterator as $availableSlot) {
			/**
			 * @var $bookableAppointmentPeriod Period
			 */
			$bookableAppointmentPeriod = $availableSlot['period'];
			$this->_logger->info('Returning available slot [' . $bookableAppointmentPeriod->getStartDate()->format(self::DATE_TIME_FORMAT) . ']');
			yield  [
				'timestamp' => $bookableAppointmentPeriod->getStartDate()->getTimestamp(),
			];
		}
	}

	public function getDefaultTimezone()
	{
		return new \DateTimeZone($this->_getAppointmentTypeObject()->get_timezone()->getName());
	}

	private function _getAppointmentType()
	{
		$availableAppointmentTypes = self::getAppointmentTypes();

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

	/**
	 * @return \SSA_Appointment_Type_Object
	 */
	private function _getAppointmentTypeObject()
	{
		$type  =   $this->_getAppointmentType();
		return new \SSA_Appointment_Type_Object($type['id']);
	}

	private function _sanitizeIncomingAdditionalAppointmentDataArray(&$additionalAppointmentData)
	{
		$this->_logger->info('Going to sanitize incoming additional appointment data [' . json_encode($additionalAppointmentData) . ']');
		$this->_sanitizeAdditionalAppointmentData($additionalAppointmentData);
		$this->_logger->info('Printing sanitized additional appointment data [' . json_encode($additionalAppointmentData) . ']');
	}

	private function _validateIncomingAdditionalAppointmentData($appointmentType, $additionalAppointmentData)
	{
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


	private function _sanitizeAdditionalAppointmentData(&$additionalAppointmentData)
	{
		foreach ($additionalAppointmentData as $key => &$value) {
			if (is_array($value)) {
				$value = $this->_sanitizeAdditionalAppointmentData($value);
			} else {
				$value = sanitize_text_field($value);
			}
		}
		return $additionalAppointmentData;
	}
    private function _doesTheAppointmentBelongToEmailAddress($requestEmailAddress, $appointmentId) {
        $appointment = $this->_plugin->appointment_model->get($appointmentId);
        $appointmentEmail = $appointment['customer_information']['Email'] ?? '';
        $appointmentEmail = trim($appointmentEmail);
        $requestEmailAddress = trim($requestEmailAddress);
        $appointmentID = $appointment['id'];

        $this->_logger->info('Comparing appointment email address ['.$appointmentEmail.'] with request email address ['.$requestEmailAddress.']');

        if ($requestEmailAddress !== $appointmentEmail) {
            throw new DataItemNotFoundException('The appointment with id ['.$appointmentID.'] could not be found for ['.$requestEmailAddress.']');
        }
    }


	public static function getAppointmentTypes()
	{
		if (!class_exists('Simply_Schedule_Appointments')) {
			return [];
		}

		$request = new \WP_REST_Request();
		$response = ssa()->appointment_type_model->get_items($request);

		self::_checkWpResponse($response);

		return $response->get_data()['data'];
	}

	public static function getAppointmentTypesOptions()
	{
		$types     =   self::getAppointmentTypes();

		$options   =   [];
		foreach ($types as $type) {
			$options[$type['id']] = $type['title'];
		}

		return $options;
	}

	private static function _checkWpResponse($response)
	{
		if (is_wp_error($response)) {
			/* @var $response \WP_Error  */
			throw new \Exception($response->get_error_message());
		}
		if (is_a($response->data['data'], 'WP_Error')) {
			throw new \Exception($response->data['data']->get_error_message());
		}
		if (!empty($response->data['error'])) {
			throw new \Exception($response->data['error']);
		}
	}
}
