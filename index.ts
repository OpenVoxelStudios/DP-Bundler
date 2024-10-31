import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve, join, basename } from "path";
import Bun from 'bun';

function format(path: string): string {
    if (path.startsWith('"') || path.startsWith("'")) path = path.slice(1, -1);

    if (!existsSync(path)) throw new Error('The specified path does not exist');
    return path;
};

async function writePath(path: string) {
    const glob = new Bun.Glob('**/*');
    for await (const file of glob.scan({ cwd: path, absolute: false, onlyFiles: true })) {
        mkdirSync(join(PATH, file, '..'), { recursive: true });

        if (file.startsWith('data/minecraft/tags/function/')) {
            let content = [];
            if (existsSync(join(PATH, file))) content = JSON.parse(readFileSync(join(PATH, file), { encoding: 'utf-8' })).values;

            let final = JSON.parse(readFileSync(join(path, file), { encoding: 'utf-8' }));
            final.values.push(...content);

            writeFileSync(join(PATH, file), JSON.stringify(final, null, 4), { encoding: 'utf-8' });
        }
        else copyFileSync(join(path, file), join(PATH, file));
    }
};

const mainDatapack = resolve(format(prompt('Enter the path for the MAIN datapack:') || ""));

const secondaryDatapacks: string[] = ["/Users/nini/Library/Application Support/ModrinthApp/profiles/OVS/saves/doors testworld/datapacks/Doors Invasion AJ"];

for (let i = ""; i = prompt('Enter another secondary path or press enter when you are done:') || "";) secondaryDatapacks.push(resolve(format(i)));
secondaryDatapacks.reverse();
console.log('\nDone asking for datapack path, bundling everything into one');
console.log('NOTE: The MAIN datapack will override the secondary ones (pack.png, pack.mcmeta..)');

const PATH = join(__dirname, basename(mainDatapack));
if (existsSync(PATH)) rmSync(PATH, { recursive: true });
mkdirSync(PATH, { recursive: true });

for (const path of secondaryDatapacks) await writePath(path);
await writePath(mainDatapack);