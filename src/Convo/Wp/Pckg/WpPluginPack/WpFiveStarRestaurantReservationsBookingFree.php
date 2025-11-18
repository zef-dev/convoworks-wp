<?php

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IServiceContext;
use Convo\Pckg\Appointments\BadRequestException;
use Convo\Pckg\Appointments\IAppointmentsContext;
use Convo\Pckg\Appointments\SlotNotAvailableException;

class WpFiveStarRestaurantReservationsBookingFree extends AbstractBasicComponent implements IServiceContext, IAppointmentsContext
{
    public const DATE_FORMAT = 'Y-m-d';
    public const TIME_FORMAT = 'H:i:s';
    public const DATE_TIME_FORMAT = 'Y-m-d H:i:s';

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
    }

    public function init()
    {
        $this->_logger->debug('WpFiveStarRestaurantReservationsBooking init');
        if (!is_plugin_active('restaurant-reservations/restaurant-reservations.php')) {
            throw new \Exception('Five Star Restaurant Reservations Booking WP Plugin is not activated.');
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
        $this->_logger->info('Going to check if the time slot [' . $time->format(self::DATE_TIME_FORMAT) . '] is available');
        $validation_errors = [];
        // Check against valid open dates/times
        if (is_object($time)) {
            $request = new \DateTime($time->format('Y-m-d') . ' ' . $time->format('H:i:s'));

            $early_bookings = $rtb_controller->settings->get_setting('early-bookings');
            if (!empty($early_bookings) && is_numeric($early_bookings)) {
                $uppar_bound = (new \DateTime('now'))->setTime(23, 59);
                $uppar_bound->add(new \DateInterval("P{$early_bookings}D"));

                if ($request > $uppar_bound) {
                    $validation_errors[] = [
                        'field' => 'time',
                        'error_msg' => 'Booking request too far in the future',
                        // translators: %1$s is replaced with the maximum number of days for advance bookings.
                        'message' => sprintf(__('Sorry, bookings can not be made more than %1$s days in advance.', 'convoworks-wp'), $early_bookings),
                    ];
                }
            }

            $late_bookings = $rtb_controller->settings->get_setting('late-bookings');
            if (empty($late_bookings)) {
                if ($request->format('U') < current_time('timestamp')) {
                    $validation_errors[] = [
                        'field' => 'time',
                        'error_msg' => 'Booking request in the past',
                        'message' => __('Sorry, bookings can not be made in the past.', 'convoworks-wp'),
                    ];
                }
            } elseif ($late_bookings === 'same_day') {
                if ($request->format('Y-m-d') == current_time('Y-m-d')) {
                    $validation_errors[] = [
                        'field' => 'time',
                        'error_msg' => 'Booking request made on same day',
                        'message' => __('Sorry, bookings can not be made for the same day.', 'convoworks-wp'),
                    ];
                }
            } elseif (is_numeric($late_bookings)) {
                $late_bookings_seconds = $late_bookings * 60; // Late bookings allowance in seconds
                if ($request->format('U') < (current_time('timestamp') + $late_bookings_seconds)) {
                    if ($late_bookings >= 1440) {
                        // translators: %1$s is replaced with the minimum number of days for advance bookings.
                        $late_bookings_message = sprintf(__('Sorry, bookings must be made more than %1$s days in advance.', 'convoworks-wp'), $late_bookings / 1440);
                    } elseif ($late_bookings >= 60) {
                        // translators: %1$s is replaced with the minimum number of hours for advance bookings.
                        $late_bookings_message = sprintf(__('Sorry, bookings must be made more than %1$s hours in advance.', 'convoworks-wp'), $late_bookings / 60);
                    } else {
                        // translators: %1$s is replaced with the minimum number of minutes for advance bookings.
                        $late_bookings_message = sprintf(__('Sorry, bookings must be made more than %1$s minutes in advance.', 'convoworks-wp'), $late_bookings);
                    }
                    $validation_errors[] = [
                        'field' => 'time',
                        'error_msg' => 'Booking request made too close to the reserved time',
                        'message' => $late_bookings_message,
                    ];
                }
            }

            // Check against scheduling exception rules
            $exceptions = $rtb_controller->settings->get_setting('schedule-closed');
            if (empty($this->validation_errors) && !empty($exceptions)) {
                $exception_is_active = false;
                $datetime_is_valid = false;
                foreach ($exceptions as $exception) {
                    $excp_date = new \DateTime($exception['date']);
                    if ($excp_date->format('Y-m-d') == $request->format('Y-m-d')) {
                        $exception_is_active = true;

                        // Closed all day
                        if (empty($exception['time'])) {
                            continue;
                        }

                        $excp_start_time = empty($exception['time']['start']) ? $request : new \DateTime($exception['date'] . ' ' . $exception['time']['start']);
                        $excp_end_time = empty($exception['time']['end']) ? $request : new \DateTime($exception['date'] . ' ' . $exception['time']['end']);

                        if ($request->format('U') >= $excp_start_time->format('U') && $request->format('U') <= $excp_end_time->format('U')) {
                            $datetime_is_valid = true;
                            break;
                        }
                    }
                }

                if ($exception_is_active && !$datetime_is_valid) {
                    $validation_errors[] = [
                        'field' => 'date',
                        'error_msg' => 'Booking request made on invalid date or time in an exception rule',
                        'message' => 'Sorry, no bookings are being accepted then.'
                    ];
                }
            }

            // Check against weekly scheduling rules
            $rules = $rtb_controller->settings->get_setting('schedule-open');
            if (empty($exception_is_active) && empty($this->validation_errors) && !empty($rules)) {
                $request_weekday = strtolower($request->format('l'));
                $time_is_valid = null;
                $day_is_valid = null;
                foreach ($rules as $rule) {
                    if (!empty($rule['weekdays'][$request_weekday])) {
                        $day_is_valid = true;

                        if (empty($rule['time'])) {
                            $time_is_valid = true; // Days with no time values are open all day
                            break;
                        }

                        $too_early = true;
                        $too_late = true;

                        // Too early
                        if (!empty($rule['time']['start'])) {
                            $rule_start_time = new \DateTime($request->format('Y-m-d') . ' ' . $rule['time']['start']);
                            if ($rule_start_time->format('U') <= $request->format('U')) {
                                $too_early = false;
                            }
                        }

                        // Too late
                        if (!empty($rule['time']['end'])) {
                            $rule_end_time = new \DateTime($request->format('Y-m-d') . ' ' . $rule['time']['end']);
                            if ($rule_end_time->format('U') >= $request->format('U')) {
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
                    $validation_errors[] = [
                        'field' => 'date',
                        'error_msg' => 'Booking request made on an invalid date',
                        'message' => 'Sorry, no bookings are being accepted on that date.',
                    ];
                } elseif (!$time_is_valid) {
                    $validation_errors[] = [
                        'field' => 'time',
                        'error_msg' => 'Booking request made at an invalid time',
                        'message' => 'Sorry, no bookings are being accepted at that time.',
                    ];
                }
            }

            $incomingTime = $this->_getGmtTimestampFromDate($time->format(self::DATE_TIME_FORMAT));
            $this->_logger->info('Incoming time [' . $incomingTime . ']');
            if (!in_array($incomingTime, $this->_getBookableTimeSlots($time))) {
                $validation_errors[] = [
                    'field' => 'time',
                    'error_msg' => 'Booking request made time which is not available',
                    'message' => 'Sorry, no bookings are being accepted at that time.',
                ];
            }

            // Accept the date if it has passed validation
            if (empty($validation_errors)) {
                return true;
            }
        }
        $this->_logger->notice('There are some errors that might interest you [' . json_encode($validation_errors) . ']');

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
        // also adding email into the payload structure
        if (is_email($email)) {
            $payload['email'] = $email;
        }

        // performing payload validation
        $this->_validatePayload($payload);

        if (!$this->isSlotAvailable($time)) {
            throw new SlotNotAvailableException('Time slot [' . $time->format(self::DATE_TIME_FORMAT) . '] is not available.');
        }

        $args = [
            'post_type' => 'rtb-booking',
            'post_title' => $payload['name'],
            'post_content' => $payload['message'] ?? '',
            'post_date' => $time->format(self::DATE_TIME_FORMAT),
            'post_date_gmt' => get_gmt_from_date($time->format(self::DATE_TIME_FORMAT)),
            'post_status' => 'pending',
        ];
        $this->_logger->info('Going to create post with type "rtb-booking" and args [' . json_encode($args) . ']');
        $id = wp_insert_post($args, true);
        if (!is_wp_error($id)) {
            $meta = [
                'party' => $payload['party'],
                'email' => $email,
                'phone' => $payload['phone'] ?? '',
                'date_submission' => current_time('timestamp'),
            ];

            $this->_logger->info('Adding payload to post meta with type "rtb-booking" [' . json_encode($meta) . ']');
            update_post_meta($id, 'rtb', $meta);
            return $id;
        }

        throw new BadRequestException('Could not crete booking with the provided args [' . json_encode($args) . ']');
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
            throw new DataItemNotFoundException('Booking with ID [' . $booking->ID . '] was not found.');
        }

        $booking_meta = get_post_meta($appointmentId, 'rtb', true);
        $booking_email = $booking_meta['email'];

        if (!is_email($email) && trim($email) != trim($booking_email)) {
            throw new DataItemNotFoundException('Email [' . $email . '] was not found for booking with ID [' . $booking->ID . '].');
        }

        $this->_logger->info('Going to update booking with ID [' . $booking->ID . '] for [' . $email . ']');

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
                $this->_logger->info('Updating post meta of post ID [' . $booking->ID . '] with the following post meta [' . json_encode($meta) . ']');
                update_post_meta($booking->ID, 'rtb', $meta);
            }
        }

        $args['ID'] = $booking->ID;
        $args['post_status'] = 'pending';
        if ($this->isSlotAvailable($time)) {
            $args['post_date'] = $time->format(self::DATE_TIME_FORMAT);
            $args['post_date_gmt'] = get_gmt_from_date($time->format(self::DATE_TIME_FORMAT));
        }

        if (isset($payload['message']) && !empty($payload['message'])) {
            $args['post_content'] = $booking->post_content . ' ' . $payload['message'];
        }

        $this->_logger->info('Updating booking with ID [' . $booking->ID . '] with the following arguments [' . json_encode($args) . ']');

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
            throw new DataItemNotFoundException('Booking with ID [' . $appointmentId . '] was not found.');
        }

        $booking_meta = get_post_meta($appointmentId, 'rtb', true);
        $booking_email = $booking_meta['email'];

        if (is_email($email) && trim($email) == trim($booking_email)) {
            $this->_logger->info('Going to cancel booking with ID [' . $appointmentId . ']');
            if ($rtb_controller->settings->get_setting('allow-cancellations')) {
                wp_update_post(['ID' => $booking->ID, 'post_status' => 'cancelled']);
                $this->_logger->info('Canceled booking with ID [' . $appointmentId . ']');
            } else {
                throw new BadRequestException('Cancellations are not allowed.');
            }
        } else {
            throw new DataItemNotFoundException('Booking with ID [' . $appointmentId . '] does not exist for the provided email address [' . $email . '] and the booking email [' . $booking_email . ']');
        }
    }

    /**
     * @param $email
     * @param $appointmentId
     * @return array
     */
    public function getAppointment($email, $appointmentId)
    {
        require_once(RTB_PLUGIN_DIR . '/includes/Booking.class.php');
        $booking = new \rtbBooking();
        $appointment = $booking->load_post(get_post($appointmentId));

        if ($appointment) {
            $this->_logger->info('Got booking with ID [' . $appointmentId . ']');
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
            'posts_per_page' => $count
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
                $this->_logger->notice('Unsupported mode [' . $mode . ']');
                return [];
        }

        $this->_logger->info('Going to load booking with the following query args [' . json_encode($args) . ']');

        require_once(RTB_PLUGIN_DIR . '/includes/Query.class.php');

        $query = new \rtbQuery($args);
        $query->prepare_args();
        $bookings = $query->get_bookings();

        $appointments = [];

        foreach ($bookings as $booking) {
            $bookingAsArray = (array) $booking;
            $appointments[] = $this->_marshalAppointment($bookingAsArray);
        }

        $this->_logger->info('Loaded [' . count($bookings) . '] bookings.');

        return $appointments;
    }

    /**
     * @param $startTime
     * @return \Iterator
     */
    public function getFreeSlotsIterator($startTime)
    {
        $alternativeStartTime = $this->_replaceTime($startTime);
        $allPossibleSlots = $this->_getBookableTimeSlots($alternativeStartTime);

        $this->_logger->info('Going to suggest available time slots for [' . $startTime->format(self::DATE_TIME_FORMAT) . ']');

        // add suggestions for 14 mode days
        for ($i = 1; $i < 15; $i++) {
            $nextDate = new \DateTime($alternativeStartTime->format(self::DATE_TIME_FORMAT) . " +$i day", $this->getDefaultTimezone());
            $allPossibleSlots = array_merge($allPossibleSlots, $this->_getBookableTimeSlots($nextDate));
        }

        $this->_logger->info('Got all possible slots [' . json_encode($allPossibleSlots) . ']');
        foreach ($allPossibleSlots as $possibleSlot) {
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
     * @return \DateTimeZone
     */
    private function _getUtcTimezone()
    {
        return new \DateTimeZone('UTC');
    }

    private function _getGmtTimestampFromDate($string, $format = 'Y-m-d H:i:s')
    {
        $datetime = date_create($string, $this->getDefaultTimezone());

        if (false === $datetime) {
            return gmdate($format, 0);
        }

        return $datetime->setTimezone($this->_getUtcTimezone())->getTimestamp();
    }

    /**
     * Set date time to now in case the start time is in the past.
     * @param $startTime
     * @return \DateTimeImmutable
     * @throws \Exception
     */
    private function _replaceTime($startTime)
    {
        $now = new \DateTime('now', $startTime->getTimezone());
        if ($now->getTimestamp() >= $startTime->getTimestamp()) {
            return new \DateTimeImmutable('now', $this->getDefaultTimezone());
        }
        return $startTime;
    }

    private function _marshalAppointment($appointment)
    {
        $time = new \DateTime($appointment['post']->post_date_gmt, $this->_getUtcTimezone());

        $this->_logger->debug('Marshalled appointment [' . $time->format(self::DATE_TIME_FORMAT) . '] out of [' . $appointment['post']->post_date . ']');

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

    // validation

    private function _validatePayload($payload)
    {
        if (!isset($payload['name'])) {
            throw new BadRequestException('Please let us know your name.');
        }
        $this->_validateParty($payload['party']);
        $this->_validatePhone($payload['phone']);
    }

    private function _validateParty($party)
    {
        global $rtb_controller;
        // Party
        if (empty($party)) {
            throw new BadRequestException('Please let us know how many people will be in your party.');
        // Check party size
        } else {
            $party_size = $rtb_controller->settings->get_setting('party-size');
            if (!empty($party_size) && $party_size < $party) {
                throw new BadRequestException('We only accept bookings for parties of up to [' . $party_size . '] people.');
            }
            $party_size_min = $rtb_controller->settings->get_setting('party-size-min');
            if (!empty($party_size_min) && $party_size_min > $party) {
                throw new BadRequestException('We only accept bookings for parties of more than [' . $party_size_min . '] people.');
            }
        }
    }
    private function _validatePhone($phone)
    {
        global $rtb_controller;

        // Phone
        $phone_required = $rtb_controller->settings->get_setting('require-phone');
        if ($phone_required && empty($phone)) {
            throw new BadRequestException('Please provide a phone number so we can confirm your booking.');
        }
    }

    // preparing suggestions

    /**
     * @param $startTime
     * @return array
     */
    private function _getBookableTimeSlots($startTime)
    {
        global $rtb_controller;
        $interval = $rtb_controller->settings->get_setting('time-interval') * 60;

        $this->_logger->info('Checking available time slots for [' . $startTime->format(self::DATE_TIME_FORMAT) . '] ' . $startTime->getTimezone()->getName() . ']');

        $allPossibleSlots = [];
        foreach ($this->_getOpeningHours($startTime) as $pair) {
            $allPossibleSlots[] = $pair['from'];
            $next = $pair['from'] + $interval;
            while ($next <= $pair['to']) {
                $allPossibleSlots[] = $next;
                $next += $interval;
            }
        }

        return $allPossibleSlots;
    }

    /**
     * @param $requestedTime
     * @return array|false
     */
    private function _getOpeningHours($requestedTime)
    {
        global $rtb_controller;

        $location_slug = ! empty($this->location) ? $this->location->slug : false;

        $schedule_closed = $rtb_controller->settings->get_setting('schedule-closed', $location_slug);
        $schedule_closed = is_array($schedule_closed) ? $schedule_closed : [];

        $valid_times = [];

        // Check if this date is an exception to the rules
        if ($schedule_closed !== 'undefined') {
            foreach ($schedule_closed as $closing) {
                $this->_logger->info('Printing closing [' . json_encode($closing) . ']');
                $time = $this->_getGmtTimestampFromDate($closing['date']);

                if (get_gmt_from_date(date('Y-m-d', $time)) == get_gmt_from_date($requestedTime->format('Y-m-d'))) {
                    // Closed all day
                    if (! isset($closing['time']) || $closing['time'] == 'undefined') {
                        return [];
                    }

                    if ($closing['time']['start'] !== 'undefined') {
                        $open_time = $this->_getGmtTimestampFromDate($closing['date'] . ' ' . $closing['time']['start']);
                    } else {
                        $open_time = $this->_getGmtTimestampFromDate($closing['date']); // Start of the day
                    }

                    if ($closing['time']['end'] !== 'undefined') {
                        $close_time = $this->_getGmtTimestampFromDate($closing['date'] . ' ' . $closing['time']['end']);
                    } else {
                        $close_time = $this->_getGmtTimestampFromDate($closing['date'] . ' 23:59:59'); // End of the day
                    }

                    $open_time = $this->_getEarliestTime($open_time, $requestedTime);
                    if ($open_time <= $close_time) {
                        $valid_times[] = ['from' => $open_time, 'to' => $close_time];
                    }
                }
            }

            // Exit early if this date is an exception
            if (isset($open_time)) {
                return $valid_times;
            }
        }

        $schedule_open = $rtb_controller->settings->get_setting('schedule-open', $location_slug);
        $schedule_open = is_array($schedule_open) ? $schedule_open : [];

        // Get any rules which apply to this weekday
        $day_of_week = strtolower(
            date('l', $this->_getGmtTimestampFromDate($requestedTime->format('Y-m-d') . ' 1:00:00'))
        );

        $this->_logger->info('Printing day of week [' . json_encode($day_of_week) . ']');

        foreach ($schedule_open as $opening) {
            $this->_logger->info('Printing opening [' . json_encode($opening) . ']');
            if ($opening['weekdays'] !== 'undefined') {
                foreach ($opening['weekdays'] as $weekday => $value) {
                    if ($weekday == $day_of_week) {

                        // Closed all day
                        if (! isset($opening['time']) || $opening['time'] == 'undefined') {
                            return [];
                        }

                        if ($opening['time']['start'] !== 'undefined') {
                            $open_time = $this->_getGmtTimestampFromDate($requestedTime->format('Y-m-d') . ' ' . $opening['time']['start']);
                        } else {
                            $open_time = $this->_getGmtTimestampFromDate($requestedTime->format('Y-m-d'));
                        }

                        if ($opening['time']['end'] !== 'undefined') {
                            $close_time = $this->_getGmtTimestampFromDate($requestedTime->format('Y-m-d') . ' ' . $opening['time']['end']);
                        } else {
                            // End of the day
                            $close_time = $this->_getGmtTimestampFromDate($requestedTime->format('Y-m-d') . ' 23:59:59');
                        }

                        $open_time = $this->_getEarliestTime($open_time, $requestedTime);

                        if ($open_time <= $close_time) {
                            $valid_times[] = ['from' => $open_time, 'to' => $close_time];
                        }
                    }
                }
            }
        }

        // Pass any valid times located
        if (count($valid_times) >= 1) {
            $this->_logger->info('Got [' . count($valid_times) . '] available time slots [' . json_encode($valid_times) . ']');
            return $valid_times;
        }

        return [];
    }

    /**
     * @param $open_time
     * @param $requestedTime
     * @return float|int|mixed
     * @throws \Exception
     */
    private function _getEarliestTime($open_time, $requestedTime)
    {
        global $rtb_controller;

        $interval = $rtb_controller->settings->get_setting('time-interval') * 60;
        $now = new \DateTime('now', $this->_getUtcTimezone());

        // adjust open time with respect to the current time of the day for upcoming timeslots
        $current_time = date_create(get_gmt_from_date($now->format(self::DATE_TIME_FORMAT)), $this->_getUtcTimezone())->getTimestamp();

        // Only make adjustments for current day selections
        if (date('y-m-d', $this->_getGmtTimestampFromDate($requestedTime->format('y-m-d'))) !== date('y-m-d', $current_time)) {
            return $open_time;
        }

        $late_bookings = $rtb_controller->settings->get_setting('late-bookings');

        if ($current_time > $open_time) {
            while ($current_time > $open_time) {
                $open_time += $interval;
            }
        }

        // adjust the open time for the Late Bookings option
        if (is_numeric($late_bookings) && $late_bookings % 1 === 0) {
            $time_calc = $current_time + $late_bookings * 60;
            while ($time_calc > $open_time) {
                $open_time = $open_time + $interval;
            }
        }

        return $open_time;
    }
}
