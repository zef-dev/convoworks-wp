
export default function alertIndicator( $log) {
    
    $log.log('jsonText init');
    
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attr, ngModel) 
        {
            function into(input) {
                try {
                    scope.$emit('JsonError', false);
                    return JSON.parse(input);
                } catch (e) {
                    $log.warn('Error parsing JSON:', e.message);
                    scope.$emit('JsonError', true);
                    return {};
                }
            }
            
            function out(data) {
                return JSON.stringify(data, null, 2);
            }

            ngModel.$parsers.push(into);
            ngModel.$formatters.push(out);
        }
    };
}
