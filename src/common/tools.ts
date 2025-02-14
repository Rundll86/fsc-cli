import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import fs from "fs/promises";
import { existsSync } from "fs";
import { stdout } from "process";
import path from "path";
import type {
    AllowedPackageManager,
    PackageManagerCommand,
    PackageManagerImpleAlias
} from "./structs";
export async function run(args: string[], show: boolean = true) {
    return new Promise<{
        result: ChildProcessWithoutNullStreams;
        stdout: string;
    }>((resolve, reject) => {
        if (show) stdout.write(`$ ${args.map(e => e.includes(" ") ? '"' + e + '"' : e).join(" ")}\n`);
        let stdoutData: string = "";
        const result = spawn("powershell", ["-C", ...args]);
        result.stdout.addListener("data", (data) => {
            stdoutData += data.toString();
        });
        result.addListener("close", () => {
            if (result.exitCode === 0) resolve({ result, stdout: stdoutData });
            else reject({ result, stdout: stdoutData });
        });
    });
};
export async function isModuleGlobalInstalled(name: string): Promise<boolean> {
    return (await run(["npm", "list", "-g"], false)).stdout.includes(` ${name}@`);
};
export function readAlias(
    pm: AllowedPackageManager,
    command: PackageManagerCommand
): string {
    return packageManagerImpleAlias[pm][command] ?? command;
};
export const packageManagerImpleAlias: PackageManagerImpleAlias = {
    yarn: {
        install: "add"
    },
    npm: {}
};
export async function mkdirIfNotExists(dirname: string): Promise<boolean> {
    if (!existsSync(dirname)) {
        await fs.mkdir(dirname);
        return true;
    };
    return false;
};
export async function copyFolderRecursive(source: string, target: string) {
    const entries = await fs.readdir(source, { withFileTypes: true });
    for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const targetPath = path.join(target, entry.name);
        if (entry.isDirectory()) {
            if (!await fs.stat(targetPath).catch(() => null)) {
                await fs.mkdir(targetPath);
            };
            await copyFolderRecursive(sourcePath, targetPath);
        } else {
            if (!await fs.stat(targetPath).catch(() => null)) {
                await fs.copyFile(sourcePath, targetPath);
            };
        };
    };
};
export function requireFromCwd<T>(id: string): T {
    return require(path.resolve(id));
};
export function toArray<T>(data: {
    length: number;
    [key: number]: T;
}): T[] {
    const result: T[] = [];
    for (let i = 0; i < data.length; i++) {
        result.push(data[i]);
    };
    return result;
};
export function filenameWithoutExt(filename: string) {
    return path.basename(filename.slice(0, -path.extname(filename).length));
};