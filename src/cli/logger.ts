import { exit, stdout } from "process";
import chalk, { ChalkInstance } from "chalk";
export namespace Logger {
    let loggedData: Message[] = [];
    interface Message {
        type: MessageType;
        data: string
    };
    const colorMap: Record<keyof typeof MessageType, ChalkInstance> = {
        INFO: chalk.blue,
        WARNING: chalk.yellow,
        ERROR: chalk.red,
        PROCESS: chalk.gray,
        PROGRESS: chalk.magenta,
        FULFILLED: chalk.cyan,
        REJECTED: chalk.red
    };
    export enum MessageType {
        INFO = "INFO",
        WARNING = "WARNING",
        ERROR = "ERROR",
        PROCESS = "PROCESS",
        PROGRESS = "PROGRESS",
        FULFILLED = "FULFILLED",
        REJECTED = "REJECTED"
    };
    function space() {
        stdout.write(" ");
    };
    function nextLine() {
        stdout.write("\n");
    };
    export function message(msg: Message, br: boolean = true, upper: boolean = true) {
        msg.data = msg.data.toString?.call(msg.data) ?? JSON.stringify(msg.data);
        const time = new Date(Date.now());
        loggedData.push(msg);
        stdout.write("[");
        stdout.write(`${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`);
        space();
        stdout.write(`${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`);
        space();
        stdout.write(colorMap[msg.type](msg.type.toUpperCase()));
        stdout.write("]");
        space();
        if (upper) stdout.write(msg.data[0].toUpperCase() + msg.data.slice(1));
        else stdout.write(msg.data);
        if (br) nextLine();
    };
    export function info(data: string) {
        message({ type: MessageType.INFO, data });
    };
    export function warn(data: string) {
        message({ type: MessageType.WARNING, data });
    };
    export function error(data: string) {
        message({ type: MessageType.ERROR, data });
    };
    export function process(data: string) {
        message({ type: MessageType.PROCESS, data });
    };
    export async function progress(data: string, executor: () => Promise<unknown>): Promise<void> {
        return new Promise((resolve, reject) => {
            const flower = "-\\|/";
            let frame = 0;
            let executorRunning = false;
            const timeout = setInterval(async () => {
                message({ type: MessageType.PROGRESS, data: `${data}...[ ${flower[frame++]} ]\r` }, false);
                if (frame === flower.length) { frame = 0; };
                if (!executorRunning) {
                    executorRunning = true;
                    try {
                        await executor();
                        message({ type: MessageType.FULFILLED, data: `${data}...Done! \r` });
                        resolve();
                    } catch (e) {
                        message({ type: MessageType.REJECTED, data: `${data}...Failed! \r` });
                        Logger.error(e as string);
                        reject(e);
                        exit(1);
                    };
                    clearInterval(timeout);
                };
            }, 200);
        });
    };
};