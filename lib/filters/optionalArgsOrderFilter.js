"use strict";
const filtersLoader_1 = require('../filtersLoader');
function register() {
    filtersLoader_1.filtersLoader.registerOperationFilter("optionalArgsOrder", new OptionalArgsOrderFilter());
}
exports.register = register;
class OptionalArgsOrderFilter {
    constructor() {
    }
    apply(operation) {
        var mandatory = [];
        var optional = [];
        for (var i = 0; i < operation.args.length; i++) {
            var arg = operation.args[i];
            if (arg.sourceParameter.required) {
                mandatory.push(arg);
            }
            else {
                optional.push(arg);
            }
        }
        operation.args = mandatory.concat(optional);
        return operation;
    }
}
