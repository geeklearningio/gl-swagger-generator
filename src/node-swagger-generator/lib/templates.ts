/**
 * Created by autex on 5/20/2016.
 */
import {IOperationFilter, IProvideDependencies, ILanguageFilter, IDefinitionFilter} from './generation';
import {IProvideGenerationFilters} from "./generation";
import {ILanguageProvider} from "./language";
import * as fs from "./filesystem";

import handlebars = require("handlebars");
import {filtersLoader} from './filtersLoader';

import path = require('path');

var dynRequire = require.bind(this);

export interface ITemplateModeEntry {
    selector: string;
    template: HandlebarsTemplateDelegate;
    naming: HandlebarsTemplateDelegate;
}

export interface ITemplateMode extends IProvideGenerationFilters {
    entries: ITemplateModeEntry[];
}

export interface ITemplateLanguage {
    name: string;
    filter: ILanguageFilter;
}

export interface ITemplate extends IProvideGenerationFilters, IProvideDependencies {
    name: string;
    language: ITemplateLanguage;
    modes: { [key: string]: ITemplateMode };
    handlebars: handlebars.IHandlebarsEnvironment;
}

export class TemplateStore {

    constructor(private templateRootPaths: string[]) {

    }

    async FindTemplate(language: string, framework: string, version: string): Promise<ITemplate> {

        var templateSubDirectory = path.join(language, framework, version);
        var templateManifestSubPath = path.join(templateSubDirectory, 'template.json');

        for (var index = 0; index < this.templateRootPaths.length; index++) {
            var templateRootPath = this.templateRootPaths[index];
            var templatManifestPath = path.join(templateRootPath, templateManifestSubPath);

            if (await fs.existsAsync(templatManifestPath)) {
                var environement = handlebars.create();
                registerBuiltinHelpers(environement);
                var manifest = await fs.readJsonAsync(templatManifestPath);
                var directory = path.join(templateRootPath, templateSubDirectory);
                var templates: { [key: string]: HandlebarsTemplateDelegate } = {};

                var files = await fs.readDirAsync(directory);

                for (var fileIndex = 0; fileIndex < files.length; fileIndex++) {
                    var file = files[fileIndex];

                    var ext = path.extname(file);
                    var baseName = path.basename(file, ext);
                    if (ext == ".hbs") {
                        var templateContent = await fs.readAsync(path.join(directory, file));
                        if (baseName[0] === '_') {
                            //console.log('registering partial :' + baseName);
                            environement.registerPartial(baseName.substring(1), templateContent);
                        } else {
                            templates[file] = environement.compile(templateContent, {
                                noEscape: true
                            });
                        }
                    }
                }

                //console.log(JSON.stringify(Object.keys(templates)));

                var modes: { [key: string]: ITemplateMode } = {};

                for (var key in manifest.modes) {
                    if (manifest.modes.hasOwnProperty(key)) {
                        var element = manifest.modes[key];
                        var mode: ITemplateMode = {
                            entries: (<any[]>element.entries).map(e => {
                                //console.log(JSON.stringify(e));
                                //console.log(templates[e.template]);
                                return {
                                    selector: e.selector,
                                    template: templates[e.template],
                                    naming: environement.compile(e.naming)
                                }
                            })
                        };
                        modes[key] = mode;
                    }
                }
                return {
                    name: manifest.name,
                    language: {
                        name: manifest.language.name,
                        filter: (manifest.language.filter ? require(manifest.language.filter) : require('./languages/' + manifest.language.name)).create()
                    },
                    dependencies: manifest.dependencies,
                    modes: modes,
                    handlebars: environement,
                    operationFilters: manifest.definitionFilters ? manifest.definitionFilters.map((name: string) => filtersLoader.getOperationFilter(name)) : [],
                    definitionFilters: manifest.definitionFilters ? manifest.definitionFilters.map((name: string) => filtersLoader.getDefinitionFilter(name)) : [],
                };
            }
        }

        throw new Error("No matching template was found");
    }
}


function registerBuiltinHelpers(handlebars: Handlebars.IHandlebarsEnvironment) {

    // handlebars.registerDecorator("importScope", (fn, props, container, decoratorContext, data) => {
    //     props.importScope = {};
    //     console.log(container);
    //     let ret = (context: any, options: any) => {
    //         let executionResult = fn(context, options);
    //         console.log("requesting partial : " + decoratorContext.args[0]);
    //         console.log(container.partials[decoratorContext.args[0]]);
    //         console.log(Object.keys(props.importScope))
    //         // let partialResult = (<any>handlebars).VM.invokePartial(container.partials[decoratorContext.args[0]], decoratorContext.args[0], Object.keys(props.importScope), container.helpers, container.partials, data);
    //         let partialResult = container.invokePartial(decoratorContext.args[0], decoratorContext, options);
    //         props.importScope = null;
    //         return partialResult + executionResult;
    //     };
    //     return ret;
    // });

    // handlebars.registerDecorator("import", (fn, props, container, context) => {
    //         console.log('import decorator');
    //     if (props.importScope && context) {
    //         console.log('pushing import to scope : ' + context);
    //         props.importScope[String(context)] = context;
    //     }
    //     return fn;
    // });

    handlebars.registerHelper('json', (context: any) => {
        return JSON.stringify(context, null, 4);
    });

    handlebars.registerHelper('lowerCase', (context: string) => {
        return context.toLowerCase();
    });

    handlebars.registerHelper('upperCase', (context: string) => {
        return context.toUpperCase();
    });

    handlebars.registerHelper('camlCase', (context: any) => {
        var contextType = typeof context;
        if (contextType === 'string') {
            context = context.split(/[^\w]/g);
        }

        return camlCasePreserve(<string[]>context);
    });

    handlebars.registerHelper('pascalCase', (context: any) => {
        var contextType = typeof context;
        if (contextType === 'string') {
            context = context.split(/[^\w]/g);
        }

        return pascalCasePreserve(<string[]>context);
    });

    handlebars.registerHelper('pascalCaseOverwriteCasing', (context: any) => {
        var contextType = typeof context;
        if (contextType === 'string') {
            context = context.split(/[^\w]/g);
        }

        return pascalCase(<string[]>context);
    });

    handlebars.registerHelper('mapLookup', function (map: any, lookupValue: string, options: any): any {
        if (map) {
            return options.fn(map[lookupValue]);
        }
        return options.fn({});
    });

    handlebars.registerHelper('forIn', function (map: any, options: any): any {
        if (map) {
            var result: string = "";
            for (var key in map) {
                if (map.hasOwnProperty(key)) {
                    var element = map[key];
                    result += options.fn({ key: key, value: element });
                }
            }
            return result;
        }
        return options.fn({});
    });

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