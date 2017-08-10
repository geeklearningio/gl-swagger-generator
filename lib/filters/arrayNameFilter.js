"use strict";
const filtersLoader_1 = require('../filtersLoader');
function register() {
    filtersLoader_1.filtersLoader.registerDefinitionFilter("arrayName", new ArrayDefinitionNameFilter());
}
exports.register = register;
class ArrayDefinitionNameFilter {
    constructor() {
    }
    apply(definition) {
        var baseName = definition.name ? definition.name : definition.rawName;
        definition.name = baseName.replace(/\[\]/g, "Array");
        return definition;
    }
}
