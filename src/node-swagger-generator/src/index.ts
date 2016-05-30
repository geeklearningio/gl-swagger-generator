import {ISink} from './sink';
import {IOperationFilter, ILanguageFilter, IDefinitionFilter, ContextBuilder, IGenerationContext} from './generation';
import {TemplateStore} from './templates';
import parser = require('swagger-parser');
import path = require('path');
var Promise = require('bluebird');

export interface ISwaggerGeneratorOptions {
    language: string;
    framework: string;
    version: string;

    operationFilters?: IOperationFilter[];
    definitionFilters?: IDefinitionFilter[];

    clientName?: string;
    singleFile?: boolean;

    template: string;
    templatePath?: string;
    templateOptions: any;
    handlerbarsExtensions?: any
    renameDefinitions?: {[from: string]: string}
}

interface  IParserResult {
    api: parser.IApi,
    metadata: parser.IMetadata
}

export async function generateFromJson(swaggerJson:string, options:ISwaggerGeneratorOptions, sink:ISink):Promise<void> {
    var api = await parse(swaggerJson);
}

function parse(swaggerJson:string):Promise<IParserResult> {
    var deferral = Promise.defer<void>();
    parser.parse(swaggerJson, {}, (err, api, metadata) => {
        if (err) {
            deferral.reject(err);
        } else {
            deferral.resolve({api: api, metadata: metadata});
        }
    });
    return deferral.promise;
}

export class Generator {
    templateStore:TemplateStore;
    templatePaths:string[];

    constructor(templateStores:string[]) {
        this.templatePaths = templateStores;
        if (!templateStores) this.templatePaths = [];
        this.templatePaths.push(path.join(__dirname, '../templates'));
        this.templateStore = new TemplateStore(this.templatePaths);
    }

    async Generate(swaggerJson:string, options:ISwaggerGeneratorOptions, sink:ISink):Promise<void> {
        var template = await this.templateStore.FindTemplate(options.language, options.framework, options.version);
        var api = await parse(swaggerJson);


    }
}