import {filtersLoader} from '../filtersLoader';
import {IOperationFilter, IProvideDependencies, ILanguageFilter, IDefinitionFilter, Definition, Operation} from '../generation';
import _ = require('lodash');

export function register() {
    filtersLoader.registerDefinitionFilter("pascalCaseName", new PascalCaseDefinitionNameFilter(true));
    filtersLoader.registerOperationFilter("pascalCaseName", new PascalCaseOperationNameFilter(true));
    filtersLoader.registerOperationFilter("pascalCaseArgumentName", new PascalCaseArgumentNameFilter(true));
}

class PascalCaseDefinitionNameFilter implements IDefinitionFilter {
    private pascalCase: (words: string[]) => string;
    constructor(preserveCasing: boolean) {
        if (preserveCasing) {
            this.pascalCase = pascalCasePreserve;
        } else {
            this.pascalCase = pascalCase;
        }
    }

    apply(definition: Definition): Definition {
        definition.name = this.pascalCase(splitString(definition.rawName));
        return definition;
    }
}

class PascalCaseOperationNameFilter implements IOperationFilter {
    private pascalCase: (words: string[]) => string;
    constructor(preserveCasing: boolean) {
        if (preserveCasing) {
            this.pascalCase = pascalCasePreserve;
        } else {
            this.pascalCase = pascalCase;
        }
    }

    apply(operation: Operation): Operation {
        operation.name = this.pascalCase(splitString(operation.name));
        return operation;
    }
}

class PascalCaseArgumentNameFilter implements IOperationFilter {
    private pascalCase: (words: string[]) => string;
    constructor(preserveCasing: boolean) {
        if (preserveCasing) {
            this.pascalCase = pascalCasePreserve;
        } else {
            this.pascalCase = pascalCase;
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
    return words.map((x: string, index: number) => {
        if (index) {
            return firstLetterUpperCasePreserveCasing(x);
        } else {
            return firstLetterLowerCasePreserveCasing(x);
        }
    }).join('');
}

function pascalCasePreserve(words: string[]): string {
    return words.map((x: string, index: number) => {
        return firstLetterUpperCasePreserveCasing(x);
    }).join('');
}


function pascalCase(words: string[]): string {
    return words.map((x: string, index: number) => {
        return firstLetterUpperCase(x);
    }).join('');
}

function firstLetterUpperCase(str: string): string {
    return (<string>str).substring(0, 1).toUpperCase() + (<string>str).substring(1).toLowerCase();
}

function firstLetterUpperCasePreserveCasing(str: string): string {
    return (<string>str).substring(0, 1).toUpperCase() + (<string>str).substring(1);
}

function firstLetterLowerCasePreserveCasing(str: string): string {
    return (<string>str).substring(0, 1).toLowerCase() + (<string>str).substring(1);
}