<?php 

if ( !file_exists( '../common/__config.php')) {
	die( 'No configuration file!');
}

require_once ('../common/__config.php');


?><!DOCTYPE html>
<html lang="en" ng-app="adomee.admin">

    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>Administration - <?php echo CONVO_APP_TITLE ?></title>
        
        <?php
			require_once( '_css.include.php');
			require_once( '_js.include.php');
		?>
		
		<script src="app/routing-wp.js?v=<?php echo CONVO_VERSION ?>"></script>
		<script src="app/app.js?v=<?php echo CONVO_VERSION ?>"></script>
		
		<!--[if lt IE 9]>
          <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
          
          <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
        <![endif]-->  
        
<?php if (CONVO_IS_DEVELOPMENT) : ?>
    <style type="text/css">
        nav.navbar
        {
            border-bottom: 3px solid #ff0000;
        }
    </style>
<?php endif; ?>

    </head>
    <body ng-controller="MainController">
    
		<ng-include src="'alert.html'"></ng-include>
		
		<script type="text/ng-template" id="alert.html">
	    	<div style="position:fixed; top: 55px; right:5px; z-index:100;" class="notify-container" ng-controller="AdmAlertCtrl as alertCtrl" ng-hide="alertCtrl.alerts.length == 0">
	    		<uib-alert ng-repeat="alert in alertCtrl.alerts" type="{{alert.type}}" close="alertCtrl.closeAlert($index)">{{alert.msg}}</uib-alert>
	    	</div>
		</script>
		

    <!-- Navigation -->
    
    <div class="sk-cube-grid" data-loading>
	  <div class="sk-cube sk-cube1"></div>
	  <div class="sk-cube sk-cube2"></div>
	  <div class="sk-cube sk-cube3"></div>
	  <div class="sk-cube sk-cube4"></div>
	  <div class="sk-cube sk-cube5"></div>
	  <div class="sk-cube sk-cube6"></div>
	  <div class="sk-cube sk-cube7"></div>
	  <div class="sk-cube sk-cube8"></div>
	  <div class="sk-cube sk-cube9"></div>
	</div>
    
    <!-- Page Content -->
    <div class="{{mainContainerClass}}" style="min-height: 600px;" ng-view autoscroll="true">
    	

    </div>
    <!-- /.container -->
	
	<hr>

	<footer>
		<p style="text-align: center;">&copy; ZEF Development <?php echo date('Y'); ?>
	</footer>
	
    </body>

</html>