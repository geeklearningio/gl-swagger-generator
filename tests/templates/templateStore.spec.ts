/**
 * Created by autex on 5/31/2016.
 */
"use strict"

import path = require('path');
import {TemplateStore} from '../../lib/templates';

describe("TemplateStore", () => {
    var builtinTemplateRoot = path.join(__dirname, '../../templates');
    var templateStore: TemplateStore

    beforeEach(()=>{
        templateStore = new TemplateStore([builtinTemplateRoot]);
    })

    xit("should find typescript angular 1.5", async (done) => {
        var template = await templateStore.FindTemplate("typescript", "angular", "1.5");
        expect(template.name).toBe('typescript-angular-1.5');
        expect(template.language.name).toBe('typescript');
        expect(template.modes['singleFile']).toBeDefined();
        done();
    });
});