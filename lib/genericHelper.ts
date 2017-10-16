import { ScopedSwaggerVisitorBase, ISwaggerVisitor } from "./swaggerVisitor";
import { ISchema, IHasTypeInformation, IOperation } from "../typings/swagger-doc2";
import XRegExp = require('xregexp');

export class AppenGenericMetadataVisitor extends ScopedSwaggerVisitorBase {

    private genericRegex = XRegExp('^(?<genericName>\\w+)\\[(?<genericArgs>.+)\\]$');;

    visitDefinition(name: string, schema: ISchema) {
        let genericInfo = this.matchGenerics(name);
        (<any>schema)['x-generic-info'] = genericInfo;

        console.log(name);
        console.log(JSON.stringify(genericInfo));
    }

    visitAnonymousDefinition(schema: IHasTypeInformation) {
    }

    visitOperation(verb: string, operation: IOperation) {
    }

    private matchGenerics(typeName: string): IGenericInfo {
        var result = XRegExp.exec(typeName, this.genericRegex);
        if (result) {
            let childInfo = this.matchGenerics((<any>result).genericArgs);
            return {
                typeName: (<any>result).genericName,
                arguments: [childInfo]
            };
        } else {
            return {
                typeName: typeName
            };
        }
    }
}

export interface IGenericInfo {
    typeName: string,
    arguments?: IGenericInfo[]
}