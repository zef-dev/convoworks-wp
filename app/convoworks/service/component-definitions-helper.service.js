/* @ngInject */
export default function ComponentDefinitionsHelperService() {
    this.toRunnableBlocks = function(definitions) {
        if (!Array.isArray(definitions)) {
            return [];
        }

        return definitions
            // get component definitions from packages
            .map(function (pckg) {
                return pckg.components || [];
            })
            // flatten array of arrays
            .flat()
            // get runnable blocks
            .filter(function (definition) {
                return Array.isArray(definition['_interfaces']) &&
                    definition['_interfaces'].indexOf('Convo\\Core\\Workflow\\IRunnableBlock') > -1;
            })
            // format options
            .map(function (block) {
                var props = block['component_properties'] || {};

                return {
                    class: block['type'],
                    name: block['name'],
                    defaultName: props['name'] ? props['name']['defaultValue'] : block['name'],
                    role: props['role'] ? props['role']['defaultValue'] : undefined,
                    namespace: block['namespace'],
                    description: block['description'],
                };
            });
    };

    this.toDatasourceContexts = function(definitions) {
        if (!Array.isArray(definitions)) {
            return [];
        }

        return definitions
            // get component definitions from packages
            .map(function (pckg) {
                return pckg.components || [];
            })
            // flatten array of arrays
            .flat()
            // get datasource components
            .filter(function (definition) {
                if (!definition || !definition['component_properties']) {
                    return false;
                }

                if (typeof definition['name'] === 'string' && definition['name'].includes('x!')) {
                    return false;
                }

                return definition['component_properties']['_workflow'] === 'datasource';
            });
    };
}

