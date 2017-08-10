import { ILanguageFilter, IGenerationContext } from '../generation';
import { IType, IAbstractedTypeConverter } from '../typing';
export declare function create(): ILanguageFilter;
export declare class TypescriptFilter implements ILanguageFilter {
    genericRegex: RegExp;
    constructor();
    createAbstractedTypeConverter(generationContext: IGenerationContext): IAbstractedTypeConverter<IType>;
    supportsGenerics(): boolean;
}
