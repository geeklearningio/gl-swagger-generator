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
                console.log('generating : ' + name);
                fs.writeFileSync(path.join(outputPath, name), content, { encoding: 'utf8' });
            },
            complete: (): void => {

            }
        }
    ).then(() => {
        console.log('generation complete');
    });
}

