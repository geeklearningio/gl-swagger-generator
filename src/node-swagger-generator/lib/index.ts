import {ISink} from './sink';
import {IOperationFilter, ILanguageFilter, IDefinitionFilter, IProvideGenerationFilters, IProvideDependencies, ContextBuilder, IGenerationContext} from './generation';
import {TemplateStore} from './templates';
import parser = require('swagger-parser');
import path = require('path');
import {wrapArray} from './collection';
import _ = require('lodash');
import * as visitor from './swaggerVisitor';

import camlCaseFilters = require('./filters/camlCaseFilters');
import pascalCaseFilters = require('./filters/pascalCaseFilters');
import arrayNameFilters = require('./filters/arrayNameFilter');
import optionalArgsOrderFilters = require('./filters/optionalArgsOrderFilter');

camlCaseFilters.register();
pascalCaseFilters.register();
arrayNameFilters.register();
optionalArgsOrderFilters.register();

var bluebird = require('bluebird');

export interface IPlugin {
    languages: { [key: string]: () => ILanguageFilter };
    operationFilters: { [key: string]: () => IOperationFilter };
    definitionFilters: { [key: string]: () => IDefinitionFilter };
    contextVisitors: { [key: string]: () => IDefinitionFilter };
}

export interface ISwaggerGeneratorOptions extends IProvideGenerationFilters, IProvideDependencies {
    language: string;
    framework: string;
    version: string;

    mode: string;

    contentTypes?: {
        preferred?: string[];
        override?: string[];
    }

    clientName?: string;

    templateOptions: any;
    handlerbarsExtensions?: any
    renameDefinitions?: { [from: string]: string };

    mediaTypesPriorities?: { [from: string]: number };
}

export interface IParserResult {
    api: parser.IApi,
    metadata: parser.IMetadata
}

export async function generateFromJsonOrYaml(swaggerJsonOrYaml: string, options: ISwaggerGeneratorOptions, sink: ISink, templateStores?: string[]): Promise<void> {
    var generator = new Generator(templateStores);
    await generator.generate(await parse(swaggerJsonOrYaml), options, sink);
}

function parse(swaggerJsonOrYaml: string): Promise<IParserResult> {
    var deferral = bluebird.defer();
    parser.parse(swaggerJsonOrYaml, {
       
    }, (err, api, metadata) => {
        if (err) {
            deferral.reject(err);
        } else {
            deferral.resolve({ api: api, metadata: metadata });
        }
    });
    return deferral.promise;
}

class LoggerVisitor extends visitor.ScopedSwaggerVisitorBase implements visitor.ISwaggerVisitor {

    visitDefinition(name: string, schema: parser.ISchema) {
        console.log('Definition : ' + name + ', ' + this.stack.map(x => x.name).join('/'));
    }

    visitAnonymousDefinition(schema: parser.IHasTypeInformation) {
        console.log('Anonymous : ' + this.stack.map(x => x.name).join('/'));
    }

    visitOperation(verb: string, operation: parser.IOperation) {
        console.log(verb.toUpperCase() + ' : ' + this.stack.map(x => x.name).join('/'));
    }
}

export class Generator {
    templateStore: TemplateStore;
    templatePaths: string[];

    constructor(templateStores: string[]) {
        this.templatePaths = templateStores;
        if (!templateStores) this.templatePaths = [];
        this.templatePaths.push(path.join(__dirname, '../templates'));
        this.templateStore = new TemplateStore(this.templatePaths);
    }

    private mergeFilters(filtersProviders: IProvideGenerationFilters[]): IProvideGenerationFilters {
        var result: IProvideGenerationFilters = {
            definitionFilters: [],
            operationFilters: []
        };

        _.forEach(filtersProviders, (provider) => {
            if (provider.definitionFilters) {
                result.definitionFilters = result.definitionFilters.concat(provider.definitionFilters)
            }
            if (provider.operationFilters) {
                result.operationFilters = result.operationFilters.concat(provider.operationFilters)
            }
        });
        return result;
    }


    async generate(swaggerJson: IParserResult, options: ISwaggerGeneratorOptions, sink: ISink): Promise<void> {
        var template = await this.templateStore.FindTemplate(options.language, options.framework, options.version);
        var mode = template.modes[options.mode];
        var language: ILanguageFilter = template.language.filter;
        var mergedFilters = this.mergeFilters([template, mode, options]);
        // console.log('merged filters');
        // console.log(mergedFilters);
        var mergedDependencies = _.transform(_.merge(options.dependencies, template.dependencies), (result, value, key) => {
            var dep = _.clone(value);
            dep.name = key;
            result.push(dep);
        }, []);

        var visitable = visitor.get(swaggerJson.api);

        visitable.visit(new LoggerVisitor());

        console.log("Preparing Generation Context");
        var contextBuilder = new ContextBuilder(
            swaggerJson.api,
            language,
            mergedFilters.operationFilters,
            mergedFilters.definitionFilters,
            mergedDependencies,
            options.ambientTypes,
            options.mediaTypesPriorities
        );

        var context = contextBuilder.Build();
        console.log("Finished Generetion Context preparation")
        for (var i = 0; i < mode.entries.length; i++) {
            var entry = mode.entries[i];

            var matches = this.selectObjects(context, entry.selector);
            for (var m = 0; m < matches.length; m++) {
                var match = matches[m];
                var handlebarsContext = {
                    options: options.templateOptions,
                    api: context,
                    data: match
                };

                var name = entry.naming(handlebarsContext);
                console.log("Starting Generation (" + entry.selector + "): " + name);
                //console.log(handlebarsContext.data);
                var content = entry.template(handlebarsContext);
                sink.push(name, content);
            }
        }

        sink.complete();
    }

    private selectObjects(api: IGenerationContext, selector: string): any[] {
        var segments = selector ? selector.split('.') : [];
        var currentNode: any = api;
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            if (segment in currentNode) {
                currentNode = currentNode[segment];
            } else {
                currentNode = [];
                break;
            }
        }
        if (Array.isArray(currentNode)) {
            return currentNode.filter((x: any) => !x.shouldIgnore);
        } else {
            return currentNode.shouldIgnore ? [] : [currentNode];
        }
    }
}