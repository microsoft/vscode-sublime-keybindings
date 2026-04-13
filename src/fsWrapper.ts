import * as fs from 'fs';

export async function pathExists(stringPath: string): Promise<boolean> {
    try {
        await fs.promises.access(stringPath, fs.constants.F_OK);
        return true;
    } catch (e) {
        return false;
    }
}

export async function readFileAsync(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    return fs.promises.readFile(filePath, encoding);
}
