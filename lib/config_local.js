// You can use either absolute or relative path in "sourceDir" and "targetDir".
// Do not use "~"

"use strict";

module.exports = {
    projects: [
        { 
            name: "itest",
            sourceDir: "/Users/raymond/Workspace/moblab-ios/Moblab_iOS/Res/Game/AllGame/JudgeMeNot/_kitchen",
            targetDir: "/Users/raymond/Workspace/moblab-ios/Moblab_iOS/Res/Game/AllGame/JudgeMeNot/itest",
            platform: "iOS",
        },
        { 
            name: "atest",
            sourceDir: "/Users/raymond/Workspace/moblab-ios/Moblab_iOS/Res/Game/AllGame/JudgeMeNot/_kitchen",
            targetDir: "/Users/raymond/Workspace/moblab-ios/Moblab_iOS/Res/Game/AllGame/JudgeMeNot/atest",
            platform: "Android",
        },
        {
            name: "ios-demo",
            sourceDir: "./ios_demo/_kitchen",
            targetDir: "./ios_demo/",
            platform: "iOS",
        },
        { 
            name: "android-demo",
            sourceDir: "./android_demo/_svg_source",
            targetDir: "./android_demo/",
            platform: "Android",
        }
    ]
};