/**
 * Created by autex on 5/22/2016.
 */

var jsontots = require('json-schema-to-typescript');
import fs = require('fs');
import path = require('path');

async function transformSchema(){
    fs.writeFileSync(path.join(__dirname, '../src/swagger-schema.d.ts'), await jsontots.compileFromFile(path.join(__dirname, '../../swagger-schema-2.json')));
}

transformSchema();