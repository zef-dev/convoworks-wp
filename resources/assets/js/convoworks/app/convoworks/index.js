import appModule from './app.module';

import 'angular-local-storage';

import './app.route';

import './style.css';

//import 'angular-route';
//import 'angular-animate';
//import 'angular-bootstrap-contextmenu';
//import 'angular-cookies';
//import 'angular-sanitize';
//import 'angularjs-ui-bootstrap';
//import 'ng-file-upload';


export default appModule
    .config( function ( localStorageServiceProvider) {
      localStorageServiceProvider
        .setPrefix( 'convoAdmin')
//      .setStorageType( 'sessionStorage')
        .setNotify( true, true)
    })
    .name;
