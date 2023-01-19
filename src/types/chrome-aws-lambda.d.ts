declare module 'chrome-aws-lambda' {
    export const args: string[];
    export const executablePath: Promise<string>;
}