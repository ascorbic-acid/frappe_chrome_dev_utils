let currentPage = location.href;
async function inject() {
    await waitFrappeField();
    // notify background of page ready
    backgroundMessage("bg_request__page_loaded")
}

async function main(evt) {
    await inject();
    setInterval(async function()
    {
        if (currentPage != location.href)
        {
            currentPage = location.href;
            await inject();
        }
    }, 3000);
}

// utils
async function backgroundMessage(eventName, payload) {
    chrome.runtime.sendMessage(
        {
            eventName: eventName,
            payload: payload
        }
    );
}


// Listen for page scripts
window.addEventListener("message", async (evt) => {
    if (evt.origin === window.origin) {
        // message.origin = window.location.origin
        // console.log("CS: ", evt.data.eventName);
        switch(evt.data.eventName) {
            case "cs_request__show_options_dialog":
                backgroundMessage("bg_request__show_options_dialog", evt.data.payload);
                break;
            case "cs_request__childtable_save":
                backgroundMessage('bg_request__childtable_save', evt.data.payload);
                break;

            case "cs_request__childtable_insert":
                backgroundMessage('bg_request__childtable_insert', evt.data.payload);
                break;
            
            case "cs_request__customized_fields_save": 
                backgroundMessage('bg_request__customized_fields_save', evt.data.payload);
                break;

            case "cs_request__customized_fields_insert":
                backgroundMessage('bg_request__customized_fields_insert');
                break;
        }
    }
});
window.addEventListener("load", main, false);


function waitFrappeField() {
    const selector = "[data-fieldname]"
    return new Promise((resolve) => {
        const target = document.querySelector(selector)
        if (target) {
            return resolve(target)
        }

        const observer = new MutationObserver((mutations) => {
            const target = document.querySelector(selector)
            if (target) {
                resolve(target);
                observer.disconnect();
            }
        }
        );
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    );
}