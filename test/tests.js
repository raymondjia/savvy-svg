"use strict";

// var path = require("path");
// var fs = require("fs");
var should = require("chai").should();      // jshint ignore:line
var fs = require("fs");
var tempfs = require("temp-fs");
var _ = require("lodash");
var path = require("path");

var rewire = require("rewire");
var savvysvg = rewire("..");

describe("Parsing META file", function() {

    describe("Parsing a single line", function() {

        var refMeta = { dummy: 1 };

        it("should skip line starts with #", function() {
            var testMeta = _.assign({}, refMeta);
            savvysvg.parseLineOfMetaData("# whatever", 123, testMeta);
            testMeta.should.deep.equal(refMeta);
        });

        it("should skip lines containing whitespace only", function() {
            var testMeta = _.assign({}, refMeta);
            savvysvg.parseLineOfMetaData("   \t   ", 123, testMeta);
            testMeta.should.deep.equal(refMeta);
        });

        it("should accept description with file name only", function() {
            var testMeta = _.assign({}, refMeta);
            savvysvg.parseLineOfMetaData("  source-file_name\t  \n", 123, testMeta);
            testMeta.should.deep.equal(
                _.assign(refMeta, {
                    "source-file_name": {
                        source: "source-file_name",
                        target: "source-file_name",
                        scale: 1.0,
                        width: undefined,
                        height: undefined,   
                    }
                })
            );
        });

        it("should accept description with file name and scale", function() {
            var testMeta = _.assign({}, refMeta);
            savvysvg.parseLineOfMetaData("  source-file_name\t 12.30x \n", 123, testMeta);
            testMeta.should.deep.equal(
                _.assign(refMeta, {
                    "source-file_name": {
                        source: "source-file_name",
                        target: "source-file_name",
                        scale: 12.3,
                        width: undefined,
                        height: undefined,   
                    }
                })
            );
        });

        it("should accept description with source file name, scale, and target directory/file name", function() {
            var testMeta = _.assign({}, refMeta);
            savvysvg.parseLineOfMetaData("  source-file_name\t 1x \t ../targetDir/targetFile", 123, testMeta);
            testMeta.should.deep.equal(
                _.assign(refMeta, {
                    "../targetDir/targetFile": {
                        source: "source-file_name",
                        target: "../targetDir/targetFile",
                        scale: 1,
                        width: undefined,
                        height: undefined,   
                    }
                })
            );
        });

        it("should accept description with file name, width, and height", function() {
            var testMeta = _.assign({}, refMeta);
            savvysvg.parseLineOfMetaData("  source-file_name\t 201 19.5 \n", 123, testMeta);
            testMeta.should.deep.equal(
                _.assign(refMeta, {
                    "source-file_name": {
                        source: "source-file_name",
                        target: "source-file_name",
                        scale: undefined,
                        width: 201,
                        height: 19.5,   
                    }
                })
            );
        });

        it("should accept description with file name, width, height, and target file name", function() {
            var testMeta = _.assign({}, refMeta);
            savvysvg.parseLineOfMetaData("  source-file_name\t 201 19.5 \t target.File", 123, testMeta);
            testMeta.should.deep.equal(
                _.assign(refMeta, {
                    "target.File": {
                        source: "source-file_name",
                        target: "target.File",
                        scale: undefined,
                        width: 201,
                        height: 19.5,   
                    }
                })
            );
        });

        it("should strip the .svg and .png suffix on source and target file names", function() {
            var testMeta = _.assign({}, refMeta);
            savvysvg.parseLineOfMetaData("  source-file_name.svg\t 201 19.5 \t target.File.png", 123, testMeta);
            testMeta.should.deep.equal(
                _.assign(refMeta, {
                    "target.File": {
                        source: "source-file_name",
                        target: "target.File",
                        scale: undefined,
                        width: 201,
                        height: 19.5,   
                    }
                })
            );
        });

        it("should report error with line number", function() {
            var testMeta = _.assign({}, refMeta);
            var errorMessage;
            
            var mockConsole = {
                error: function(arg) {
                    errorMessage = arg;
                }
            };
            var revert = savvysvg.__set__("console", mockConsole);

            savvysvg.parseLineOfMetaData("  source-file_name.svg\t 201x 19.5x \t target.File.png", 123, testMeta);
            testMeta.should.deep.equal(refMeta);

            errorMessage.should.match(/line 123/);

            revert();
        });
    });

    describe("Parsing META file", function() {
        var testData = [
            "# this is a comment",
            "", // blank line
            "# another comment",
            "line4 1.0x",
            "line5 error here",
            "line6 0.6x line6AltName"
        ].join("\n");

        var metaFilePath;

        before(function(done) {
            tempfs.track();
            tempfs.open(function(err, tempFile) {
                should.not.exist(err);
                fs.writeSync(tempFile.fd, testData);
                fs.closeSync(tempFile.fd);
                metaFilePath = tempFile.path;
                done();
            });
        });

        it("read every line", function() {
            var mockConsole = {
                error: function() {}
            };
            var revert = savvysvg.__set__("console", mockConsole);
            var meta = savvysvg.parseMetadataFile(metaFilePath);
            revert();
            meta.should.have.property("line4");
            meta.should.have.property("line6AltName");
        });

        it("should keep track of line number correctly", function() {
            var errorMessage;
            var mockConsole = {
                error: function(arg) {
                    errorMessage = arg;
                }
            };
            var revert = savvysvg.__set__("console", mockConsole);
            savvysvg.parseMetadataFile(metaFilePath);
            revert();
            errorMessage.should.match(/line 5/);
        });

        after(function() {
            // temp file is removed automatically
        });
    });
});


describe("Handling of project", function() {

    var testDataArray = [
        "file1 1.0x",
        "file1 0.8x file1AltName",
        "file2 200 100",
        "file2 210 110 file2AltName"
    ];
    var testData = testDataArray.join("\n");

    var projectPath;

    before(function(done) {
        tempfs.track();
        tempfs.mkdir(function(err, dir) {
            projectPath = dir.path;
            done();
        });
    });

    it("should report error if META file is not found", function() {
        var testProject =  { 
            name: "iostest",
            sourceDir: projectPath,
            targetDir: projectPath,
            platform: "iOS",
        };

        var errorMessage;
        var mockConsole = {
            error: function(arg) {
                errorMessage = arg;
            }
        };
        var revert = savvysvg.__set__("console", mockConsole);
        savvysvg.handleProject(testProject);
        revert();   
        errorMessage.should.match(/Failed to open META file/);
    });

    it("should enqueue files for processing - iOS", function() {
        fs.writeFileSync(path.join(projectPath, "META.txt"), testData);
        var testProject =  { 
            name: "iostest",
            sourceDir: projectPath,
            targetDir: projectPath,
            platform: "iOS",
        };

        savvysvg.handleProject(testProject);
        var queue = savvysvg.globalQueue.queue;

        queue.length.should.equal(testDataArray.length * 3);        // each SVG file should generate 3 PNG
        queue.should.include({
            sourcePath: path.join(projectPath, "file1.svg"),
            targetPath: path.join(projectPath, "file1.png"),
            scale: 1.0,
            mustRun: true
        });
        queue.should.include({
            sourcePath: path.join(projectPath, "file1.svg"),
            targetPath: path.join(projectPath, "file1@2x.png"),
            scale: 2.0,
            mustRun: true
        });
        queue.should.include({
            sourcePath: path.join(projectPath, "file1.svg"),
            targetPath: path.join(projectPath, "file1@3x.png"),
            scale: 3.0,
            mustRun: true
        });
        queue.should.include({
            sourcePath: path.join(projectPath, "file1.svg"),
            targetPath: path.join(projectPath, "file1AltName.png"),
            scale: 0.8,
            mustRun: true
        });
        queue.should.include({
            sourcePath: path.join(projectPath, "file1.svg"),
            targetPath: path.join(projectPath, "file1AltName@2x.png"),
            scale: 0.8 * 2,
            mustRun: true
        });
        queue.should.include({
            sourcePath: path.join(projectPath, "file1.svg"),
            targetPath: path.join(projectPath, "file1AltName@3x.png"),
            scale: 0.8 * 3,
            mustRun: true
        });
        queue.should.include({
            sourcePath: path.join(projectPath, "file2.svg"),
            targetPath: path.join(projectPath, "file2.png"),
            width: 200,
            height: 100,
            mustRun: true
        });
        queue.should.include({
            sourcePath: path.join(projectPath, "file2.svg"),
            targetPath: path.join(projectPath, "file2@2x.png"),
            width: 400,
            height: 200,
            mustRun: true
        });
        queue.should.include({
            sourcePath: path.join(projectPath, "file2.svg"),
            targetPath: path.join(projectPath, "file2@3x.png"),
            width: 600,
            height: 300,
            mustRun: true
        });
        queue.should.include({
            sourcePath: path.join(projectPath, "file2.svg"),
            targetPath: path.join(projectPath, "file2AltName.png"),
            width: 210,
            height: 110,
            mustRun: true
        });
        queue.should.include({
            sourcePath: path.join(projectPath, "file2.svg"),
            targetPath: path.join(projectPath, "file2AltName@2x.png"),
            width: 420,
            height: 220,
            mustRun: true
        });
        queue.should.include({
            sourcePath: path.join(projectPath, "file2.svg"),
            targetPath: path.join(projectPath, "file2AltName@3x.png"),
            width: 630,
            height: 330,
            mustRun: true
        });
    });

    it("save a shadow copy of the META file", function() {
        var cachedData = fs.readFileSync(path.join(projectPath, ".cachedMETA.txt"), { encoding: "ascii" });
        cachedData.should.equal(testData);
    });

    it("should enqueue a file as optional if definition is not changed", function() {
       var testProject =  { 
            name: "iostest",
            sourceDir: projectPath,
            targetDir: projectPath,
            platform: "iOS",
        };

        savvysvg.globalQueue.flush();
        savvysvg.handleProject(testProject);
        var queue = savvysvg.globalQueue.queue;

        queue.length.should.equal(testDataArray.length * 3);        // each SVG file should generate 3 PNG
 
        _.each(queue, function(item) {
            item.mustRun.should.equal(false);
        });
    });

    it("should detect changes in META file", function() {        
        var cachedDataArray = [
            "file1 1.0x",
            "file1 0.8x file1AltName",
            "file2 210 110 file2AltName"
        ];
        var cachedData = cachedDataArray.join("\n");
        fs.writeFileSync(path.join(projectPath, ".cachedMETA.txt"), cachedData);

        var testProject =  { 
            name: "iostest",
            sourceDir: projectPath,
            targetDir: projectPath,
            platform: "iOS",
        };

        savvysvg.globalQueue.flush();
        savvysvg.handleProject(testProject);
        var queue = savvysvg.globalQueue.queue;

        queue.length.should.equal(testDataArray.length * 3);        // each SVG file should generate 3 PNG

        _.each(queue, function(item) {
            if (item.targetPath === path.join(projectPath, "file2AltName@3x.png")) {
                item.mustRun.should.equal(false);
            }
            else if (item.targetPath === path.join(projectPath, "file2@2x.png")) {
                item.mustRun.should.equal(true);
            }
        });
    });    

    it("should enqueue all files as must run if -f is specified", function() {
       var testProject =  { 
            name: "iostest",
            sourceDir: projectPath,
            targetDir: projectPath,
            platform: "iOS",
        };

        var mockConfig = { force: true };
        var revert = savvysvg.__set__("config", mockConfig);

        savvysvg.globalQueue.flush();
        savvysvg.handleProject(testProject);
        revert();

        var queue = savvysvg.globalQueue.queue;

        queue.length.should.equal(testDataArray.length * 3);        // each SVG file should generate 3 PNG
 
        _.each(queue, function(item) {
            item.mustRun.should.equal(true);
        });
    });

    after(function() {
        fs.unlinkSync(path.join(projectPath, "META.txt"));
        fs.unlinkSync(path.join(projectPath, ".cachedMETA.txt"));
    });
});

