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
    return new TypescriptFilter();
}

import prettier = require('prettier');

export class TypescriptFilter implements ILanguageFilter {
    genericRegex: RegExp;
    extension = '.ts';

    constructor() {
        this.genericRegex = XRegExp('^(?<genericType>\\w+)\\[(?<arguments>.*?)\\]$', '');
    }

    createAbstractedTypeConverter(generationContext: IGenerationContext): IAbstractedTypeConverter<IType> {
        return new TypescriptAbstractedTypeConverter(generationContext);
    }

    supportsGenerics(): boolean {
        return false;
    }

    prettyfy(content: string, path: string, options: any) : string {
        if(options && options.prettier && options.prettier.enabled) {
            const finalOptions = _.merge({
                "filepath" : path,
            }, options.prettier.options)
            return prettier.format(content, finalOptions);
        } 
    }
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

    enumTypeConvert(type: EnumAbstractedType): TypescriptType {
        return TypescriptType.enum(this.builtinTypeConvert(type.backingType), type.values);
    }

    customTypeConvert(type: CustomAbstractedType): TypescriptType {
        return TypescriptType.fromDefinition(type.definition);
    }

    arrayTypeConvert(type: ArrayAbstractedType): TypescriptType {
        var innerType = type.itemType.convert(this);
        return TypescriptType.array(innerType);
    }

    fileTypeConvert(type: FileAbstractedType): TypescriptType {
        return TypescriptType.file;
    }

    genericTypeConvert(type: GenericAbstractedType): TypescriptType {
        return undefined;
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
    isEnum: boolean;
    enumValues: any[];


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
    public static file: TypescriptType = new TypescriptType('Blob | File', null, true, false, false, false, true);

    public static ambient(name: string, namespace: string): TypescriptType {
        var type = new TypescriptType(name.replace('<>', ""), null, true, false, false, false, false);
        type.namespace = namespace;
        return type;
    }

    public static enum(backingType: TypescriptType, values: any[]): any {
        var type = new TypescriptType(null, null, false, false, false, false, false);
        type.isEnum = true;
        type.valueType = backingType;
        type.keyType = backingType;
        type.enumValues = values;
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