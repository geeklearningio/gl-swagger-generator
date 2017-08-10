"use strict";
const fs = require('fs-extra');
var Promise = require('bluebird');
function existsAsync(path) {
    var deferral = Promise.defer();
    fs.exists(path, (res) => {
        deferral.resolve(res);
    });
    return deferral.promise;
}
exports.existsAsync = existsAsync;
function readJsonAsync(path) {
    var deferral = Promise.defer();
    fs.readJson(path, (err, res) => {
        if (err) {
            deferral.reject(err);
        }
        else {
            deferral.resolve(res);
        }
    });
    return deferral.promise;
}
exports.readJsonAsync = readJsonAsync;
function readAsync(path) {
    var deferral = Promise.defer();
    fs.readFile(path, "utf-8", (err, res) => {
        if (err) {
            deferral.reject(err);
        }
        else {
            deferral.resolve(res);
        }
    });
    return deferral.promise;
}
exports.readAsync = readAsync;
function readDirAsync(path) {
    var deferral = Promise.defer();
    fs.readdir(path, (err, res) => {
        if (err) {
            deferral.reject(err);
        }
        else {
            deferral.resolve(res);
        }
    });
    return deferral.promise;
}
exports.readDirAsync = readDirAsync;
