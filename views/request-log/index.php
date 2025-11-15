<?php
if (!defined('ABSPATH')) {
    exit;
}

// avoid recursively appending wp http referrer query argument
// thanks to \WPForms_Overview::remove_referer
if ( isset( $_SERVER['REQUEST_URI'] ) ) {
    $_SERVER['REQUEST_URI'] = remove_query_arg( '_wp_http_referer', wp_unslash( $_SERVER['REQUEST_URI'] ) );
}

?>
<?php if (isset($_GET['action']) && $_GET['action'] = 'details'): ?>
    <?php include(__DIR__ .'/details.php') ?>
<?php else: ?>
    <?php include(__DIR__ .'/table_list.php') ?>
<?php endif; ?>
