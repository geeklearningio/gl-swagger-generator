import fs = require('fs-extra');
var Promise = require('bluebird');

export function existsAsync(path: string): Promise<boolean>{
    var deferral = Promise.defer();
    fs.exists(path, (res) => {
        deferral.resolve(res);
    });
    return deferral.promise;
}

export function readJsonAsync(path: string): Promise<any>{
    var deferral = Promise.defer();
    fs.readJson(path, (err, res) => {
        if(err){
            deferral.reject(err);
        } else {
            deferral.resolve(res);
        }
    });
    return deferral.promise;
}

export function readAsync(path: string): Promise<string>{
    var deferral = Promise.defer();
    fs.readFile(path, "utf-8", (err, res) => {
        if(err){
            deferral.reject(err);
        } else {
            deferral.resolve(res);
        }
    });
    return deferral.promise;
}

export function readDirAsync(path: string): Promise<string[]>{
    var deferral = Promise.defer();
    fs.readdir(path, (err, res) => {
        if(err){
            deferral.reject(err);
        } else {
            deferral.resolve(res);
        }
    });
    return deferral.promise;
}