import template from './entity-list.tmpl.html';

/* @ngInject */
export default function entityList($log, $window)
{
    return {
        restrict: 'E',
        require: '^serviceContext',
        template: template,
        link: function( $scope, $element, $attributes, serviceContext) {
            $log.debug( 'entityList link');

            $scope.$watch(() => serviceContext.getSelectedService().entities, (newVal, oldVal) => {
                $scope.entities = newVal;
            }, true);

            $scope.deleteEntity = function($event, entity) {
                $event.preventDefault();
                $event.stopPropagation();

                if ($window.confirm(`Are you sure you want to delete ${entity.name}?`)) {
                    serviceContext.removeConvoEntity(entity);
                }
            }

            $scope.getEntitiesCount = function (entity)
            {
                if (!entity.values || entity.values.length === 0) {
                    return 'No entity values';
                }

                if (entity.values.length === 1) {
                    return '1 value';
                }

                return `${entity.values.length} values`;
            }
        }
    }
}
