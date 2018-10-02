import generator = require('./index');
import path = require('path');
import fs = require('fs-extra');
import { merge } from 'lodash';

export function run() {
    var argv = require('yargs').argv;

    var outputPath = argv.outputPath

    fs.ensureDirSync(outputPath);

    console.log('def', argv.def);

    generator.generateFromJsonOrYaml(
        argv.schema, merge(fs.readJSONSync(argv.options), argv.def), {
            push: (name: string, content: string): void => {
                var targetPath = path.join(outputPath, name);
                var directory = path.dirname(targetPath);
                fs.ensureDirSync(directory);
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

