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
    return new TypescriptFilter();
}

export class TypescriptFilter implements ILanguageFilter {
    genericRegex: RegExp;

    constructor() {
        this.genericRegex = XRegExp('^(?<genericType>\\w+)\\[(?<arguments>.*?)\\]$', '');
    }

    createAbstractedTypeConverter(generationContext: IGenerationContext): IAbstractedTypeConverter<IType> {
        return new TypescriptAbstractedTypeConverter(generationContext);
    }

    supportsGenerics(): boolean {
        return false;
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

class TypescriptAbstractedTypeConverter implements IAbstractedTypeConverter<IType> {
    constructor(private generationContext: IGenerationContext) {

    }

    schemaLessTypeConvert(type: SchemaLessAbstractedType): TypescriptType {
        return TypescriptType.any;
    }

    mapTypeConvert(type: MapAbstractedType): TypescriptType {
        return TypescriptType.dictionary(type.keyType.convert(this), type.valueType.convert(this));
    }

    builtinTypeConvert(type: BuiltinAbstractedType): TypescriptType {
        if (type.name === 'integer' || type.name === 'number') {
            return TypescriptType.number;
        } else if (type.name === 'string') {
            if (type.format === "date" || type.format === "date-time") {
                return TypescriptType.string;
                //return TypescriptType.dateTimeOffset;
            } else if (type.format === "uuid") {
                return TypescriptType.string;
            }
            return TypescriptType.string;
        } else if (type.name === 'boolean') {
            return TypescriptType.boolean;
        } 
        return TypescriptType.any;
    }

    customTypeConvert(type: CustomAbstractedType): TypescriptType {
        return TypescriptType.fromDefinition(type.definition);
    }

    arrayTypeConvert(type: ArrayAbstractedType): TypescriptType {
        //console.log(type.itemType);
        var innerType = type.itemType.convert(this);
        //console.log(innerType);
        return TypescriptType.array(innerType);
    }

    fileTypeConvert(type: FileAbstractedType): TypescriptType {
        return TypescriptType.file;
    }

    genericTypeConvert(type: GenericAbstractedType): TypescriptType {
        return 
        //return CSharpType.generic(type.generic.convert(this), type.parameters.map(type => type.convert(this)));
    }

    importedTypeConvert(type: ImportedAbstractedType): TypescriptType {
        return TypescriptType.ambient(type.importedType.typeName, type.importedType.namespace);
    }
}

class TypescriptType implements IType {
    isLanguageType: boolean;
    name: () => string;
    namespace: string;
    definition: IDefinition;
    isAnonymous: boolean;
    isBuiltin: boolean;
    isDefinition: boolean;
    isArray: boolean;
    itemType: TypescriptType;
    isFile: boolean;
    isGeneric: boolean;
    genericArguments: TypescriptType[];
    isDictionary: boolean;
    keyType: TypescriptType;
    valueType: TypescriptType;


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

    public static string: TypescriptType = new TypescriptType('string', null, true, false, false, false, false);
    public static number: TypescriptType = new TypescriptType('number', null, true, false, false, false, false);
    public static boolean: TypescriptType = new TypescriptType('boolean', null, true, false, false, false, false);
    public static any: TypescriptType = new TypescriptType('any', null, true, false, false, false, false);
    public static file: TypescriptType = new TypescriptType('Uint8Array', null, true, false, false, false, true);

    public static ambient(name: string, namespace: string): TypescriptType {
        var type = new TypescriptType(name.replace('<>', ""), null, true, false, false, false, false);
        type.namespace = namespace;
        return type;
    }

    public static fromDefinition(definition: IDefinition): TypescriptType {
        var type = new TypescriptType(null, definition, false, true, false, false, false);
        type.namespace = null;
        return type;
    }

    public static anonymous(definition: Definition): TypescriptType {
        return new TypescriptType(null, definition, false, false, true, false, false);
    }

    public static dictionary(keyType: TypescriptType, valueType: TypescriptType): TypescriptType {
        var type = new TypescriptType(null, null, false, false, false, false, false);
        type.isDictionary = true;
        type.keyType = keyType;
        type.valueType = valueType;
        type.name = () => 'Dictionary';
        type.namespace = 'System.Collections.Generic';
        return type;
    }

    public static array(type: TypescriptType): TypescriptType {
        let arrayType = new TypescriptType(null, null, false, false, false, true, false);
        arrayType.itemType = type;
        arrayType.namespace = null;
        return arrayType;
    }

    public asArray(): IType {
        return TypescriptType.array(this);
    }

    public static generic(type: TypescriptType, args: TypescriptType[]): TypescriptType {
        let genericType = new TypescriptType(null, null, false, false, false, false, false);
        genericType.isGeneric = true;
        genericType.itemType = type;
        genericType.genericArguments = args;
        return genericType;
    }
}