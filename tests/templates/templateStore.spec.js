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
const templates_1 = require('../../lib/templates');
describe("TemplateStore", () => {
    var builtinTemplateRoot = path.join(__dirname, '../../templates');
    var templateStore;
    beforeEach(() => {
        templateStore = new templates_1.TemplateStore([builtinTemplateRoot]);
    });
    xit("should find typescript angular 1.5", (done) => __awaiter(this, void 0, void 0, function* () {
        var template = yield templateStore.FindTemplate("typescript", "angular", "1.5");
        expect(template.name).toBe('typescript-angular-1.5');
        expect(template.language.name).toBe('typescript');
        expect(template.modes['singleFile']).toBeDefined();
        done();
    }));
});
