import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { confirm, input, select } from '@inquirer/prompts';
import colors from 'yoctocolors-cjs';
import { resolve, join } from "path";
import Bun, { $ } from 'bun';

const OS: 'win' | 'linux' | 'darwin' = require(`os`).platform().toLowerCase().replace(/[0-9]/g, ``);

function format(path: string): string {
    return ((path.startsWith('"') || path.startsWith("'")) ? path.slice(1, -1) : path).trim();
}

const glob = new Bun.Glob('**/*');
async function writePath(PATH: string, path: string) {
    for await (const file of glob.scan({ cwd: path, absolute: false, onlyFiles: true })) {
        mkdirSync(join(PATH, file, '..'), { recursive: true });

        if (file.startsWith('data/minecraft/tags/function/')) {
            let content = existsSync(join(PATH, file)) ? JSON.parse(readFileSync(join(PATH, file), { encoding: 'utf-8' })).values : [];
            let final = JSON.parse(readFileSync(join(path, file), { encoding: 'utf-8' }));
            final.values = final.values.concat(content);

            writeFileSync(join(PATH, file), JSON.stringify(final, null, 4), { encoding: 'utf-8' });
        }
        else {
            if (['pack.png', 'pack.mcmeta'].includes(file) || !existsSync(join(PATH, file)) || await confirm({
                message: `File ${colors.underline(file)} has a conflict. Overwrite it with file from datapack ${colors.underline(path)}?`,
            })) copyFileSync(join(path, file), join(PATH, file));
        };
    };
};

async function askPath(prompt: string): Promise<string> {
    return resolve(format(await input({
        message: prompt,
        required: true,
        validate: (value) => existsSync(resolve(format(value))) ? true : colors.red('Path does not exist'),
    })));
};

async function timeIt(message: string, func: () => Promise<void> | void) {
    console.time(message);
    await func();
    console.timeEnd(message);
};

async function main() {
    const mainFolder = await askPath('Path of your datapacks folder in your world:');
    const packList = readdirSync(mainFolder, { withFileTypes: true }).filter(f => f.isDirectory()).map(dir => dir.name);

    const mainDatapack = await select({
        message: 'Please select the main datapack (the pack.png & pack.mcmeta will override the others):',
        choices: packList.map(p => {
            return {
                name: p,
                value: p,
            }
        }),
    });

    const secondaryDatapacks = packList.filter(p => p != mainDatapack).concat(mainDatapack);

    const PATH = join(process.cwd(), 'output', mainDatapack);
    if (existsSync(PATH) && !await confirm({
        message: `This will override a previous output at ${colors.underline(PATH)}. Please confirm:`,
        default: true,
    })) throw new Error('Action cancelled.');


    if (existsSync(PATH)) await timeIt(`${colors.green('✔')} Deleted previous build.`, () => {
        rmSync(PATH, { recursive: true });
        mkdirSync(PATH, { recursive: true });
    });

    await timeIt(`${colors.green('✔')} Bundled ${secondaryDatapacks.length} datapacks into one.`, async () => {
        for (const path of secondaryDatapacks) {
            await timeIt(`${colors.green('✔')} Added ${colors.bold(path)}.`, async () => {
                await writePath(PATH, join(mainFolder, path));
            });
        };
    });

    console.log('');
    if (await confirm({
        message: 'Do you want to zip the output? This will override the previous zip file.',
        default: false,
    })) await timeIt(`${colors.green('✔')} Zipped the output.`, async () => {
        await $`zip -r ${PATH + '.zip'} ${PATH}`.quiet();
    })

    if (await confirm({
        message: 'Do you want to open the result folder in your file explorer?',
        default: false,
    })) await timeIt(`${colors.green('✔')} Opened the output folder.`, async () => {
        await $`${{ win: 'explorer', linux: 'xdg-open', darwin: 'open' }[OS]} ${PATH}`.quiet();
    });
};
main();