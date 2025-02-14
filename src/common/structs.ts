export interface BlockDefine {
    langStore: Record<string, Record<string, string>>;
    method: string;
    type: string;
    opcode: string;
};
export interface MenuDefine {
    name: string;
    options: MenuOptionDefine[];
};
export interface MenuOptionDefine {
    text: string;
    value: string;
};
export const allowedPackageManagers = ["yarn", "npm"] as const;
export type AllowedPackageManager = typeof allowedPackageManagers[number];
export type PackageManagerImpleAlias = Record<
    AllowedPackageManager,
    Partial<Record<PackageManagerCommand, string>>
>;
export type PackageManagerCommand = "init" | "install";
export interface ConfigFileAllRequired {
    entry: string;
    outputAt: string;
    server: {
        port: number;
    }
};
export type ConfigFile = PartialRecursive<ConfigFileAllRequired>;
export type PartialRecursive<T> = {
    [K in keyof T]?: PartialRecursive<T[K]>;
};