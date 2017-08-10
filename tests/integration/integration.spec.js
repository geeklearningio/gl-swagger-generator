"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const path = require('path');
const index_1 = require('../../lib/index');
describe("Sample Apis", () => {
    var specs = ["minimal.yaml", "petStore.yaml"].map((spec) => {
        return {
            name: spec,
            path: path.join(__dirname, 'apis', spec)
        };
    });
    var outputs;
    var outputedFiles;
    var sink = {
        push: (name, content) => {
            outputs[name] = content;
            outputedFiles++;
            console.log("File : " + name);
            console.log(content);
        },
        complete: () => {
        }
    };
    beforeEach(() => {
        outputs = {};
        outputedFiles = 0;
    });
    specs.forEach((spec) => {
        it("should successfully generate typescript definitions for api : " + spec.name, (done) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield index_1.generateFromJsonOrYaml(spec.path, {
                    language: "mock",
                    framework: "mock",
                    version: "0.1",
                    mode: "singleFile",
                    templateOptions: {
                        clientName: "client"
                    },
                }, sink);
                expect(outputedFiles).toBeGreaterThan(0);
                done();
            }
            catch (err) {
                done.fail(err);
            }
        }), 5000);
    });
});
