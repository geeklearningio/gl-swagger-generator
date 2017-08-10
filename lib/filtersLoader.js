"use strict";
class FilterLoader {
    constructor() {
        this.definitionFilters = {};
        this.operationFilters = {};
    }
    registerDefinitionFilter(name, filter) {
        this.definitionFilters[name] = filter;
    }
    registerOperationFilter(name, filter) {
        this.operationFilters[name] = filter;
    }
    getDefinitionFilter(name) {
        return this.definitionFilters[name];
    }
    getOperationFilter(name) {
        return this.operationFilters[name];
    }
}
exports.filtersLoader = new FilterLoader();
