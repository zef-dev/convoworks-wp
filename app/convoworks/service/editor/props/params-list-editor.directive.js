import template from './params-list-editor.tmpl.html';

/* @ngInject */
export default function paramsListEditor($log, $timeout) {
    return {
        restrict: 'E',
        require: '^serviceContext',
        template: template,
        scope: {
            component: '=',
            propertyDefinition: '=',
            key: '=',
            service: '='
        },
        link: function ($scope, $element, $attributes, serviceContext) {
            $log.log('paramsListEditor link');

            const BACK_TO_COMPONENT_DELAY = 250;
            let back_to_component_timeout = null;

            $scope.pairs = [];

            $scope.addParamPair = function () {
                $scope.pairs.push({
                    key: 'my_new_param',
                    val: ''
                });
                $scope.backToComponent();
            }

            $scope.removeParamPair = function (index) {
                $scope.pairs.splice(index, 1);
                $scope.backToComponent();
            }

            $scope.moveParamPairUp = function (index) {
                if (index <= 0) {
                    return;
                }
                const tmp = $scope.pairs[index - 1];
                $scope.pairs[index - 1] = $scope.pairs[index];
                $scope.pairs[index] = tmp;
                $scope.backToComponent(true);
            }

            $scope.moveParamPairDown = function (index) {
                if (index >= $scope.pairs.length - 1) {
                    return;
                }
                const tmp = $scope.pairs[index + 1];
                $scope.pairs[index + 1] = $scope.pairs[index];
                $scope.pairs[index] = tmp;
                $scope.backToComponent(true);
            }

            $scope.$watch(`component.properties.${$scope.key}`, function () {
                const current = $scope.component.properties[$scope.key];
                $log.log('paramsListEditor watch', $scope.key, current);

                if ($scope.usingRaw()) {
                    $log.log('paramsListEditor using raw for key', $scope.key);
                    return;
                }

                $scope.pairs = [];

                if (Array.isArray(current)) {
                    // New format – list of { key, val }
                    for (const item of current) {
                        if (!item || typeof item !== 'object') {
                            continue;
                        }

                        $scope.pairs.push({
                            key: item.key,
                            val: item.val
                        });
                    }
                } else if (current && typeof current === 'object') {
                    // Legacy associative object – migrate to list on first edit
                    for (let key in current) {
                        if (!Object.prototype.hasOwnProperty.call(current, key)) {
                            continue;
                        }

                        let val = current[key];
                        $scope.pairs.push({
                            key: key,
                            val: val
                        });
                    }
                }
            }, true)

            $scope.backToComponent = function (debounce = false) {
                if ($scope.usingRaw()) {
                    $log.log('paramsListEditor using raw for key', $scope.key);
                    return;
                }

                if (debounce)
                {
                    if (back_to_component_timeout) {
                        $timeout.cancel(back_to_component_timeout);
                        back_to_component_timeout = null;
                    }

                    back_to_component_timeout = $timeout(() => {
                        _backToComponent();
                    }, BACK_TO_COMPONENT_DELAY);
                }
                else
                {
                    _backToComponent();
                }
            }

            $scope.usingRaw = function () {
                // Keep honoring the system flag so we don't accidentally overwrite existing raw values.
                return $scope.component.properties[`_use_var_${$scope.key}`];
            }

            // PRIVATE
            function _backToComponent()
            {
                const list = [];

                for (const pair of $scope.pairs) {
                    if (!pair || pair.key === undefined) {
                        continue;
                    }

                    list.push({
                        key: pair.key,
                        val: pair.val
                    });
                }

                $log.log('paramsListEditor backToComponent list', $scope.key, list);
                $scope.component.properties[$scope.key] = list.length ? list : [];
            }
        }
    }
};


