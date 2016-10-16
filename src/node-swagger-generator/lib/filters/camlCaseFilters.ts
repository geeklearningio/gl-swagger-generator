import {filtersLoader} from '../filtersLoader';
import {IOperationFilter, IProvideDependencies, ILanguageFilter, IDefinitionFilter, Definition, Operation} from '../generation';
import _ = require('lodash');

export function register() {
    filtersLoader.registerDefinitionFilter("camlCaseName", new CamlCaseDefinitionNameFilter(true));
    filtersLoader.registerOperationFilter("camlCaseName", new CamlCaseOperationNameFilter(true));
    filtersLoader.registerOperationFilter("camlCaseArgumentName", new CamlCaseArgumentNameFilter(true));
}

class CamlCaseDefinitionNameFilter implements IDefinitionFilter {
    private pascalCase: (words: string[]) => string;
    constructor(preserveCasing: boolean) {
        if (preserveCasing) {
            this.pascalCase = camlCasePreserve;
        } else {
            this.pascalCase = camlCase;
        }
    }

    apply(definition: Definition): Definition {
        var baseName = definition.name ? definition.name : definition.rawName;
        definition.name = this.pascalCase(splitString(baseName));
        return definition;
    }
}

class CamlCaseOperationNameFilter implements IOperationFilter {
    private pascalCase: (words: string[]) => string;
    constructor(preserveCasing: boolean) {
        if (preserveCasing) {
            this.pascalCase = camlCasePreserve;
        } else {
            this.pascalCase = camlCase;
        }
    }

    apply(operation: Operation): Operation {
        operation.name = this.pascalCase(splitString(operation.name));
        return operation;
    }
}

class CamlCaseArgumentNameFilter implements IOperationFilter {
    private pascalCase: (words: string[]) => string;
    constructor(preserveCasing: boolean) {
        if (preserveCasing) {
            this.pascalCase = camlCasePreserve;
        } else {
            this.pascalCase = camlCase;
        }
    }

    apply(operation: Operation): Operation {
        _.forEach(operation.args, (arg) => {
            arg.name = this.pascalCase(splitString(arg.rawName));
        });
        return operation;
    }
}

function splitString(str: string): string[] {
    return str.split(/[^\w]/g);
}

function camlCasePreserve(words: string[]): string {
    return words.map((x: string, index: number)=> {
        if (index) {
            return firstLetterUpperCasePreserveCasing(x);
        } else {
            return firstLetterLowerCasePreserveCasing(x);
        }
    }).join('');
}

function camlCase(words: string[]): string {
    return words.map((x: string, index: number) => {
        return firstLetterLowerCase(x);
    }).join('');
}

function firstLetterLowerCase(str: string): string {
    return (<string>str).substring(0, 1).toLowerCase() + (<string>str).substring(1).toLowerCase();
}

function firstLetterUpperCasePreserveCasing(str: string): string {
    return (<string>str).substring(0, 1).toUpperCase() + (<string>str).substring(1);
}

function firstLetterLowerCasePreserveCasing(str: string): string {
    return (<string>str).substring(0, 1).toLowerCase() + (<string>str).substring(1);
}