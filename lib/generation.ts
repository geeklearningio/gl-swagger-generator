/**
 * Created by autex on 5/20/2016.
 */
import * as swaggerVisitor from './swaggerVisitor';
//import * as swagger from 'swagger-parser';
import _ = require('lodash');
import XRegExp = require('xregexp');
import * as swaggerDoc from '../typings/swagger-doc2';

import {
    IExtensible,
    IAbstractedType, IType, ITyped, IImportedType,
    IDefinition, IProperty,
    IAbstractedTypeConverter,
    SchemaLessAbstractedType, EnumAbstractedType, ArrayAbstractedType, BuiltinAbstractedType, CustomAbstractedType, FileAbstractedType, MapAbstractedType, GenericAbstractedType, ImportedAbstractedType
} from './typing';

//import servicesVersion = ts.servicesVersion;


var pathParamRegex = XRegExp('({.*?})|([^{}]*)')
var genericRegex = XRegExp('(?<genericName>\\w+)\\[(?<genericArgs>.+)\\]');

export interface IGenerationContext {
    definitions?: Definition[];
    definitionsMap?: { [ref: string]: Definition };
    operations?: Operation[];
    host?: string;
    basePath?: string;
    defaultConsumes?: string[];
    defaultProduces?: string[];
    dependencies?: IDependency[];
    devDependencies?: IDependency[];
    ambientTypes?: IImportedType[];
    allNamespaces?: string[];

    visit(visitor: IGenerationContextVisitor): void;
}


var verbs: string[] = ["get", "head", "options", "delete", "post", "patch", "put"];

export class ContextBuilder extends swaggerVisitor.ScopedSwaggerVisitorBase {
    context: IGenerationContext;

    constructor(
        private api: swaggerDoc.IApi,
        private languageFilter: ILanguageFilter,
        private operationFilters: IOperationFilter[],
        private definitionFilters: IDefinitionFilter[],
        private dependencies: IDependency[],
        private devDependencies: IDependency[],
        private ambientTypes: IImportedType[],
        private mediaTypesPriorities?: { [from: string]: number }
    ) {
        super();
    }

    GetOrCreateDefinition(ref: string): Definition {

        let definition = this.context.definitionsMap[ref];

        if (!definition) {
            //console.log("Uinitialized definition : " + ref);
            definition = new Definition();
            this.context.definitions.push(definition);
            this.context.definitionsMap[ref] = definition
        }
        return definition;
    }

    GetOrCreateDefinitionFromSchema(definitionName: string, schema: swaggerDoc.ISchema) {
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

    GetTypeAbstraction(source: swaggerDoc.IHasTypeInformation): IAbstractedType {
        if (!source) {
            return new SchemaLessAbstractedType();
        }
        if (source.schema) {
            return this.GetTypeAbstraction(source.schema);
        }
        if (source.$ref) {
            return new CustomAbstractedType(this.GetOrCreateDefinition(source.$ref));
        } else {
            let type = source.type;
            if (type === 'object') {
                if ((<any>source).definition) {
                    return new CustomAbstractedType(this.GetOrCreateDefinitionFromSchema((<any>source).definition.name, (<any>source).definition));
                } else if (source.additionalProperties) {
                    return new MapAbstractedType(new BuiltinAbstractedType('string'), this.GetTypeAbstraction(source.additionalProperties));
                } else {
                    return new SchemaLessAbstractedType();
                }
            } else if (source.enum) {
                return new EnumAbstractedType(new BuiltinAbstractedType(type, source.format), source.enum);
            } else if (type === 'array') {
                return new ArrayAbstractedType(this.GetTypeAbstraction(source.items));
            } else if (type === 'file') {
                return new FileAbstractedType();
            } else if (type) {
                return new BuiltinAbstractedType(type, source.format, (<any>source)['x-nullable']);
            } else {
                return new SchemaLessAbstractedType();
            }
        }
    }

    visitRoot(root: swaggerDoc.IApi): void {
        this.context.definitions = [];
        this.context.definitionsMap = {};
        this.context.operations = [];

        this.context.host = this.api.host;
        this.context.basePath = this.api.basePath;

        this.context.defaultConsumes = this.api.consumes ? this.api.consumes : [];
        this.context.defaultProduces = this.api.produces ? this.api.produces : [];

    }

    // visitApiInfo?(apiInfo: swaggerDoc.IApiInfo): void;
    // visitPath?(pathTemplate: string, path: swaggerDoc.IPath): void;

    visitOperation(verb: string, operation: swaggerDoc.IOperation): void {
        var path = this.stack[this.stack.length - 1];
        var operationContext = new Operation();


        operationContext.rawPath = path.name;
        operationContext.verb = verb;
        operationContext.summary = operation.summary;
        operationContext.description = operation.description;
        operationContext.hasUniqueResponseType = true;

        XRegExp.forEach(path.name, pathParamRegex, match => {
            var segment = match[0];
            if (segment.length) {
                if (segment[0] == '{') {
                    operationContext.pathSegments.push({ name: segment.substring(1, segment.length - 1), isParam: true });
                } else {
                    operationContext.pathSegments.push({ name: segment, isParam: false })
                }
            }
        });

        operationContext.name = operation.operationId ? operation.operationId : verb + path.name;

        operationContext.consumes = operation.consumes ? operation.consumes : this.context.defaultConsumes;
        operationContext.produces = operation.produces ? operation.produces : this.context.defaultProduces;

        if (operationContext.consumes && this.mediaTypesPriorities) {
            operationContext.consumes = operationContext.consumes.sort((a, b) => this.mediaTypesPriorities[b] | 0 - this.mediaTypesPriorities[a] | 0);
        }
        if (operationContext.produces && this.mediaTypesPriorities) {
            operationContext.produces = operationContext.produces.sort((a, b) => this.mediaTypesPriorities[b] | 0 - this.mediaTypesPriorities[a] | 0);
        }

        operationContext.security = operation.security ? _.keys(operation.security[0]) : []

        this.push("operation", operationContext);
    }

    visitOperationPost(verb: string, operation: swaggerDoc.IOperation): void {
        try {
            var operationContext = this.get<Operation>("operation");

            _.forEach(this.operationFilters, (filter) => {
                operationContext = filter.apply(operationContext, this);
            });

            this.context.operations.push(operationContext);
        }
        catch (err) {
            console.log(err);
            console.log(err.stack);
        }
    }

    private getNameFromRef($ref: string) : string {
        return $ref.substring($ref.lastIndexOf('/') + 1).replace(/~1/g, '/');
    }

    visitOperationParameter(parameter: swaggerDoc.IParameterOrReference, index: number): void {
        var operation = this.get<Operation>("operation");
        if (parameter.$ref){
            parameter = this.api.parameters[this.getNameFromRef(parameter.$ref)];
        }
        var argument = new Argument();
        argument.rawName = parameter.name;
        argument.name = parameter.name;
        argument.in = parameter.in;
        argument.description = parameter.description;
        argument.optional = !parameter.required;
        argument.sourceParameter = parameter;
        argument.abstractedType = this.GetTypeAbstraction(parameter);

        operation.args.push(argument);

        if (argument.in === "header") {
            operation.headers.push(argument);
        }
        if (argument.in === "query") {
            operation.query.push(argument);
        }
        if (argument.in === "formData") {
            operation.formData.push(argument);
            operation.hasRequestContent = true;
        }
        if (argument.in === "path") {
            operation.pathParams.push(argument);
        }
        if (argument.in === "body") {
            operation.requestBody = argument;
            operation.hasRequestContent = true;
        }
    }


    // visitAnonymousDefinition?(schema: swaggerDoc.IHasTypeInformation): void;
    visitDefinition(name: string, schema: swaggerDoc.ISchema): void {
        //console.log("Preparing :" + name);
        this.GetOrCreateDefinitionFromSchema(name, schema);
    }

    // visitDefinitionAncestor?(ref: string): void;
    // visitProperty?(name: string, schema: swaggerDoc.IProperty): void{
    // }
    // visitSecurityDefinition?(name: string, definition: swaggerDoc.ISecurityScheme): void;
    visitOperationResponse(status: string, response: swaggerDoc.IResponse): void {
        var operation = this.get<Operation>("operation");
        var responseContext = new Response();

        responseContext.status = parseInt(status);
        responseContext.sourceResponse = response;

        responseContext.abstractedType = this.GetTypeAbstraction(response.schema);

        //console.log(operation);

        if (status.indexOf('20') === 0) {
            operation.successResponse.push(responseContext);
        } else if (status === 'default') {
            operation.defaultResponse = responseContext;
        } else {
            operation.errorResponse.push(responseContext);
        }
        operation.responses.push(responseContext);
    }

    Build(): IGenerationContext {
        this.context = new GenerationContext();

        console.log("listing ambient types");
        this.context.ambientTypes = [].concat(this.ambientTypes);
        _.forEach(this.dependencies, (dependency) => {
            if (dependency.types) {
                this.context.ambientTypes = this.context.ambientTypes.concat(dependency.types);
            }
        });

        console.log("listing namespaces");
        var namespacesMap: any = {};
        _.forEach(this.context.ambientTypes, type => {
            if (type.namespace) {
                namespacesMap[type.namespace] = type.namespace;
            }
        });

        this.context.allNamespaces = Object.keys(namespacesMap);

        this.context.dependencies = this.dependencies;
        this.context.devDependencies = this.devDependencies;

        var visitable = swaggerVisitor.get(this.api);

        // execute custom api visitors;

        console.log("Base context generation");
        visitable.visit(this);

        console.log("mapping ancestors");
        // execute ancestore mapper (should become a generation context visitor)
        _.forEach(this.context.definitions, (definition: Definition) => {
            if (definition.ancestorRef) {
                definition.ancestor = this.context.definitionsMap[definition.ancestorRef];
            }
        });
        // execute type mapper


        // execute custom generation context visitor

        if (this.languageFilter.supportsGenerics()) {
            console.log("Mapping generics (limited support)");
            this.context.visit(new GenericTypeMapper(this));
        }

        console.log("Mapping language types");
        this.context.visit(new LanguageTypeMapper(this.languageFilter, this));

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
    createAbstractedTypeConverter(generationContext: IGenerationContext): IAbstractedTypeConverter<IType>;
    supportsGenerics(): boolean;
}

export interface IProvideGenerationFilters {
    operationFilters?: IOperationFilter[];
    definitionFilters?: IDefinitionFilter[];
}


export interface IDependency {
    name?: string;
    version?: string;
    types: IImportedType[];
}

export interface IProvideDependencies {
    dependencies?: { [key: string]: IDependency };
    devDependencies?: { [key: string]: IDependency };
    ambientTypes?: IImportedType[];
    ambientNamespaces?: string[];
}

export class Extensible implements IExtensible {
    public ext: { [key: string]: any };
}

export class Response extends Extensible {
    public type: IType;
    public abstractedType: IAbstractedType;
    public status: number;
    public sourceResponse: swaggerDoc.IResponse;

    constructor() {
        super();
    }
}

export class Operation extends Extensible {
    public name: string;
    public rawPath: string;
    public pathSegments: { name: string, isParam: boolean }[];
    public verb: string;
    public requestBody: Argument;
    public hasRequestContent: boolean;
    public successResponse: Response[];
    public errorResponse: Response[];
    public defaultResponse: Response;
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
    public summary: string;
    public consumes: string[];
    public produces: string[];
    public successSamples: { [contentType: string]: any };

    public security: string[];

    public hasUniqueResponseType: boolean;
    public responses: Response[];

    constructor() {
        super();
        this.pathSegments = [];
        this.responses = [];
        this.successResponse = [];
        this.errorResponse = [];

        this.hasUniqueResponseType = true;

        this.args = [];
        this.headers = [];
        this.query = [];
        this.formData = [];
        this.pathParams = [];
        this.args = [];
        this.hasRequestContent = false;

        // TODO : #15 those defaults hardcoded mimetypes should not be usefull except in case of uncomplete swagger
        // definitions. We should consider dropping them as there is an better way to handler those cases 
        // using a custom swagger visitor if need be.

        if (!this.consumes || !this.consumes.length) {
            this.consumes = ["application/json"];
        }

        if (!this.produces || !this.produces.length) {
            this.produces = ["application/json"];
        }
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
    rawName: string;
    in: string;
    description: string;
    optional: boolean;
    abstractedType: IAbstractedType;
    type: IType;
    sourceParameter: swaggerDoc.IParameterOrReference

    constructor() {
        super();
    }
}

export class Definition extends Extensible implements IDefinition {
    public name: string;
    public rawName: string;
    public nameParts: string[];

    public description: string;
    public properties: IProperty[];
    public ancestorRef: string;
    public ancestor: IDefinition;

    public isInitialized: boolean;
    public shouldIgnore: boolean;

    constructor() {
        super();
        this.isInitialized = false;
        this.shouldIgnore = false;
    }

    initFromSchema(name: string, schema: swaggerDoc.ISchema, contextBuilder: ContextBuilder) {
        if (name) {
            this.name = name;
            this.rawName = name;
            this.nameParts = name.split(/[^\w]/g);
        }

        if (schema.description) {
            this.description = schema.description;
        }

        if (schema) {
            this.properties = [];

            var injectProperties = (schemaProperties: any) => {
                if (schemaProperties) {
                    _.forEach(schemaProperties, (property: swaggerDoc.IProperty, propertyName: string) => {
                        let propertyContext = new Property(propertyName, property, contextBuilder);
                        propertyContext.abstractedType = contextBuilder.GetTypeAbstraction(property);
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

export class Property extends Extensible implements IProperty {
    public name: string;
    public type: IType;
    public abstractedType: IAbstractedType;
    public description: string;

    public sourceSchema: swaggerDoc.IProperty;

    constructor(name: string, schema: swaggerDoc.IProperty, contextBuilder: ContextBuilder) {
        super();
        this.name = name;
        this.description = schema.description;
        this.sourceSchema = schema;
    }
}


class GenerationContext implements IGenerationContext {
    definitions: Definition[];
    definitionsMap: { [ref: string]: Definition };
    operations: Operation[];
    host: string;
    basePath: string;
    defaultConsumes: string[];
    defaultProduces: string[];
    dependencies: IDependency[];
    devDependencies: IDependency[];
    ambientTypes: IImportedType[];

    visit(visitor: IGenerationContextVisitor): void {
        visitor.beginScope("", this)
        if (visitor.visitRoot) {
            visitor.visitRoot(this);
        }

        _.forEach(this.definitions, definition => {
            if (visitor.visitDefinition) {
                visitor.visitDefinition(definition);
            }

            visitor.beginScope(definition.name, definition);

            _.forEach(definition.properties, property => {
                if (visitor.visitDefinitionProperty) {
                    visitor.visitDefinitionProperty(property);
                }
            });

            visitor.closeScope();
        });

        _.forEach(this.operations, operation => {
            if (visitor.visitOperation) {
                visitor.visitOperation(operation);
            }
            visitor.beginScope(operation.name, operation);

            _.forEach(operation.args, arg => {
                if (visitor.visitOperationArgument) {
                    visitor.visitOperationArgument(arg);
                }
            });

            _.forEach(operation.responses, response => {
                if (visitor.visitOperationResponse) {
                    visitor.visitOperationResponse(response);
                }
            });

            visitor.closeScope();
        });

        visitor.closeScope();
    }
}

export interface IGenerationContextVisitor {
    beginScope?(name: string, data: any): void;
    closeScope?(): void;

    visitRoot?(root: IGenerationContext): void;
    visitOperation?(operation: Operation): void;
    visitDefinition?(definition: IDefinition): void;
    visitDefinitionProperty?(property: IProperty): void;
    visitOperationArgument?(arg: Argument): void;
    visitOperationResponse?(response: Response): void;
}

export class ScopedGenerationContextVisitorBase implements IGenerationContextVisitor {
    stack: { name: string, data: any, bag: { [key: string]: any } }[] = [];

    beginScope(name: string, data: any): void {
        this.stack.push({ name: name, data: data, bag: {} });
    }

    push<T>(key: string, value: T): void {
        this.stack[this.stack.length - 1].bag[key] = value;
    }

    get<T>(key: string): T {
        for (var index = this.stack.length - 1; index > 0; index--) {
            var element = this.stack[index];
            var value = element.bag[key]
            if (value) {
                return <T>value;
            }
        }
        return null;
    }

    closeScope(): void {
        this.stack.pop();
    }
}

class LanguageTypeMapper extends ScopedGenerationContextVisitorBase {
    private typeConverter: IAbstractedTypeConverter<IType>;

    constructor(private languageFilter: ILanguageFilter, private contextBuilder: ContextBuilder) {
        super();
        this.typeConverter = languageFilter.createAbstractedTypeConverter(contextBuilder.context);
    }

    //  visitRoot?(root: IGenerationContext): void;
    visitOperation(operation: Operation): void {
    }
    // visitDefinition?(definition: IDefinition): void;
    visitDefinitionProperty(property: IProperty): void {
        property.type = property.abstractedType.convert(this.typeConverter);
    }
    visitOperationArgument(arg: Argument): void {
        arg.type = arg.abstractedType.convert(this.typeConverter);
    }
    visitOperationResponse(response: Response): void {
        response.type = response.abstractedType.convert(this.typeConverter);
    }
}

class GenericTypeMapper extends ScopedGenerationContextVisitorBase {
    private typeConverter: GenericTypeConverter;

    constructor(private contextBuilder: ContextBuilder) {
        super();
        this.typeConverter = new GenericTypeConverter(this.contextBuilder);
    }

    //  visitRoot?(root: IGenerationContext): void;
    visitOperation(operation: Operation): void {
    }

    visitDefinition(definition: IDefinition): void {
        if (definition.rawName.indexOf('[]') >= 0) {
            //definition.shouldIgnore = true;
        }
    }
    visitDefinitionProperty(property: IProperty): void {
        property.abstractedType = property.abstractedType.convert(this.typeConverter);
    }
    visitOperationArgument(arg: Argument): void {
        arg.abstractedType = arg.abstractedType.convert(this.typeConverter);
    }
    visitOperationResponse(response: Response): void {
        response.abstractedType = response.abstractedType.convert(this.typeConverter);
    }
}

class GenericTypeConverter implements IAbstractedTypeConverter<IAbstractedType>{
    constructor(private contextBuilder: ContextBuilder) {
    }

    schemaLessTypeConvert(type: SchemaLessAbstractedType): IAbstractedType {
        return type;
    }
    mapTypeConvert(type: MapAbstractedType): IAbstractedType {
        return new MapAbstractedType(type.keyType.convert(this), type.valueType.convert(this));
    }
    builtinTypeConvert(type: BuiltinAbstractedType): IAbstractedType {
        return type;
    }

    enumTypeConvert(type: EnumAbstractedType): IAbstractedType {
        return type;
    }

    customTypeConvert(type: CustomAbstractedType): IAbstractedType {
        var parts = <any>XRegExp.exec(type.definition.rawName, genericRegex);
        if (parts) {
            var genericName = parts.genericName;
            var genericArgs = parts.genericArgs;
            var matchingTypes = this.contextBuilder.context.ambientTypes.filter((importedType: IImportedType) => importedType.typeName == genericName + '<>');

            if (matchingTypes.length == 1) {
                type.definition.shouldIgnore = true;
                return new GenericAbstractedType(
                    new ImportedAbstractedType(matchingTypes[0]),
                    [new CustomAbstractedType(this.contextBuilder.GetOrCreateDefinition('#/definitions/' + genericArgs))]
                );
            }
        }

        return type;
    }
    arrayTypeConvert(type: ArrayAbstractedType): IAbstractedType {
        return new ArrayAbstractedType(type.itemType.convert(this));
    }
    fileTypeConvert(type: FileAbstractedType): IAbstractedType {
        return type;
    }
    genericTypeConvert(type: GenericAbstractedType): IAbstractedType {
        return type;
    }
    importedTypeConvert(type: ImportedAbstractedType): IAbstractedType {
        return type;
    }
}