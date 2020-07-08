(function () {
    'use strict';
    angular.module('convo.editor').directive('textArray', ['$log', function($log) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function ($scope, $element, $attributes, ngModel) {
                function into(input) {
                    return input.split(',').map(function (s) { return s.trim() });
                }

                function out(data) {
                    return data.join(', ');
                }

                ngModel.$parsers.push(into);
                ngModel.$formatters.push(out);
            }
        }
    }])

})();