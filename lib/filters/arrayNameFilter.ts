import {filtersLoader} from '../filtersLoader';
import {IOperationFilter, IProvideDependencies, ILanguageFilter, IDefinitionFilter, Definition, Operation} from '../generation';
import _ = require('lodash');

export function register() {
    filtersLoader.registerDefinitionFilter("arrayName", new ArrayDefinitionNameFilter());
}

class ArrayDefinitionNameFilter implements IDefinitionFilter {
    constructor() {
    }

    apply(definition: Definition): Definition {
        var baseName = definition.name ? definition.name : definition.rawName;
        definition.name = baseName.replace(/\[\]/g, "Array");
        return definition;
    }
}