'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

chrome.tabs.onUpdated.addListener(tabId => {
  chrome.pageAction.show(tabId);
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.from === 'content' && msg.subject === 'filterDOMAcion') {
    chrome.pageAction.show(sender.tab.id);
  }
});
