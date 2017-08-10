"use strict";
class SchemaLessAbstractedType {
    convert(converter) {
        return converter.schemaLessTypeConvert(this);
    }
}
exports.SchemaLessAbstractedType = SchemaLessAbstractedType;
class MapAbstractedType {
    constructor(keyType, valueType) {
        this.keyType = keyType;
        this.valueType = valueType;
    }
    convert(converter) {
        return converter.mapTypeConvert(this);
    }
}
exports.MapAbstractedType = MapAbstractedType;
class ImportedAbstractedType {
    constructor(importedType) {
        this.importedType = importedType;
    }
    convert(converter) {
        return converter.importedTypeConvert(this);
    }
}
exports.ImportedAbstractedType = ImportedAbstractedType;
class GenericAbstractedType {
    constructor(generic, parameters) {
        this.generic = generic;
        this.parameters = parameters;
    }
    convert(converter) {
        return converter.genericTypeConvert(this);
    }
}
exports.GenericAbstractedType = GenericAbstractedType;
class BuiltinAbstractedType {
    constructor(name, format) {
        this.name = name;
        this.format = format;
    }
    convert(converter) {
        return converter.builtinTypeConvert(this);
    }
}
exports.BuiltinAbstractedType = BuiltinAbstractedType;
class CustomAbstractedType {
    constructor(definition) {
        this.definition = definition;
    }
    convert(converter) {
        return converter.customTypeConvert(this);
    }
}
exports.CustomAbstractedType = CustomAbstractedType;
class ArrayAbstractedType {
    constructor(itemType) {
        this.itemType = itemType;
    }
    convert(converter) {
        return converter.arrayTypeConvert(this);
    }
}
exports.ArrayAbstractedType = ArrayAbstractedType;
class FileAbstractedType {
    convert(converter) {
        return converter.fileTypeConvert(this);
    }
}
exports.FileAbstractedType = FileAbstractedType;
