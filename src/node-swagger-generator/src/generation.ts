/**
 * Created by autex on 5/20/2016.
 */
import {IApi} from 'swagger-parser'

export interface IGenerationContext {
}

export class ContextBuilder {
    constructor(api:IApi, languageFilter:ILanguageFilter, operationFilters:IOperationFilter[], definitionFilters:IDefinitionFilter[]) {

    }

    Build():IGenerationContext {
        return [];
    }
}

export interface IOperationFilter {

}

export  interface IDefinitionFilter {

}

export interface  ILanguageFilter {

}