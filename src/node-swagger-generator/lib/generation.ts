/**
 * Created by autex on 5/20/2016.
 */
import * as swagger from 'swagger-parser'
import _ = require('lodash');
//import servicesVersion = ts.servicesVersion;


export interface IGenerationContext {
    definitions?: Definition[];
    definitionsMap?: { [ref: string]: Definition };
    operations?: Operation[];
    host?: string;
    basePath?: string;
    defaultConsumes?: string[];
    defaultProduces?: string[];
    dependencies?: IDependency[];
    ambientTypes?: IImportedType[];
}

var verbs: string[] = ["get", "head", "options", "delete", "post", "patch", "put"];

export class ContextBuilder {
    context: IGenerationContext = {};

    constructor(
        private api: swagger.IApi,
        private languageFilter: ILanguageFilter,
        private operationFilters: IOperationFilter[],
        private definitionFilters: IDefinitionFilter[],
        private dependencies: IDependency[],
        private ambientTypes: IImportedType[]) {
    }

    GetType(ref: string): IType {
        return this.languageFilter.getCustomType(this.GetOrCreateDefinition(ref), this);
    }

    GetTypeFromSchema(schema: swagger.ISchema): IType {
        if (schema.$ref) {
            return this.GetType(schema.$ref);
        } else {
            throw new Error('Anonymous return type are not yet supported');
        }
    }

    GetTypeFromTypeInformation(typeInfo: swagger.IHasTypeInformation): IType {
        if (typeInfo.$ref) {
            return this.GetType(typeInfo.$ref);
        } else {
            var type = this.languageFilter.getType(typeInfo, this);
            if (type) {
                return type;
            } else {
                throw new Error('Anonymous types are not yet supported');
            }
        }
    }

    GetOrCreateDefinition(ref: string): Definition {

        let definition = this.context.definitionsMap[ref];

        if (!definition) {
            definition = new Definition();
            this.context.definitions.push(definition);
            this.context.definitionsMap[ref] = definition
        }
        return definition;
    }

    GetOrCreateDefinitionFromSchema(definitionName: string, schema: swagger.ISchema) {
        var ref = '#\/definitions\/' + definitionName.replace(/\//g, '~1');

        let definition = this.context.definitionsMap[ref];

        if (!definition) {
            definition = new Definition();

            this.context.definitions.push(definition);
            this.context.definitionsMap[ref] = definition
        }

        if (!definition.isInitialized) {
            definition.initFromSchema(definitionName, schema, this);

            _.forEach(this.definitionFilters, (filter) => {
                filter.apply(definition, this);
            });

            //console.log(this.context.definitionsMap[ref]);
        }

        return definition;
    }

    GetOrCreateAnonymous(schema: swagger.IHasTypeInformation, parents: string[]) {
        throw new Error("Not implemented exception");
    }

    Build(): IGenerationContext {
        this.context = {};

        this.context.ambientTypes = [].concat(this.ambientTypes);

        _.forEach(this.dependencies, (dependency) => {
            if (dependency.types) {
                this.context.ambientTypes = this.context.ambientTypes.concat(dependency.types);
            }
        });

        this.context.definitions = [];
        this.context.dependencies = this.dependencies;
        this.context.definitionsMap = {};

        this.context.operations = [];

        this.context.host = this.api.host;
        this.context.basePath = this.api.basePath;

        this.context.defaultConsumes = this.api.consumes ? this.api.consumes : [];
        this.context.defaultProduces = this.api.produces ? this.api.produces : [];

        _.forEach(this.api.definitions, (definition: swagger.ISchema, definitionName: string) => {
            var ref = '#\/definitions\/' + definitionName.replace(/\//g, '~1');
            this.GetOrCreateDefinitionFromSchema(definitionName, definition);
        });

        _.forEach(this.context.definitions, (definition: Definition) => {
            if (definition.ancestorRef) {
                definition.ancestor = this.context.definitionsMap[definition.ancestorRef];
            }
        });

        _.forEach(this.api.paths, (path: swagger.IPath, pathName: string) => {
            for (var i = 0; i < verbs.length; i++) {
                var verb = verbs[i];
                let operation: swagger.IOperation = (<any>path)[verb];
                if (operation) {
                    var operationContext = new Operation(pathName, verb.toUpperCase(), path, operation, this);
                    _.forEach(this.operationFilters, (filter) => {
                        operationContext = filter.apply(operationContext, this);
                    });
                    this.context.operations.push(operationContext);
                }
            }
        });

        return this.context;
    }
}

export interface IOperationFilter {
    apply(operation: Operation, builder: ContextBuilder): Operation;
}

export interface IDefinitionFilter {
    apply(definition: Definition, builder: ContextBuilder): Definition;
}

export interface ILanguageFilter {
    getCustomType(definition: Definition, contextBuilder: ContextBuilder): IType
    getType(source: swagger.IHasTypeInformation, context: ContextBuilder): IType
}

export interface IType {
    name: () => string;
    definition?: Definition;
    isAnonymous?: boolean;
    isBuiltin?: boolean;
    isDefinition?: boolean;
    isArray?: boolean;
    isFile?: boolean;
    asArray(): IType;
}

export interface ITyped {
    type: IType;
}

export interface IProvideGenerationFilters {
    operationFilters?: IOperationFilter[];
    definitionFilters?: IDefinitionFilter[];
}

export interface IImportedType {
    typeName: string;
    namespace: string;
}

export interface IDependency {
    name?: string;
    version?: string;
    types: IImportedType[];
}

export interface IProvideDependencies {
    dependencies?: { [key: string]: IDependency };
    ambientTypes?: IImportedType[];
    ambientNamespaces?: string[];
}

export class Extensible {
    public ext: { [key: string]: any };
}

export class Response extends Extensible {
    public type: IType;
    public status: number;

    constructor(status: string, response: swagger.IResponse, contextBuilder: ContextBuilder) {
        super();
        this.type = contextBuilder.GetTypeFromSchema(response.schema);
    }
}

export class Operation extends Extensible {
    public name: string;
    public rawPath: string;
    public pathSegments: { name: string, isParam: boolean }[];
    public verb: string;
    public requestBody: any;
    public successResponse: Response[];
    public errorResponse: Response[];
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
    public successSamples: { [contentType: string]: any };

    public security: string;

    public hasUniqueResponseType: boolean;
    public responses: Response[];

    constructor(pathName: string, verb: string, path: swagger.IPath, method: swagger.IOperation, contextBuilder: ContextBuilder) {
        super();
        this.rawPath = pathName;
        this.verb = verb;
        this.pathSegments = [];
        this.responses = [];
        this.successResponse = [];
        this.errorResponse = [];
        this.description = method.description;
        this.hasUniqueResponseType = true;
        this.name = method.operationId ? method.operationId : this.verb + this.rawPath;

        _.forEach(pathName.split('/'), (segment) => {
            if (segment.length) {
                if (segment[0] == '{') {
                    this.pathSegments.push({ name: segment.substring(1, segment.length - 1), isParam: true });
                } else {
                    this.pathSegments.push({ name: segment, isParam: false })
                }
            }
        });

        this.args = [];

        _.forEach(method.parameters, (parameter: swagger.IParameterOrReference, index: number) => {
            var argument = new Argument(parameter, contextBuilder);
            this.args.push(argument);
        });

        var bodyArg = _.filter(this.args, (arg) => arg.in === "body");
        if (bodyArg.length) {
            this.requestBody = bodyArg[0];
        }

        this.headers = _.filter(this.args, (arg) => arg.in === "header");
        this.query = _.filter(this.args, (arg) => arg.in === "query");
        this.formData = _.filter(this.args, (arg) => arg.in === "formData");
        this.pathParams = _.filter(this.args, (arg) => arg.in === "path");

        this.args = this.args.sort(optionalThenAlpha);

        this.consumes = method.consumes ? method.consumes : contextBuilder.context.defaultConsumes;
        this.produces = method.produces ? method.produces : contextBuilder.context.defaultProduces;

        if (!this.consumes || !this.consumes.length) {
            this.consumes = ["application/json"];
        }

        if (!this.produces || !this.produces.length) {
            this.produces = ["application/json"];
        }

        this.isJsonRequest = this.consumes.filter(x => x === "application/json").length > 0;
        this.isJsonResponse = this.produces.filter(x => x === "application/json").length > 0;
        this.isBinaryResponse = !this.isJsonResponse;
        this.isFormDataRequest = this.consumes.filter(x => x === "multipart/form-data").length > 0;

        this.security = method.security ? _.keys(method.security[0])[0] : null;

        _.forEach(method.responses, (response: swagger.IResponse, status: string) => {
            var responseContext = new Response(status, response, contextBuilder);
            if (status.indexOf('20') === 0) {
                this.successResponse.push(responseContext);
            } else {
                this.errorResponse.push(responseContext);
            }
            this.responses.push(responseContext);
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

export class Argument extends Extensible implements ITyped {
    name: string;
    in: string;
    description: string;
    optional: boolean;
    type: IType;

    constructor(parameter: swagger.IParameterOrReference, contextBuilder: ContextBuilder) {
        super();
        this.name = parameter.name;
        this.in = parameter.in;
        this.description = parameter.description;
        this.optional = !parameter.required;
        this.type = contextBuilder.GetTypeFromTypeInformation(parameter);
    }
}

export class Definition extends Extensible {
    public name: string;
    public rawName: string;
    public nameParts: string[];

    public properties: Property[];
    public ancestorRef: string;
    public ancestor: Definition;

    public isInitialized: boolean;

    constructor() {
        super();
        this.isInitialized = false;
    }

    initFromSchema(name: string, schema: swagger.ISchema, contextBuilder: ContextBuilder) {
        if (name) {
            this.name = name;
            this.rawName = name;
            this.nameParts = name.split(/[^\w]/g);
        }

        if (schema) {
            this.properties = [];

            var injectProperties = (schemaProperties: any) => {
                if (schemaProperties) {
                    _.forEach(schemaProperties, (property: swagger.IProperty, propertyName: string) => {
                        let propertyContext = new Property(propertyName, property, contextBuilder);
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

        this.isInitialized = true;
    }
}

export class Property extends Extensible implements ITyped {
    public name: string;
    public type: IType;
    public description: string;

    constructor(name: string, schema: swagger.IProperty, contextBuilder: ContextBuilder) {
        super();
        this.name = name;
        this.description = schema.description;
        this.type = contextBuilder.GetTypeFromTypeInformation(schema);
    }
}
