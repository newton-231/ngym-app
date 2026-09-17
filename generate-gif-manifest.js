const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const gifsRoot = path.join(projectRoot, 'assets', 'gifs');
const manifestPath = path.join(gifsRoot, 'manifest.json');
const exercisesPath = path.join(projectRoot, 'data', 'exercises.json');
const imageExtensions = new Set(['.gif', '.png', '.jpg', '.jpeg', '.webp', '.avif']);

const exercises = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));
const manifest = {};
let assetCount = 0;
let exerciseMatchCount = 0;

for (let folderNumber = 1; folderNumber <= 14; folderNumber += 1) {
    const folderName = `Folder_${folderNumber}`;
    const folderPath = path.join(gifsRoot, folderName);

    if (!fs.existsSync(folderPath)) {
        throw new Error(`Missing required folder: ${folderName}`);
    }

    const files = fs.readdirSync(folderPath, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .filter((entry) => imageExtensions.has(path.extname(entry.name).toLowerCase()))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

    for (const fileName of files) {
        const relativePath = `${folderName}/${fileName}`;
        const fileStem = path.basename(fileName, path.extname(fileName));
        manifest[fileStem] = relativePath;
        assetCount += 1;

        const numericId = Number.parseInt(fileName.split('-', 1)[0], 10);
        const exercise = Number.isInteger(numericId) ? exercises[numericId - 1] : null;
        if (exercise && !manifest[exercise.id]) {
            manifest[exercise.id] = relativePath;
            exerciseMatchCount += 1;
        }
    }
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${manifestPath}`);
console.log(`Indexed ${assetCount} image/GIF files from Folder_1 through Folder_14.`);
console.log(`Matched ${exerciseMatchCount} exercise IDs.`);
