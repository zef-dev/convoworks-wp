<?php

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\Factory\InvalidComponentDataException;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Pckg\Appointments\BadRequestException;
use Convo\Pckg\Appointments\IAppointmentsContext;
use Convo\Pckg\Appointments\SlotNotAvailableException;

class WpFiveStarRestaurantReservationsBookingFree extends AbstractBasicComponent implements IServiceContext, IAppointmentsContext
{
    const DATE_FORMAT = 'Y-m-d';
    const TIME_FORMAT = 'H:i:s';
    const DATE_TIME_FORMAT = 'Y-m-d H:i:s';

    /**
     * @var mixed
     */
    private $_id;

    /**
     * @var mixed
     */
    private $_partySize;

    public function __construct($properties)
    {
        parent::__construct($properties);
        $this->_id = $properties['id'];
        $this->_partySize = $properties['party_size'] ?? 1;
    }

    public function init()
    {
        $this->_logger->debug('WpFiveStarRestaurantReservationsBooking init');
        if (!class_exists(\rtbBooking::class)) {
            throw new \Exception('Missing Five Star Restaurant Reservations Booking WP Plugin.');
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

    /**
     * @param $time
     * @return bool
     */
    public function isSlotAvailable($time)
    {
        global $rtb_controller;

        $validation_errors = [];
        // Check against valid open dates/times
        if (is_object($time)) {
            $request = new \DateTime( $time->format( 'Y-m-d' ) . ' ' . $time->format( 'H:i:s' ) );

            $early_bookings = $rtb_controller->settings->get_setting( 'early-bookings' );
            if ( !empty( $early_bookings ) && is_numeric( $early_bookings ) ) {
                $uppar_bound = ( new \DateTime( 'now' ) )->setTime( 23, 59 );
                $uppar_bound->add( new \DateInterval( "P{$early_bookings}D" ) );

                if ( $request > $uppar_bound ) {
                    $validation_errors[] = array(
                        'field'		=> 'time',
                        'error_msg'	=> 'Booking request too far in the future',
                        'message'	=> sprintf( __( 'Sorry, bookings can not be made more than %s days in advance.', 'restaurant-reservations' ), $early_bookings ),
                    );
                }
            }

            $late_bookings = $rtb_controller->settings->get_setting( 'late-bookings' );
            if ( empty( $late_bookings ) ) {
                if ( $request->format( 'U' ) < current_time( 'timestamp' ) ) {
                    $validation_errors[] = array(
                        'field'		=> 'time',
                        'error_msg'	=> 'Booking request in the past',
                        'message'	=> __( 'Sorry, bookings can not be made in the past.', 'restaurant-reservations' ),
                    );
                }

            } elseif ( $late_bookings === 'same_day' ) {
                if ( $request->format( 'Y-m-d' ) == current_time( 'Y-m-d' ) ) {
                    $validation_errors[] = array(
                        'field'		=> 'time',
                        'error_msg'	=> 'Booking request made on same day',
                        'message'	=> __( 'Sorry, bookings can not be made for the same day.', 'restaurant-reservations' ),
                    );
                }

            } else if ( is_numeric( $late_bookings ) ) {
                $late_bookings_seconds = $late_bookings * 60; // Late bookings allowance in seconds
                if ( $request->format( 'U' ) < ( current_time( 'timestamp' ) + $late_bookings_seconds ) ) {
                    if ( $late_bookings >= 1440 ) {
                        $late_bookings_message = sprintf( __( 'Sorry, bookings must be made more than %s days in advance.', 'restaurant-reservations' ), $late_bookings / 1440 );
                    } elseif ( $late_bookings >= 60 ) {
                        $late_bookings_message = sprintf( __( 'Sorry, bookings must be made more than %s hours in advance.', 'restaurant-reservations' ), $late_bookings / 60 );
                    } else {
                        $late_bookings_message = sprintf( __( 'Sorry, bookings must be made more than %s minutes in advance.', 'restaurant-reservations' ), $late_bookings );
                    }
                    $validation_errors[] = array(
                        'field'		=> 'time',
                        'error_msg'	=> 'Booking request made too close to the reserved time',
                        'message'	=> $late_bookings_message,
                    );
                }
            }

            // Check against scheduling exception rules
            $exceptions = $rtb_controller->settings->get_setting( 'schedule-closed' );
            if (empty($this->validation_errors) && !empty($exceptions)) {
                $exception_is_active = false;
                $datetime_is_valid = false;
                foreach($exceptions as $exception) {
                    $excp_date = new \DateTime($exception['date']);
                    if ($excp_date->format('Y-m-d') == $request->format('Y-m-d')) {
                        $exception_is_active = true;

                        // Closed all day
                        if (empty($exception['time'])) {
                            continue;
                        }

                        $excp_start_time = empty($exception['time']['start']) ? $request : new \DateTime($exception['date'].' '.$exception['time']['start']);
                        $excp_end_time = empty($exception['time']['end']) ? $request : new \DateTime($exception['date'].' '.$exception['time']['end']);

                        if ($request->format('U') >= $excp_start_time->format('U') && $request->format('U') <= $excp_end_time->format('U')) {
                            $datetime_is_valid = true;
                            break;
                        }
                    }
                }

                if ($exception_is_active && !$datetime_is_valid) {
                    $validation_errors[] = array(
                        'field'		=> 'date',
                        'error_msg'	=> 'Booking request made on invalid date or time in an exception rule',
                        'message'	=> 'Sorry, no bookings are being accepted then.'
                    );
                }
            }

            // Check against weekly scheduling rules
            $rules = $rtb_controller->settings->get_setting( 'schedule-open' );
            if (empty($exception_is_active) && empty($this->validation_errors) && !empty($rules)) {
                $request_weekday = strtolower($request->format('l'));
                $time_is_valid = null;
                $day_is_valid = null;
                foreach($rules as $rule) {
                    if (!empty($rule['weekdays'][$request_weekday])) {
                        $day_is_valid = true;

                        if (empty($rule['time'])) {
                            $time_is_valid = true; // Days with no time values are open all day
                            break;
                        }

                        $too_early = true;
                        $too_late = true;

                        // Too early
                        if ( !empty( $rule['time']['start'] ) ) {
                            $rule_start_time = new \DateTime($request->format('Y-m-d').' '.$rule['time']['start']);
                            if ($rule_start_time->format('U') <= $request->format('U')) {
                                $too_early = false;
                            }
                        }

                        // Too late
                        if (!empty( $rule['time']['end'])) {
                            $rule_end_time = new \DateTime($request->format( 'Y-m-d' ).' '.$rule['time']['end']);
                            if ($rule_end_time->format('U') >= $request->format( 'U' )) {
                                $too_late = false;
                            }
                        }

                        // Valid time found
                        if ($too_early === false && $too_late === false) {
                            $time_is_valid = true;
                            break;
                        }
                    }
                }

                if (!$day_is_valid) {
                    $validation_errors[] = array(
                        'field'		=> 'date',
                        'error_msg'	=> 'Booking request made on an invalid date',
                        'message'	=> 'Sorry, no bookings are being accepted on that date.',
                    );
                } elseif (!$time_is_valid) {
                    $validation_errors[] = array(
                        'field'		=> 'time',
                        'error_msg'	=> 'Booking request made at an invalid time',
                        'message'	=> 'Sorry, no bookings are being accepted at that time.',
                    );
                }
            }

            // Accept the date if it has passed validation
            if (empty($validation_errors)) {
                return true;
            }
        }
        $this->_logger->notice('There are some errors that might interest you ['.json_encode($validation_errors).']');

        return false;
    }

    /**
     * @param $email
     * @param $time
     * @param $payload
     * @return string
     */
    public function createAppointment($email, $time, $payload = [])
    {
        // adding party size in the payload structure
        $partySize = intval($this->getService()->evaluateString($this->_partySize));

        if (!empty($partySize)) {
            $payload['party'] = $partySize;
        }

        // also adding email into the payload structure
        if (is_email($email)) {
            $payload['email'] = $email;
        }

        // performing payload validation
        $this->_validatePayload($payload);

        if(!$this->isSlotAvailable($time)) {
            throw new SlotNotAvailableException('Time slot ['.$time->format(self::DATE_TIME_FORMAT).'] is not available.');
        }

        $args = array(
            'post_type'		=> 'rtb-booking',
            'post_title'	=> $payload['name'],
            'post_content'	=> $payload['message'] ?? '',
            'post_date'		=> $time->format(self::DATE_TIME_FORMAT),
            'post_date_gmt'	=> get_gmt_from_date($time->format(self::DATE_TIME_FORMAT)), // fix for post_date_gmt not being set for some bookings
            'post_status'	=> 'pending', // TODO check if we can get default status from this
        );

        $id = wp_insert_post($args, true);
        if (!is_wp_error($id)) {
            $meta = array(
                'party' => $payload['party'],
                'email' => $email,
                'phone' => $payload['phone'] ?? '',
                'date_submission' => current_time( 'timestamp' ),
            );

            update_post_meta($id,'rtb', $meta);
            return $id;
        }

        throw new BadRequestException('Could not crete booking with the provided args ['.json_encode($args).']');
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
        $booking = get_post($appointmentId);

        if (empty($booking)) {
            throw new DataItemNotFoundException('Booking with ID ['.$booking->ID.'] was not found.');
        }

        $booking_meta = get_post_meta($appointmentId, 'rtb', true);
        $booking_email = $booking_meta['email'];

        if (!is_email($email) && trim($email) != trim($booking_email)) {
            throw new DataItemNotFoundException('Email ['.$email.'] was not found for booking with ID ['.$booking->ID.'].');
        }

        $this->_logger->info('Going to update booking with ID ['.$booking->ID.'] for ['.$email.']');

        if (!empty($payload)) {
            $meta = $booking_meta;
            $shouldUpdate = false;
            if (isset($payload['party']) && !empty($payload['party'])) {
                $this->_validateParty($payload['party']);
                $shouldUpdate = true;
                $meta['party'] = $payload['party'];
            }

            if (isset($payload['phone']) && !empty($payload['phone'])) {
                $this->_validatePhone($payload['phone']);
                $shouldUpdate = true;
                $meta['phone'] = $payload['phone'];
            }

            if ($shouldUpdate) {
                $this->_logger->info('Updating post meta of post ID ['.$booking->ID.'] with the following post meta ['.json_encode($meta).']');
                update_post_meta($booking->ID, 'rtb', $meta);
            }
        }

        $args['ID'] =  $booking->ID;
        $args['post_status'] = 'pending';
        if ($this->isSlotAvailable($time)) {
            $args['post_date'] = $time->format(self::DATE_TIME_FORMAT);
            $args['post_date_gmt'] = get_gmt_from_date($time->format(self::DATE_TIME_FORMAT));
        }

        if (isset($payload['message']) && !empty($payload['message'])) {
            $args['post_content'] = $booking->post_content.' '.$payload['message'];
        }

        $this->_logger->info('Updating booking with ID ['.$booking->ID.'] with the following arguments ['.json_encode($args).']');

        $id = wp_update_post($args, true);
        if (is_wp_error($id)) {
            throw new BadRequestException($id->get_error_message());
        }

        return $id;
    }

    /**
     * Cancels existing appointment
     * @param string $email
     * @param string $appointmentId
     * @throws DataItemNotFoundException
     */
    public function cancelAppointment($email, $appointmentId)
    {
        global $rtb_controller;
        $booking = get_post($appointmentId);

        if (empty($booking)) {
            throw new DataItemNotFoundException('Booking with ID ['.$appointmentId.'] was not found.');
        }

        $booking_meta = get_post_meta($appointmentId, 'rtb', true);
        $booking_email = $booking_meta['email'];

        if (is_email($email) && trim($email) == trim($booking_email)) {
            $this->_logger->info('Going to cancel booking with ID ['.$appointmentId.']');
            // todo check for allow-cancellations option
            if ($rtb_controller->settings->get_setting('allow-cancellations' )) {
                wp_update_post( array( 'ID' => $booking->ID, 'post_status' => 'cancelled' ) );
            } else {
                throw new BadRequestException('Cancellations are not allowed.');
            }

        } else {
            throw new DataItemNotFoundException('Booking with ID ['.$appointmentId.'] does not exist for the provided email address ['.$email.'] and the booking email ['.$booking_email.']');
        }
    }

    /**
     * @param $email
     * @param $appointmentId
     * @return array
     */
    public function getAppointment($email, $appointmentId)
    {
        require_once( RTB_PLUGIN_DIR . '/includes/Booking.class.php' );
        $booking = new \rtbBooking();
        $appointment = $booking->load_post(get_post($appointmentId));

        if ($appointment) {
            $bookingArray = (array) $booking;
            return $this->_marshalAppointment($bookingArray);
        }

        throw new DataItemNotFoundException('Appointment with id [' . $appointmentId . '] could not be found.');
    }

    /**
     * @param $email
     * @param $mode
     * @param $count
     * @return array
     */
    public function loadAppointments($email, $mode = self::LOAD_MODE_CURRENT, $count = self::DEFAULT_APPOINTMENTS_COUNT)
    {
        $args = [
            'posts_per_page'	=> $count
        ];

        switch ($mode) {
            case self::LOAD_MODE_CURRENT:
                $args['date_range'] = 'upcoming';
                $args['order'] = 'ASC';
                break;
            case self::LOAD_MODE_PAST:
                $args['date_range'] = 'past';
                $args['order'] = 'DESC';
                break;
            case self::LOAD_MODE_ALL:
                $args['date_range'] = 'all';
                $args['order'] = 'DESC';
                break;
            default:
                $this->_logger->notice('Unsupported mode ['.$mode.']');
                return [];
        }

        require_once( RTB_PLUGIN_DIR . '/includes/Query.class.php' );

        $query = new \rtbQuery($args);
        $query->prepare_args();
        $bookings = $query->get_bookings();

        $appointments = [];

        foreach ($bookings as $booking) {
            $bookingAsArray = (array) $booking;
            $appointments[] = $this->_marshalAppointment($bookingAsArray);
        }

        return $appointments;
    }

    /**
     * // TODO: ask a question how to do the suggestions right
     * @param $startTime
     * @return \Iterator
     */
    public function getFreeSlotsIterator($startTime)
    {
        $alternativeStartTime = $this->_replaceTime($startTime);
        $allPossibleSlots = $this->_getBookableTimeSlots($alternativeStartTime);

        // add suggestions for 14 mode days
        for ($i = 1; $i < 15; $i++) {
            $nextDate = new \DateTimeImmutable($alternativeStartTime->format(self::DATE_TIME_FORMAT)." +$i day", $this->getDefaultTimezone());
            $allPossibleSlots = array_merge($allPossibleSlots, $this->_getBookableTimeSlots($nextDate));
        }

        $this->_logger->info('Got all possible slots ['.json_encode($allPossibleSlots).']');
        foreach($allPossibleSlots as $possibleSlot) {
            yield [
                'timestamp' => $possibleSlot
            ];
        }
    }

    /**
     * @return \DateTimeZone
     */
    public function getDefaultTimezone()
    {
        return wp_timezone();
    }

    /**
     * Set date time to now in case the start time is in the past.
     * @param $startTime
     * @return \DateTimeImmutable
     * @throws \Exception
     */
    private function _replaceTime($startTime) {
        if (time() >= $startTime->getTimestamp()) {
            return new \DateTimeImmutable('now', $this->getDefaultTimezone());
        }
        return $startTime;
    }

    private function _marshalAppointment( $appointment)
    {
        $time =   new \DateTime( $appointment['post']->post_date, new \DateTimeZone(wp_timezone_string()));

        $this->_logger->debug( 'Marshalled appointment ['.$time->format( self::DATE_TIME_FORMAT).'] out of ['.$appointment['post']->post_date.']');

        return [
            'appointment_id' => $appointment['post']->ID,
            'email' => $appointment['email'],
            'timestamp' => $time->getTimestamp(),
            'timezone' => $time->getTimezone()->getName(),
            'payload' => [
                'party' => $appointment['party'],
                'name' => $appointment['name'],
                'email' => $appointment['email'],
                'phone' => $appointment['phone'] ?? '',
                'message' => $appointment['message'] ?? '',
            ]
        ];
    }

    private function _validatePayload($payload) {
        if (!isset($payload['name'])) {
            throw new BadRequestException('Please let us know your name.');
        }
        $this->_validateParty($payload['party']);
        $this->_validatePhone($payload['phone']);
    }

    private function _validateParty($party) {
        global $rtb_controller;
        // Party
        if ( empty($party) ) {
            throw new BadRequestException('Please let us know how many people will be in your party.');
            // Check party size
        } else {
            $party_size = $rtb_controller->settings->get_setting( 'party-size' );
            if (!empty($party_size) && $party_size < $party) {
                throw new BadRequestException('We only accept bookings for parties of up to ['.$party_size.'] people.');
            }
            $party_size_min = $rtb_controller->settings->get_setting('party-size-min');
            if (!empty($party_size_min) && $party_size_min > $party) {
                throw new BadRequestException('We only accept bookings for parties of more than ['.$party_size_min.'] people.');
            }
        }
    }
    private function _validatePhone($phone) {
        global $rtb_controller;

        // Phone
        $phone_required = $rtb_controller->settings->get_setting( 'require-phone' );
        if ($phone_required && empty($phone)) {
            throw new BadRequestException('Please provide a phone number so we can confirm your booking.');
        }
    }

    private function _getBookableTimeSlots($startTime) {
        global $rtb_controller;
        $interval = $rtb_controller->settings->get_setting( 'time-interval' ) * 60;

        $this->_logger->info('Checking available time slots for ['.$startTime->format(self::DATE_TIME_FORMAT).'] '.$startTime->getTimezone()->getName().']');

        $allPossibleSlots = [];
        foreach ( $this->_getOpeningHours($startTime) as $pair ) {
            $allPossibleSlots[] = $pair['from'];
            $next = $pair['from'] + $interval;
            while ( $next <= $pair['to'] ) {
                $allPossibleSlots[] = $next;
                $next += $interval;
            }
        }

        return $allPossibleSlots;
    }

    /**
     * TODO fix timezone
     * @param $requestedTime
     * @return array|false
     */
    private function _getOpeningHours($requestedTime) {
        global $rtb_controller;

        $schedule_closed = $rtb_controller->settings->get_setting( 'schedule-closed');
        $schedule_closed = is_array( $schedule_closed ) ? $schedule_closed : array();

        $valid_times = array();

        // Check if this date is an exception to the rules
        if ( $schedule_closed != 'undefined' ) {

            foreach ( $schedule_closed as $closing ) {
                $time = date_create($closing['date'], new \DateTimeZone('UTC'))->getTimestamp();

                if ( date( 'Y', $time ) == $requestedTime->format('Y') &&
                    date( 'm', $time ) == $requestedTime->format('m') &&
                    date( 'd', $time ) == $requestedTime->format('d')
                ) {

                    // Closed all day
                    if ( ! isset( $closing['time'] ) || $closing['time'] == 'undefined' ) {
                        return false;
                    }

                    if ( $closing['time']['start'] != 'undefined' ) {
                        $open_time = date_create( $closing['date'] . ' ' . $closing['time']['start'], new \DateTimeZone('UTC'))->getTimestamp();
                    } else {
                        $open_time = date_create( $closing['date'], new \DateTimeZone('UTC') )->getTimestamp(); // Start of the day
                    }

                    if ( $closing['time']['end'] != 'undefined' ) {
                        $close_time = date_create($closing['date'] . ' ' . $closing['time']['end'], new \DateTimeZone('UTC'))->getTimestamp();
                    } else {
                        $close_time = date_create( $closing['date'] . ' 23:59:59', new \DateTimeZone('UTC'))->getTimestamp(); // End of the day
                    }

                    $open_time = $this->_getEarliestTime($open_time, $requestedTime);

                    if ( $open_time <= $close_time ) {
                        $valid_times[] = ['from' => $open_time, 'to' => $close_time];
                    }
                }
            }

            // Exit early if this date is an exception
            if ( isset( $open_time ) ) {
                return $valid_times;
            }
        }

        $schedule_open = $rtb_controller->settings->get_setting('schedule-open');
        $schedule_open = is_array( $schedule_open ) ? $schedule_open : array();

        // Get any rules which apply to this weekday
        $day_of_week =  strtolower(
            date( 'l', date_create( $requestedTime->format('Y') . '-' . $requestedTime->format('m') . '-' . $requestedTime->format('d') . ' 1:00:00', new \DateTimeZone('UTC') )->getTimestamp() )
        );

        foreach ( $schedule_open as $opening ) {

            if ( $opening['weekdays'] != 'undefined' ) {

                foreach ( $opening['weekdays'] as $weekday => $value ) {

                    if ( $weekday == $day_of_week ) {

                        // Closed all day
                        if ( ! isset($opening['time']) || $opening['time'] == 'undefined' ) {

                            return false;
                        }

                        if ( $opening['time']['start'] != 'undefined' ) {

                            $open_time = date_create( $requestedTime->format('Y') . '-' . $requestedTime->format('m') . '-' . $requestedTime->format('d') . ' ' . $opening['time']['start'], new \DateTimeZone('UTC') )->getTimestamp();
                        }
                        else {

                            $open_time = date_create( $requestedTime->format('Y') . '-' . $requestedTime->format('m') . '-' . $requestedTime->format('d'), new \DateTimeZone('UTC') )->getTimestamp();
                        }

                        if ( $opening['time']['end'] != 'undefined' ) {

                            $close_time = date_create( $requestedTime->format('Y') . '-' . $requestedTime->format('m') . '-' . $requestedTime->format('d') . ' ' . $opening['time']['end'], new \DateTimeZone('UTC') )->getTimestamp();
                        }
                        else {
                            // End of the day
                            $close_time = date_create( $requestedTime->format('Y') . '-' . $requestedTime->format('m') . '-' . $requestedTime->format('d') . ' 23:59:59', new \DateTimeZone('UTC') )->getTimestamp();
                        }

                        $open_time = $this->_getEarliestTime( $open_time, $requestedTime );

                        if ( $open_time <= $close_time ) {
                            $valid_times[] = ['from' => $open_time, 'to' => $close_time];
                        }
                    }
                }
            }
        }

        // Pass any valid times located
        if ( sizeOf( $valid_times ) >= 1 ) {
            $this->_logger->info('Valid times ['.json_encode($valid_times).'] for ['.$requestedTime->format(self::DATE_TIME_FORMAT).']');
            return $valid_times;
        }

        return [];
    }

    private function _getEarliestTime($open_time, $requestedTime) {
        global $rtb_controller;

        $interval = $rtb_controller->settings->get_setting( 'time-interval' ) * 60;

        // adjust open time with respect to the current time of the day for upcoming timeslots
        $requested_time = $requestedTime->getTimestamp();

        $this->_logger->info('Printing earliest time ['.$open_time.']');

        // Only make adjustments for current day selections
        if ( date( 'y-m-d', date_create( "{$requestedTime->format('y')}-{$requestedTime->format('m')}-{$requestedTime->format('d')}", new \DateTimeZone('UTC') )) !== date( 'y-m-d', $requested_time) ) {
            return $open_time;
        }

        $late_bookings = $rtb_controller->settings->get_setting( 'late-bookings');

        if( $requested_time > $open_time ) {
            while( $requested_time > $open_time ) {
                $open_time += $interval;
            }
        }

        // adjust the open time for the Late Bookings option
        if ( is_numeric($late_bookings) && $late_bookings % 1 === 0 ) {
            $time_calc = time() + $late_bookings * 60;
            while ($time_calc > $open_time) {
                $open_time = $open_time + $interval;
            }
        }

        $this->_logger->info('Printing earliest time ['.$open_time.']');

        return $open_time;
    }
}
