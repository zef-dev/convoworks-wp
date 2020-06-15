<div ng-app="adomee.admin">
<?php
if ( ! defined('ABSPATH')) {
    exit;
}
?>

<script src="<?php echo CONVOWP_ASSETS_URL ?>js/ng-all.js"></script>
<style src="<?php echo CONVOWP_ASSETS_URL ?>css/ng-all.css"></style>
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
    <div ng-controller="MainController">
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

</div>
