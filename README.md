# Savvy-SVG
An SVG to PNG conversion tool optimized for mobile development.

A sad fact in mobile development is that neither iOS nor Andorid has wide enough support for SVG as a common graphic format. This will probably change in the near future, but before that, we are stuck with PNG files - lots of them.

In order to achieve the best visual effect on the retina display, iOS apps need to include three diffrent resolutions ("regular", @2x, and @3x) for each image file. Andorid apps, for being able to run on devices with a wider range of resolutions, typically need to include five different resolutions (ldpi, mdpi, hdpi, xhdpi, and xxhdpi). Designers hate geneerating and updating all these files manually, and developers hate managing them too.

Apparently a better way is to generate PNGs at different resolutions from a single SVG file. The [svg2png](https://github.com/domenic/svg2png) tool written by Domenic Denicola does a great job, but there is still room to improve. 

Savvy-SVG runs on top of a forked version of [svg2png](https://github.com/raymondjia/svg2png). When you run "npm install" the correct svg2png will be pulled automatically.

## Installation

Savvy-SVG is built with Node.js. If you don't already have Node.js installed, follow the steps [here](https://nodejs.org/).

    npm install savvy-svg
    cd savvy-svg
    npm install --production

or:

    git clone https://github.com/raymondjia/savvy-svg
    cd savvy-svg
    npm install --production


The last step might take a while, please be patient. 

## Try it out first

Savvy-SVG comes with two sample projects and some source SVG files. Try it out on the sample files first before you decide whether this will work out for you.

    cd savvy-svg
    node lib/savvy-svg.js

This will list all the projects defined:

    Available projects:
    ios_example
    android_example

Run it on ios_example:

    node lib/savvy-svg.js ios_example
    ...
    9 SVG files processed; 27 PNG files generated.

The new PNG files are placed under **./examples/ios_res**.

Try run the above command one more time:

    node lib/savvy-svg.js ios_example
    ...
    9 SVG files processed; 0 PNG files generated.

Savvy-SVG detects if there is any change in either the source SVG files, or the project definition file ("META.txt"). Since nothing has changed, then it happily ends without doing anything.

Let's simulate a change in one of the SVG files:

    touch examples/source/account-get-free-credit.svg
    node lib/savvy-svg.js ios_example
    ...
    9 SVG files processed; 3 PNG files generated.

If for some reason you want to refresh all the PNG files, use the -f flag to **force** converting every source file:

    node lib/savvy-svg.js -f ios_example
    ...
    9 SVG files processed; 27 PNG files generated.
    

## Configuration

### Define your projects

There is a **config_local.js** under **savvy-svg/lib**. Open it with a text editor, add project definition as shown below:

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

The **sourceDir** is where your SVG files are located. The **targetDir** is where your PNG files are going to be placed - with some small difference on iOS and Android:

- iOS - All the PNG files will be placed inside the target directory directly.

- Android - Savvy-SVG creates 5 subdirectories under the target directory, and places the PNG files inside these subdirectories according to their resolution:
  - drawable-ldpi   
  - drawable-mdpi   
  - drawable-hdpi
  - drawable-xhdpi  
  - drawable-xxhdpi

### Define your conversion in META.txt

Inside your **sourceDir** of each project, you need to create a **META.txt** file, which lists all the SVG files you want to convert to PNG.

- If you don't need to change the size or naming, simply list the base name should be suffice:

        account-get-free-credit

- If you want to scale it at a specific ratio:

        def-avatar          2.0x

- And give the PNG files a different name:
       
        def-avatar          3.0x       def-avatar-huge

- Alternatively, you can specify the width and height of the target PNG in "points" or pixels:

        account-add-photo   36 44
        def-avatar          60 60      Icon-60

Note:

- The scaling and dimensions controls the size of the **base resolution** - on iOS it's the file without @2x or @3x suffix; on Android, it becomes the **mdpi**. All other resolutions are derived from the base one.

- Empty lines or lines starts with # on the first column will be ignored.

- Android drawables can't have dashes ("-") in their filenames. Savvy-SVG sanitizes the source file names to remove or replace unacceptable characters, e.g. dashes will be replaced with underscores.


## Usage

- List all the available projects:
    
        node lib/savvy-svg.js

- Run conversion on a given project:
 
        node lib/savvy-svg.js <project-name>

- Reconvert every file in a given project:

        node lib/savvy-svg.js -f <project-name>

- Run conversion on every project (why do you even need to do this?):

        node lib/savvy-svg.js -a

- Show a help/usage message:

        node lib/savvy-svg.js -h


## FAQs
1. This is confusing to me, should I give up and go back to the old way?

    I hope not. There are some learning and tweaking involved, especially if you aren't familiar with Node.js yet. But trust me, the long term benefit of managing your graphics in SVG will outweigh the time and effort you invest in learning this tool **very quickly**. And your designer will thank you for making his/her life easier.


1.  Some of my SVG files failed to convert, what's going on?

    I noticed this problem in my own projects. If this happens to you, try saving the SVG in a different flavor, or in a different tool. If all efforts fail, you can always send the file to me and let me check it out (raymondjia at gmail dot com).

## About the Author

Nothing much really, I use Objective C and Node.js regularly, but still hesitate calling myself an expert in either. I also know a bit of Java, C#, and Python.
