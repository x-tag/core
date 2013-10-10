# X-Tag - Custom Elements for Modern Browsers

**This is the repository for the core [X-Tag](http://x-tags.org) library.**

Based on the current W3 Web Components [draft][1], X-Tag enables the custom element portion of the proposal.
Custom elements let you register new tags/elements with the parser, so they are recognized and inflated with
special abilities you define.

You can find out more about what X-Tag does, where it works, and how to use it, on the project page: [http://x-tags.org](http://x-tags.org).

X-Tag (excluding third-party icons or images) is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

  [1]: https://dvcs.w3.org/hg/webcomponents/raw-file/tip/explainer/index.html       "W3 Web Components Spec (Draft)"

## Developers

To get started hacking on X-Tag core:

    $ git clone https://github.com/x-tag/core x-tag-core

    $ cd x-tag-core

    $ git submodule update --init --recursive

    $ npm install   # for devDependencies
    
    $ grunt polyfill  # rebuilds polyfill file

    $ grunt build    # output to ./dist

If you are interested in building your own custom elements, you can use our [web-component-stub](https://github.com/x-tag/web-component-stub) as a starting point.

## Tests

Jasmine tests via grunt are not working yet, please open [test/index.html](test/index.html) in your browser to see if everything passes.


### Distributable Build

	$ grunt build

	// See ./dist/ directory for the js files that can be used in your project



### Create your own web components

To learn more about X-Tags visit [x-tags.org](http://x-tags.org).

To create your own component, use our [web-component-stub](https://github.com/x-tag/web-component-stub).

Share your components by adding them to the [Custom Elements Registry](http://customelements.io/) or Bower.
