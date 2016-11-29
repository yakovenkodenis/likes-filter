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
    checkIfURLisCommunity(document.location.pathname)
      .then(isCommunity => parseURL(document.location.search, isCommunity))
      .then(params => getUserLikes(params))
      .then(userIDs => getUserObjects(userIDs))
      .then(users => filterUsers(users, term))
      .then(users => injectDataToDOM(users))
      .catch(e => console.log(e));
}


const API = {
    get base() {
        return 'https://api.vk.com/method'
    },

    getGroups(community) {
        return `${this.base}/groups.getById?groupId=${community}`
            + '&fields=gid&v=5.60';
    },

    getLikesIDs({ type, owner_id, item_id }, offset = 0, count = 1000) {
        return `${this.base}/likes.getList?type=${type}`
            + `&owner_id=${owner_id}&item_id=${item_id}&v=5.60`
            + `&friends_only=0&count=${count}&offset=${offset}`;
    },

    getUsersByIDs(userIDs, fields="city,bdate,photo_medium") {
        return `${this.base}/users.get?user_ids=${userIDs}`
            + `&fields=${fields}&name_case=Nom&v=5.60`;
    },

    resolveScreenName(screenName) {
        return `${this.base}/utils.resolveScreenName?`
            + `screen_name=${screenName}`;
    }
}


const checkIfURLisCommunity = community => {
    community = community.replace(/\//g, '');

    if (/^[a-z]+?[a-z0-9]*$/g.test(community)) {
        return new Promise((resolve, reject) => {
            const requestURL = API.resolveScreenName(community)
            performXHR(requestURL)
                .then(response => {
                    if (response.error) {
                        reject({ error: 'XHR error' });
                    } else {
                        if (response.response.type === 'group') {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }
                });
        });
    } else {
        return new Promise((resolve, reject) => {
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
    }
}


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
            resolve({
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
            API.getLikesIDs(params, 0, 1)
        ).then(response => {
            if (response.error) {
                resolve({ error: response.error });
            } else {
                const { response: { count } } = response;
                let offset = 0;
                let loops = Math.ceil(count / 200);
                const promises = [];

                while (loops--) {
                    promises.push(
                        sleep()(new Promise((res, rej) => {
                            performXHR(
                                API.getLikesIDs(params, offset)
                            ).then(resp => {
                                if (resp.error) {
                                    res({ error: resp.error });
                                } else {
                                    res(resp.response.items);
                                }
                            });
                        }))
                    );
                    offset += 200;
                    offset = Math.abs(count - offset) < 1000 ? Math.abs(count - offset) : offset;
                }

                Promise.all(promises)
                    .then(responses => {
                        resolve([].concat(...responses.filter(Array.isArray)));
                    });
            }
        });
    });


const getUserObjects = userIDs =>
    new Promise((resolve, reject) => {
        const promises = [];

        createGroupedArray(userIDs, 200).forEach(group => {
            promises.push(
                sleep()(new Promise((res, rej) => {
                const requestURL = API.getUsersByIDs(group);
                performXHR(requestURL)
                    .then(response => {
                        if (response.error) {
                            res({ error: 'XHR error in getUserObjects' });
                        } else {
                            res(response.response);
                        }
                    });
            })));
        });

        Promise.all(promises)
          .then(responses => resolve([].concat(...responses.filter(Array.isArray))));
    });


const filterUsers = (users, { city, ageFrom, ageTo }) =>
    new Promise((resolve, reject) => {
        if (!users || users.length === 0) {
            resolve({ error: 'Wrong users parameter' });
        } else {
            const filteredUsers = users.filter(user => {
                const age = getAge(user.bdate);
                return (age && user.city && user.bdate)
                            && user.city.title.toLowerCase() === city.toLowerCase()
                            && age >= +ageFrom && age <= +ageTo;  
            });
            resolve(filteredUsers);
        }
    });


const injectDataToDOM = users => {
    console.log('---------------')
    console.log('injectDataToDOM')
    console.log(users)
    console.log('---------------')
    document.getElementById('wk_likes_more_link').remove();
    document.getElementById('wk_likes_rows').innerHTML = users.map(constructUserDOMElement).join('');
}


const getAge = vkDateString => {
    if (!vkDateString) {
        return undefined;
    }

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


const createGroupedArray = (arr, chunkSize) => {
    let groups = [], i;
    for (i = 0; i < arr.length; i += chunkSize) {
        groups.push(arr.slice(i, i + chunkSize));
    }
    return groups;
}


const constructUserDOMElement = ({ id, first_name, last_name, photo_medium }) => {
    const photo = mapToHTTPS(photo_medium);
    return `
    <div class="fans_fan_row inl_bl" id="fans_fan_row${id}" data-id="${id}">
        <div class="fans_fanph_wrap ui_zoom_wrap" onmouseover="uiPhotoZoom.over(this, ${id}, {showOpts: {queue: 1}});">
            <a class="ui_zoom_outer ui_zoom_added" href="/albums${id}" aria-label="View photos"><div class="ui_zoom_inner"><div class="ui_zoom"><div class="ui_zoom_icon"></div></div></div></a><a class="fans_fan_ph " href="/id${id}">
                <img class="fans_fan_img" src="${photo}" alt="${first_name} ${last_name}" data-pin-nopin="true">
            </a>
        </div>
        <div class="fans_fan_name"><a class="fans_fan_lnk" href="/id${id}">${first_name} ${last_name}</a></div>
    </div>
    `;
}

const mapToHTTPS = url => url.indexOf('https') < 0 ? url.replace('http', 'https') : url;

const sleep = () => (...args) => new Promise((resolve, reject) => {
    setTimeout(() => resolve(...args), Math.floor(Math.random() * (50 - 10)) + 10)
});
