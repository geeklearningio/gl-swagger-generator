import { IProvideDependencies, ILanguageFilter } from './generation';
import { IProvideGenerationFilters } from "./generation";
import handlebars = require("handlebars");
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
    modes: {
        [key: string]: ITemplateMode;
    };
    handlebars: handlebars.IHandlebarsEnvironment;
}
export declare class TemplateStore {
    private templateRootPaths;
    constructor(templateRootPaths: string[]);
    FindTemplate(language: string, framework: string, version: string): Promise<ITemplate>;
}
