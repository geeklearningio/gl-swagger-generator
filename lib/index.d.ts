import { ISink } from './sink';
import { IOperationFilter, ILanguageFilter, IDefinitionFilter, IProvideGenerationFilters, IProvideDependencies } from './generation';
import { TemplateStore } from './templates';
import parser = require('swagger-parser');
export interface IPlugin {
    languages: {
        [key: string]: () => ILanguageFilter;
    };
    operationFilters: {
        [key: string]: () => IOperationFilter;
    };
    definitionFilters: {
        [key: string]: () => IDefinitionFilter;
    };
    contextVisitors: {
        [key: string]: () => IDefinitionFilter;
    };
}
export interface ISwaggerGeneratorOptions extends IProvideGenerationFilters, IProvideDependencies {
    language: string;
    framework: string;
    version: string;
    mode: string;
    contentTypes?: {
        preferred?: string[];
        override?: string[];
    };
    clientName?: string;
    templateOptions: any;
    handlerbarsExtensions?: any;
    renameDefinitions?: {
        [from: string]: string;
    };
    mediaTypesPriorities?: {
        [from: string]: number;
    };
}
export interface IParserResult {
    api: parser.IApi;
    metadata: parser.IMetadata;
}
export declare function generateFromJsonOrYaml(swaggerJsonOrYaml: string, options: ISwaggerGeneratorOptions, sink: ISink, templateStores?: string[]): Promise<void>;
export declare class Generator {
    templateStore: TemplateStore;
    templatePaths: string[];
    constructor(templateStores: string[]);
    private mergeFilters(filtersProviders);
    generate(swaggerJson: IParserResult, options: ISwaggerGeneratorOptions, sink: ISink): Promise<void>;
    private selectObjects(api, selector);
}
