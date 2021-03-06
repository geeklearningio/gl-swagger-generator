import { ISink } from './sink';
import { IOperationFilter, ILanguageFilter, IDefinitionFilter, IProvideGenerationFilters, IProvideDependencies, ContextBuilder, IGenerationContext } from './generation';
import { TemplateStore } from './templates';
import parser = require('swagger-parser');
import * as swaggerDoc from '../typings/swagger-doc2';
import path = require('path');
import { wrapArray } from './collection';
import _ = require('lodash');
import * as visitor from './swaggerVisitor';

import classSuffixFilters = require('./filters/classSuffix');
import camlCaseFilters = require('./filters/camlCaseFilters');
import pascalCaseFilters = require('./filters/pascalCaseFilters');
import arrayNameFilters = require('./filters/arrayNameFilter');
import optionalArgsOrderFilters = require('./filters/optionalArgsOrderFilter');
import { AppenGenericMetadataVisitor } from './genericHelper';
import { ISwaggerVisitor } from './swaggerVisitor';
import { filtersLoader } from './filtersLoader';

classSuffixFilters.register();
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

    customSchemaVisitors?: (string | ISwaggerVisitor)[];

    templateOptions: any;
    handlerbarsExtensions?: any
    renameDefinitions?: { [from: string]: string };

    mediaTypesPriorities?: { [from: string]: number };
}

export interface IParserResult {
    api: swaggerDoc.IApi
}

export async function generateFromJsonOrYaml(swaggerJsonOrYaml: string, options: ISwaggerGeneratorOptions, sink: ISink, templateStores?: string[]): Promise<void> {
    try {
        var generator = new Generator(templateStores);
        await generator.generate(await parse(swaggerJsonOrYaml), options, sink);
    }
    catch (error) {
        console.error('an unknown error has occured: ', error);
        throw error;
    }
}

function parse(swaggerJsonOrYaml: string): Promise<IParserResult> {
    var deferral = bluebird.defer();
    parser.bundle(swaggerJsonOrYaml, {

    }, (err, api) => {
        if (err) {
            deferral.reject(err);
        } else {
            deferral.resolve({ api: api });
        }
    });
    return deferral.promise;
}

class LoggerVisitor extends visitor.ScopedSwaggerVisitorBase implements visitor.ISwaggerVisitor {

    visitDefinition(name: string, schema: swaggerDoc.ISchema) {
        console.log('Definition : ' + name + ', ' + this.stack.map(x => x.name).join('/'));
    }

    visitAnonymousDefinition(schema: swaggerDoc.IHasTypeInformation) {
        console.log('Anonymous : ' + this.stack.map(x => x.name).join('/'));
    }

    visitOperation(verb: string, operation: swaggerDoc.IOperation) {
        console.log(verb.toUpperCase() + ' : ' + this.stack.map(x => x.name).join('/'));
    }
}

export class Generator {
    templateStore: TemplateStore;
    templatePaths: string[];

    constructor(templateStores: string[]) {
        this.templatePaths = templateStores;
        if (!templateStores) this.templatePaths = [];
        this.templatePaths.push(path.join(__dirname, '../../templates'));
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

        if (!mode) {
            throw new Error("This template does not have a mode: " + options.mode);
        }

        var language: ILanguageFilter = template.language.filter;
        var mergedFilters = this.mergeFilters([template, mode, options]);

        var mergedOptions = {};

        if (template.templateOptions) {
            mergedOptions = _.merge(mergedOptions, template.templateOptions)
        }

        mergedOptions = _.merge(mergedOptions, options.templateOptions);

        var mergedDependencies = _.transform(_.merge(options.dependencies, template.dependencies), (result, value, key) => {
            var dep = _.clone(value);
            dep.name = key;
            result.push(dep);
        }, []);

        var mergedDevDependencies = _.transform(_.merge(options.devDependencies, template.devDependencies), (result, value, key) => {
            var dep = _.clone(value);
            dep.name = key;
            result.push(dep);
        }, []);

        var visitable = visitor.get(swaggerJson.api);

        if (options.customSchemaVisitors) {
            _.forEach(options.customSchemaVisitors, customVisitor => {
                var visitor = _.isString(customVisitor) ? eval(customVisitor)() : customVisitor;
                visitable.visit(visitor);
            })
        }

        //visitable.visit(new LoggerVisitor());

        visitable.visit(new AppenGenericMetadataVisitor());


        console.log("Preparing Generation Context");
        var contextBuilder = new ContextBuilder(
            swaggerJson.api,
            language,
            filtersLoader.resolveOperationFilters(mergedFilters.operationFilters),
            filtersLoader.resolveDefinitionFilters(mergedFilters.definitionFilters),
            mergedDependencies,
            mergedDevDependencies,
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
                    options: mergedOptions,
                    api: context,
                    data: match
                };

                var name = entry.naming(handlebarsContext);
                console.log("Starting Generation (" + entry.selector + "): " + name);
                //console.log(handlebarsContext.data);
                var content = entry.template(handlebarsContext);
                
                if (language.prettyfy && name.endsWith(language.extension)) {
                    content = language.prettyfy(content, name, mergedOptions);
                } 

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