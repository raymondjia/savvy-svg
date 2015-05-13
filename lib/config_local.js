// You can use either absolute or relative path in "sourceDir" and "targetDir".
// Do not use "~"

"use strict";

module.exports = {
    projects: [
        {
            name: "ios_example",
            sourceDir: "./examples/source",
            targetDir: "./examples/ios_res/",
            platform: "iOS",
        },
        { 
            name: "android_example",
            sourceDir: "./examples/source",
            targetDir: "./examples/android_res/",
            platform: "Android",
        }
    ]
};