import {filtersLoader} from '../filtersLoader';
import {IOperationFilter, IProvideDependencies, ILanguageFilter, IDefinitionFilter, Definition, Operation, Argument} from '../generation';
import _ = require('lodash');

export function register() {
    filtersLoader.registerOperationFilter("optionalArgsOrder", new OptionalArgsOrderFilter());
}



class OptionalArgsOrderFilter implements IOperationFilter {
    constructor() {
    }

    apply(operation: Operation): Operation {

        var mandatory : Argument[] = [];
        var optional : Argument[] = [];

        for(var i = 0; i < operation.args.length; i++){
            var arg = operation.args[i];
            if (arg.optional){
                optional.push(arg);
            }else {
                mandatory.push(arg);
            }
        }

        operation.args = mandatory.concat(optional);
        //console.log(operation.args.map(a=> a.name).join(", "));
        return operation;
    }
}
