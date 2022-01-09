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

	public function isSlotAvailable( $time)
	{
		$targetAppointmentType = $this->_getAppointmentType();

// 		$this->_logger->debug('Getting info from appointment type [' . json_encode($targetAppointmentType) . ']');

		$this->_logger->info( "Got appointment of type [".$targetAppointmentType['title']."][".$time->format( self::DATE_TIME_FORMAT)."]");

		if ( $this->_plugin->availability_functions->is_period_available( 
		    intval( $targetAppointmentType['id']), 
		    ['start_date' => $time->format( self::DATE_TIME_FORMAT)])) {
		    $this->_logger->info( 'Time slot [' . $time->format( self::DATE_TIME_FORMAT) . '] is available.');
			return true;
		}

		$this->_logger->info( 'Time slot [' . $time->format( self::DATE_TIME_FORMAT) . '] is not available.');
		return false;
	}

	public function createAppointment( $email, $time, $payload = [])
	{
		$appointmentType = $this->_getAppointmentType();
		$appointmentTypeID = $appointmentType['id'];
		
		$this->_logger->info('Checking if appointment could be created at the time [' . $time->format(self::DATE_TIME_FORMAT) . ']');

		if ( !$this->isSlotAvailable( $time)) {
		    throw new SlotNotAvailableException( 'The time slot is not available for [' . $time->format( self::DATE_TIME_FORMAT) . ']');
		}

		if ( !is_email( $email)) {
		    throw new BadRequestException( 'The provided email [' . $email . '] is not valid.');
		}

		$payload['Email'] = $email;

		$this->_sanitizeIncomingAdditionalAppointmentDataArray( $payload);
		$this->_validateIncomingAdditionalAppointmentData( $appointmentType, $payload);

		$data = [
			'appointment_type_id' => $appointmentTypeID,
		    'start_date' => $time->format( self::DATE_TIME_FORMAT),
		    'customer_information' => $payload,
		    'customer_timezone' => $time->getTimezone()->getName(),
			'status' => 'booked'
		];
		$appointmentId = $this->_plugin->appointment_model->insert( $data);

		$this->_logger->debug( 'Got appointment result ['.print_r( $appointmentId, true).']');
		
		if ( !is_numeric( $appointmentId)) {
		    throw new \Exception( 'Got non numeric result ['.print_r( $appointmentId, true).']');
		}
		if ( is_wp_error($appointmentId)) {
			throw new \Exception( json_encode( $appointmentId->get_all_error_data()));
		}

		return $appointmentId;
	}

	public function updateAppointment( $email, $appointmentId, $time, $payload = [])
	{
		if ( !$this->isSlotAvailable( $time)) {
		    throw new SlotNotAvailableException('The time slot is not available for [' . $time->format( self::DATE_TIME_FORMAT) . ']');
		}
		
		// check if exists
		$this->getAppointment( $email, $appointmentId);

		$data = [
		    'start_date' => $time->format( self::DATE_TIME_FORMAT),
		    'customer_timezone' => $time->getTimezone()->getName(),
		    'customer_information' => $payload,
		];
		
		if ( !empty( $payload)) {
			$this->_sanitizeIncomingAdditionalAppointmentDataArray( $payload);
			$data['customer_information'] = $payload;
		}

		$this->_plugin->appointment_model->update( $appointmentId, $data);
	}

	/**
	 * @param $email
	 * @param $appointmentId
	 * @return void
	 * @throws DataItemNotFoundException
	 */
	public function cancelAppointment($email, $appointmentId)
	{
	    // check if exists
	    $this->getAppointment( $email, $appointmentId);
	    
		$updatedAppointment = $this->_plugin->appointment_model->update( $appointmentId, ['status' => 'canceled']);

		if (!$updatedAppointment) {
			throw new \Exception( 'Could not cancel appointment');
		}
	}

	public function getAppointment( $email, $appointmentId)
	{
		$appointment = $this->_plugin->appointment_model->get( $appointmentId);

		if ( !$appointment) {
			throw new DataItemNotFoundException('Appointment with id [' . $appointmentId . '] could not be found.');
		}
		
		return $this->_marshalAppointment( $appointment);
	}

	public function loadAppointments( $email, $mode = self::LOAD_MODE_CURRENT, $count = self::DEFAULT_APPOINTMENTS_COUNT)
	{
	    $this->_logger->debug( 'Loading appointments ['.$email.']['.$mode.']['.$count.']');
    
		$sql_where    =   [" AND `customer_information` LIKE '%Email%:%{$email}%'"];
		
		$request = new \WP_REST_Request();
		$request->set_param( 'number', $count);
		
		switch ($mode) {
			case self::LOAD_MODE_ALL:
				$request->set_param( 'order', 'DESC');
				break;
			case self::LOAD_MODE_PAST:
				$sql_where[] = " AND start_date < NOW()";
				break;
			case self::LOAD_MODE_CURRENT:
			    $request->set_param( 'order', 'ASC');
			    $sql_where[] = " AND status = 'booked'";
			    break;
			default:
                throw new \Exception( 'Unexpected load mode ['.$mode.']');
		}
		
		$request->set_param( 'append_where_sql', $sql_where);

		$response = $this->_plugin->appointment_model->get_items( $request);;

		if (is_wp_error( $response)) {
		    /* @var $response \WP_Error  */
		    throw new \Exception( $response->get_error_message());
		}

		$appointments = [];

		foreach ( $response->get_data()['data'] as $appointment) {
		    $appointments[] = $this->_marshalAppointment( $appointment);
		}

		return $appointments;
	}
	
	
	private function _marshalAppointment( $appointment)
	{
	    $time =   new \DateTime( $appointment['start_date'], new \DateTimeZone( $appointment['customer_timezone']));
	    
	    $this->_logger->debug( 'Marshalled appointment ['.$time->format( self::DATE_TIME_FORMAT).'] out of ['.$appointment['start_date'].']['.$appointment['customer_timezone'].']');
	    
	    return [
	        'appointment_id' => $appointment['id'],
	        'timestamp' => $time->getTimestamp(),
	        'timezone' => $appointment['customer_timezone'],
	        'payload' => $appointment['customer_information']
	    ];
	}
	

	/**
	 * {@inheritDoc}
	 * @see \Convo\Pckg\Appointments\IAppointmentsContext::getFreeSlotsIterator()
	 */
	public function getFreeSlotsIterator( $startTime)
	{
		$appointmentType = $this->_getAppointmentType();
		$end_time        =  clone $startTime;
		$end_time        =  $end_time->add( new \DateInterval('P15D'));
		$args = [
			'start_date_min' => $startTime->format('Y-m-d'),
		    'start_date_max' => $end_time->format('Y-m-d'),
// 		    'start_date' => $startTime->format('Y-m-d'),
		];

// 		$this->_logger->info( 'Printing args [' . json_encode( $args) . ']');

		$iterator   =   $this->_plugin->availability_functions->get_bookable_appointments( $appointmentType['id'], $args);
		foreach ( $iterator as $availableSlot) {
			/**
			 * @var $bookableAppointmentPeriod Period
			 */
			$bookableAppointmentPeriod = $availableSlot['period'];
			$this->_logger->info('Returning available slot [' . $bookableAppointmentPeriod->getStartDate()->format( self::DATE_TIME_FORMAT). ']');
			yield  [
			    'timestamp' => $bookableAppointmentPeriod->getStartDate()->getTimestamp(),
			    'timezone' => $bookableAppointmentPeriod->getStartDate()->getTimezone()->getName()
			];
		}
	}

	private function _getAppointmentTypes()
	{
		$appointmentTypes = [];
		$request = new \WP_REST_Request();
		$response = $this->_plugin->appointment_type_model->get_items($request);

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
	    return new \SSA_Appointment_Type_Object($id);
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
		$ssaSettings = $this->_plugin->settings->get();
		$timezoneString = 'UTC';
		if (isset($ssaSettings['global']['timezone_string'])) {
			$timezoneString = $ssaSettings['global']['timezone_string'];
		}

		$this->_logger->info('Returning configured SSA timezone [' . $timezoneString . ']');

		return $timezoneString;
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