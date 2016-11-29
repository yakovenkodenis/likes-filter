'use strict';

const filterDOM = info => {
    // ignore
};


window.addEventListener('DOMContentLoaded', () => {

    const submit = document.getElementById('submit'),
          city = document.getElementById('city'),
          ageFrom = document.getElementById('ageFrom'),
          ageTo = document.getElementById('ageTo');

    submit.addEventListener('click', e => {
        e.preventDefault();

        const term = {
            city: city.value,
            ageFrom: ageFrom.value,
            ageTo: ageTo.value
        };

        if (!term.city && !term.age) {
            return;
        }

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

