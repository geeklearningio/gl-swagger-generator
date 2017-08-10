"use strict";
const XRegExp = require('xregexp');
function create() {
    return new TypescriptFilter();
}
exports.create = create;
class TypescriptFilter {
    constructor() {
        this.genericRegex = XRegExp('^(?<genericType>\\w+)\\[(?<arguments>.*?)\\]$', '');
    }
    createAbstractedTypeConverter(generationContext) {
        return new TypescriptAbstractedTypeConverter(generationContext);
    }
    supportsGenerics() {
        return false;
    }
}
exports.TypescriptFilter = TypescriptFilter;
class TypescriptAbstractedTypeConverter {
    constructor(generationContext) {
        this.generationContext = generationContext;
    }
    schemaLessTypeConvert(type) {
        return TypescriptType.any;
    }
    mapTypeConvert(type) {
        return TypescriptType.dictionary(type.keyType.convert(this), type.valueType.convert(this));
    }
    builtinTypeConvert(type) {
        if (type.name === 'integer' || type.name === 'number') {
            return TypescriptType.number;
        }
        else if (type.name === 'string') {
            if (type.format === "date" || type.format === "date-time") {
                return TypescriptType.string;
            }
            else if (type.format === "uuid") {
                return TypescriptType.string;
            }
            return TypescriptType.string;
        }
        else if (type.name === 'boolean') {
            return TypescriptType.boolean;
        }
        return TypescriptType.any;
    }
    customTypeConvert(type) {
        return TypescriptType.fromDefinition(type.definition);
    }
    arrayTypeConvert(type) {
        var innerType = type.itemType.convert(this);
        return TypescriptType.array(innerType);
    }
    fileTypeConvert(type) {
        return TypescriptType.file;
    }
    genericTypeConvert(type) {
        return undefined;
    }
    importedTypeConvert(type) {
        return TypescriptType.ambient(type.importedType.typeName, type.importedType.namespace);
    }
}
class TypescriptType {
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
        var type = new TypescriptType(name.replace('<>', ""), null, true, false, false, false, false);
        type.namespace = namespace;
        return type;
    }
    static fromDefinition(definition) {
        var type = new TypescriptType(null, definition, false, true, false, false, false);
        type.namespace = null;
        return type;
    }
    static anonymous(definition) {
        return new TypescriptType(null, definition, false, false, true, false, false);
    }
    static dictionary(keyType, valueType) {
        var type = new TypescriptType(null, null, false, false, false, false, false);
        type.isDictionary = true;
        type.keyType = keyType;
        type.valueType = valueType;
        type.name = () => 'Dictionary';
        type.namespace = 'System.Collections.Generic';
        return type;
    }
    static array(type) {
        let arrayType = new TypescriptType(null, null, false, false, false, true, false);
        arrayType.itemType = type;
        arrayType.namespace = null;
        return arrayType;
    }
    asArray() {
        return TypescriptType.array(this);
    }
    static generic(type, args) {
        let genericType = new TypescriptType(null, null, false, false, false, false, false);
        genericType.isGeneric = true;
        genericType.itemType = type;
        genericType.genericArguments = args;
        return genericType;
    }
}
TypescriptType.string = new TypescriptType('string', null, true, false, false, false, false);
TypescriptType.number = new TypescriptType('number', null, true, false, false, false, false);
TypescriptType.boolean = new TypescriptType('boolean', null, true, false, false, false, false);
TypescriptType.any = new TypescriptType('any', null, true, false, false, false, false);
TypescriptType.file = new TypescriptType('Uint8Array', null, true, false, false, false, true);
