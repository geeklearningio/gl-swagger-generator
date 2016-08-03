/**
 * Created by autex on 5/20/2016.
 */

export interface ISink {
    push(name:string, content:string): void;
    complete(): void;
}