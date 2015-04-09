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
var path = require('path');
var readline = require('readline');
var svg2png = require('svg2png');

var config = require('./config');


String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};


var WorkQueue = function() {
    this.queue = [];
    var me = this;

    this.addWork = function(work) {
        this.queue.push(work);
    };

    this.worker = function() {
        if (me.queue.length === 0)
            return;

        var work = me.queue.pop();
        
        console.log(work.sourcePath + ' --> ' + work.targetPath);
        svg2png (work.sourcePath, work.targetPath, work.scale, function (err) {
            setTimeout(me.worker, 100);
        });
    };

    this.start = function() {
        setTimeout(me.worker, 0);
    };
};


var globalQueue = new WorkQueue();


function normalizeFileNameForAndroid (original) {
    normalized = original.toLowerCase().replace(/-/g, '_').replace(/#/g, 'pound').replace(/\*/, 'star').replace(/&/, '_and_');
    return normalized;    
}

function convertFileForResolution (sourceName, targetPartialPath, scale, project) {
    globalQueue.addWork({
        sourcePath: path.join(project.sourceDir, sourceName + '.svg'),
        targetPath: path.join(project.targetDir, targetPartialPath + '.png'),
        scale: scale,
    });
}


function convertFile (sourceName, targetName, scale, project) {
    // TODO: check if the file has been modified
    if (project.platform === 'iOS') {
        convertFileForResolution (sourceName, targetName, scale, project);
        convertFileForResolution (sourceName, targetName + '@2x', scale * 2.0, project);
        convertFileForResolution (sourceName, targetName + '@3x', scale * 3.0, project);
    }
    else if (project.platform === 'Android') {
        var androidTargetName = normalizeFileNameForAndroid (targetName);
        convertFileForResolution (sourceName, path.join('drawable-ldpi', androidTargetName), scale * 0.75, project);
        convertFileForResolution (sourceName, path.join('drawable-mdpi', androidTargetName), scale, project);
        convertFileForResolution (sourceName, path.join('drawable-hdpi', androidTargetName), scale * 1.5, project);
        convertFileForResolution (sourceName, path.join('drawable-xhdpi', androidTargetName), scale * 2.0, project);
        convertFileForResolution (sourceName, path.join('drawable-xxhdpi', androidTargetName), scale * 3.0, project);
    }
}


function registerConversion (srcName, targetName, scale, conversions) {
    conversions[targetName] = {
        sourceFileName: srcName,
        scale: scale,
    };    
}


function registerRegularConversion (fileName, conversions) {
    registerConversion (fileName, fileName, 1.0, conversions);
}


function registerSpecialConversion (line, platform, tasks) {
    if (line.length === 0 || line[0] === '#')
        return;

    var tokens = line.split(/ +/);
    if (tokens.length < 2) {
        console.log('Failed to parse: ' + line);
        return;
    } 
    var sourceFileName = tokens[0].trim();
    var scale = tokens[1].trim();
    var targetFileName = tokens.length > 2? tokens[2].trim() : sourceFileName;

    registerConversion (sourceFileName, targetFileName, Number(scale), platform, tasks);
}


function parseSpecialConversionList (project) {

    var deferred = Promise.pending()
    var convs = project.conversions;

    var scalingFileStream = fs.createReadStream (path.join(project.sourceDir, 'SPECIAL.txt'));
    if (scalingFileStream) {
        var rl = readline.createInterface ({
            input: scalingFileStream,
            output: process.null,
            terminal: false
        });
        rl.on('line', function(line) {
            registerSpecialConversion (line, convs);
        });
        rl.on('close', function() {
            deferred.fulfill(true);
        })
    }

    return deferred.promise;
}


function scanForSVGFiles (project) {
    return fs.readdirAsync(project.sourceDir)
        .then(function (files) {

            var convs = project.conversions;            
            _.each(files, function(fileName) {
                if (fileName.endsWith('.svg') || fileName.endsWith('.SVG')) {
                    fileName = fileName.substr(0, fileName.length - 4);
                    registerRegularConversion(fileName, convs);
                }
            });

            return true;
        });
}


function handleProject (project) {
    project.conversions = {};
    return Promise.all([
            scanForSVGFiles(project),
            parseSpecialConversionList(project)
        ])
        .then(function(results) {
            _.each(project.conversions, function(value, key) {
                console.log(value);
                convertFile (value.sourceFileName, key, value.scale, project);
            });

            globalQueue.start();
            return true;
        })


    // generate contact sheet
}

// list of projects
// take command arg, if missing, run all the projects
// otherwise run the specified project

_.each(config.projects, function(p) {
    handleProject(p).then(function(results) {
        console.log(results);
    })
});
