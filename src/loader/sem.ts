import jsdom from "jsdom";
import { LoaderDefinition } from "webpack";
import { filenameWithoutExt, toArray } from "../common/tools";
import { MenuDefine } from "src/common/structs";
const ctx: LoaderDefinition = function (data: string) {
    const dom = new jsdom.JSDOM(`<xml>${data}</xml>`, { "contentType": "application/xml" }).window.document.firstChild as HTMLElement;
    const roots = toArray(dom.childNodes as NodeListOf<HTMLElement>);
    const result: Record<string, MenuDefine> = {};
    let haveDefault = false;
    for (let i of roots) {
        if (i.nodeType !== 1) continue;
        if (i.nodeName !== "menu") {
            throw new Error("Root node can only be <menu>.");
        };
        const amIDefault = !i.getAttribute("id");
        if (amIDefault) {
            if (haveDefault) {
                throw new Error("A file can only have one default menu.")
            } else {
                haveDefault = true;
            };
        };
        const myName = i.getAttribute("id") || filenameWithoutExt(this.resourcePath);
        const me: MenuDefine = {
            name: myName,
            options: []
        };
        (i.childNodes as NodeListOf<HTMLElement>).forEach(e => {
            if (e.nodeType !== 1) return;
            if (e.nodeName !== "option") {
                throw new Error("Menu can only have <option> node.");
            };
            const myText = e.textContent ?? "";
            me.options.push({
                text: myText,
                value: e.getAttribute("value") ?? myText
            });
        });
        if (amIDefault) {
            result.default = me;
        } else {
            result[myName] = me;
        };
    };
    return "module.exports=" + JSON.stringify(result);
};
export default ctx;