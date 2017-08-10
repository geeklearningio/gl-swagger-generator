"use strict";
const filtersLoader_1 = require('../filtersLoader');
const _ = require('lodash');
function register() {
    filtersLoader_1.filtersLoader.registerDefinitionFilter("pascalCaseName", new PascalCaseDefinitionNameFilter(true));
    filtersLoader_1.filtersLoader.registerOperationFilter("pascalCaseName", new PascalCaseOperationNameFilter(true));
    filtersLoader_1.filtersLoader.registerOperationFilter("pascalCaseArgumentName", new PascalCaseArgumentNameFilter(true));
}
exports.register = register;
class PascalCaseDefinitionNameFilter {
    constructor(preserveCasing) {
        if (preserveCasing) {
            this.pascalCase = pascalCasePreserve;
        }
        else {
            this.pascalCase = pascalCase;
        }
    }
    apply(definition) {
        var baseName = definition.name ? definition.name : definition.rawName;
        definition.name = this.pascalCase(splitString(baseName));
        return definition;
    }
}
class PascalCaseOperationNameFilter {
    constructor(preserveCasing) {
        if (preserveCasing) {
            this.pascalCase = pascalCasePreserve;
        }
        else {
            this.pascalCase = pascalCase;
        }
    }
    apply(operation) {
        operation.name = this.pascalCase(splitString(operation.name));
        return operation;
    }
}
class PascalCaseArgumentNameFilter {
    constructor(preserveCasing) {
        if (preserveCasing) {
            this.pascalCase = pascalCasePreserve;
        }
        else {
            this.pascalCase = pascalCase;
        }
    }
    apply(operation) {
        _.forEach(operation.args, (arg) => {
            arg.name = this.pascalCase(splitString(arg.rawName));
        });
        return operation;
    }
}
function splitString(str) {
    return str.split(/[^\w]/g);
}
function camlCasePreserve(words) {
    return words.map((x, index) => {
        if (index) {
            return firstLetterUpperCasePreserveCasing(x);
        }
        else {
            return firstLetterLowerCasePreserveCasing(x);
        }
    }).join('');
}
function pascalCasePreserve(words) {
    return words.map((x, index) => {
        return firstLetterUpperCasePreserveCasing(x);
    }).join('');
}
function pascalCase(words) {
    return words.map((x, index) => {
        return firstLetterUpperCase(x);
    }).join('');
}
function firstLetterUpperCase(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
}
function firstLetterUpperCasePreserveCasing(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1);
}
function firstLetterLowerCasePreserveCasing(str) {
    return str.substring(0, 1).toLowerCase() + str.substring(1);
}
