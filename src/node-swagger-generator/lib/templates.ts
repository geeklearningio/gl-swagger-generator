/**
 * Created by autex on 5/20/2016.
 */
import {IOperationFilter, ILanguageFilter, IDefinitionFilter} from './generation';
import {IProvideGenerationFilters} from "./generation";

import handlebars = require("handlebars");

export interface  ITemplateModeEntry {
    selector: string;
    template: Function;
    naming: Function;
}

export interface ITemplateMode extends IProvideGenerationFilters {
    entries : ITemplateModeEntry[];
}

export interface ITemplate extends IProvideGenerationFilters {
    name: string;
    modes : {[key: string] : ITemplateMode};
    handlebars : handlebars.IHandlebarsEnvironment;
}

export class TemplateStore {

    constructor(templatePaths:string[]) {

    }

    async FindTemplate(language: string, framework: string, version : string): Promise<ITemplate>{
        var environement = handlebars.create();



        return {
            name : "dummy",
            modes : {

            },
            handlebars: environement
        };
    }
}