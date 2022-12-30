importScripts('frappe/form.js');
// importScripts('frappe/listview.js')

// called when frappe page is fully ready
function formTrigger(tabId, eventName, doctype, name) {
    // exec form scripts
    if (eventName == "refresh") {
        formRefresh(tabId, eventName, doctype, name);
    }

    // TODO: patch a forward listview load/refresh events here
    // exec listview scripts
    // idfListviewRefresh(tabId);
}

async function saveChildTableData(payload) {
    await chrome.storage.local.set({
        "storage__childtable_data": payload
    });
}

async function insertChildtableData(fieldname, tabId) {
    var childData = await chrome.storage.local.get('storage__childtable_data');
    var args = {
        fieldname,
        childData: childData.storage__childtable_data
    }

    idfExec((args) => {
        cur_frm.clear_table(args.fieldname);
        for (row of args.childData) {
            // skip insertion of fields
            delete row["creation"];
            delete row["modified"];
            delete row["modified_by"];
            delete row["name"];
            delete row["owner"];
            delete row["parent"];
            delete row["parentfield"];
            delete row["parenttype"];

            cur_frm.add_child(args.fieldname, row);
        }
        cur_frm.refresh_field(args.fieldname);
    }
        , args, tabId);
}

// Customization
async function saveCustomizedFields(payload) {
    await chrome.storage.local.set({
        "storage__customized_fields_data": payload
    });
}

async function insertCustomizedFields(tabId) {
    var savedData = await chrome.storage.local.get('storage__customized_fields_data');
    var args = {
        savedData: savedData.storage__customized_fields_data
    }

    idfExec((args) => {
        let rows = args.savedData;

        for (let i = 0; i < rows.length; i++) {
            delete rows[i]["name"];

            let nr = cur_frm.add_child("fields", rows[i]);
            let new_index = cur_frm.doc.fields.findIndex(o => o.fieldname === rows[i].insert_after_fieldname) + 1
            let new_row = cur_frm.doc.fields.splice(cur_frm.doc.fields.length - 1, 1);

            cur_frm.doc.fields.splice(new_index, 0, new_row[0]);
            nr.idx = new_index + 1;

            // update custom rows highlights
            for (let i = 0; i < cur_frm.doc.fields.length; i++) {
                if (cur_frm.doc.fields[i].is_custom_field === 1) {
                    let grid_rows = cur_frm.grids[0].wrapper.querySelector(".form-grid > .grid-body > .rows");
                    if (grid_rows.childNodes[i]) {
                        grid_rows.childNodes[i].firstChild.classList.add("highlight");
                    }
                }
            }
        }
        cur_frm.refresh_fields();
    }
        , args, tabId);
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete' && tab.active) {
        idfExec(() => {
            // init idf state
            if (!window["idfState"]) {
                window["idfState"] = {pageInit: false}
            }

            // perfect & official way to detect frappe form events and run scripts
            // patch script manager to listen for frappe forms onload, refresh etc
            if (!window.idfState.pageInit) {
                window.idfState.pageInit = true;
                let oriTrigger = frappe.ui.form.ScriptManager.prototype.trigger;

                frappe.ui.form.ScriptManager.prototype.trigger = function (...args) {
                    setTimeout(() => {
                        postMessage({
                            eventName: "idf_cs_request__form_trigger",
                            payload: args
                        });
                    }
                        , 50);
                    return oriTrigger.call(this, ...args);
                }
            }

            // old and buggy way to detect route change and run form scripts
            // if (frappe.router) {
            //     frappe.router.on('change', () => {
            //         setTimeout(() => {
            //             postMessage({
            //                 eventName: "idf_cs_request__route_changed",
            //                 payload: frappe.router.current_route
            //             })
            //         }
            //             , 500);
            //     }
            //     );
            // }
        }
            , {}, tab.id);
    }
})

// listen for content script messages
chrome.runtime.onMessage.addListener(async (event, sender, sendResponse) => {
    const tabId = sender.tab.id;
    // console.log("BG: ", event.eventName);
    switch (event.eventName) {
        case "idf_bg_request__form_trigger":
            formTrigger(tabId, ...event.payload);
            break;
        case "idf_bg_request__show_options_dialog":
            idfShowOptionsDialog({
                fieldname: event.payload
            }, tabId);
            break;
        case "idf_bg_request__childtable_save":
            saveChildTableData(event.payload);
            break;
        case "idf_bg_request__childtable_insert":
            insertChildtableData(event.payload, tabId);
            break;
        case "idf_bg_request__customized_fields_save":
            saveCustomizedFields(event.payload);
            break;
        case "idf_bg_request__customized_fields_insert":
            insertCustomizedFields(tabId);
            break;
    }
});

// execute functions in page
async function idfExec(handler, args, tabId) {
    const ret = await chrome.scripting.executeScript({
        target: {
            tabId: tabId
        },
        func: handler,
        args: [args],
        world: "MAIN"
    });
    return ret;
}
