var webdriver = require('wd')
  , assert = require('assert')
  , colors = require('colors');

var browser = webdriver.remote(
  "hub.browserstack.com"
  , 80
);

browser.on('status', function(info){
  console.log(info.cyan);
});

browser.on('command', function(meth, path, data){
  console.log(' < ' + meth.yellow, path.green, data || '');
});

var desired = {
  browserName: 'chrome'
  , version: '22.0'
  , platform: 'WINDOWS'
  , name: "This is an example test"
  , 'browserstack.user': 'arronschaar'
  , 'browserstack.key': '7p74R8AKkZhCXHoXMWzC'
};

browser.init(desired, function() {
  browser.get("http://www.google.com", function() {
    browser.title(function(err, title) {
      console.log(title);
      browser.elementByName('q', function(err, el) {
        el.sendKeys("BrowserStack", function() {
          browser.elementByName("btnG", function(err,el) {
            el.click(function() {
              browser.quit();
            })
          })
        })
      })
    })
  })
});