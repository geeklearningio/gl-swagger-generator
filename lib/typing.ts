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
    enumTypeConvert(type: EnumAbstractedType): T;
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
    ext: { [key: string]: any };
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


export class SchemaLessAbstractedType implements IAbstractedType {
    convert<T>(converter: IAbstractedTypeConverter<T>): T {
        return converter.schemaLessTypeConvert(this);
    }
}

export class MapAbstractedType implements IAbstractedType {
    constructor(public keyType: IAbstractedType, public valueType: IAbstractedType) {

    }
    convert<T>(converter: IAbstractedTypeConverter<T>): T {
        return converter.mapTypeConvert(this);
    }
}

export class ImportedAbstractedType implements IAbstractedType {
    constructor(public importedType: IImportedType) {

    }
    convert<T>(converter: IAbstractedTypeConverter<T>): T {
        return converter.importedTypeConvert(this);
    }
}

export class GenericAbstractedType implements IAbstractedType {
    constructor(public generic: IAbstractedType, public parameters: IAbstractedType[]) {

    }
    convert<T>(converter: IAbstractedTypeConverter<T>): T {
        return converter.genericTypeConvert(this);
    }
}

export class BuiltinAbstractedType implements IAbstractedType {
    constructor(public name: string, public format?: string, public isNullable? : boolean) {
        
    }

    convert<T>(converter: IAbstractedTypeConverter<T>): T {
        return converter.builtinTypeConvert(this);
    }
}

export class EnumAbstractedType implements IAbstractedType {
    constructor(public backingType: BuiltinAbstractedType, public values: any[]) {

    }

    convert<T>(converter: IAbstractedTypeConverter<T>): T {
        return converter.enumTypeConvert(this);
    }
}

export class CustomAbstractedType implements IAbstractedType {
    constructor(public definition: IDefinition) {

    }

    convert<T>(converter: IAbstractedTypeConverter<T>): T {
        return converter.customTypeConvert(this);
    }
}

export class ArrayAbstractedType implements IAbstractedType {
    constructor(public itemType: IAbstractedType) {

    }

    convert<T>(converter: IAbstractedTypeConverter<T>): T {
        return converter.arrayTypeConvert(this);
    }
}

export class FileAbstractedType implements IAbstractedType {
    convert<T>(converter: IAbstractedTypeConverter<T>): T {
        return converter.fileTypeConvert(this);
    }
}