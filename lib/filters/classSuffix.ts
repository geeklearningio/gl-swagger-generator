import {filtersLoader} from '../filtersLoader';
import {IOperationFilter, IProvideDependencies, ILanguageFilter, IDefinitionFilter, Definition, Operation} from '../generation';
import _ = require('lodash');

export function register() {
    filtersLoader.registerDefinitionFilter("classSuffix", new ClassSuffixDefinitionNameFilter());
}

class ClassSuffixDefinitionNameFilter implements IDefinitionFilter {
    constructor() {
    }

    apply(definition: Definition): Definition {
        var baseName = definition.name ? definition.name : definition.rawName;
        definition.name = baseName + 'Class';
        return definition;
    }
}