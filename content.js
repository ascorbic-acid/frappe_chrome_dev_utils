async function main(evt) {
    await waitFrappeField();
    // notify background of page fully ready
    backgroundMessage("idf_bg_request__page_loaded")
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
        switch (evt.data.eventName) {
            case "idf_cs_request__route_changed":
                backgroundMessage("idf_bg_request__route_changed", evt.data.payload);
                break;
            case "idf_cs_request__show_options_dialog":
                backgroundMessage("idf_bg_request__show_options_dialog", evt.data.payload);
                break;
            case "idf_cs_request__childtable_save":
                backgroundMessage('idf_bg_request__childtable_save', evt.data.payload);
                break;

            case "idf_cs_request__childtable_insert":
                backgroundMessage('idf_bg_request__childtable_insert', evt.data.payload);
                break;

            case "idf_cs_request__customized_fields_save":
                backgroundMessage('idf_bg_request__customized_fields_save', evt.data.payload);
                break;

            case "idf_cs_request__customized_fields_insert":
                backgroundMessage('idf_bg_request__customized_fields_insert');
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