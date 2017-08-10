"use strict";
const XRegExp = require('xregexp');
function create() {
    return new CsharpFilter();
}
exports.create = create;
class CsharpFilter {
    constructor() {
        this.genericRegex = XRegExp('^(?<genericType>\\w+)\\[(?<arguments>.*?)\\]$', '');
    }
    createAbstractedTypeConverter(generationContext) {
        return new CSharpAbstractedTypeConverter(generationContext);
    }
    supportsGenerics() {
        return true;
    }
}
exports.CsharpFilter = CsharpFilter;
class CSharpAbstractedTypeConverter {
    constructor(generationContext) {
        this.generationContext = generationContext;
    }
    schemaLessTypeConvert(type) {
        return CSharpType.any;
    }
    mapTypeConvert(type) {
        return CSharpType.dictionary(type.keyType.convert(this), type.valueType.convert(this));
    }
    builtinTypeConvert(type) {
        if (type.name === 'integer' || type.name === 'number') {
            return CSharpType.number(type.format);
        }
        else if (type.name === 'string') {
            if (type.format === "date" || type.format === "date-time") {
                return CSharpType.dateTimeOffset;
            }
            else if (type.format === "uuid") {
                return CSharpType.guid;
            }
            return CSharpType.string;
        }
        else if (type.name === 'boolean') {
            return CSharpType.boolean;
        }
        else if (type.name === 'date') {
            return CSharpType.dateTimeOffset;
        }
        return CSharpType.any;
    }
    customTypeConvert(type) {
        return CSharpType.fromDefinition(type.definition);
    }
    arrayTypeConvert(type) {
        var innerType = type.itemType.convert(this);
        return CSharpType.array(innerType);
    }
    fileTypeConvert(type) {
        return CSharpType.file;
    }
    genericTypeConvert(type) {
        return CSharpType.generic(type.generic.convert(this), type.parameters.map(type => type.convert(this)));
    }
    importedTypeConvert(type) {
        return CSharpType.ambient(type.importedType.typeName, type.importedType.namespace);
    }
}
class CSharpType {
    constructor(name, definition, isBuiltin, isDefinition, isAnonymous, isArray, isFile) {
        if (name) {
            this.name = () => name;
        }
        else if (definition) {
            this.name = () => this.definition.name;
        }
        this.definition = definition;
        this.isBuiltin = isBuiltin;
        this.isDefinition = isDefinition;
        this.isAnonymous = isAnonymous;
        this.isArray = isArray;
        this.isFile = isFile;
        this.isLanguageType = true;
        this.namespace = "System";
    }
    static ambient(name, namespace) {
        var type = new CSharpType(name.replace('<>', ""), null, true, false, false, false, false);
        type.namespace = namespace;
        return type;
    }
    static fromDefinition(definition) {
        var type = new CSharpType(null, definition, false, true, false, false, false);
        type.namespace = null;
        return type;
    }
    static anonymous(definition) {
        return new CSharpType(null, definition, false, false, true, false, false);
    }
    static dictionary(keyType, valueType) {
        var type = new CSharpType(null, null, false, false, false, false, false);
        type.isDictionary = true;
        type.keyType = keyType;
        type.valueType = valueType;
        type.name = () => 'Dictionary';
        type.namespace = 'System.Collections.Generic';
        return type;
    }
    static number(format) {
        if (format === "int32") {
            return new CSharpType('int', null, true, false, false, false, false);
        }
        else if (format === "int64") {
            return new CSharpType('long', null, true, false, false, false, false);
        }
        else if (format === "float") {
            return new CSharpType('float', null, true, false, false, false, false);
        }
        else if (format === "double") {
            return new CSharpType('double', null, true, false, false, false, false);
        }
    }
    static array(type) {
        let arrayType = new CSharpType(null, null, false, false, false, true, false);
        arrayType.itemType = type;
        arrayType.namespace = null;
        return arrayType;
    }
    asArray() {
        return CSharpType.array(this);
    }
    static generic(type, args) {
        let genericType = new CSharpType(null, null, false, false, false, false, false);
        genericType.isGeneric = true;
        genericType.itemType = type;
        genericType.genericArguments = args;
        return genericType;
    }
}
CSharpType.string = new CSharpType('string', null, true, false, false, false, false);
CSharpType.byte = new CSharpType('byte', null, true, false, false, false, false);
CSharpType.guid = new CSharpType('Guid', null, true, false, false, false, false);
CSharpType.boolean = new CSharpType('bool', null, true, false, false, false, false);
CSharpType.any = new CSharpType('object', null, true, false, false, false, false);
CSharpType.file = new CSharpType('IFile', null, true, false, false, false, true);
CSharpType.dateTimeOffset = new CSharpType('DateTimeOffset', null, true, false, false, false, false);
