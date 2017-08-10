import * as swagger from 'swagger-parser';
export declare class ScopedSwaggerVisitorBase implements ISwaggerVisitor {
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
export interface ISwaggerVisitor {
    beginScope?(name: string, data: any): void;
    closeScope?(): void;
    visitRoot?(root: swagger.IApi): void;
    visitApiInfo?(apiInfo: swagger.IApiInfo): void;
    visitPath?(pathTemplate: string, path: swagger.IPath): void;
    visitOperation?(verb: string, operation: swagger.IOperation): void;
    visitOperationPost?(verb: string, operation: swagger.IOperation): void;
    visitAnonymousDefinition?(schema: swagger.IHasTypeInformation): void;
    visitDefinition?(name: string, schema: swagger.ISchema): void;
    visitDefinitionAncestor?(ref: string): void;
    visitProperty?(name: string, schema: swagger.IProperty): void;
    visitSecurityDefinition?(name: string, definition: swagger.ISecurityScheme): void;
    visitOperationParameter?(parameter: swagger.IParameterOrReference, index: number): void;
    visitOperationResponse?(status: string, response: swagger.IResponse): void;
}
export interface IVisitableSwagger {
    visit(visitor: ISwaggerVisitor): void;
}
export declare function get(api: swagger.IApi): IVisitableSwagger;
