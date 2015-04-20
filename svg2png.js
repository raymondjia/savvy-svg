// SVG to PNG Conversion Tool

// Copyright (c) 2015, Raymond C. Jia <raymondjia@gmail.com>
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Raymond Jia nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL RAYMOND C. JIA BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


var _ = require('lodash');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));
var GetOpt = require('node-getopt');
var path = require('path');
var readline = require('readline');
var svg2png = require('svg2png');
var util = require('util');

var config = require('./config');


String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};


var WorkQueue = function() {
    this.queue = [];
    this.count = 0;
    this.deferred;
    var me = this;

    this.addWork = function(work) {
        this.queue.push(work);
    };

    this.worker = function() {
        if (me.queue.length === 0) {
            me.deferred.fulfill(me.count);
            return;
        }

        var work = me.queue.pop();
        
        var sourceStat, targetStat;
        try {
            sourceStat = fs.statSync(work.sourcePath);
        } catch (e) {
            // source doesn't exist, skip it
            setTimeout(me.worker, 10);
            return;                
        }

        try {
            targetStat = fs.statSync(work.targetPath);                
        } catch (e) {
            targetStat = { mtime: 0 };
        }

        if (!work.mustRun && sourceStat.mtime < targetStat.mtime) {
            // source is older than target, skip this file
            setTimeout(me.worker, 10);
            return;
        }

        svg2png (work.sourcePath, work.targetPath, work.scale, function (err) {
            console.info(util.format('%s --> %s', work.sourcePath, work.scale, work.targetPath));
            //console.info(work.sourcePath + ' --> ' + work.targetPath);
            if (err)
                console.error(err);
            else 
                me.count ++;
            setTimeout(me.worker, 10);
        });
    };

    this.start = function() {
        me.deferred = Promise.pending()
        setTimeout(me.worker, 0);
        return me.deferred.promise;
    };
};


var globalQueue = new WorkQueue();


function normalizeFileNameForAndroid (original) {
    normalized = original.toLowerCase().replace(/-/g, '_').replace(/#/g, 'pound').replace(/\*/, 'star').replace(/&/, '_and_');
    return normalized;    
}

function enqueueWithScale (sourceName, targetPartialPath, scale, mustRun, project) {
    globalQueue.addWork({
        sourcePath: path.join(project.sourceDir, sourceName + '.svg'),
        targetPath: path.join(project.targetDir, targetPartialPath + '.png'),
        scale: scale,
        mustRun: mustRun
    });
}

function enqueueWithDimension (sourceName, targetPartialPath, width, height, mustRun, project) {
    globalQueue.addWork({
        sourcePath: path.join(project.sourceDir, sourceName + '.svg'),
        targetPath: path.join(project.targetDir, targetPartialPath + '.png'),
        width: width,
        height: height,
        mustRun: mustRun
    });
}

function enqueueForConversion (sourceName, targetName, scale, width, height, mustRun, project) {
    if (project.platform === 'iOS') {
        if (scale === undefined) {
            enqueueWithDimension (sourceName, targetName, width, height, mustRun, project);
            enqueueWithDimension (sourceName, targetName + '@2x', width * 2.0, height * 2.0, mustRun, project);
            enqueueWithDimension (sourceName, targetName + '@3x', width * 3.0, height * 3.0, mustRun, project);
        } else {
            enqueueWithScale (sourceName, targetName, scale, mustRun, project);
            enqueueWithScale (sourceName, targetName + '@2x', scale * 2.0, mustRun, project);
            enqueueWithScale (sourceName, targetName + '@3x', scale * 3.0, mustRun, project);
        }
    }
    else if (project.platform === 'Android') {
        var androidTargetName = normalizeFileNameForAndroid (targetName);
        if (scale === undefined) {
            enqueueWithDimension (sourceName, path.join('drawable-ldpi', androidTargetName), width * 0.75, height * 0.75, mustRun, project);
            enqueueWithDimension (sourceName, path.join('drawable-mdpi', androidTargetName), width, height, mustRun, project);
            enqueueWithDimension (sourceName, path.join('drawable-hdpi', androidTargetName), width * 1.5, height * 1.5, mustRun, project);
            enqueueWithDimension (sourceName, path.join('drawable-xhdpi', androidTargetName), width * 2.0, height * 2.0, mustRun, project);
            enqueueWithDimension (sourceName, path.join('drawable-xxhdpi', androidTargetName), width * 3.0, height * 3.0, mustRun, project);
        } else {
            enqueueWithScale (sourceName, path.join('drawable-ldpi', androidTargetName), scale * 0.75, mustRun, project);
            enqueueWithScale (sourceName, path.join('drawable-mdpi', androidTargetName), scale, mustRun, project);
            enqueueWithScale (sourceName, path.join('drawable-hdpi', androidTargetName), scale * 1.5, mustRun, project);
            enqueueWithScale (sourceName, path.join('drawable-xhdpi', androidTargetName), scale * 2.0, mustRun, project);
            enqueueWithScale (sourceName, path.join('drawable-xxhdpi', androidTargetName), scale * 3.0, mustRun, project);
        }
    }
}

function registerMetaDataItem (meta, source, target, scale, width, height) {
    if (source.endsWith('.svg'))
        source = source.substr(0, source.length - 4);       // strip the .svg suffix

    if (target === undefined)
        target = source;
    else if (target.endsWith('.png'))
        target = target.substr(0, target.length - 4);       // strip the .png suffix

    meta[target] = {
        source: source,
        target: target,
        scale: scale,
        width: width,
        height: height
    };
} 

function parseLineOfMetaData (line, lineNumber, meta) {
    line = line.trim();
    if (line.length === 0 || line[0] === '#')
        return;

    var matches = line.match(/(\w+)\s+([\d.]+)\s+([\d.]+)\s+(\w+)/);
    if (matches !== null) {
        registerMetaDataItem (meta, matches[1], matches[4], /*scale*/undefined, parseFloat(matches[2]), parseFloat(matches[3]));
        return;
    }

    matches = line.match(/(\w+)\s+([\d.]+)\s+([\d.]+)/);
    if (matches !== null) {
        registerMetaDataItem (meta, /*source*/matches[1], /*target*/undefined, /*scale*/undefined, parseFloat(matches[2]), parseFloat(matches[3]));
        return;
    }

    matches = line.match(/(\w+)\s+([\d.]+)x\s+(\w+)/);
    if (matches !== null) {
        registerMetaDataItem (meta, /*source*/matches[1], /*target*/matches[3], /*scale*/parseFloat(matches[2]), undefined, undefined);
        return;
    }

    matches = line.match(/(\w+)\s+([\d.]+)x/);
    if (matches !== null) {
        registerMetaDataItem (meta, /*source*/matches[1], /*target*/undefined, /*scale*/parseFloat(matches[2]), undefined, undefined);
        return;
    }

    matches = line.match(/(\w+)/);
    if (matches !== null) {
        registerMetaDataItem (meta, /*source*/matches[1], /*target*/undefined, /*scale*/1.0, undefined, undefined);
        return;
    }

    console.error(util.format('Incorrect format on line %d: %s', lineNumber, line));
}

function parseMetadataFile (path) {
    var meta = {};
    try {
        var metaFileContent = fs.readFileSync(path).toString();
        var lines = metaFileContent.split('\n');
        var lineNumber = 1;
        _.each(lines, function(line) {
            parseLineOfMetaData (line, lineNumber ++, meta);
        });
    } catch (e) {
        return null;
    }
    return meta;
}

function handleProject (project) {
    // load meta file
    // check if force, check if a cached version of meta file exists
    // compare meta files
    // parse all lines
    // mark changed lines as 'must run'
    // if 'force' flag is set, all lines are 'must run'
    // save a cached version of meta file

    var metaPath = path.join(project.sourceDir, 'META.txt');
    var meta = parseMetadataFile(metaPath);
    if (meta == null) {
        console.error(util.format('Failed to open META file: %s', metaPath));
        return 0;
    }

    var cachedMetaPath = path.join(project.sourceDir, '.cachedMETA.txt');
    var cachedMeta = parseMetadataFile(cachedMetaPath);
    if (cachedMeta == null) 
        cachedMeta = {};

    _.each(meta, function(value, key) {
        var cachedValue = cachedMeta[key];
        var mustRun = false;

        if (cachedValue === undefined)
            mustRun = true;
        else if (value.source !== cachedValue.source ||
                value.width !== cachedValue.width ||
                value.height !== cachedValue.height ||
                value.scale !== cachedValue.scale)
            mustRun = true;

        enqueueForConversion (value.source, 
            key, // base name of the target file
            value.scale, value.width, value.height, 
            config.force || mustRun,
            project
        )
    });

    // copy the entire content of META file to the cache
    fs.writeFileSync(cachedMetaPath, fs.readFileSync(metaPath).toString());

    // generate contact sheet
    return Object.keys(meta).length;
}


function handleProjectsAndPrintStats (projects) {

    var svgCount = 0;
    _.each(projects, function(p) {
        svgCount += handleProject(p);
    })

    globalQueue.start()
    .then(function(results) {
        console.log(util.format('%d SVG files processed; %d PNG files generated.', svgCount, results));    
    });    
}

function main() {
    var getopt = new GetOpt([
        ['a', 'all',    'convert all the projects registered in config_local.js'],
        ['f', 'force',  'reconvert all files regardless the last modification time'],
        ['h', 'help',   'display this help']
    ]);

    getopt.setHelp(
        "Usage: node savvy-svg2png.js [OPTION] [<project name>]\n" +
        "Convert SVG graphics to PNG for iOS and Android development.\n" +
        "\n" +
        "[[OPTIONS]]\n" +
        "\n" +
        "Installation: npm install savvy-svg2png\n" +
        "Respository:  https://github.com/raymondjia/savvy-svg2png\n"
    ).bindHelp().parseSystem();

    if (getopt.parsedOption.options.force === true)
        config.force = true;

    var projects;
    if (getopt.parsedOption.options.all === true)
        projects = config.projects;
    else {
        var projectNames = getopt.parsedOption.argv;
        if (projectNames.length === 0) {
            console.info('Available projects: ');
            _.each(config.projects, function(p) {
                console.info(p.name);
            });
            process.exit(0);
        }

        projects = _.filter(config.projects, function(p) {
            return _.indexOf(projectNames, p.name) > -1;
        });
    }

    handleProjectsAndPrintStats (projects);
}

main();
