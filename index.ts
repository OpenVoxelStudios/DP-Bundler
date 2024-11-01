import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve, join, basename } from "path";
import { input, select } from '@inquirer/prompts';
import colors from 'yoctocolors-cjs';
import Bun from 'bun';

function format(path: string): string {
    return (path.startsWith('"') || path.startsWith("'")) ? path.slice(1, -1) : path;
}

const glob = new Bun.Glob('**/*');
async function writePath(path: string) {
    for await (const file of glob.scan({ cwd: path, absolute: false, onlyFiles: true })) {
        mkdirSync(join(PATH, file, '..'), { recursive: true });

        if (file.startsWith('data/minecraft/tags/function/')) {
            let content = existsSync(join(PATH, file)) ? JSON.parse(readFileSync(join(PATH, file), { encoding: 'utf-8' })).values : [];
            let final = JSON.parse(readFileSync(join(path, file), { encoding: 'utf-8' }));
            final.values = final.values.concat(content);

            writeFileSync(join(PATH, file), JSON.stringify(final, null, 4), { encoding: 'utf-8' });
        }
        else copyFileSync(join(path, file), join(PATH, file));
    }
};

async function askPath(prompt: string): Promise<string> {
    return resolve(format(await input({
        message: prompt,
        required: true,
        validate: (value) => existsSync(resolve(format(value))) ? true : colors.red('Path does not exist')
    })));
};

const mainFolder = await askPath('Path of your datapacks folder in your world:');
const packList = readdirSync(mainFolder, { withFileTypes: true }).filter(f => f.isDirectory()).map(dir => dir.name);

const mainDatapack = await select({
    message: 'Please select the main datapack (the pack.png & pack.mcmeta will override the others):',
    choices: packList.map((p, i) => {
        return {
            name: p,
            value: p,
        }
    }),
});

const secondaryDatapacks = packList.filter(p => p != mainDatapack).concat(mainDatapack);
console.time(`Bundling ${secondaryDatapacks.length} datapacks into one...`);

const PATH = join(__dirname, mainDatapack);
if (existsSync(PATH)) rmSync(PATH, { recursive: true });
mkdirSync(PATH, { recursive: true });
for (const path of secondaryDatapacks) await writePath(join(mainFolder, path));

console.timeEnd(`Bundling ${secondaryDatapacks.length} datapacks into one...`);