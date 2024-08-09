import fs from "fs";
import path from "path";

const handlersPath = path.join(import.meta.dirname, '..', 'handlers');

// Function to recursively rename .js files to .mjs
function renameFilesInDir(directory) {
    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        files.forEach((file) => {
            const fullPath = path.join(directory, file);
            if (fs.statSync(fullPath).isDirectory()) {
                // Recurse into subdirectories
                renameFilesInDir(fullPath);
            } else if (file.endsWith('.js')) {
                const newFilePath = fullPath.replace(/\.js$/, '.mjs');
                fs.rename(fullPath, newFilePath, (err) => {
                    if (err) throw err;
                    console.log(`Renamed: ${fullPath} -> ${newFilePath}`);
                });
            }
        });
    });
}

renameFilesInDir(handlersPath);
for(let i = 0; i < process.argv.length - 2; i++) {
    renameFilesInDir(process.argv[i + 2]);
}