/**
 * Created by autex on 5/20/2016.
 */

export interface ITemplate{
    name: string;
}

export class TemplateStore {
    constructor(templatePaths:string[]) {

    }

    async FindTemplate(language: string, framework: string, version : string): Promise<ITemplate>{
        return {name : "dummy"};
    }
}