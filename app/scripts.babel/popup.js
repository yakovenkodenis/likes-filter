'use strict';

const filterDOM = info => {
    alert(JSON.stringify(info));
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

