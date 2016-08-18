import {ILanguageFilter, IType, Definition, ContextBuilder} from '../generation'
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

    getCustomType(definition: Definition, contextBuilder: ContextBuilder): IType {
        //console.log('get custom type : ' + definition.rawName + ' ' + definition.isInitialized);
        var match = XRegExp.exec(definition.rawName, this.genericRegex);
        //console.log(match);
        if (match) {
            var genericType = (<any>match).genericType;
            //console.log('genericType :' + genericType);
            var type = _.find(contextBuilder.context.ambientTypes, type => type.typeName == (genericType + '<>'));
            if (type) {
                return CSharpType.ambient(genericType + '<>');
            }
        }
        return CSharpType.fromDefinition(definition);
    }

    getType(source: swagger.IHasTypeInformation, contextBuilder: ContextBuilder): IType {
        if (!source) {
            return CSharpType.any;
        }
        if ((<any>source).isLanguageType) {
            return (<any>source);
        }
        if (source.$ref) {
            return this.getCustomType(contextBuilder.GetOrCreateDefinition(source.$ref), contextBuilder);
        } else {
            let type = source.type;
            if (type === 'integer' || type === 'number') {
                return CSharpType.number(source.format);
            } else if (type == 'string') {
                if (source.format === "date" || source.format === "date-time") {
                    return CSharpType.dateTimeOffset;
                }
                return CSharpType.string;
            } else if (type == 'boolean') {
                return CSharpType.boolean;
            } else if (type === 'object') {
                if ((<any>source).definition) {
                    return CSharpType.anonymous((<any>source).definition);
                }
                if (source.additionalProperties) {
                    return CSharpType.dictionary(CSharpType.string, <CSharpType>this.getType(source.additionalProperties, contextBuilder));
                }
                return CSharpType.any;
            } else if (type === 'array') {
                //console.log(JSON.stringify(source.items));
                return this.getType(source.items, contextBuilder).asArray();
            } else if (type === 'file') {
                return CSharpType.file;
            } else if (type === 'date') {
                return CSharpType.file;
            } else {
                return CSharpType.any;
            }
        }
    }
}

class CSharpType implements IType {
    isLanguageType: boolean;
    name: () => string;
    definition: Definition;
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

    constructor(name: string, definition: Definition, isBuiltin: boolean, isDefinition: boolean, isAnonymous: boolean, isArray: boolean, isFile: boolean) {
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
    }

    public static string: CSharpType = new CSharpType('string', null, true, false, false, false, false);
    public static boolean: CSharpType = new CSharpType('bool', null, true, false, false, false, false);
    public static any: CSharpType = new CSharpType('object', null, true, false, false, false, false);
    public static file: CSharpType = new CSharpType('string', null, true, false, false, false, true);
    public static dateTimeOffset: CSharpType = new CSharpType('DateTimeOffset', null, true, false, false, false, false);

    public static ambient(name: string) {
        return new CSharpType(name, null, true, false, false, false, false);
    }

    public static fromDefinition(definition: Definition): CSharpType {
        return new CSharpType(null, definition, false, true, false, false, false);
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
        var type = new CSharpType(null, type.definition, true, false, false, true, false);
        type.itemType = type;
        return type;
    }

    public asArray(): IType {
        return CSharpType.array(this);
    }
}