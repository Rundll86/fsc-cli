import jsdom from "jsdom";
import { LoaderDefinition } from "webpack";
import { filenameWithoutExt, toArray } from "../common/tools";
import path from "path";
import { BlockDefine } from "../common/structs";
const ctx: LoaderDefinition = function (data: string) {
    const dom = new jsdom.JSDOM(`<xml>${data}</xml>`, { "contentType": "application/xml" }).window.document.firstChild as HTMLElement;
    const roots = toArray(dom.childNodes as NodeListOf<HTMLElement>);
    const allowedLangs = ["zh-cn", "en"];
    const allowedBlockTypes = ["command", "reporter", "bool"];
    const allowedArgTypes = ["string", "number", "bool"];
    let opcodes: string[] = [];
    let result: Record<string, BlockDefine> = {};
    let scripts: Record<string, string> = {};
    let hasDefault = false;
    let amIDefault = false;
    let defaultBlock: BlockDefine | null = null;
    for (let e of roots) {
        if (e.nodeType !== 1) continue;
        if (!e.hasAttribute("id")) {
            if (hasDefault) {
                throw new Error("A file can only have one default block.");
            } else {
                hasDefault = true;
                amIDefault = true;
            };
        };
        const myType = e.nodeName;
        if (!allowedBlockTypes.includes(myType)) {
            throw new Error(`Unknown block type: ${myType}`);
        };
        // const myFilename = path.basename(this.resourcePath);
        const myOpcode: string = e.getAttribute("id") || filenameWithoutExt(this.resourcePath);
        if (opcodes.includes(myOpcode)) {
            throw new Error(`ID ${myOpcode} is already exist.`);
        };
        opcodes.push(myOpcode);
        const langStore: Record<string, Record<string, string>> = {};
        e.querySelectorAll("text").forEach((e) => {
            const myLang: string = e.getAttribute("lang") || "zh-cn";
            if (!allowedLangs.includes(myLang)) {
                throw new Error(`Invalid language label: ${myLang}`);
            };
            let result = "";
            (e.childNodes as NodeListOf<HTMLElement>).forEach(e => {
                if (e.nodeType === 3) result += e.textContent?.trim() ?? "";
                else {
                    const myArgType = e.nodeName.toLowerCase();
                    if (!allowedArgTypes.includes(myArgType)) {
                        throw new Error(`Invalid argument type: ${myLang}`);
                    };
                    const myDefaultValue = e.getAttribute("default");
                    const myRefName = e.getAttribute("ref");
                    if (!myRefName) {
                        throw new Error(`Argument must have a refname.`);
                    };
                    result += `[${myRefName}${myArgType === "string" ? "" : ":" + myArgType}${myDefaultValue ? "=" + myDefaultValue : ""}]`;
                };
            });
            if (!langStore[myLang]) langStore[myLang] = {};
            langStore[myLang][myOpcode] = result;
        });
        let doIHaveScript = false;
        let myScript: string | null = null;
        e.querySelectorAll("script").forEach(e => {
            if (doIHaveScript) {
                throw new Error(`Block ${myOpcode} can only have one <script> node.`);
            };
            doIHaveScript = true;
            myScript = e.textContent;
            scripts[myOpcode] = myScript ?? "";
        });
        if (!doIHaveScript || !myScript) {
            throw new Error(`Block ${myOpcode} must have a valid <script> node.`);
        };
        const me = {
            langStore,
            type: myType,
            method: `{symbolFor${myOpcode}}`,
            opcode: myOpcode
        };
        if (amIDefault) {
            defaultBlock = me;
            amIDefault = false;
        } else {
            result[myOpcode] = me;
        };
    };
    const resultWithDefault = Object.assign({}, result, defaultBlock ? { default: defaultBlock } : {});
    let output = JSON.stringify(resultWithDefault);
    Object.values(resultWithDefault).forEach(e => {
        output = output.replaceAll(`"${e.method}"`, `(args)=>{${scripts[e.opcode]}}`);
    });
    return "module.exports=" + output + ";";
};
export default ctx;