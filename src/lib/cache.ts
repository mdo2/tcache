/// <reference path="../typings/all.d.ts" />
import fs = require('fs-extra');
import path = require('path');
import util = require('./util');
import _ = require('underscore');

const callback = util.callback;

interface StatResult {
    path:string;
    stat:fs.Stats;
}


export class Cache {
    constructor(private dir:string) {
    }

    set(key:string, sourceDir:string, cb?:Function):void {
        let targetDir = path.join(this.dir, key);
        fs.copy(sourceDir, targetDir, (error) => {
            return callback(cb, error);
        });


    }

    get(key:string, targetDir:string, cb?:Function):void {
        let sourceDir = path.join(this.dir, key);
        fs.copy(sourceDir, targetDir, (error) => {
            if (error && error['code'] == 'ENOENT') {
                return callback(cb, null, false);
            } else if (error) {
                return callback(cb, error);
            } else {
                return callback(cb, error, true);
            }
        });

    }

    del(key:string, cb?:Function):void {
        let dir = path.join(this.dir, key);
        fs.rmdir(dir, (error) => {
            return callback(cb, error);
        });
    }


    /**
     * Purge cache entries older than a given time.
     *
     * @param timeout - Any file/directory older than this number of milliseconds will be removed
     * @param cb - Callback
     */
    purge(timeout:number, cb?:Function):void {
        fs.readdir(this.dir, (error, files:string[]) => {
            if (error) return callback(cb, error);
            let stats:StatResult[] = [];
            let statCount = 0;
            for (let file of files) {
                let filePath = path.join(this.dir, file);
                statFile(filePath);
            }

            function statFile(filePath:string) {
                let afterNStats = _.after(files.length, afterStats);
                fs.stat(filePath, (error, stat) => {
                    statCount += 1;
                    if (error) {
                        console.log(`Error reading ${filePath}: ${error.message}`);
                    }
                    stats.push({path: filePath, stat: stat});
                    afterNStats(stats);
                });
            }

            function afterStats(stats:StatResult[]) {
                var now = new Date();
                let toRemove = stats.filter((stat)=> {
                    return now.getTime() - stat.stat.ctime.getTime() > timeout;
                });
                toRemove.forEach((f) => {
                    let afterNRemove = _.after(toRemove.length, afterRemove);
                    fs.remove(f.path, (error) => {
                        if (error) return afterRemove(error);
                        console.log(`Removed ${f.path} from cache`);
                        afterNRemove(null);
                    });
                });
            }

            function afterRemove(err) {
                return callback(cb);
            }
        });
    }

    has(key:string, cb?:((exists:boolean) => void)) {
        let dir = path.join(this.dir, key);
        fs.open(dir, 'r', undefined, (error, fd) => {
            if (!error) fs.close(fd);
            let exists = true;
            if (error && error['code'] === 'ENOENT') {
                exists = false;
            }
            return callback(cb, exists);
        });
    }

}

