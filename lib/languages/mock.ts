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
    return new MockFilter();
}

import prettier = require('prettier');

export class MockFilter implements ILanguageFilter {
    genericRegex: RegExp;
    extension = '.txt';

    constructor() {
        this.genericRegex = XRegExp('^(?<genericType>\\w+)\\[(?<arguments>.*?)\\]$', '');
    }

    createAbstractedTypeConverter(generationContext: IGenerationContext): IAbstractedTypeConverter<IType> {
        return new MockAbstractedTypeConverter(generationContext);
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

class MockAbstractedTypeConverter implements IAbstractedTypeConverter<IType> {
    constructor(private generationContext: IGenerationContext) {

    }

    schemaLessTypeConvert(type: SchemaLessAbstractedType): MockType {
        return MockType.any;
    }

    mapTypeConvert(type: MapAbstractedType): MockType {
        return MockType.dictionary(type.keyType.convert(this), type.valueType.convert(this));
    }

    builtinTypeConvert(type: BuiltinAbstractedType): MockType {
        if (type.name === 'integer' || type.name === 'number') {
            return MockType.number;
        } else if (type.name === 'string') {
            if (type.format === "date" || type.format === "date-time") {
                return MockType.string;
                //return MockType.dateTimeOffset;
            } else if (type.format === "uuid") {
                return MockType.string;
            }
            return MockType.string;
        } else if (type.name === 'boolean') {
            return MockType.boolean;
        } 
        return MockType.any;
    }

    enumTypeConvert(type: EnumAbstractedType): MockType {
        return MockType.enum(this.builtinTypeConvert(type.backingType), type.values);
    }

    customTypeConvert(type: CustomAbstractedType): MockType {
        return MockType.fromDefinition(type.definition);
    }

    arrayTypeConvert(type: ArrayAbstractedType): MockType {
        var innerType = type.itemType.convert(this);
        return MockType.array(innerType);
    }

    fileTypeConvert(type: FileAbstractedType): MockType {
        return MockType.file;
    }

    genericTypeConvert(type: GenericAbstractedType): MockType {
        return undefined;
        //return CSharpType.generic(type.generic.convert(this), type.parameters.map(type => type.convert(this)));
    }

    importedTypeConvert(type: ImportedAbstractedType): MockType {
        return MockType.ambient(type.importedType.typeName, type.importedType.namespace);
    }
}

class MockType implements IType {
   
    isLanguageType: boolean;
    name: () => string;
    namespace: string;
    definition: IDefinition;
    isAnonymous: boolean;
    isBuiltin: boolean;
    isDefinition: boolean;
    isArray: boolean;
    itemType: MockType;
    isFile: boolean;
    isGeneric: boolean;
    genericArguments: MockType[];
    isDictionary: boolean;
    keyType: MockType;
    valueType: MockType;
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

    public static string: MockType = new MockType('string', null, true, false, false, false, false);
    public static number: MockType = new MockType('number', null, true, false, false, false, false);
    public static boolean: MockType = new MockType('boolean', null, true, false, false, false, false);
    public static any: MockType = new MockType('any', null, true, false, false, false, false);
    public static file: MockType = new MockType('Blob | File', null, true, false, false, false, true);

    public static ambient(name: string, namespace: string): MockType {
        var type = new MockType(name.replace('<>', ""), null, true, false, false, false, false);
        type.namespace = namespace;
        return type;
    }

    public static enum(backingType: MockType, values: any[]): any {
        var type = new MockType(null, null, false, false, false, false, false);
        type.isEnum = true;
        type.valueType = backingType;
        type.keyType = backingType;
        type.enumValues = values;
        return type;
    }

    public static fromDefinition(definition: IDefinition): MockType {
        var type = new MockType(null, definition, false, true, false, false, false);
        type.namespace = null;
        return type;
    }

    public static anonymous(definition: Definition): MockType {
        return new MockType(null, definition, false, false, true, false, false);
    }

    public static dictionary(keyType: MockType, valueType: MockType): MockType {
        var type = new MockType(null, null, false, false, false, false, false);
        type.isDictionary = true;
        type.keyType = keyType;
        type.valueType = valueType;
        type.name = () => 'Dictionary';
        return type;
    }

    public static array(type: MockType): MockType {
        let arrayType = new MockType(null, null, false, false, false, true, false);
        arrayType.itemType = type;
        arrayType.namespace = null;
        return arrayType;
    }

    public asArray(): IType {
        return MockType.array(this);
    }

    public static generic(type: MockType, args: MockType[]): MockType {
        let genericType = new MockType(null, null, false, false, false, false, false);
        genericType.isGeneric = true;
        genericType.itemType = type;
        genericType.genericArguments = args;
        return genericType;
    }
}