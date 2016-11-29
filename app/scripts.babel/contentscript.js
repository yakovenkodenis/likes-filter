'use strict';


chrome.runtime.sendMessage({
    from: 'content',
    subject: 'filterDOMAction'
});


chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if (msg.from === 'popup' && msg.subject === 'filterDOM') {
        const { term } = msg;
        const rowsParent = document.getElementById('wk_likes_rows');

        filterChildrenInDOM(rowsParent, term);

        response({
            from: 'content',
            subject: 'filterDOM',
            success: true,
            term
        });
    }
});


const filterChildrenInDOM = (parent, term) => {
    // const userIDs = Array.prototype.map.call(
    //     parent.childNodes,
    //     child => child.dataset.id
    // );

    checkIfURLisCommunity(document.location.pathname)
      .then(isCommunity => parseURL(document.location.search, isCommunity))
      .then(params => getUserLikes(params));
}


const checkIfURLisCommunity = community =>
    new Promise((resolve, reject) => {
        const requestURL = API.getGroups(community);
        performXHR(requestURL)
            .then(response => {
                if (response.error) {
                    if (response.error.error_code) {
                        resolve(false);
                    } else {
                        reject({ error: 'XHR error' });
                    }
                } else {
                    resolve(true);
                }
            })
            .catch(error => reject(error));
    });


const performXHR = url =>
    new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.send();

        xhr.onreadystatechange = () => {
            if (xhr.readyState != 4) {
                return;
            }

            if (xhr.status != 200) {
                reject({ error: `${xhr.status}: ${xhr.statusText}` });
            } else {
                resolve(JSON.parse(xhr.responseText));
            }
        }
    });


const parseURL = (url, isCommunity = true) =>
    new Promise((resolve, reject) => {
        const parsed = decodeURIComponent(url);

        if (parsed.indexOf('?w=likes/') === -1) {
            reject({
                error: 'cannot filter likes on this page'
            });
        }

        let params = parsed.split(/\?w=likes\//g)
                        .filter(e => ["rev", ""].indexOf(e) < 0)[0]
                        .split(/\W+/g);

        if (params.length === 2) {
            const ids = params[1].split('_');
            ids[0] = isCommunity ? `-${ids[0]}` : ids[0];
        
            if (params[0] === "wall_reply") {
                resolve({
                    type: "comment",
                    owner_id: ids[0],
                    item_id: ids[1]
                });
            } else if (params[0] === "wall") {
                resolve( {
                    type: "post",
                    owner_id: ids[0],
                    item_id: ids[1]
                });
            } else {
                resolve({
                    type: params[0],
                    owner_id: ids[0],
                    item_id: ids[1]
                });
            }
        } else {
            const p = params[0].split(/([a-z]+?[\_[a-z]+)/g);
            const ids = p[2].split('_');
            ids[0] = isCommunity ? `-${ids[0]}` : ids[0];
            resolve({
                type: p[1],
                owner_id: ids[0],
                item_id: ids[1]
            });
        }
    });


const getUserLikes = params =>
    new Promise((resolve, reject) => {
        performXHR(
            API.getLikesIDs(params, 0)
        ).then(response => {
            if (response.error) {
                resolve({ error: response.error });
            } else {
                const { response: { count } } = response;
                let offset = 0;
                let loops = Math.ceil(count / 1000);
                const promises = [];

                while (loops--) {
                    promises.push(
                        new Promise((res, rej) => {
                            performXHR(
                                API.getLikesIDs(params, offset)
                            ).then(resp => {
                                if (resp.error) {
                                    res({ error: resp.error });
                                } else {
                                    res(resp.response.items);
                                }
                            });
                        })
                    );
                    offset += 1000;
                    offset = Math.abs(count - offset) < 1000 ? Math.abs(count - offset) : offset;
                }

                Promise.all(promises)
                  .then(responses => {
                      resolve([].concat(...responses.filter(Array.isArray)));
                  });
            }
        });
    });


const API = {
    get base() {
        return 'https://api.vk.com/method'
    },

    getGroups(community) {
        return `${this.base}/groups.getById?groupId=${community}`
            + '&fields=gid&version=5.60';
    },

    getLikesIDs({ type, owner_id, item_id }, offset = 0, count = 1000) {
        return `${this.base}/likes.getList?type=${type}`
            + `&owner_id=${owner_id}&item_id=${item_id}&v=5.60`
            + '&friends_only=0&count=${count}&offset=${offset}';
    },

    getUsersByIDs(userIDs, fields="city,bdate,photo_medium") {
        return `${this.base}/users.get?user_ids=${userIDS}`
            + `&fields=${fields}&name_case=Nom&version=5.60`;
    },

    resolveScreenName(screenName) {
        return `${this.base}/utils.resolveScreenName?`
            + `screen_name=${screenName}`;
    }
}


const getAge = vkDateString => {
    const dateString = vkDateString.split('.').reverse().join('/');
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}


const constructUserDOMElement = ({ id, first_name, last_name, photo_medium }) => {
    const tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = `
    <div class="fans_fan_row inl_bl" id="fans_fan_row${id}" data-id="${id}">
        <div class="fans_fanph_wrap ui_zoom_wrap" onmouseover="uiPhotoZoom.over(this, ${id}, {showOpts: {queue: 1}});">
            <a class="ui_zoom_outer ui_zoom_added" href="/albums${id}" aria-label="View photos"><div class="ui_zoom_inner"><div class="ui_zoom"><div class="ui_zoom_icon"></div></div></div></a><a class="fans_fan_ph " href="/id${id}">
                <img class="fans_fan_img" src="${photo_medium}" alt="${first_name} ${last_name}" data-pin-nopin="true">
            </a>
        </div>
        <div class="fans_fan_name"><a class="fans_fan_lnk" href="/id${id}">${first_name} ${last_name}</a></div>
    </div>
    `;
    return tmpDiv.firstChild;
}
