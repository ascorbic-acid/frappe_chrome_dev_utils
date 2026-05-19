(async () => {
    const { EVENTS } = await import(chrome.runtime.getURL('src/shared/events.js'));

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
                let docs = []

                for (let i = 0; i < results.data.length; i++) {
                    let doc = results.data[i]
                    if (!doc.docname) continue
                    doc["doctype"] = doctype

                    docs.push(doc)
                }
                backgroundMessage(EVENTS.BG_CSV_TOOL_BULK_UPDATE, docs);
            }
        });
    }


    // Listen for page scripts
    window.addEventListener("message", async (event) => {
        if (event.origin === window.origin) {
            switch (event.data.eventName) {
                case EVENTS.CS_FORM_TRIGGER:
                    backgroundMessage(EVENTS.BG_FORM_TRIGGER, event.data.payload);
                    break;
                case EVENTS.CS_LISTVIEW_SETUP:
                    backgroundMessage(EVENTS.BG_LISTVIEW_SETUP, event.data.payload);
                    break;
                case EVENTS.CS_SHOW_OPTIONS_DIALOG:
                    backgroundMessage(EVENTS.BG_SHOW_OPTIONS_DIALOG, event.data.payload);
                    break;
                case EVENTS.CS_SAVE_DATA:
                    backgroundMessage(EVENTS.BG_SAVE_DATA, event.data.payload);
                    break;
                case EVENTS.CS_LISTVIEW_SHOW_INSERT_DIALOG:
                    backgroundMessage(EVENTS.BG_LISTVIEW_SHOW_INSERT_DIALOG, event.data.payload);
                    break;
                case EVENTS.CS_LISTVIEW_SHOW_CSV_DIALOG:
                    backgroundMessage(EVENTS.BG_LISTVIEW_SHOW_CSV_DIALOG, event.data.payload);
                    break;
                case EVENTS.CS_CSV_TOOL_READ_FILE:
                    csvToolReadFile(event.data.payload.doctype, event.data.payload.docfields, event.data.payload.file)
                    break;
                case EVENTS.CS_CHILDTABLE_SAVE:
                    backgroundMessage(EVENTS.BG_CHILDTABLE_SAVE, event.data.payload);
                    break;
                case EVENTS.CS_CHILDTABLE_INSERT:
                    backgroundMessage(EVENTS.BG_CHILDTABLE_INSERT, event.data.payload);
                    break;
                case EVENTS.CS_CUSTOMIZED_FIELDS_SAVE:
                    backgroundMessage(EVENTS.BG_CUSTOMIZED_FIELDS_SAVE, event.data.payload);
                    break;
                case EVENTS.CS_CUSTOMIZED_FIELDS_INSERT:
                    backgroundMessage(EVENTS.BG_CUSTOMIZED_FIELDS_INSERT);
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
})();
