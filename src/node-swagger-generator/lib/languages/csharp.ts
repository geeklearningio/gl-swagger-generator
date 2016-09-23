import {ILanguageFilter, IGenerationContext, Definition, ContextBuilder} from '../generation'
import {
    IExtensible,
    IAbstractedType, IType, ITyped, IImportedType,
    IDefinition, IProperty,
    IAbstractedTypeConverter,
    SchemaLessAbstractedType, ArrayAbstractedType, BuiltinAbstractedType, CustomAbstractedType, FileAbstractedType, MapAbstractedType, GenericAbstractedType, ImportedAbstractedType
} from '../typing';
import swagger = require('swagger-parser');
import _ = require('lodash');
import XRegExp = require('xregexp');

export function create(): ILanguageFilter {
    return new CsharpFilter();
}

export class CsharpFilter implements ILanguageFilter {
    genericRegex: RegExp;

    constructor() {
        this.genericRegex = XRegExp('^(?<genericType>\\w+)\\[(?<arguments>.*?)\\]$', '');
    }

    createAbstractedTypeConverter(generationContext: IGenerationContext): IAbstractedTypeConverter<IType> {
        return new CSharpAbstractedTypeConverter(generationContext);
    }

    supportsGenerics(): boolean {
        return true;
    }

    // getCustomType(definition: Definition, contextBuilder: ContextBuilder): IType {
    //     //console.log('get custom type : ' + definition.rawName + ' ' + definition.isInitialized);
    //     var match = XRegExp.exec(definition.rawName, this.genericRegex);
    //     //console.log(match);
    //     if (match) {
    //         var genericType = (<any>match).genericType;
    //         //console.log('genericType :' + genericType);
    //         var type = _.find(contextBuilder.context.ambientTypes, type => type.typeName == (genericType + '<>'));
    //         if (type) {
    //             return CSharpType.ambient(genericType + '<>');
    //         }
    //     }
    //     return CSharpType.fromDefinition(definition);
    // }

    // getType(source: swagger.IHasTypeInformation, contextBuilder: ContextBuilder): IType {
    //     if (!source) {
    //         return CSharpType.any;
    //     }
    //     if ((<any>source).isLanguageType) {
    //         return (<any>source);
    //     }
    //     if (source.$ref) {
    //         return this.getCustomType(contextBuilder.GetOrCreateDefinition(source.$ref), contextBuilder);
    //     } else {
    //         let type = source.type;
    //         if (type === 'integer' || type === 'number') {
    //             return CSharpType.number(source.format);
    //         } else if (type == 'string') {
    //             if (source.format === "date" || source.format === "date-time") {
    //                 return CSharpType.dateTimeOffset;
    //             }
    //             return CSharpType.string;
    //         } else if (type == 'boolean') {
    //             return CSharpType.boolean;
    //         } else if (type === 'object') {
    //             if ((<any>source).definition) {
    //                 return CSharpType.anonymous((<any>source).definition);
    //             }
    //             if (source.additionalProperties) {
    //                 return CSharpType.dictionary(CSharpType.string, <CSharpType>this.getType(source.additionalProperties, contextBuilder));
    //             }
    //             return CSharpType.any;
    //         } else if (type === 'array') {
    //             //console.log(JSON.stringify(source.items));
    //             return this.getType(source.items, contextBuilder).asArray();
    //         } else if (type === 'file') {
    //             return CSharpType.file;
    //         } else if (type === 'date') {
    //             return CSharpType.file;
    //         } else {
    //             return CSharpType.any;
    //         }
    //     }
    // }
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
        if (type.name === 'integer' || type.name === 'number') {
            return CSharpType.number(type.format);
        } else if (type.name === 'string') {
            if (type.format === "date" || type.format === "date-time") {
                return CSharpType.dateTimeOffset;
            } else if (type.format === "uuid") {
                return CSharpType.guid;
            }
            return CSharpType.string;
        } else if (type.name === 'boolean') {
            return CSharpType.boolean;
        } else if (type.name === 'date') {
            return CSharpType.dateTimeOffset;
        }
        return CSharpType.any;
    }

    customTypeConvert(type: CustomAbstractedType): CSharpType {
        return CSharpType.fromDefinition(type.definition);
    }

    arrayTypeConvert(type: ArrayAbstractedType): CSharpType {
        //console.log(type.itemType);
        var innerType = type.itemType.convert(this);
        //console.log(innerType);
        return CSharpType.array(innerType);
    }

    fileTypeConvert(type: FileAbstractedType): CSharpType {
        return CSharpType.array(CSharpType.byte);
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

    constructor(name: string, definition: IDefinition, isBuiltin: boolean, isDefinition: boolean, isAnonymous: boolean, isArray: boolean, isFile: boolean) {
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
    }

    public static string: CSharpType = new CSharpType('string', null, true, false, false, false, false);
    public static byte: CSharpType = new CSharpType('byte', null, true, false, false, false, false);
    public static guid: CSharpType = new CSharpType('Guid', null, true, false, false, false, false);
    public static boolean: CSharpType = new CSharpType('bool', null, true, false, false, false, false);
    public static any: CSharpType = new CSharpType('object', null, true, false, false, false, false);
    public static file: CSharpType = new CSharpType('string', null, true, false, false, false, true);
    public static dateTimeOffset: CSharpType = new CSharpType('DateTimeOffset', null, true, false, false, false, false);

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
            return new CSharpType('int', null, true, false, false, false, false);
        } else if (format === "int64") {
            return new CSharpType('long', null, true, false, false, false, false);
        } else if (format === "float") {
            return new CSharpType('float', null, true, false, false, false, false);
        } else if (format === "double") {
            return new CSharpType('double', null, true, false, false, false, false);
        }
    }

    public static array(type: CSharpType): CSharpType {
        let arrayType = new CSharpType(null, null, false, false, false, true, false);
        arrayType.itemType = type;
        arrayType.namespace = null;
        return arrayType;
    }

    public asArray(): IType {
        return CSharpType.array(this);
    }

    public static generic(type: CSharpType, args: CSharpType[]): CSharpType {
        let genericType = new CSharpType(null, null, false, false, false, false, false);
        genericType.isGeneric = true;
        genericType.itemType = type;
        genericType.genericArguments = args;
        return genericType;
    }
}