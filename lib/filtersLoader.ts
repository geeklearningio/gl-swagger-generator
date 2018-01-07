import { IOperationFilter, IProvideDependencies, ILanguageFilter, IDefinitionFilter } from './generation';
import { IDefinition } from './typing';
import { isString } from 'lodash';

export interface IFilterLoader {
    registerDefinitionFilter(name: string, filter: IDefinitionFilter): void;
    registerOperationFilter(name: string, filter: IOperationFilter): void;

    getDefinitionFilter(name: string): IDefinitionFilter;
    getOperationFilter(name: string): IOperationFilter;

    resolveDefinitionFilters(source: (string | IDefinitionFilter)[]): IDefinitionFilter[];
    resolveOperationFilters(source: (string | IOperationFilter)[]): IOperationFilter[];
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

    resolveDefinitionFilters(source: (string | IDefinitionFilter)[]): IDefinitionFilter[] {
        return source.map(x=> {
            if (isString(x)) {
                var filter = this.definitionFilters[x];
                if (filter) {
                    return filter;
                }
                return <IDefinitionFilter>eval(x)();
            } else  {
                return <IDefinitionFilter>x;
            }
        });
    }

    resolveOperationFilters(source: (string | IOperationFilter)[]): IOperationFilter[] {
        return source.map(x=> {
            if (isString(x)) {
                var filter = this.operationFilters[x];
                if (filter) {
                    return filter;
                }
                return <IOperationFilter>eval(x)();
            } else  {
                (x);
                return <IOperationFilter>x;
            }
        });
    }
}

export var filtersLoader: IFilterLoader = new FilterLoader();