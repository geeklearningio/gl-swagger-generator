"use strict";
const generator = require('./index');
const path = require('path');
const fs = require('fs-extra');
function run() {
    var argv = require('yargs').argv;
    var outputPath = argv.outputPath;
    fs.ensureDirSync(outputPath);
    generator.generateFromJsonOrYaml(argv.schema, fs.readJSONSync(argv.options), {
        push: (name, content) => {
            var targetPath = path.join(outputPath, name);
            console.log('writing : ' + targetPath);
            fs.writeFileSync(targetPath, content, { encoding: 'utf8' });
        },
        complete: () => {
        }
    }).then(() => {
        console.log('generation complete');
    }).catch((err) => {
        console.error(err);
        console.error(err.stack);
        process.exit(1);
    });
}
exports.run = run;
