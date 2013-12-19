var webdriver = require('browserstack-webdriver');

// Input capabilities
var capabilities = {
  'browserName' : 'firefox',
  'browserstack.user' : 'arronschaar',
  'browserstack.key' : '7p74R8AKkZhCXHoXMWzC'
}

var driver = new webdriver.Builder().
  usingServer('http://hub.browserstack.com/wd/hub').
  withCapabilities(capabilities).
  build();

driver.get('http://people.mozilla.org/~aschaar/shiftbox/demo/');
driver.findElement(webdriver.By.name('q')).sendKeys('BrowserStack');
driver.findElement(webdriver.By.name('btnG')).click();

driver.getTitle().then(function(title) {
  console.log(title);
});

driver.quit();