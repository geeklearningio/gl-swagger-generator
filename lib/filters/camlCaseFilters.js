"use strict";
const filtersLoader_1 = require('../filtersLoader');
const _ = require('lodash');
function register() {
    filtersLoader_1.filtersLoader.registerDefinitionFilter("camlCaseName", new CamlCaseDefinitionNameFilter(true));
    filtersLoader_1.filtersLoader.registerOperationFilter("camlCaseName", new CamlCaseOperationNameFilter(true));
    filtersLoader_1.filtersLoader.registerOperationFilter("camlCaseArgumentName", new CamlCaseArgumentNameFilter(true));
}
exports.register = register;
class CamlCaseDefinitionNameFilter {
    constructor(preserveCasing) {
        if (preserveCasing) {
            this.pascalCase = camlCasePreserve;
        }
        else {
            this.pascalCase = camlCase;
        }
    }
    apply(definition) {
        var baseName = definition.name ? definition.name : definition.rawName;
        definition.name = this.pascalCase(splitString(baseName));
        return definition;
    }
}
class CamlCaseOperationNameFilter {
    constructor(preserveCasing) {
        if (preserveCasing) {
            this.pascalCase = camlCasePreserve;
        }
        else {
            this.pascalCase = camlCase;
        }
    }
    apply(operation) {
        operation.name = this.pascalCase(splitString(operation.name));
        return operation;
    }
}
class CamlCaseArgumentNameFilter {
    constructor(preserveCasing) {
        if (preserveCasing) {
            this.pascalCase = camlCasePreserve;
        }
        else {
            this.pascalCase = camlCase;
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
function camlCase(words) {
    return words.map((x, index) => {
        return firstLetterLowerCase(x);
    }).join('');
}
function firstLetterLowerCase(str) {
    return str.substring(0, 1).toLowerCase() + str.substring(1).toLowerCase();
}
function firstLetterUpperCasePreserveCasing(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1);
}
function firstLetterLowerCasePreserveCasing(str) {
    return str.substring(0, 1).toLowerCase() + str.substring(1);
}
