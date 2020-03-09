# X-Tag - Rocket fuel for component development

[![Join the chat at https://gitter.im/x-tag/core](https://badges.gitter.im/x-tag/core.svg)](https://gitter.im/x-tag/core?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM version](https://badge.fury.io/js/x-tag.svg)](https://badge.fury.io/js/x-tag)

[![CDNJS](https://img.shields.io/cdnjs/v/x-tag.svg)](https://cdnjs.com/libraries/x-tag) 

**This is the repository for the core [X-Tag](http://x-tag.github.io/) library.**

X-Tag is a Microsoft supported, open source, JavaScript library that wraps the W3C standard Web Components family of APIs to provide a compact, feature-rich interface for rapid component development. While X-Tag offers feature hooks for all Web Component APIs (Custom Elements, Shadow DOM, HTML Templates), it only requires [Custom Element][1] support to operate. In the absence of native Custom Element support, X-Tag relies on the same set of polyfills Google's Polymer framework uses.

You can find out more about what X-Tag does, where it works, and how to use it, on the project page: [x-tag.github.io](http://x-tag.github.io/).

  [1]: http://w3c.github.io/webcomponents/spec/custom/       "W3 Web Components Spec (Draft)"

## Snag X-Tag from NPM

````bash
npm install x-tag
````

## Pull our repo from Github

To get started hacking on X-Tag core:

````bash
git clone https://github.com/x-tag/core x-tag-core --recursive
cd x-tag-core
npm install        # installs all the required dependencies using package.json
gulp all     # outputs x-tag-core.js and x-tag-core.min.js to ./dist
````

## Updating

If you already cloned the library and want to update your build with changes to Core, do:

````bash
cd x-tag-core
git pull origin master
npm install
gulp all
````

This assumes you just cloned the library and its remote repository is labelled `origin`. Suppose you had your own fork where your own remote is `origin`; you should add another remote origin and label it as `upstream`. Then your `git pull` line would need to be `git pull upstream master` instead.

## Tests

We use Jasmine to test the library, and you can verify it works as expected by opening [tests/core/index.html](tests/core/index.html) in your browser to run the tests.


## Regenerating the distributable build

In the interest of not reinventing the wheel, X-Tag core uses a few existing libraries which get pulled into the project. But distributing a bunch of separate files is not efficient, so we need to generate a single file that contains all this code.

If you make changes on the library and want to regenerate the build, just run

````bash
gulp all
````

and both `x-tag-raw.js` and `x-tag-polyfilled.js` will be rebuilt, minified, and placed in the `./dist` directory.


## Creating your own Web Components

To learn more about X-Tags visit [x-tag.github.io/docs](http://x-tag.github.io/docs).