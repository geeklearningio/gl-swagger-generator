/**
 * Created by autex on 5/31/2016.
 */
"use strict"

import path = require('path');
import fs = require('../../lib/filesystem');
import {generateFromJsonOrYaml} from '../../lib/index';

describe("Sample Apis", () => {

    var specs = ["minimal.yaml"].map((spec) => {
        return {
            name: spec, 
            path: path.join(__dirname, 'apis', spec)
        };
    });


    // beforeEach(()=>{

    // });

    specs.forEach((spec) => {
        var sink = {
            push: (name:string, content:string): void => {

            },
            complete: (): void => {

            }
        };
        
        it("should successfully generate typescript definitions for api : " + spec.name, async (done) => {
            await generateFromJsonOrYaml(await fs.readAsync(spec.path), {
                    language: "typescript",
                    framework: "angular",
                    version: "1.5",
                    mode: "singleFile",
                    templateOptions : {
                        
                    },
            }, sink);
            done();
        });
    });
});