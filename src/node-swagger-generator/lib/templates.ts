/**
 * Created by autex on 5/20/2016.
 */
import {IOperationFilter, ILanguageFilter, IDefinitionFilter} from './generation';
import {IProvideGenerationFilters} from "./generation";
import {ILanguageProvider} from "./language";
import * as fs from "./filesystem";

import handlebars = require("handlebars");

import path = require('path');

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
}

export interface ITemplate extends IProvideGenerationFilters {
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
                            environement.registerPartial(baseName, templateContent);
                        } else {
                            templates[file] = environement.compile(templateContent);
                        }
                    }
                }

                console.log( JSON.stringify( Object.keys(templates)));

                var modes: { [key: string]: ITemplateMode } = {};

                for (var key in manifest.modes) {
                    if (manifest.modes.hasOwnProperty(key)) {
                        var element = manifest.modes[key];
                        var mode: ITemplateMode = {
                            entries: (<any[]>element.entries).map(e => {
                                console.log(JSON.stringify(e));
                                console.log( templates[e.template]);
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
                    language: manifest.language,
                    modes: modes,
                    handlebars: environement
                };
            }
        }

        throw new Error("No matching template was found");
    }
}