
function getHoveringField() {
    // find target field using attribute instead of :hover
    let targetField = document.querySelectorAll("div.frappe-control[aria-describedby]");
    // let field = targetField[targetField.length - 1];
    return targetField[0]
}

// create tooltip for all fields
function initFieldsTooltip() {
    // if(!document.querySelector("[data-tippy-stylesheet]")) {
        var frappe_fields = Array.from(document.querySelectorAll("div.frappe-control"));
        for (let i = 0; i < frappe_fields.length; i++) {
            let fieldname = frappe_fields[i].getAttribute("data-fieldname")
            tippy(frappe_fields[i], {
                content: ` ${fieldname}  (Ctrl+X)`,
                arrow: false
            });
        }
    // }
}

let currentPage = location.href;
async function inject() {
    await waitFrappeField();
    initFieldsTooltip();
    
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
    
    // register keyboard events
    $(document).keydown(function (e) {
        if (e.ctrlKey && e.keyCode == 88) {
            let fieldname = getHoveringField().getAttribute("data-fieldname");
            backgroundMessage("bg_request__show_field_options_dialog", fieldname);
        };
    });
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
        console.log("CS: ", evt.data.eventName);
        switch(evt.data.eventName) {
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
})

// send it to background
// chrome.runtime.sendMessage(message, (response) => {
//         // The callback for this message will call `window.postMessage`
//         window.postMessage(response, message.origin)
// })
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
        })
    }
    );
}