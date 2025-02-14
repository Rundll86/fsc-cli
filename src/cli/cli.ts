#!/usr/bin/env node
import { program } from "commander";
import { Logger } from "./logger";
import { existsSync } from "fs";
import process from "process";
import {
    copyFolderRecursive,
    isModuleGlobalInstalled,
    readAlias,
    removeDirectories,
    removeDirectory,
    removePaths,
    requireFromCwd,
    run
} from "../common/tools";
import path from "path";
import { webpack, optimize } from "webpack";
import WebpackDevServer from "webpack-dev-server";
import Webpackbar from "webpackbar";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { AllowedPackageManager, allowedPackageManagers, ConfigFile, ConfigFileAllRequired } from "../common/structs";
import { writeFile } from "fs/promises";
program.option("-c, --config-file <cf>", "which config file does framework use", "fsc.config.js");
program.command("setup").alias("init")
    .option("-u, --package-manager <pm>", "what package manager do you want to use", "yarn")
    .option("-v, --version", "what version of fs-context do you want to use", "latest")
    .action(async (options: {
        packageManager: AllowedPackageManager,
        version: string
    }) => {
        Logger.process("setting up workspace...");
        if (!allowedPackageManagers.includes(options.packageManager)) {
            Logger.error(`unknown package manager: ${options.packageManager}`);
            process.exit(1);
        };
        if (existsSync("package.json")) {
            Logger.warn("skip creating package.json.");
        } else {
            if (!await isModuleGlobalInstalled(options.packageManager)) {
                await Logger.progress(`${options.packageManager} isn't installed, installing`, async () => {
                    await run(["npm", "install", options.packageManager, "-g"]);
                });
            };
            Logger.process("creating package.json");
            await run([options.packageManager, readAlias(options.packageManager, "init"), "-y"]);
        };
        try {
            await Logger.progress("installing libraries", async () => {
                await run([options.packageManager, readAlias(options.packageManager, "install"), ...[
                    "@types/node",
                    "ts-loader",
                    "typescript",
                    `fs-context@${options.version}`,
                    "webpack"
                ]], false);
            });
        } catch {
            Logger.info("please check your network connection.");
            process.exit(1);
        };
        Logger.progress("writing template content...", async () => {
            copyFolderRecursive(path.resolve(__dirname, "../..", "templates/workspace"), process.cwd());
        });
        Logger.progress("writing default config file", async () => {
            const data: ConfigFileAllRequired = {
                entry: "src/extension.ts",
                outputAt: "dist",
                server: {
                    port: 25565
                }
            };
            await writeFile(program.opts().configFile, "module.exports = " + JSON.stringify(data, null, 4));
        });
    });
program.command("compile")
    .option("-d, --develop", "whether you want to compile extension as develop mode", false)
    .action(async (arg: { develop: boolean }) => {
        if (arg.develop) Logger.info("Development server is running on 25565.");
        const config: ConfigFile = requireFromCwd(program.opts().configFile);
        const compiler = webpack({
            entry: path.resolve(config.entry || "src/extension.ts"),
            output: {
                path: path.resolve(config.outputAt || "dist"),
                filename: "extension.js",
                clean: true
            },
            resolve: {
                extensions: [".ts", ".js"]
            },
            module: {
                rules: [
                    {
                        test: /\.ts$/i,
                        use: {
                            loader: "ts-loader",
                            options: {
                                transpileOnly: true
                            }
                        }
                    },
                    {
                        test: /\.seb$/i,
                        use: path.resolve(__dirname, "..", "loader/seb.js")
                    },
                    {
                        test: /\.sem$/i,
                        use: path.resolve(__dirname, "..", "loader/sem.js")
                    }
                ]
            },
            mode: arg.develop ? "development" : "production",
            plugins: [
                new Webpackbar({
                    name: "Extension",
                    color: "green"
                }),
                new optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
                new HtmlWebpackPlugin({
                    title: "document",
                    filename: "index.html"
                })
            ],
            stats: "errors-warnings"
        });
        if (!arg.develop) {
            compiler.compile((err, comp) => { });
        } else {
            const wds = new WebpackDevServer({
                port: config.server?.port ?? 25565,
                allowedHosts: "*",
                compress: true,
                client: {
                    logging: "none"
                },
                hot: false,
                liveReload: false,
                webSocketServer: false,
                setupExitSignals: false
            }, compiler);
            wds.start();
        };
    });
const dangerCommand = program.command("danger");
dangerCommand.command("reset").action(() => {
    removePaths("src", "fsc.config.js", "tsconfig.json");
});
program.parse();