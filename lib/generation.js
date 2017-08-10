"use strict";
const swaggerVisitor = require('./swaggerVisitor');
const _ = require('lodash');
const XRegExp = require('xregexp');
const typing_1 = require('./typing');
var pathParamRegex = XRegExp('({.*?})|([^{}]*)');
var genericRegex = XRegExp('(?<genericName>\\w+)\\[(?<genericArgs>.+)\\]');
var verbs = ["get", "head", "options", "delete", "post", "patch", "put"];
class ContextBuilder extends swaggerVisitor.ScopedSwaggerVisitorBase {
    constructor(api, languageFilter, operationFilters, definitionFilters, dependencies, ambientTypes, mediaTypesPriorities) {
        super();
        this.api = api;
        this.languageFilter = languageFilter;
        this.operationFilters = operationFilters;
        this.definitionFilters = definitionFilters;
        this.dependencies = dependencies;
        this.ambientTypes = ambientTypes;
        this.mediaTypesPriorities = mediaTypesPriorities;
    }
    GetOrCreateDefinition(ref) {
        let definition = this.context.definitionsMap[ref];
        if (!definition) {
            definition = new Definition();
            this.context.definitions.push(definition);
            this.context.definitionsMap[ref] = definition;
        }
        return definition;
    }
    GetOrCreateDefinitionFromSchema(definitionName, schema) {
        var ref = '#\/definitions\/' + definitionName.replace(/\//g, '~1');
        let definition = this.context.definitionsMap[ref];
        if (!definition) {
            definition = new Definition();
            this.context.definitions.push(definition);
            this.context.definitionsMap[ref] = definition;
        }
        if (!definition.isInitialized) {
            definition.initFromSchema(definitionName, schema, this);
            _.forEach(this.definitionFilters, (filter) => {
                filter.apply(definition, this);
            });
        }
        return definition;
    }
    GetTypeAbstraction(source) {
        if (!source) {
            return new typing_1.SchemaLessAbstractedType();
        }
        if (source.schema) {
            return this.GetTypeAbstraction(source.schema);
        }
        if (source.$ref) {
            return new typing_1.CustomAbstractedType(this.GetOrCreateDefinition(source.$ref));
        }
        else {
            let type = source.type;
            if (type === 'object') {
                if (source.definition) {
                    return new typing_1.CustomAbstractedType(this.GetOrCreateDefinitionFromSchema(source.definition.name, source.definition));
                }
                else if (source.additionalProperties) {
                    return new typing_1.MapAbstractedType(new typing_1.BuiltinAbstractedType('string'), this.GetTypeAbstraction(source.additionalProperties));
                }
                else {
                    return new typing_1.SchemaLessAbstractedType();
                }
            }
            else if (type === 'array') {
                return new typing_1.ArrayAbstractedType(this.GetTypeAbstraction(source.items));
            }
            else if (type === 'file') {
                return new typing_1.FileAbstractedType();
            }
            else if (type) {
                return new typing_1.BuiltinAbstractedType(type, source.format);
            }
            else {
                return new typing_1.SchemaLessAbstractedType();
            }
        }
    }
    visitRoot(root) {
        this.context.definitions = [];
        this.context.definitionsMap = {};
        this.context.operations = [];
        this.context.host = this.api.host;
        this.context.basePath = this.api.basePath;
        this.context.defaultConsumes = this.api.consumes ? this.api.consumes : [];
        this.context.defaultProduces = this.api.produces ? this.api.produces : [];
    }
    visitOperation(verb, operation) {
        var path = this.stack[this.stack.length - 1];
        var operationContext = new Operation();
        operationContext.rawPath = path.name;
        operationContext.verb = verb;
        operationContext.description = operation.description;
        operationContext.hasUniqueResponseType = true;
        XRegExp.forEach(path.name, pathParamRegex, match => {
            var segment = match[0];
            if (segment.length) {
                if (segment[0] == '{') {
                    operationContext.pathSegments.push({ name: segment.substring(1, segment.length - 1), isParam: true });
                }
                else {
                    operationContext.pathSegments.push({ name: segment, isParam: false });
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
        operationContext.security = operation.security ? _.keys(operation.security[0]) : [];
        this.push("operation", operationContext);
    }
    visitOperationPost(verb, operation) {
        try {
            var operationContext = this.get("operation");
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
    visitOperationParameter(parameter, index) {
        var operation = this.get("operation");
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
    visitDefinition(name, schema) {
        this.GetOrCreateDefinitionFromSchema(name, schema);
    }
    visitOperationResponse(status, response) {
        var operation = this.get("operation");
        var responseContext = new Response();
        responseContext.status = parseInt(status);
        responseContext.sourceResponse = response;
        responseContext.abstractedType = this.GetTypeAbstraction(response.schema);
        if (status.indexOf('20') === 0) {
            operation.successResponse.push(responseContext);
        }
        else {
            operation.errorResponse.push(responseContext);
        }
        operation.responses.push(responseContext);
    }
    Build() {
        this.context = new GenerationContext();
        console.log("listing ambient types");
        this.context.ambientTypes = [].concat(this.ambientTypes);
        _.forEach(this.dependencies, (dependency) => {
            if (dependency.types) {
                this.context.ambientTypes = this.context.ambientTypes.concat(dependency.types);
            }
        });
        console.log("listing namespaces");
        var namespacesMap = {};
        _.forEach(this.context.ambientTypes, type => {
            if (type.namespace) {
                namespacesMap[type.namespace] = type.namespace;
            }
        });
        this.context.allNamespaces = Object.keys(namespacesMap);
        this.context.dependencies = this.dependencies;
        var visitable = swaggerVisitor.get(this.api);
        console.log("Base context generation");
        visitable.visit(this);
        console.log("mapping ancestors");
        _.forEach(this.context.definitions, (definition) => {
            if (definition.ancestorRef) {
                definition.ancestor = this.context.definitionsMap[definition.ancestorRef];
            }
        });
        if (this.languageFilter.supportsGenerics()) {
            console.log("Mapping generics (limited support)");
            this.context.visit(new GenericTypeMapper(this));
        }
        console.log("Mapping language types");
        this.context.visit(new LanguageTypeMapper(this.languageFilter, this));
        return this.context;
    }
}
exports.ContextBuilder = ContextBuilder;
class Extensible {
}
exports.Extensible = Extensible;
class Response extends Extensible {
    constructor() {
        super();
    }
}
exports.Response = Response;
class Operation extends Extensible {
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
        if (!this.consumes || !this.consumes.length) {
            this.consumes = ["application/json"];
        }
        if (!this.produces || !this.produces.length) {
            this.produces = ["application/json"];
        }
    }
}
exports.Operation = Operation;
var optionalThenAlpha = (a, b) => {
    if (a.optional === b.optional) {
        return a.name > b.name ? 1 : -1;
    }
    else {
        return a.optional ? 1 : -1;
    }
};
class Argument extends Extensible {
    constructor() {
        super();
    }
}
exports.Argument = Argument;
class Definition extends Extensible {
    constructor() {
        super();
        this.isInitialized = false;
        this.shouldIgnore = false;
    }
    initFromSchema(name, schema, contextBuilder) {
        if (name) {
            this.name = name;
            this.rawName = name;
            this.nameParts = name.split(/[^\w]/g);
        }
        if (schema) {
            this.properties = [];
            var injectProperties = (schemaProperties) => {
                if (schemaProperties) {
                    _.forEach(schemaProperties, (property, propertyName) => {
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
                    }
                    else {
                    }
                    injectProperties(item.properties);
                });
            }
        }
        this.isInitialized = true;
    }
}
exports.Definition = Definition;
class Property extends Extensible {
    constructor(name, schema, contextBuilder) {
        super();
        this.name = name;
        this.description = schema.description;
        this.sourceSchema = schema;
    }
}
exports.Property = Property;
class GenerationContext {
    visit(visitor) {
        visitor.beginScope("", this);
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
class ScopedGenerationContextVisitorBase {
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
exports.ScopedGenerationContextVisitorBase = ScopedGenerationContextVisitorBase;
class LanguageTypeMapper extends ScopedGenerationContextVisitorBase {
    constructor(languageFilter, contextBuilder) {
        super();
        this.languageFilter = languageFilter;
        this.contextBuilder = contextBuilder;
        this.typeConverter = languageFilter.createAbstractedTypeConverter(contextBuilder.context);
    }
    visitOperation(operation) {
    }
    visitDefinitionProperty(property) {
        property.type = property.abstractedType.convert(this.typeConverter);
    }
    visitOperationArgument(arg) {
        arg.type = arg.abstractedType.convert(this.typeConverter);
    }
    visitOperationResponse(response) {
        response.type = response.abstractedType.convert(this.typeConverter);
    }
}
class GenericTypeMapper extends ScopedGenerationContextVisitorBase {
    constructor(contextBuilder) {
        super();
        this.contextBuilder = contextBuilder;
        this.typeConverter = new GenericTypeConverter(this.contextBuilder);
    }
    visitOperation(operation) {
    }
    visitDefinition(definition) {
        if (definition.rawName.indexOf('[]') >= 0) {
        }
    }
    visitDefinitionProperty(property) {
        property.abstractedType = property.abstractedType.convert(this.typeConverter);
    }
    visitOperationArgument(arg) {
        arg.abstractedType = arg.abstractedType.convert(this.typeConverter);
    }
    visitOperationResponse(response) {
        response.abstractedType = response.abstractedType.convert(this.typeConverter);
    }
}
class GenericTypeConverter {
    constructor(contextBuilder) {
        this.contextBuilder = contextBuilder;
    }
    schemaLessTypeConvert(type) {
        return type;
    }
    mapTypeConvert(type) {
        return new typing_1.MapAbstractedType(type.keyType.convert(this), type.valueType.convert(this));
    }
    builtinTypeConvert(type) {
        return type;
    }
    customTypeConvert(type) {
        var parts = XRegExp.exec(type.definition.rawName, genericRegex);
        if (parts) {
            var genericName = parts.genericName;
            var genericArgs = parts.genericArgs;
            var matchingTypes = this.contextBuilder.context.ambientTypes.filter((importedType) => importedType.typeName == genericName + '<>');
            if (matchingTypes.length == 1) {
                type.definition.shouldIgnore = true;
                return new typing_1.GenericAbstractedType(new typing_1.ImportedAbstractedType(matchingTypes[0]), [new typing_1.CustomAbstractedType(this.contextBuilder.GetOrCreateDefinition('#/definitions/' + genericArgs))]);
            }
        }
        return type;
    }
    arrayTypeConvert(type) {
        return new typing_1.ArrayAbstractedType(type.itemType.convert(this));
    }
    fileTypeConvert(type) {
        return type;
    }
    genericTypeConvert(type) {
        return type;
    }
    importedTypeConvert(type) {
        return type;
    }
}
