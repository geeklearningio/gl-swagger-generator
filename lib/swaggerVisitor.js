"use strict";
const _ = require('lodash');
var verbs = ["get", "head", "options", "delete", "post", "patch", "put"];
class ScopedSwaggerVisitorBase {
    constructor() {
        this.stack = [];
    }
    beginScope(name, data) {
        this.stack.push({ name: name, data: data, bag: {} });
    }
    push(key, value) {
        this.stack[this.stack.length - 1].bag[key] = value;
    }
    get(key) {
        for (var index = this.stack.length - 1; index > 0; index--) {
            var element = this.stack[index];
            var value = element.bag[key];
            if (value) {
                return value;
            }
        }
        return null;
    }
    closeScope() {
        this.stack.pop();
    }
}
exports.ScopedSwaggerVisitorBase = ScopedSwaggerVisitorBase;
function get(api) {
    return new VisitableSwagger(api);
}
exports.get = get;
class VisitableSwagger {
    constructor(api) {
        this.api = api;
    }
    beginScope(visitor, name, data) {
        if (visitor.beginScope) {
            visitor.beginScope(name, data);
        }
    }
    closeScope(visitor) {
        if (visitor.closeScope) {
            visitor.closeScope();
        }
    }
    visit(visitor) {
        var enumerateProperties = (schemaProperties) => {
            if (schemaProperties) {
                _.forEach(schemaProperties, (property, propertyName) => {
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
            visitor.visitApiInfo(this.api.info);
        }
        this.beginScope(visitor, "definitions", this.api.definitions);
        _.forEach(this.api.definitions, (schema, name) => {
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
        _.forEach(this.api.paths, (path, pathTemplate) => {
            if (visitor.visitPath) {
                visitor.visitPath(pathTemplate, path);
            }
            this.beginScope(visitor, pathTemplate, path);
            for (var i = 0; i < verbs.length; i++) {
                var verb = verbs[i];
                let operation = path[verb];
                if (operation) {
                    if (visitor.visitOperation) {
                        visitor.visitOperation(verb, operation);
                    }
                    this.beginScope(visitor, verb, operation);
                    _.forEach(operation.parameters, (parameter, index) => {
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
                    _.forEach(operation.responses, (response, status) => {
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
