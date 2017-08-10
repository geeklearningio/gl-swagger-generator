"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require("./filesystem");
const handlebars = require("handlebars");
const filtersLoader_1 = require('./filtersLoader');
const path = require('path');
var dynRequire = require.bind(this);
class TemplateStore {
    constructor(templateRootPaths) {
        this.templateRootPaths = templateRootPaths;
    }
    FindTemplate(language, framework, version) {
        return __awaiter(this, void 0, void 0, function* () {
            var templateSubDirectory = path.join(language, framework, version);
            var templateManifestSubPath = path.join(templateSubDirectory, 'template.json');
            for (var index = 0; index < this.templateRootPaths.length; index++) {
                var templateRootPath = this.templateRootPaths[index];
                var templatManifestPath = path.join(templateRootPath, templateManifestSubPath);
                if (yield fs.existsAsync(templatManifestPath)) {
                    var environement = handlebars.create();
                    registerBuiltinHelpers(environement);
                    var manifest = yield fs.readJsonAsync(templatManifestPath);
                    var directory = path.join(templateRootPath, templateSubDirectory);
                    var templates = {};
                    var files = yield fs.readDirAsync(directory);
                    for (var fileIndex = 0; fileIndex < files.length; fileIndex++) {
                        var file = files[fileIndex];
                        var ext = path.extname(file);
                        var baseName = path.basename(file, ext);
                        if (ext == ".hbs") {
                            var templateContent = yield fs.readAsync(path.join(directory, file));
                            if (baseName[0] === '_') {
                                environement.registerPartial(baseName.substring(1), templateContent);
                            }
                            else {
                                templates[file.toLowerCase()] = environement.compile(templateContent, {
                                    noEscape: true
                                });
                            }
                        }
                    }
                    var modes = {};
                    for (var key in manifest.modes) {
                        if (manifest.modes.hasOwnProperty(key)) {
                            var element = manifest.modes[key];
                            var mode = {
                                entries: element.entries.map(e => {
                                    return {
                                        selector: e.selector,
                                        template: templates[e.template.toLowerCase()],
                                        naming: environement.compile(e.naming)
                                    };
                                })
                            };
                            modes[key] = mode;
                        }
                    }
                    return {
                        name: manifest.name,
                        language: {
                            name: manifest.language.name,
                            filter: (manifest.language.filter ? require(manifest.language.filter) : require('./languages/' + manifest.language.name)).create()
                        },
                        dependencies: manifest.dependencies,
                        modes: modes,
                        handlebars: environement,
                        operationFilters: manifest.operationFilters ? manifest.operationFilters.map((name) => filtersLoader_1.filtersLoader.getOperationFilter(name)) : [],
                        definitionFilters: manifest.definitionFilters ? manifest.definitionFilters.map((name) => filtersLoader_1.filtersLoader.getDefinitionFilter(name)) : [],
                    };
                }
            }
            throw new Error("No matching template was found");
        });
    }
}
exports.TemplateStore = TemplateStore;
function registerBuiltinHelpers(handlebars) {
    handlebars.registerHelper('json', (context) => {
        return JSON.stringify(context, null, 4);
    });
    handlebars.registerHelper('lowerCase', (context) => {
        return context.toLowerCase();
    });
    handlebars.registerHelper('upperCase', (context) => {
        return context.toUpperCase();
    });
    handlebars.registerHelper('camlCase', (context) => {
        var contextType = typeof context;
        if (contextType === 'string') {
            context = context.split(/[^\w]/g);
        }
        return camlCasePreserve(context);
    });
    handlebars.registerHelper('pascalCase', (context) => {
        var contextType = typeof context;
        if (contextType === 'string') {
            context = context.split(/[^\w]/g);
        }
        return pascalCasePreserve(context);
    });
    handlebars.registerHelper('pascalCaseOverwriteCasing', (context) => {
        var contextType = typeof context;
        if (contextType === 'string') {
            context = context.split(/[^\w]/g);
        }
        return pascalCase(context);
    });
    handlebars.registerHelper('mapLookup', function (map, lookupValue, options) {
        if (map) {
            return options.fn(map[lookupValue]);
        }
        return options.fn({});
    });
    handlebars.registerHelper('getLines', function (data, options) {
        return options.fn(data ? data.split(/[\n\r]+/g) : []);
    });
    handlebars.registerHelper('forIn', function (map, options) {
        if (map) {
            var result = "";
            for (var key in map) {
                if (map.hasOwnProperty(key)) {
                    var element = map[key];
                    result += options.fn({ key: key, value: element });
                }
            }
            return result;
        }
        return options.fn({});
    });
    handlebars.registerHelper('intOrString', (context) => {
        if (isNaN(context)) {
            return "\"" + String(context) + "\"";
        }
        else {
            return context;
        }
    });
    handlebars.registerHelper("is", (value, test, options) => {
        if (value && value === test) {
            return options.fn(this);
        }
        else {
            return options.inverse(this);
        }
    });
    handlebars.registerHelper("isnt", (value, test, options) => {
        if (!value || value !== test) {
            return options.fn(this);
        }
        else {
            return options.inverse(this);
        }
    });
}
function camlCasePreserve(words) {
    return words.map((x, index) => {
        if (index) {
            return firstLetterUpperCasePreserveCasing(x);
        }
        else {
            return firstLetterLowerCasePreserveCasing(x);
        }
    }).join('');
}
function pascalCasePreserve(words) {
    return words.map((x, index) => {
        return firstLetterUpperCasePreserveCasing(x);
    }).join('');
}
function pascalCase(words) {
    return words.map((x, index) => {
        return firstLetterUpperCase(x);
    }).join('');
}
function firstLetterUpperCase(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
}
function firstLetterUpperCasePreserveCasing(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1);
}
function firstLetterLowerCasePreserveCasing(str) {
    return str.substring(0, 1).toLowerCase() + str.substring(1);
}
