import generator = require('./index');
import path = require('path');
import fs = require('fs');
var argv = require('yargs').argv;

var outputPath = argv.outputPath

generator.generateFromJsonOrYaml(
    argv.schema, {
        language: "csharp",
        framework: "netstandard",
        version: "1.3",
        mode: "project",
        dependencies: {
            "Microsoft.AspNetCore.JsonPatch": {
                version: "1.0.0",
                types: [
                    { typeName: "JsonPatchDocument<>", namespace: "Microsoft.AspNetCore.JsonPatch" },
                    { typeName: "Operation<>", namespace: "Microsoft.AspNetCore.JsonPatch" }
                ]
            }
        },
        ambientTypes :[
             { typeName: "Reponse<>", namespace: null},
        ],
        templateOptions: {
            clientName: "Client",
            projectGuid: "ea07d308-9141-472b-91da-ca109903e186",
            rootNamespace: 'Example'
        },
    }, {
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