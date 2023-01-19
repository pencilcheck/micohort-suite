declare module '@gizt/selector' {
    function select(selector: string, data: any): string | string[] | any[];
    export default select;
}