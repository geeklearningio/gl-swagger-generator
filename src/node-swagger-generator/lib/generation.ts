/**
 * Created by autex on 5/20/2016.
 */
import * as swagger from 'swagger-parser'
import _ = require('lodash');
//import servicesVersion = ts.servicesVersion;


export interface IGenerationContext {
    definitions?: any[];
    definitionsMap?: {[ref: string]: any};
    operations?: any[];
    host?: string;
    basePath?: string;
    defaultConsumes?: string[];
    defaultProduces?: string[];
}

var verbs: string[] = ["get", "head", "options", "delete", "post", "patch", "put"];

export class ContextBuilder {
    constructor(
        private api: swagger.IApi,
        private languageFilter:ILanguageFilter,
        private operationFilters:IOperationFilter[],
        private definitionFilters:IDefinitionFilter[]) {
    }

    Build():IGenerationContext {

        var context: IGenerationContext = {};

        context.definitions = [];

        context.definitionsMap = {};

        context.operations = [];

        context.host = this.api.host;
        context.basePath = this.api.basePath;

        context.defaultConsumes = this.api.consumes ? this.api.consumes : [];
        context.defaultProduces = this.api.produces ? this.api.produces : [];

        _.forEach(this.api.definitions, (definition: swagger.ISchema, definitionName: string) => {

            var ref = '#\/definitions\/' + definitionName.replace(/\//g, '~1');

            //var renameTo = renameDefinitions[definitionName];
            //gutil.log(definitionName);
            //if (renameTo) {
            //    definitionName = renameTo;
            //    gutil.log('renaming : ' + renameTo);
            //}


            let definitionContext = new Definition(definitionName, definition);

            _.forEach(this.definitionFilters, (filter) => {
              definitionContext = filter.apply(definitionContext, this);
            });

            context.definitions.push(definitionContext);
            context.definitionsMap[ref] = definitionContext
        });

        _.forEach(context.definitions, (definition: Definition) => {
            if (definition.ancestorRef) {
                definition.ancestor = context.definitionsMap[definition.ancestorRef];
            }
        });


        _.forEach(this.api.paths, (path: swagger.IPath, pathName: string) => {
            for (var i = 0; i < verbs.length; i++) {
                var verb = verbs[i];
                let operation: swagger.IOperation = (<any>path)[verb];
                if (operation) {
                    var operationContext = new Operation(pathName, verb.toUpperCase(), path, operation, context);
                    _.forEach(this.operationFilters, (filter) => {
                        operationContext = filter.apply(operationContext, this);
                    });
                    context.operations.push(operationContext);
                }
            }
        });

        return context;
    }
}

export interface IOperationFilter {

}

export  interface IDefinitionFilter {

}

export interface  ILanguageFilter {

}

export interface  IProvideGenerationFilters {
    operationFilters?: IOperationFilter[];
    definitionFilters?: IDefinitionFilter[];
}



export class Operation {
    public name: string;
    public rawPath: string;
    public pathSegments: {name: string, isParam: boolean}[];
    public verb: string;
    public requestBody: any;
    public successResponse: any;
    public errorResponse: any;
    public headers: Argument[];
    public query: Argument[];
    public formData: Argument[];
    public pathParams: Argument[];
    public args: Argument[];
    public requestContentType: string;
    public responseContentType: string;

    public isJsonRequest: boolean;
    public isJsonResponse: boolean;
    public isBinaryResponse: boolean;
    public isFormDataRequest: boolean;

    public description: string;
    public consumes: string[];
    public produces: string[];
    public successSamples: {[contentType: string]: any};

    public security: string;

    constructor(pathName: string, verb: string, path: swagger.IPath, method: swagger.IOperation, context: IGenerationContext) {
        this.name = method.operationId ? method.operationId : this.verb + "/" + this.rawPath;
        this.rawPath = pathName;
        this.verb = verb;
        this.pathSegments = [];
        this.description = method.description;

        _.forEach(pathName.split('/'), (segment)=> {
            if (segment.length) {
                if (segment[0] == '{') {
                    this.pathSegments.push({name: segment.substring(1, segment.length - 1), isParam: true});
                } else {
                    this.pathSegments.push({name: segment, isParam: false})
                }
            }
        });

        this.args = [];

        _.forEach(method.parameters, (parameter: swagger.IParameterOrReference, index: number) => {
            var argument = new Argument(parameter);
            this.args.push(argument);
        });

        var bodyArg = _.filter(this.args, (arg)=> arg.in === "body");
        if (bodyArg.length) {
            this.requestBody = bodyArg[0];
        }

        this.headers = _.filter(this.args, (arg)=> arg.in === "header");
        this.query = _.filter(this.args, (arg)=> arg.in === "query");
        this.formData = _.filter(this.args, (arg)=> arg.in === "formData");
        this.pathParams = _.filter(this.args, (arg)=> arg.in === "path");

        this.args = this.args.sort(optionalThenAlpha);


        this.consumes = method.consumes ? method.consumes : context.defaultConsumes;
        this.produces = method.produces ? method.produces : context.defaultProduces;

        if (!this.consumes || !this.consumes.length) {
            this.consumes = ["application/json"];
        }

        if (!this.produces || !this.produces.length) {
            this.produces = ["application/json"];
        }

        this.isJsonRequest = this.consumes.filter(x=> x === "application/json").length > 0;
        this.isJsonResponse = this.produces.filter(x=> x === "application/json").length > 0;
        this.isBinaryResponse = !this.isJsonResponse;
        this.isFormDataRequest = this.consumes.filter(x=> x === "multipart/form-data").length > 0;

        this.security = method.security ? _.keys(method.security[0])[0] : null;

        _.forEach(method.responses, (response: swagger.IResponse, status: string) => {
            if (status.indexOf('20') === 0) {
                this.successResponse = response.schema;
                this.successSamples = response.examples;
            }
        });

    }
}

var optionalThenAlpha = (a: any, b: any): number => {
    if (a.optional === b.optional) {
        return a.name > b.name ? 1 : -1;
    } else {
        return a.optional ? 1 : -1;
    }
};

export class Argument implements swagger.IHasTypeInformation {
    name: string;
    in: string;
    type: string;
    format: string;
    $ref: string;
    items: swagger.IHasTypeInformation;
    description: string;
    optional: boolean;
    additionalProperties: swagger.IHasTypeInformation;

    constructor(parameter: swagger.IParameterOrReference) {
        this.name = parameter.name;
        this.in = parameter.in;
        this.type = parameter.type;
        this.format = parameter.format;
        this.items = parameter.items;
        this.$ref = (parameter.schema && parameter.schema.$ref) ? parameter.schema.$ref : parameter.$ref;
        this.description = parameter.description;
        this.optional = !parameter.required;
        this.additionalProperties = parameter.additionalProperties;
    }
}

export class Definition {
    public name: string;
    public rawName: string;
    public nameParts: string[];

    public properties: Property[];
    public ancestorRef: string;
    public ancestor: Definition;

    constructor(name: string, schema: swagger.ISchema) {
        if (name && schema) {
            this.name = name;
            this.rawName = name;
            this.nameParts = name.split(/[^\w]/g);
            this.properties = [];

            var injectProperties = (schemaProperties: any)=> {
                if (schemaProperties) {
                    _.forEach(schemaProperties, (property: swagger.IProperty, propertyName: string) => {
                        let propertyContext = new Property(propertyName, property);
                        this.properties.push(propertyContext);
                    });
                }
            };

            injectProperties(schema.properties);

            if (schema.allOf) {
                _.forEach(schema.allOf, (item) => {
                    if (item.$ref) {
                        this.ancestorRef = item.$ref;
                    } else {

                    }
                    injectProperties(item.properties);
                });
            }
        }
    }
}

export class Property implements swagger.IHasTypeInformation {
    public name: string;
    public type: string;
    public format: string;
    public $ref: string;
    public description: string;
    public items: swagger.IHasTypeInformation;
    public definition: Definition;
    public additionalProperties: swagger.IHasTypeInformation;

    constructor(name: string, schema: swagger.IProperty) {
        this.name = name;
        this.$ref = schema.$ref;
        this.format = schema.format;
        this.type = schema.type;
        this.description = schema.description;
        this.items = schema.items;
        this.additionalProperties = schema.additionalProperties;

        if (schema.properties) {
            this.definition = new Definition(name, schema);
        }
    }
}
