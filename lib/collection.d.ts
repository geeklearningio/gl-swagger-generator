export declare function wrapArray<T>(array: T[]): ArrayHelper<T>;
export declare class ArrayHelper<T> {
    private list;
    constructor(list: T[]);
    each(operation: (item: T, index: number) => any): void;
    eachAsync(operation: (item: T, index: number) => Promise<any>): Promise<any>;
}
