import { IOperationFilter, IDefinitionFilter } from './generation';
export interface IFilterLoader {
    registerDefinitionFilter(name: string, filter: IDefinitionFilter): void;
    registerOperationFilter(name: string, filter: IOperationFilter): void;
    getDefinitionFilter(name: string): IDefinitionFilter;
    getOperationFilter(name: string): IOperationFilter;
}
export declare var filtersLoader: IFilterLoader;
