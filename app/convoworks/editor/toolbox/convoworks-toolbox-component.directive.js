import template from './convoworks-toolbox-component.tmpl.html';

/* @ngInject */
export default function convoworksToolboxComponent( $log, $compile, ComponentDragDropService)
{
    return {
        restrict: 'E',
        scope: {
            'componentDefinition' : '='
        },
        require : '^serviceContext',
        template: template,
        link: function( $scope, $element, $attributes, serviceContext) {

            var $draggable;

            _initDraggable();

            $scope.$on('$destroy', function() {
                if ($draggable) {
                    ComponentDragDropService.destroyDraggable($draggable);
                    $draggable = null;
                }
            });

            $scope.isDeprecated =   function() {
                if ( $scope.componentDefinition.name.indexOf('X!') === 0 || $scope.componentDefinition.name.indexOf('x!') === 0) {
                    return true;
                }
                return false;
            }

            function _initDraggable()
            {
                $draggable = $element.find( ComponentDragDropService.CONFIG.TOOLBOX_COMPONENT_SELECTOR);
                
                // Use service to initialize draggable for component definition
                ComponentDragDropService.initDefinitionDraggable(
                    $draggable,
                    $scope.componentDefinition
                );
            }
        }
    }
}
