function get_fieldname(label, docfields) {
    const field = docfields.find((df) => {
        if (df.label && df.label === label) {
            return df
        }
    })
    return field["fieldname"]
}

async function csvToolReadFile(doctype, docfields, file) {
    Papa.parse(file, {
        header: true,
        transformHeader: function (header, idx) {
            if (header === "ID") {
                return "docname"
            }
            return get_fieldname(header, docfields)
        },
        complete: function (results) {
            console.log(results);
            let docs = []

            for (let i = 0; i < results.data.length; i++) {
                let doc = results.data[i]
                if (!doc.docname) continue
                doc["doctype"] = doctype

                docs.push(doc)
            }
            backgroundMessage('idf_bg_request__csv-tool-bulk_update', docs);
        }
    });
}


// Listen for page scripts
window.addEventListener("message", async (event) => {
    if (event.origin === window.origin) {
        // console.log("CS: ", evt.data.eventName);
        switch (event.data.eventName) {
            case "idf_cs_request__form_trigger":
                backgroundMessage("idf_bg_request__form_trigger", event.data.payload);
                break;
            case "idf_cs_request__listview_setup":
                backgroundMessage("idf_bg_request__listview_setup", event.data.payload);
                break;
            case "idf_cs_request__show_options_dialog":
                backgroundMessage("idf_bg_request__show_options_dialog", event.data.payload);
                break;
            case "idf_cs_request__save-data":
                backgroundMessage('idf_bg_request__save-data', event.data.payload);
                break;
            case "idf_cs_request__listview_show-insert-doc-data-dialog":
                backgroundMessage('idf_bg_request__listview_show-insert-doc-data-dialog', event.data.payload);
                break;
            case "idf_cs_request__listview_show-csv-tool-dialog":
                backgroundMessage('idf_bg_request__listview_show-csv-tool-dialog', event.data.payload);
                break;
            case "idf_cs_request__csv-tool-read_file":
                csvToolReadFile(event.data.payload.doctype, event.data.payload.docfields, event.data.payload.file)
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
