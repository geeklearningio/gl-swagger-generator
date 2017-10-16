import * as swagger from '../typings/swagger-doc2'
import _ = require('lodash');

var verbs: string[] = ["get", "head", "options", "delete", "post", "patch", "put"];

export class ScopedSwaggerVisitorBase implements ISwaggerVisitor {
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

export function get(api: swagger.IApi): IVisitableSwagger {
    return new VisitableSwagger(api);
}

class VisitableSwagger implements IVisitableSwagger {
    constructor(private api: swagger.IApi) {

    }

    private beginScope(visitor: ISwaggerVisitor, name: string, data: any) {
        if (visitor.beginScope) {
            visitor.beginScope(name, data);
        }
    }

    private closeScope(visitor: ISwaggerVisitor) {
        if (visitor.closeScope) {
            visitor.closeScope();
        }
    }

    visit(visitor: ISwaggerVisitor) {
        var enumerateProperties = (schemaProperties: any) => {
            if (schemaProperties) {
                _.forEach(schemaProperties, (property: swagger.IProperty, propertyName: string) => {
                    if (visitor.visitProperty) {
                        visitor.visitProperty(propertyName, property);
                    }
                    this.beginScope(visitor, propertyName, property);
                    if (property.type == "object" && property.properties) {
                        if (visitor.visitAnonymousDefinition) {
                            visitor.visitAnonymousDefinition(property);
                        }
                    }
                    this.closeScope(visitor);
                });
            }
        };

        this.beginScope(visitor, "#", this.api);

        if (visitor.visitRoot) {
            visitor.visitRoot(this.api);
        }

        if (visitor.visitApiInfo) {
            visitor.visitApiInfo(this.api.info)
        }

        this.beginScope(visitor, "definitions", this.api.definitions);
        _.forEach(this.api.definitions, (schema: swagger.ISchema, name: string) => {
            if (visitor.visitDefinition) {
                visitor.visitDefinition(name, schema);
            }
            this.beginScope(visitor, name, schema);

            enumerateProperties(schema.properties);
            if (schema.allOf) {
                _.forEach(schema.allOf, (item) => {
                    if (item.$ref) {
                        if (visitor.visitDefinitionAncestor) {
                            visitor.visitDefinitionAncestor(item.$ref);
                        }
                    }
                    enumerateProperties(item.properties);
                });
            }
            this.closeScope(visitor);
        });
        this.closeScope(visitor);

        this.beginScope(visitor, "paths", this.api.paths);
        _.forEach(this.api.paths, (path: swagger.IPath, pathTemplate: string) => {
            if (visitor.visitPath) {
                visitor.visitPath(pathTemplate, path);
            }
            this.beginScope(visitor, pathTemplate, path);

            for (var i = 0; i < verbs.length; i++) {
                var verb = verbs[i];
                let operation: swagger.IOperation = <swagger.IOperation>path[verb];
                if (operation) {
                    if (visitor.visitOperation) {
                        visitor.visitOperation(verb, operation);
                    }
                    this.beginScope(visitor, verb, operation);

                    _.forEach(operation.parameters, (parameter: swagger.IParameterOrReference, index: number) => {
                        if (visitor.visitOperationParameter) {
                            visitor.visitOperationParameter(parameter, index);
                        }
                        this.beginScope(visitor, parameter.name, parameter);

                        if (parameter.type == "object" && parameter.properties) {
                            if (visitor.visitAnonymousDefinition) {
                                visitor.visitAnonymousDefinition(parameter);
                            }
                        }
                        this.closeScope(visitor);
                    });

                    _.forEach(operation.responses, (response: swagger.IResponse, status: string) => {
                        if (visitor.visitOperationResponse) {
                            visitor.visitOperationResponse(status, response);
                        }
                        this.beginScope(visitor, status, response);
                        if (response.schema && response.schema.type == "object" && response.schema.properties) {
                            if (visitor.visitAnonymousDefinition) {
                                visitor.visitAnonymousDefinition(response.schema);
                            }
                        }
                        this.closeScope(visitor);
                    });

                    if (visitor.visitOperationPost) {
                        visitor.visitOperationPost(verb, operation);
                    }
                    this.closeScope(visitor);
                    
                }
            }
            this.closeScope(visitor);
        });
        this.closeScope(visitor);

        this.closeScope(visitor);
    }
}