"use strict";

// var path = require("path");
// var fs = require("fs");
var should = require("chai").should();      // jshint ignore:line
var _ = require("lodash");

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
});

specify("Command line arguments", function(done) {
    done();
});

/*
specify("Scale 1.svg to 80%", function (done) {
    svg2png(relative("images/1.svg"), relative("images/1-actual.png"), 0.8, function (err) {
        if (err) {
            return done(err);
        }

        var expected = fs.readFileSync(relative("images/1-expected.png"));
        var actual = fs.readFileSync(relative("images/1-actual.png"));

        actual.should.deep.equal(expected);

        done();
    });
});

specify("Scale 2.svg to 180%", function (done) {
    svg2png(relative("images/2.svg"), relative("images/2-actual.png"), 1.8, function (err) {
        if (err) {
            return done(err);
        }

        var expected = fs.readFileSync(relative("images/2-expected.png"));
        var actual = fs.readFileSync(relative("images/2-actual.png"));

        actual.should.deep.equal(expected);

        done();
    });
});

specify("Omit scale argument for 3.svg", function (done) {
    svg2png(relative("images/3.svg"), relative("images/3-actual.png"), function (err) {
        if (err) {
            return done(err);
        }

        var expected = fs.readFileSync(relative("images/3-expected.png"));
        var actual = fs.readFileSync(relative("images/3-actual.png"));

        actual.should.deep.equal(expected);

        done();
    });
});

specify("No green border for 4.svg", function (done) {
    svg2png(relative("images/4.svg"), relative("images/4-actual.png"), function (err) {
        if (err) {
            return done(err);
        }

        var expected = fs.readFileSync(relative("images/4-expected.png"));
        var actual = fs.readFileSync(relative("images/4-actual.png"));

        actual.should.deep.equal(expected);

        done();
    });
});

specify("Scales 5.svg correctly despite viewBox + fixed width/height", function (done) {
    svg2png(relative("images/5.svg"), relative("images/5-actual.png"), 2, function (err) {
        if (err) {
            return done(err);
        }

        var expected = fs.readFileSync(relative("images/5-expected.png"));
        var actual = fs.readFileSync(relative("images/5-actual.png"));

        actual.should.deep.equal(expected);

        done();
    });
});

it("should pass through errors that occur while calculating dimensions", function (done) {
    svg2png(relative("images/invalid.svg"), relative("images/invalid-actual.png"), function (err) {
        should.exist(err);
        err.should.have.property("message").and.match(/Unable to calculate dimensions./);

        done();
    });
});

it("should pass through errors about unloadable source files", function (done) {
    svg2png("doesnotexist.asdf", "doesnotexist.asdf2", 1.0, function (err) {
        should.exist(err);
        err.should.have.property("message").that.equals("Unable to load the source file.");

        done();
    });
});

after(function () {
    fs.unlink(relative("images/1-actual.png"));
    fs.unlink(relative("images/2-actual.png"));
    fs.unlink(relative("images/3-actual.png"));
    fs.unlink(relative("images/4-actual.png"));
    fs.unlink(relative("images/5-actual.png"));
});

function relative(relPath) {
    return path.resolve(__dirname, relPath);
}
*/
