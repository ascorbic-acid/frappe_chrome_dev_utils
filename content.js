// Listen for page scripts
window.addEventListener("message", async (event) => {
    if (event.origin === window.origin) {
        // console.log("CS: ", evt.data.eventName);
        switch (event.data.eventName) {
            case "idf_cs_request__form_trigger":
                backgroundMessage("idf_bg_request__form_trigger", event.data.payload);
                break;
            case "idf_cs_request__show_options_dialog":
                backgroundMessage("idf_bg_request__show_options_dialog", event.data.payload);
                break;
            case "idf_cs_request__childtable_save":
                backgroundMessage('idf_bg_request__childtable_save', event.data.payload);
                break;

            case "idf_cs_request__childtable_insert":
                backgroundMessage('idf_bg_request__childtable_insert', event.data.payload);
                break;

            case "idf_cs_request__customized_fields_save":
                backgroundMessage('idf_bg_request__customized_fields_save', event.data.payload);
                break;

            case "idf_cs_request__customized_fields_insert":
                backgroundMessage('idf_bg_request__customized_fields_insert');
                break;
        }
    }
});

// utils
async function backgroundMessage(eventName, payload) {
    chrome.runtime.sendMessage(
        {
            eventName: eventName,
            payload: payload
        }
    );
}
