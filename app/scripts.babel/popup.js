'use strict';

const form = document.getElementById('form');
const data = new FormData(form);

console.log('POPUUP');
console.log(data.entries());

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const currentTab = tabs[0];

    chrome.tabs.sendMessage(currentTab.id, { action: 'filter' }, response => {
        console.log('Filter action sent');
    });
});

const sendFilterData = e => {
    e.preventDefault();

    
}

