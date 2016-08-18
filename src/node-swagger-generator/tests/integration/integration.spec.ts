/**
 * Created by autex on 5/31/2016.
 */
"use strict"

import path = require('path');
import fs = require('../../lib/filesystem');
import {generateFromJsonOrYaml} from '../../lib/index';
import {ISink} from '../../lib/sink';


describe("Sample Apis", () => {

    var specs = ["minimal.yaml", "petStore.yaml"].map((spec) => {
        return {
            name: spec,
            path: path.join(__dirname, 'apis', spec)
        };
    });

    var outputs: { [key: string]: string };
    var outputedFiles: number;
    var sink: ISink = {
        push: (name: string, content: string): void => {
            outputs[name] = content;
            outputedFiles++;
            console.log("File : " + name);
            console.log(content);
        },
        complete: (): void => {

        }
    };

    beforeEach(() => {
        outputs = {};
        outputedFiles = 0;
    });

    specs.forEach((spec) => {

        it("should successfully generate typescript definitions for api : " + spec.name, async (done) => {
            try {
                await generateFromJsonOrYaml(spec.path, {
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
        }, 5000);
    });
});