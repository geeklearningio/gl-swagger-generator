import {IOperationFilter, IProvideDependencies, ILanguageFilter, IDefinitionFilter} from './generation';


export interface IFilterLoader {
    registerDefinitionFilter(name: string, filter: IDefinitionFilter): void;
    registerOperationFilter(name: string, filter: IOperationFilter): void;

    getDefinitionFilter(name: string): IDefinitionFilter;
    getOperationFilter(name: string): IOperationFilter;
}

class FilterLoader implements IFilterLoader {
    private definitionFilters: { [name: string]: IDefinitionFilter } = {};
    private operationFilters: { [name: string]: IOperationFilter } = {};

    registerDefinitionFilter(name: string, filter: IDefinitionFilter): void {
        this.definitionFilters[name] = filter;
    }

    registerOperationFilter(name: string, filter: IOperationFilter): void {
        this.operationFilters[name] = filter;
    }

    getDefinitionFilter(name: string): IDefinitionFilter {
        return this.definitionFilters[name];
    }

    getOperationFilter(name: string): IOperationFilter {
        return this.operationFilters[name];
    }
}

export var filtersLoader: IFilterLoader = new FilterLoader();