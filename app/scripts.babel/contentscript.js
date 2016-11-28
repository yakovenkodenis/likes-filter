'use strict';

chrome.runtime.sendMessage({
    from: 'content',
    subject: 'filterDOMAction'
});

chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if (msg.from === 'popup' && msg.subject === 'filterDOM') {
        
    }
});


const currentURL = document.location.search;

console.log(currentURL);

const startFilter = () => {
    console.log('Start Filter Action');
}

const parseURL = (url, isCommunity = true) => {
    const parsed = decodeURIComponent(url);

    if (parsed.indexOf('?w=likes/') === -1) {
        return {
            error: 'cannot filter likes on this page'
        }
    }

    let params = parsed.split(/\?w=likes\//g)
                    .filter(e => ["rev", ""].indexOf(e) < 0)[0]
                    .split(/\W+/g);

    if (params.length === 2) {
        const ids = params[1].split('_');
        ids[0] = isCommunity ? `-${ids[0]}` : ids[0];
      
        if (params[0] === "wall_reply") {
            return {
                type: "comment",
                owner_id: ids[0],
                item_id: ids[1]
            };
        } else if (params[0] === "wall") {
            return {
                type: "post",
                owner_id: ids[0],
                item_id: ids[1]
            };
        } else {
            return {
                type: params[0],
                owner_id: ids[0],
                item_id: ids[1]
            }
        }
    } else {
        const p = params[0].split(/([a-z]+?[\_[a-z]+)/g);
        const ids = p[2].split('_');
        ids[0] = isCommunity ? `-${ids[0]}` : ids[0];
        return {
            type: p[1],
            owner_id: ids[0],
            item_id: ids[1]
        }
    }
}

const onRequest = (request, sender, sendResponse) => {
    if (request.action == 'filter') {
        startFilter();
    }
    sendResponse({ 'response': 'HELLOO', currentURL });
}

chrome.extension.onRequest.addListener(onRequest);
