"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
function wrapArray(array) {
    return new ArrayHelper(array);
}
exports.wrapArray = wrapArray;
class ArrayHelper {
    constructor(list) {
        this.list = list;
    }
    each(operation) {
        for (var i = 0; i < this.list.length; i++) {
            var item = this.list[i];
            operation(item, i);
        }
    }
    eachAsync(operation) {
        return __awaiter(this, void 0, void 0, function* () {
            for (var i = 0; i < this.list.length; i++) {
                var item = this.list[i];
                yield operation(item, i);
            }
        });
    }
}
exports.ArrayHelper = ArrayHelper;
