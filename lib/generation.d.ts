import * as swaggerVisitor from './swaggerVisitor';
import * as swagger from 'swagger-parser';
import { IExtensible, IAbstractedType, IType, ITyped, IImportedType, IDefinition, IProperty, IAbstractedTypeConverter } from './typing';
export interface IGenerationContext {
    definitions?: Definition[];
    definitionsMap?: {
        [ref: string]: Definition;
    };
    operations?: Operation[];
    host?: string;
    basePath?: string;
    defaultConsumes?: string[];
    defaultProduces?: string[];
    dependencies?: IDependency[];
    ambientTypes?: IImportedType[];
    allNamespaces?: string[];
    visit(visitor: IGenerationContextVisitor): void;
}
export declare class ContextBuilder extends swaggerVisitor.ScopedSwaggerVisitorBase {
    private api;
    private languageFilter;
    private operationFilters;
    private definitionFilters;
    private dependencies;
    private ambientTypes;
    private mediaTypesPriorities;
    context: IGenerationContext;
    constructor(api: swagger.IApi, languageFilter: ILanguageFilter, operationFilters: IOperationFilter[], definitionFilters: IDefinitionFilter[], dependencies: IDependency[], ambientTypes: IImportedType[], mediaTypesPriorities?: {
        [from: string]: number;
    });
    GetOrCreateDefinition(ref: string): Definition;
    GetOrCreateDefinitionFromSchema(definitionName: string, schema: swagger.ISchema): Definition;
    GetTypeAbstraction(source: swagger.IHasTypeInformation): IAbstractedType;
    visitRoot(root: swagger.IApi): void;
    visitOperation(verb: string, operation: swagger.IOperation): void;
    visitOperationPost(verb: string, operation: swagger.IOperation): void;
    visitOperationParameter(parameter: swagger.IParameterOrReference, index: number): void;
    visitDefinition(name: string, schema: swagger.ISchema): void;
    visitOperationResponse(status: string, response: swagger.IResponse): void;
    Build(): IGenerationContext;
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
    dependencies?: {
        [key: string]: IDependency;
    };
    ambientTypes?: IImportedType[];
    ambientNamespaces?: string[];
}
export declare class Extensible implements IExtensible {
    ext: {
        [key: string]: any;
    };
}
export declare class Response extends Extensible {
    type: IType;
    abstractedType: IAbstractedType;
    status: number;
    sourceResponse: swagger.IResponse;
    constructor();
}
export declare class Operation extends Extensible {
    name: string;
    rawPath: string;
    pathSegments: {
        name: string;
        isParam: boolean;
    }[];
    verb: string;
    requestBody: Argument;
    hasRequestContent: boolean;
    successResponse: Response[];
    errorResponse: Response[];
    headers: Argument[];
    query: Argument[];
    formData: Argument[];
    pathParams: Argument[];
    args: Argument[];
    requestContentType: string;
    responseContentType: string;
    isJsonRequest: boolean;
    isJsonResponse: boolean;
    isBinaryResponse: boolean;
    isFormDataRequest: boolean;
    description: string;
    consumes: string[];
    produces: string[];
    successSamples: {
        [contentType: string]: any;
    };
    security: string[];
    hasUniqueResponseType: boolean;
    responses: Response[];
    constructor();
}
export declare class Argument extends Extensible implements ITyped {
    name: string;
    rawName: string;
    in: string;
    description: string;
    optional: boolean;
    abstractedType: IAbstractedType;
    type: IType;
    sourceParameter: swagger.IParameterOrReference;
    constructor();
}
export declare class Definition extends Extensible implements IDefinition {
    name: string;
    rawName: string;
    nameParts: string[];
    properties: IProperty[];
    ancestorRef: string;
    ancestor: IDefinition;
    isInitialized: boolean;
    shouldIgnore: boolean;
    constructor();
    initFromSchema(name: string, schema: swagger.ISchema, contextBuilder: ContextBuilder): void;
}
export declare class Property extends Extensible implements IProperty {
    name: string;
    type: IType;
    abstractedType: IAbstractedType;
    description: string;
    sourceSchema: swagger.IProperty;
    constructor(name: string, schema: swagger.IProperty, contextBuilder: ContextBuilder);
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
export declare class ScopedGenerationContextVisitorBase implements IGenerationContextVisitor {
    stack: {
        name: string;
        data: any;
        bag: {
            [key: string]: any;
        };
    }[];
    beginScope(name: string, data: any): void;
    push<T>(key: string, value: T): void;
    get<T>(key: string): T;
    closeScope(): void;
}
