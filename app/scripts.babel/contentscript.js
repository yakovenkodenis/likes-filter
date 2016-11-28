'use strict';

const currentURL = document.location.search;

console.log(currentURL);

const startFilter = () => {
    console.log('Start Filter Action');
}

const parseURL = url => {
    const parsed = decodeURIComponent(url);
    const params = parsed.split(/\?\w\=|\_|\//g)
                    .filter(e => ["rev", ""].indexOf(e) < 0);

    if (params[0].indexOf("wall") >= 0) { // community post or comment
        params[0] = -params[0].split('-')[1];
    
        if (params.length === 2) {
            return {
            type: "post", owner_id: params[0], item_id: params[1]
            };
        } else if (params.length === 3) {
            return {
            type: "comment", owner_id: params[0], item_id: params[2].slice(1)
            };
        }
    } else if (params[0].indexOf("photo") >= 0)   { // photo
        return {
            type: "photo", owner_id: params[0].split("photo")[1], item_id: params[1]
        }
    } else {
        return {
            error: "You cannot filter likes on this page"    
        };
    }
}

const onRequest = (request, sender, sendResponse) => {
    if (request.action == 'filter') {
        startFilter();
    }
    sendResponse({ 'response': 'HELLOO', currentURL });
}

chrome.extension.onRequest.addListener(onRequest);
