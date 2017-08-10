"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
var jsontots = require('json-schema-to-typescript');
const fs = require('fs');
const path = require('path');
function transformSchema() {
    return __awaiter(this, void 0, void 0, function* () {
        fs.writeFileSync(path.join(__dirname, '../src/swagger-schema.d.ts'), yield jsontots.compileFromFile(path.join(__dirname, '../../swagger-schema-2.json')));
    });
}
transformSchema();
