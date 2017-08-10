export interface IType {
    name: () => string;
    namespace: string;
    definition?: IDefinition;
    isAnonymous?: boolean;
    isBuiltin?: boolean;
    isDefinition?: boolean;
    isArray?: boolean;
    isFile?: boolean;
    asArray(): IType;
}
export interface ITyped {
    abstractedType: IAbstractedType;
    type: IType;
}
export interface IAbstractedTypeConverter<T> {
    schemaLessTypeConvert(type: SchemaLessAbstractedType): T;
    mapTypeConvert(type: MapAbstractedType): T;
    builtinTypeConvert(type: BuiltinAbstractedType): T;
    customTypeConvert(type: CustomAbstractedType): T;
    arrayTypeConvert(type: ArrayAbstractedType): T;
    fileTypeConvert(type: FileAbstractedType): T;
    genericTypeConvert(type: GenericAbstractedType): T;
    importedTypeConvert(type: ImportedAbstractedType): T;
}
export interface IAbstractedType {
    convert<T>(converter: IAbstractedTypeConverter<T>): T;
}
export interface IExtensible {
    ext: {
        [key: string]: any;
    };
}
export interface IProperty extends IExtensible, ITyped {
    name: string;
    type: IType;
    abstractedType: IAbstractedType;
    description: string;
}
export interface IImportedType {
    typeName: string;
    namespace: string;
}
export interface IDefinition extends IExtensible {
    name: string;
    rawName: string;
    nameParts: string[];
    properties: IProperty[];
    ancestorRef: string;
    ancestor: IDefinition;
    isInitialized: boolean;
    shouldIgnore: boolean;
}
export declare class SchemaLessAbstractedType implements IAbstractedType {
    convert<T>(converter: IAbstractedTypeConverter<T>): T;
}
export declare class MapAbstractedType implements IAbstractedType {
    keyType: IAbstractedType;
    valueType: IAbstractedType;
    constructor(keyType: IAbstractedType, valueType: IAbstractedType);
    convert<T>(converter: IAbstractedTypeConverter<T>): T;
}
export declare class ImportedAbstractedType implements IAbstractedType {
    importedType: IImportedType;
    constructor(importedType: IImportedType);
    convert<T>(converter: IAbstractedTypeConverter<T>): T;
}
export declare class GenericAbstractedType implements IAbstractedType {
    generic: IAbstractedType;
    parameters: IAbstractedType[];
    constructor(generic: IAbstractedType, parameters: IAbstractedType[]);
    convert<T>(converter: IAbstractedTypeConverter<T>): T;
}
export declare class BuiltinAbstractedType implements IAbstractedType {
    name: string;
    format: string;
    constructor(name: string, format?: string);
    convert<T>(converter: IAbstractedTypeConverter<T>): T;
}
export declare class CustomAbstractedType implements IAbstractedType {
    definition: IDefinition;
    constructor(definition: IDefinition);
    convert<T>(converter: IAbstractedTypeConverter<T>): T;
}
export declare class ArrayAbstractedType implements IAbstractedType {
    itemType: IAbstractedType;
    constructor(itemType: IAbstractedType);
    convert<T>(converter: IAbstractedTypeConverter<T>): T;
}
export declare class FileAbstractedType implements IAbstractedType {
    convert<T>(converter: IAbstractedTypeConverter<T>): T;
}
