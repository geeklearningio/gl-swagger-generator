import generator = require('./index');
import path = require('path');
import fs = require('fs-extra');

export function run() {
    var argv = require('yargs').argv;

    var outputPath = argv.outputPath

    fs.ensureDirSync(outputPath);

    generator.generateFromJsonOrYaml(
        argv.schema, fs.readJSONSync(argv.options), {
            push: (name: string, content: string): void => {
                var targetPath = path.join(outputPath, name);
                console.log('writing : ' + targetPath);
                fs.writeFileSync(targetPath, content, { encoding: 'utf8' });
            },
            complete: (): void => {

            }
        }
    ).then(() => {
        console.log('generation complete');
    }).catch((err) => {
        console.error(err);
        console.error(err.stack);
        process.exit(1);
    });
}

