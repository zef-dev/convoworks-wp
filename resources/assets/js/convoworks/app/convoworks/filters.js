(function () {
    'use strict';

    angular.module('convo.editor').filter('propsFilter', function() {
          return function(items, props) {
            var out = [];

            if (angular.isArray(items)) {
                var hastext =   false;
                  items.forEach(function(item) {
                    var itemMatches = false;
    
                    var keys = Object.keys(props);
                    if (keys.length == 0)
                        return items;
                    for (var i = 0; i < keys.length; i++) {
                      var prop = keys[i];
                      var text = props[prop].toLowerCase();
                      
                      if (text)
                          hastext   =   true;
                      if (item[prop] && (item[prop].toString().toLowerCase().indexOf(text) !== -1)) {
                        itemMatches = true;
                        break;
                      }
                    }
                    if (itemMatches) {
                      out.push(item);
                    }
                  });
              
                if (!hastext)
                    return items;
            
            
            } else {
              // Let the output be the input untouched
              out = items;
            }

            return out;
          };
        });
    
    angular.module('convo.editor').filter('percent', [ function () {
        return function (value) {
            return value + ' %';
        };     
    }]);
    
    angular.module('convo.editor').filter('prettyJson', [ function() {
        return function (value) {
            return JSON.stringify( value, null, 2);
        }
    }]);

    
    angular.module('convo.editor').filter('admDate', function ( $filter) {
        
        return function ( strDate, format) {
            
            if (angular.isNumber( strDate))
                return $filter('date')( new Date( strDate * 1000), format);
            
            return $filter('date')( Date.parse( strDate), format);
        };     
    });
    
    angular.module('convo.editor').filter('unsafe', function($sce) {
        return function(val) {
            return $sce.trustAsHtml(val);
        };
    });

    angular.module('convo.editor').filter('keys', function() {
        return function (value) {
            return Object.keys(value);
        }
    })

})();