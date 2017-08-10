"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const generation_1 = require('./generation');
const templates_1 = require('./templates');
const parser = require('swagger-parser');
const path = require('path');
const _ = require('lodash');
const visitor = require('./swaggerVisitor');
const camlCaseFilters = require('./filters/camlCaseFilters');
const pascalCaseFilters = require('./filters/pascalCaseFilters');
const arrayNameFilters = require('./filters/arrayNameFilter');
const optionalArgsOrderFilters = require('./filters/optionalArgsOrderFilter');
camlCaseFilters.register();
pascalCaseFilters.register();
arrayNameFilters.register();
optionalArgsOrderFilters.register();
var bluebird = require('bluebird');
function generateFromJsonOrYaml(swaggerJsonOrYaml, options, sink, templateStores) {
    return __awaiter(this, void 0, void 0, function* () {
        var generator = new Generator(templateStores);
        yield generator.generate(yield parse(swaggerJsonOrYaml), options, sink);
    });
}
exports.generateFromJsonOrYaml = generateFromJsonOrYaml;
function parse(swaggerJsonOrYaml) {
    var deferral = bluebird.defer();
    parser.parse(swaggerJsonOrYaml, {}, (err, api, metadata) => {
        if (err) {
            deferral.reject(err);
        }
        else {
            deferral.resolve({ api: api, metadata: metadata });
        }
    });
    return deferral.promise;
}
class LoggerVisitor extends visitor.ScopedSwaggerVisitorBase {
    visitDefinition(name, schema) {
        console.log('Definition : ' + name + ', ' + this.stack.map(x => x.name).join('/'));
    }
    visitAnonymousDefinition(schema) {
        console.log('Anonymous : ' + this.stack.map(x => x.name).join('/'));
    }
    visitOperation(verb, operation) {
        console.log(verb.toUpperCase() + ' : ' + this.stack.map(x => x.name).join('/'));
    }
}
class Generator {
    constructor(templateStores) {
        this.templatePaths = templateStores;
        if (!templateStores)
            this.templatePaths = [];
        this.templatePaths.push(path.join(__dirname, '../templates'));
        this.templateStore = new templates_1.TemplateStore(this.templatePaths);
    }
    mergeFilters(filtersProviders) {
        var result = {
            definitionFilters: [],
            operationFilters: []
        };
        _.forEach(filtersProviders, (provider) => {
            if (provider.definitionFilters) {
                result.definitionFilters = result.definitionFilters.concat(provider.definitionFilters);
            }
            if (provider.operationFilters) {
                result.operationFilters = result.operationFilters.concat(provider.operationFilters);
            }
        });
        return result;
    }
    generate(swaggerJson, options, sink) {
        return __awaiter(this, void 0, void 0, function* () {
            var template = yield this.templateStore.FindTemplate(options.language, options.framework, options.version);
            var mode = template.modes[options.mode];
            var language = template.language.filter;
            var mergedFilters = this.mergeFilters([template, mode, options]);
            var mergedDependencies = _.transform(_.merge(options.dependencies, template.dependencies), (result, value, key) => {
                var dep = _.clone(value);
                dep.name = key;
                result.push(dep);
            }, []);
            var visitable = visitor.get(swaggerJson.api);
            visitable.visit(new LoggerVisitor());
            console.log("Preparing Generation Context");
            var contextBuilder = new generation_1.ContextBuilder(swaggerJson.api, language, mergedFilters.operationFilters, mergedFilters.definitionFilters, mergedDependencies, options.ambientTypes, options.mediaTypesPriorities);
            var context = contextBuilder.Build();
            console.log("Finished Generetion Context preparation");
            for (var i = 0; i < mode.entries.length; i++) {
                var entry = mode.entries[i];
                var matches = this.selectObjects(context, entry.selector);
                for (var m = 0; m < matches.length; m++) {
                    var match = matches[m];
                    var handlebarsContext = {
                        options: options.templateOptions,
                        api: context,
                        data: match
                    };
                    var name = entry.naming(handlebarsContext);
                    console.log("Starting Generation (" + entry.selector + "): " + name);
                    var content = entry.template(handlebarsContext);
                    sink.push(name, content);
                }
            }
            sink.complete();
        });
    }
    selectObjects(api, selector) {
        var segments = selector ? selector.split('.') : [];
        var currentNode = api;
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            if (segment in currentNode) {
                currentNode = currentNode[segment];
            }
            else {
                currentNode = [];
                break;
            }
        }
        if (Array.isArray(currentNode)) {
            return currentNode.filter((x) => !x.shouldIgnore);
        }
        else {
            return currentNode.shouldIgnore ? [] : [currentNode];
        }
    }
}
exports.Generator = Generator;
