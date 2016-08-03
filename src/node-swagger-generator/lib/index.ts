import {ISink} from './sink';
import {IOperationFilter, ILanguageFilter, IDefinitionFilter, IProvideGenerationFilters, ContextBuilder, IGenerationContext} from './generation';
import {TemplateStore} from './templates';
import parser = require('swagger-parser');
import path = require('path');
var Promise = require('bluebird');



export interface ISwaggerGeneratorOptions extends IProvideGenerationFilters {
    language: string;
    framework: string;
    version: string;

    mode: string;
    //operationFilters?: IOperationFilter[];
    //definitionFilters?: IDefinitionFilter[];

    contentTypes? : {
        preferred? : string[];
        override? : string[];
    }

    clientName?: string;

    templateOptions: any;
    handlerbarsExtensions?: any
    renameDefinitions?: {[from: string]: string}
}

interface  IParserResult {
    api: parser.IApi,
    metadata: parser.IMetadata
}

export async function generateFromJson(swaggerJson:string, options:ISwaggerGeneratorOptions, sink:ISink):Promise<void> {
    var generator  = new Generator([]);
    await generator.Generate(await parse(swaggerJson), options, sink);
}

function parse(swaggerJson:string):Promise<IParserResult> {
    var deferral = Promise.defer();
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

    private mergeFilters(filtersProviders :IProvideGenerationFilters[]) : IProvideGenerationFilters{
        return {
            definitionFilters: [],
            operationFilters: []
        };
    }

    async Generate(swaggerJson:IParserResult, options:ISwaggerGeneratorOptions, sink:ISink):Promise<void> {
        var template = await this.templateStore.FindTemplate(options.language, options.framework, options.version);
        var mode = template.modes[options.mode];
        var language: ILanguageFilter = null;
        var mergedFilters = this.mergeFilters([template, mode, options]);

        var contextBuilder = new ContextBuilder(swaggerJson.api, language,mergedFilters.operationFilters, mergedFilters.definitionFilters);
        var context = contextBuilder.Build();

        for(var i = 0; i < mode.entries.length; i ++){
            var entry = mode.entries[i];

            var matches = this.selectObjects(context, entry.selector);
            for(var m = 0; m < matches.length; m++){
                var match = matches[m];
                var handlebarsContext = {
                    options : options.templateOptions,
                    api : context,
                    data : match
                };

                var content = entry.template(handlebarsContext);
                var name = entry.naming(handlebarsContext);
                sink.push(name, content);
            }
        }

        sink.complete();
    }

    private selectObjects(api: IGenerationContext, selector: string): any[] {
        var segments = selector.split('.');
        var currentNode: any = api;
        for(var i = 0; i < segments.length; i++){
            var segment = segments[i];
            if (segment in currentNode){
                currentNode = currentNode[segment];
            } else {
                currentNode = [];
                break;
            }
        }
        if (Array.isArray(currentNode)){
            return currentNode;
        } else {
            return [currentNode];
        }
    }
}