export interface ISink {
    push(name: string, content: string): void;
    complete(): void;
}
