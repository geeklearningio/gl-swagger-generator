import {ILanguageFilter, IGenerationContext, Definition, ContextBuilder} from '../generation'
import {
    IExtensible,
    IAbstractedType, IType, ITyped, IImportedType,
    IDefinition, IProperty,
    IAbstractedTypeConverter,
    SchemaLessAbstractedType, EnumAbstractedType, ArrayAbstractedType, BuiltinAbstractedType, CustomAbstractedType, FileAbstractedType, MapAbstractedType, GenericAbstractedType, ImportedAbstractedType
} from '../typing';
import swagger = require('swagger-parser');
import _ = require('lodash');
import XRegExp = require('xregexp');

export function create(): ILanguageFilter {
    return new CsharpFilter();
}

export class CsharpFilter implements ILanguageFilter {
    genericRegex: RegExp;
    extension = '.cs';

    constructor() {
        this.genericRegex = XRegExp('^(?<genericType>\\w+)\\[(?<arguments>.*?)\\]$', '');
    }

    createAbstractedTypeConverter(generationContext: IGenerationContext): IAbstractedTypeConverter<IType> {
        return new CSharpAbstractedTypeConverter(generationContext);
    }

    supportsGenerics(): boolean {
        return true;
    }
}

class CSharpAbstractedTypeConverter implements IAbstractedTypeConverter<IType> {
    constructor(private generationContext: IGenerationContext) {

    }

    schemaLessTypeConvert(type: SchemaLessAbstractedType): CSharpType {
        return CSharpType.any;
    }

    mapTypeConvert(type: MapAbstractedType): CSharpType {
        return CSharpType.dictionary(type.keyType.convert(this), type.valueType.convert(this));
    }

    builtinTypeConvert(type: BuiltinAbstractedType): CSharpType {
        if (type.name === 'integer') {
            return CSharpType.number(type.format ? type.format : 'int32').asNullable(type.isNullable);
        } else if (type.name === 'number') { 
            return CSharpType.number(type.format ? type.format : 'double').asNullable(type.isNullable);
        } else if (type.name === 'string') {
            if (type.format === "date" || type.format === "date-time") {
                return CSharpType.dateTimeOffset.asNullable(type.isNullable);
            } else if (type.format === "uuid") {
                return CSharpType.guid.asNullable(type.isNullable);
            }
            return CSharpType.string;
        } else if (type.name === 'boolean') {
            return CSharpType.boolean.asNullable(type.isNullable);
        } else if (type.name === 'date') {
            return CSharpType.dateTimeOffset.asNullable(type.isNullable);
        }
        return CSharpType.any;
    }

    customTypeConvert(type: CustomAbstractedType): CSharpType {
        return CSharpType.fromDefinition(type.definition);
    }

    enumTypeConvert(type: EnumAbstractedType): CSharpType {
        return CSharpType.enum(this.builtinTypeConvert(type.backingType), type.values);
    }

    arrayTypeConvert(type: ArrayAbstractedType): CSharpType {
        var innerType = type.itemType.convert(this);
        return CSharpType.array(innerType);
    }

    fileTypeConvert(type: FileAbstractedType): CSharpType {
        return CSharpType.file;
    }

    genericTypeConvert(type: GenericAbstractedType): CSharpType {
        return CSharpType.generic(type.generic.convert(this), type.parameters.map(type => type.convert(this)));
    }

    importedTypeConvert(type: ImportedAbstractedType): CSharpType {
        return CSharpType.ambient(type.importedType.typeName, type.importedType.namespace);
    }
}

class CSharpType implements IType {
    isLanguageType: boolean;
    name: () => string;
    namespace: string;
    definition: IDefinition;
    isNullable: boolean;
    isValueType: boolean;
    isAnonymous: boolean;
    isBuiltin: boolean;
    isDefinition: boolean;
    isArray: boolean;
    itemType: CSharpType;
    isFile: boolean;
    isGeneric: boolean;
    genericArguments: CSharpType[];
    isDictionary: boolean;
    keyType: CSharpType;
    valueType: CSharpType;
    isEnum: boolean;
    enumValues: any[];

    constructor(
        name: string, 
        definition: IDefinition, 
        isBuiltin: boolean, 
        isDefinition: boolean, 
        isAnonymous: boolean, 
        isArray: boolean, 
        isFile: boolean, 
        isValueType: boolean = false) {
        if (name) {
            this.name = () => name;
        } else if (definition) {
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
        this.isValueType = isValueType;
    }

    public static string: CSharpType = new CSharpType('string', null, true, false, false, false, false);
    public static byte: CSharpType = new CSharpType('byte', null, true, false, false, false, false, true);
    public static guid: CSharpType = new CSharpType('Guid', null, true, false, false, false, false, true);
    public static boolean: CSharpType = new CSharpType('bool', null, true, false, false, false, false, true);
    public static any: CSharpType = new CSharpType('object', null, true, false, false, false, false);
    public static file: CSharpType = new CSharpType('IFile', null, true, false, false, false, true);
    public static dateTimeOffset: CSharpType = new CSharpType('DateTimeOffset', null, true, false, false, false, false, true);

    public static ambient(name: string, namespace: string): CSharpType {
        var type = new CSharpType(name.replace('<>', ""), null, true, false, false, false, false);
        type.namespace = namespace;
        return type;
    }

    public static fromDefinition(definition: IDefinition): CSharpType {
        var type = new CSharpType(null, definition, false, true, false, false, false);
        type.namespace = null;
        return type;
    }

    public static anonymous(definition: Definition): CSharpType {
        return new CSharpType(null, definition, false, false, true, false, false);
    }

    public static enum(backingType: CSharpType, values: any[]): any {
        var type = new CSharpType(null, null, false, false, false, false, false, true);
        type.isEnum = true;
        type.keyType = backingType;
        type.valueType = backingType;
        type.enumValues = values;
        return type;
    }

    public static dictionary(keyType: CSharpType, valueType: CSharpType): CSharpType {
        var type = new CSharpType(null, null, false, false, false, false, false);
        type.isDictionary = true;
        type.keyType = keyType;
        type.valueType = valueType;
        type.name = () => 'Dictionary';
        type.namespace = 'System.Collections.Generic';
        return type;
    }

    public static number(format: string): CSharpType {
        if (format === "int32") {
            return new CSharpType('int', null, true, false, false, false, false, true);
        } else if (format === "int64" || format == "long") {
            return new CSharpType('long', null, true, false, false, false, false, true);
        } else if (format === "float") {
            return new CSharpType('float', null, true, false, false, false, false, true);
        } else if (format === "double") {
            return new CSharpType('double', null, true, false, false, false, false, true);
        } else {
            console.warn('format unknown :', format);
            return new CSharpType('double', null, true, false, false, false, false, true);
        }
    }

    public static array(type: CSharpType): CSharpType {
        let arrayType = new CSharpType(null, null, false, false, false, true, false);
        arrayType.itemType = type;
        arrayType.namespace = null;
        return arrayType;
    }

    public static nullable(type: CSharpType): CSharpType {
        let nullableType = new CSharpType(null, null, false, false, false, false, false, false);
        nullableType.itemType = type;
        nullableType.isNullable = true;
        return nullableType;
    }

    public asArray(): IType {
        return CSharpType.array(this);
    }

    public asNullable(isNullable: boolean): CSharpType {
        if (isNullable) {
            return CSharpType.nullable(this);
        } else {
            return this;
        }
    }

    public static generic(type: CSharpType, args: CSharpType[]): CSharpType {
        let genericType = new CSharpType(null, null, false, false, false, false, false);
        genericType.isGeneric = true;
        genericType.itemType = type;
        genericType.genericArguments = args;
        return genericType;
    }
}