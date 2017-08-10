
export function wrapArray<T>(array: T[]): ArrayHelper<T> {
    return new ArrayHelper(array);
}

export class ArrayHelper<T> {
    constructor(private list: T[]) {

    }

    each(operation: (item: T, index: number) => any): void {
        for (var i = 0; i < this.list.length; i++) {
            var item = this.list[i];
            operation(item, i);
        }
    }

    async eachAsync(operation: (item: T, index: number) => Promise<any>): Promise<any> {
        for (var i = 0; i < this.list.length; i++) {
            var item = this.list[i];
            await operation(item, i);
        }
    }
}