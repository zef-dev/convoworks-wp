window.OPDashboard = {};

try {
    require('bootstrap');
} catch (e) {
    console.error(e);
}

// Global stuff
require('./helpers');
require('./ajax');
require('./settings');
import './OP3General'