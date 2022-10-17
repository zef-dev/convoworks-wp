<?php
if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('WP_List_Table')) {
    require_once(ABSPATH . 'wp-admin/includes/class-wp-list-table.php');
}

class ConvoServiceConversationRequestLogTable extends WP_List_Table
{
    /** @var \Convo\Data\Wp\WpConvoServiceConversationRequestDao */
    private $_wpConvoServiceConversationRequestDao;
    public function __construct($wpConvoServiceConversationRequestDao, $args = array())
    {
        $args = array(
            'singular'  => 'Request Log',     //singular name of the listed records
            'plural'    => 'Request Logs',    //plural name of the listed records
            'ajax'      => false
        );
        $this->_wpConvoServiceConversationRequestDao = $wpConvoServiceConversationRequestDao;
        parent::__construct($args);
    }

    public function prepare_items() {
        $columns = $this->get_columns();
        $hidden = $this->get_hidden_columns();
        $sortable = $this->get_sortable_columns();
        $this->_column_headers = array(
            $columns,
            $hidden,
            $sortable
        );
        $per_page = $this->get_items_per_page('records_per_page', 10);
        $current_page = $this->get_pagenum();
        $total_items = $this->record_count();
        $data = $this->get_records($per_page, $current_page);
        $this->set_pagination_args(
            ['total_items' => $total_items, 'per_page' => $per_page]
        );

        $this->items = $data;
    }

    public function column_default($item, $column_name) {
        switch ($column_name) {
            case 'request_id':
            case 'service_id':
            case 'session_id':
            case 'device_id':
            case 'stage':
            case 'error':
            case 'test_view':
            case 'platform':
            case 'state':
            case 'intent_name':
            case 'time_created':
            case 'time_elapsed':
                return $item[$column_name];
            default:
                return print_r( $item, true );
        }
    }

    public function get_records($per_page = 10, $page_number = 1) {
        $filterArgs = $this->_prepareFilterArgs();
        $sortArgs = $this->_prepareSortArgs();

        $paginationArgs['records_per_page'] = $per_page;
        $paginationArgs['paged'] = $page_number;

        $requestLogs = [];
        $rows = $this->_wpConvoServiceConversationRequestDao->getRecords($filterArgs, $sortArgs, $paginationArgs);

        foreach ($rows as $row) {
            $serviceVariables = json_decode($row['service_variables'], true);
            $state = $serviceVariables['session']['state'] ?? 'N/A';
            
            $requestLogs[] = [
                'request_id' => $row['request_id'],
                'session_id' => $row['session_id'],
                'service_id' => $row['service_id'],
                'device_id' => $row['device_id'],
                'stage' => $row['stage'],
                'error' => $row['error'],
                'test_view' => $row['test_view'],
                'platform' => $row['platform'],
                'state' => $state,
                'intent_name' => $row['intent_name'],
                'time_created' => $row['time_created'],
                'time_elapsed' => $row['time_elapsed']
            ];
        }

        return $requestLogs;
    }

    public function get_columns() {
        $columns = [
            'request_id' => 'Request ID',
            'session_id' => 'Session ID',
            'device_id' => 'Device ID',
            'service_id' => 'Service ID',
            'stage' => 'Stage',
            'error' => 'Error',
            'test_view' => 'Is from test view?',
            'platform' => 'Platform',
            'state' => 'State',
            'intent_name' => 'Intent Name',
            'time_created' => 'Time Created',
            'time_elapsed' => 'Time Elapsed'
        ];

        return $columns;
    }

    public function get_hidden_columns() {
        return [];
    }

    public function get_sortable_columns() {
        $sortable_columns = array(
            'time_created' => array('time_created', false)
        );
        return $sortable_columns;
    }

    public function no_items() {
        _e('No convo service conversation request logs found in the database.', 'convo');
    }

    public function record_count() {
        $filterArgs = $this->_prepareFilterArgs();
        return $this->_wpConvoServiceConversationRequestDao->getCountOfRecords($filterArgs);
    }

    function column_request_id($item) {
        $actions = array(
            'copy_to_clipboard'    => sprintf('<i data-toggle="tooltip" data-placement="top" title="Copy Request ID to Clipboard" style="cursor: pointer" class="fa fa-clone" aria-hidden="true" onclick="copyToClipboard(this)" data-content="%s"></i>', $item['request_id']),
        );

        $dataItem = '<a href=?page='.$_REQUEST['page'].'&action=details&id='.$item['request_id'].'><p class="m-0 text-primary text-truncate">'.$item['request_id'].'</p></a>';
        //Return the title contents
        return sprintf('%1$s %2$s',
            /*$1%s*/ $dataItem,
            /*$2%s*/ $this->row_actions($actions)
        );
    }

    function column_device_id($item) {
        $actions = array(
            'copy_to_clipboard'    => sprintf('<i data-toggle="tooltip" data-placement="top" title="Copy Device ID to Clipboard" style="cursor: pointer" class="fa fa-clone" aria-hidden="true" onclick="copyToClipboard(this)" data-content="%s"></i>', $item['device_id']),
        );

        $dataItem = '<p class="m-0 text-truncate">'.$item['device_id'].'</p>';
        //Return the title contents
        return sprintf('%1$s %2$s',
            /*$1%s*/ $dataItem,
            /*$2%s*/ $this->row_actions($actions)
        );
    }

    function column_session_id($item) {
        $actions = array(
            'copy_to_clipboard'    => sprintf('<i data-toggle="tooltip" data-placement="top" title="Copy Session ID to Clipboard" style="cursor: pointer" class="fa fa-clone" aria-hidden="true" onclick="copyToClipboard(this)" data-content="%s"></i>', $item['session_id']),
        );

        if (empty($item['session_id'])) {
            return 'N/A';
        }

        $dataItem = '<p class="m-0 text-truncate">'.$item['session_id'].'</p>';
        //Return the title contents
        return sprintf('%1$s %2$s',
            /*$1%s*/ $dataItem,
            /*$2%s*/ $this->row_actions($actions)
        );
    }

    function column_error($item) {
        $actions = array(
            'copy_to_clipboard'    => sprintf('<i data-toggle="tooltip" data-placement="top" title="Copy Session ID to Clipboard" style="cursor: pointer" class="fa fa-clone" aria-hidden="true" onclick="copyToClipboard(this)" data-content="%s"></i>', $item['error']),
        );

        if (empty($item['error'])) {
            return 'N/A';
        }

        $dataItem = '<p class="m-0 text-truncate">'.$item['error'].'</p>';
        //Return the title contents
        return sprintf('%1$s %2$s',
            /*$1%s*/ $dataItem,
            /*$2%s*/ $this->row_actions($actions)
        );
    }

    function column_test_view($item) {
        return !empty($item['test_view']) ? 'Yes' : 'No';
    }

    function column_intent_name($item) {
        return !empty($item['intent_name']) ? $item['intent_name'] : 'N/A';
    }

    function column_time_created($item) {
        $date_time = date_i18n('F j, Y g:i:s a', $item['time_created']);
        return sprintf('%1$s', $date_time);
    }

    function column_time_elapsed($item) {
        $time_elapsed = $item['time_elapsed'] . 's';
        return sprintf('%1$s', $time_elapsed);
    }

    protected function extra_tablenav($which)
    {
        if ($which === 'top') {
            $currentServiceId = ! empty( $_GET['service_id'] ) ? sanitize_text_field( wp_unslash( $_GET['service_id'] ) ) : '';
            $currentStage = ! empty( $_GET['stage'] ) ? sanitize_text_field( wp_unslash( $_GET['stage'] ) ) : '';
            $testView = $_GET['test_view'] ?? '';
            $currentTestView = sanitize_text_field(wp_unslash( $testView));
            $currentPlatform = ! empty( $_GET['platform'] ) ? sanitize_text_field( wp_unslash( $_GET['platform'] ) ) : '';
            ?>
            <div class="alignleft actions">
                <select name="service_id">
                    <option value=""><?php esc_html_e( 'All Services', 'convo-plugin' ); ?></option>
                    <?php foreach ( $this->_wpConvoServiceConversationRequestDao->getDistinctRequestLogElements('service_id') as $serviceId ) { ?>
                        <option value="<?php echo esc_attr( $serviceId ); ?>"
                            <?php selected( $serviceId, $currentServiceId ); ?>>
                            <?php echo esc_html( $serviceId ); ?>
                        </option>
                    <?php } ?>
                </select>
                <label for="filter-by-stage" class="screen-reader-text">Filter by Stage</label>
                <select name="stage" id="filter-by-stage">
                    <option value=""><?php esc_html_e( 'All Stages', 'convo-plugin' ); ?></option>
                    <?php foreach ( $this->_wpConvoServiceConversationRequestDao->getDistinctRequestLogElements('stage') as $serviceId ) { ?>
                        <option value="<?php echo esc_attr( $serviceId ); ?>"
                            <?php selected( $serviceId, $currentStage ); ?>>
                            <?php echo esc_html( $serviceId ); ?>
                        </option>
                    <?php } ?>
                </select>
                <label for="filter-by-test-view" class="screen-reader-text">Filter by Test View</label>
                <select name="test_view" id="filter-by-test-view">
                    <option value=""><?php esc_html_e( 'Display All', 'convo-plugin' ); ?></option>
                    <?php foreach ( $this->_wpConvoServiceConversationRequestDao->getDistinctRequestLogElements('test_view') as $isTestView ) { ?>
                        <?php if (is_numeric($isTestView)) : ?>
                            <option value="<?php echo esc_attr( $isTestView ); ?>" <?php selected( $isTestView, $currentTestView ); ?>>
                                <?php echo esc_html($isTestView) === 1 ? 'Display Test View Only' : 'Display all but Test View'; ?>
                            </option>
                        <?php endif; ?>
                    <?php } ?>
                </select>
                <label for="filter-by-platform" class="screen-reader-text">Filter by Platform</label>
                <select name="platform" id="filter-by-platform">
                    <option value=""><?php esc_html_e( 'All Platforms', 'convo-plugin' ); ?></option>
                    <?php foreach ( $this->_wpConvoServiceConversationRequestDao->getDistinctRequestLogElements('platform') as $serviceId ) { ?>
                        <option value="<?php echo esc_attr( $serviceId ); ?>"
                            <?php selected( $serviceId, $currentPlatform ); ?>>
                            <?php echo esc_html( $serviceId ); ?>
                        </option>
                    <?php } ?>
                </select>

                <?php submit_button('Apply Filter','button-secondary', 'submit', false, array( 'id' => 'convo-request-filter-submit' )); ?>
            </div>
            <?php
        }
    }

    private function _prepareFilterArgs() {
        $filterArgs = [];

        $service_id = $_GET['service_id'] ?? '';
        $stage = $_GET['stage'] ?? '';
        $platform = $_GET['platform'] ?? '';
        $test_view = $_GET['test_view'] ?? '';

        $search = $_GET['s'] ?? '';

        if (!empty($service_id)) {
            $filterArgs['service_id'] = $service_id;
        }
        if (!empty($stage)) {
            $filterArgs['stage'] = $stage;
        }
        if (is_numeric($test_view)) {
            $filterArgs['test_view'] = $test_view;
        }
        if (!empty($platform)) {
            $filterArgs['platform'] = $platform;
        }
        if (!empty($search)) {
            $filterArgs['s'] = $search;
        }

        return $filterArgs;
    }

    private function _prepareSortArgs() {
        $sortArgs = [];

        if (isset($_GET['orderby']) && isset($_GET['order'])) {
            $sortArgs['orderby'] = $_GET['orderby'];
            $sortArgs['order'] = $_GET['order'];
        }

        return $sortArgs;
    }
}

$container = \Convo\Providers\ConvoWPPlugin::getPublicDiContainer();
$wpConvoServiceConversationRequestDao = $container->get('wpConvoServiceConversationRequestDao');

$requestLogsTable = new ConvoServiceConversationRequestLogTable($wpConvoServiceConversationRequestDao);
$requestLogsTable->prepare_items();

echo '<div class="wrap"><h1 class="wp-heading-inline">'.print_r($requestLogsTable->get_args(), true).'</h1>';
?>
<form method="get">
    <input type="hidden" name="page" value="<?php echo $_REQUEST['page'] ?>" />
    <?php $requestLogsTable->search_box('search', 'convo_request_log_search'); ?>
    <?php $requestLogsTable->display(); ?>
</form>
<div class="position-fixed bottom-0 right-0 p-3" style="z-index: 5; right: 0; bottom: 0;">
    <div id="liveToast" class="toast hide" role="alert" aria-live="assertive" aria-atomic="true" data-delay="2000">
        <div class="toast-body">
            Copied to clipboard.
        </div>
    </div>
</div>
<script>
    function copyToClipboard(event) {
        console.log('Copying text ' + event.dataset.content + ' to clipboard');
        var textArea = document.createElement("textarea");
        textArea.value = event.dataset.content
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            let myAlert = document.querySelector('.toast');
            let bsAlert = new  bootstrap.Toast(myAlert);
            bsAlert.show();
        } catch (err) {
            console.log('Oops, unable to copy', event.dataset.content);
            window.alert('Oops, unable to copy');
        }
        document.body.removeChild(textArea);
    }
</script>
<?php echo '</div>'; ?>
