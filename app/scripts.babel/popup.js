'use strict';

const filterDOM = info => {

};


window.addEventListener('DOMContentLoaded', () => {

    const submit = document.getElementById('submit'),
          city = document.getElementById('city'),
          age = document.getElementById('age');

    submit.addEventListener('click', e => {
        e.preventDefault();

        const term = {
            city: city.value,
            age: age.value
        };

        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, tabs => {
            chrome.tabs.sendMessage(
                tabs[0].id,
                {
                    from: 'popup', 
                    subject: 'filterDOM',
                    term
                },
                filterDOM
            );
        });

    });

});

