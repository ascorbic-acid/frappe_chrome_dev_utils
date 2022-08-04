// This is the service worker script, which executes in its own context
// when the extension is installed or refreshed (or when you access its console).
// It would correspond to the background script in chrome extensions v2.

// console.log("This prints to the console of the service worker (background script)")

// // Importing and using functionality from external files is also possible.
// importScripts('hot-reload.js')

// If you want to import a file that is deeper in the file hierarchy of your
// extension, simply do `importScripts('path/to/file.js')`.
// The path should be relative to the file `manifest.json`.

// called when frappe page is fully ready
function pageLoaded(tabId) {

    // execute page script
    exec((args)=>{

        // patch save button to force save if the form did not change
        var origina_save_func = frappe.ui.form.save

        frappe.ui.form.save = function(frm, action, callback, btn) {
            frm.dirty();
            origina_save_func.apply(this, [frm, action, callback, btn]);
        }
        
        if(cur_frm) {
            // patch fields
            for (let i = 0; i < cur_frm.fields.length; i++) {
                let field = cur_frm.fields[i];
                
                if (location.pathname.includes("/app/customize-form")) {
                    field.df.old_hidden = field.df.hidden;
                    if (!field.df.options) {
                        field.df.options = "Empty";
                    }
                    if (!field.df.is_custom_field) {
                        field.df.is_custom_field = "0";
                    }
                }
    
                // show all hidden fields & highlight custom fields
                if (field.df.hidden === 1) {
                    //save old hidden value
                    field.df.old_hidden = 1;
                    field.df.hidden = 0;
    
                    if (field.df.is_custom_field === 1) {
                        // field.df.label += "  (HIDDEN | Custom Field)";
                        field.wrapper.querySelector(".control-label").style.color = "darksalmon";
                    } else {
                        field.df.label += "  (HIDDEN)";
                        field.wrapper.querySelector(".control-label").style.color = "brown";
                    }
                }
            }
            cur_frm.refresh_fields();
        }

        if(cur_list) {

            // add bulk edit to list views
            cur_list.page.clear_custom_actions();
            let idf_group = cur_list.page.add_custom_button_group("IDF")
    
            // Bulk Fields Edit
            cur_list.page.add_custom_menu_item(idf_group, "Bulk Rows Edit", ()=>{
                let checked = cur_list.get_checked_items();
                if (checked.length == 0) {
                    frappe.show_alert("IDF: Please Select at least one row", 5);
                    return undefined;
                }
                let dialog_fields = []
    
                for (let i = 0; i < cur_list.meta.fields.length; i++) {
                    let field = cur_list.meta.fields[i];
    
                    dialog_fields.push({
                        label: field.label,
                        fieldname: field.fieldname,
                        fieldtype: field.fieldtype,
                        options: field.options
                    })
                }
    
                let d = new frappe.ui.Dialog({
                    title: `IDF: Bulk Edit for ${checked.length} Rows.`,
                    fields: dialog_fields,
                    primary_action_label: "Submit",
                    primary_action: function(values) {
    
                        for (let i = 0; i < checked.length; i++) {
                            let checked_row = checked[i];
                            console.log(values);
    
                            frappe.call({
                                method: "frappe.client.set_value",
                                args: {
                                    doctype: cur_list.doctype,
                                    name: checked_row.name,
                                    fieldname: values
                                },
                                callback: function(r) {
                                    console.log(r.message)
                                }
                            })
                        }
    
                    }
                })
                d.show()
            }
            );
        }


    }
    , {}, tabId);
}

function showOptionsDialog(args) {
    const PREFIX = "IDF: ";
    const targetFieldName = args.fieldname;
    // const fieldType = cur_frm.fields_dict[targetFieldName].wrapper.getAttribute("data-fieldtype");
    const fieldData = cur_frm.get_field(targetFieldName);

    var dialog = new frappe.ui.Dialog({
        title: `${PREFIX} Field Info`,
        fields: [{
            label: `Details:`,
            fieldname: "tables_options_section",
            fieldtype: "Section Break"
        }, {
            label: `Details:`,
            fieldname: "field_details_html",
            fieldtype: "HTML",
            options: ` <div style="display: grid; grid-template-columns: repeat(3, 1fr)">
                        <!-- first row -->
                        <div>
                            <p onclick="frappe.utils.copy_to_clipboard('${fieldData.df.fieldname}')" style="cursor: pointer;">Name: <strong>${fieldData.df.fieldname} </strong> <img src="${args.clipboardImage}" style="width: 18px; margin: -7px 7px -2px 4px;" /></p>
                        </div>
                        <div>
                            <p ">Type: <strong>${fieldData.df.fieldtype} </strong></p>
                        </div>
                        <div>
                            <p onclick="frappe.utils.copy_to_clipboard('${fieldData.df.options}')" style="cursor: pointer;">Options: <strong>${fieldData.df.options} </strong> <img src="${args.clipboardImage}" style="width: 18px; margin: -7px 7px -2px 4px;"/><p>
                        </div>
                        
                        <!-- second row -->
                        <div>
                            <p >Hidden: <strong>${fieldData.df.old_hidden} </strong> </p>
                        </div>
                        <div>
                            <p >Is Custom: <strong>${fieldData.df.is_custom_field} </strong> </p>
                        </div>
                        <div>
                            <p >In ListView: <strong>${fieldData.df.in_list_view} </strong> </p>
                        </div>
                    </div>
                `
        }, {
            fieldtype: "Section Break"
        }, {
            label: "Options:",
            fieldname: "field_options_section",
            fieldtype: "Section Break"
        }, {
            label: 'Copy Table Data',
            fieldname: 'copy_table_data',
            fieldtype: 'Button',
            click: (val)=>{
                if (fieldData.df.fieldtype == "Table") {
                    postMessage({
                        eventName: "cs_request__childtable_save",
                        payload: cur_frm.doc[fieldData.df.fieldname]
                    });

                    frappe.show_alert(`${PREFIX} table data of ${fieldData.df.fieldname} saved`, 8);
                    cur_dialog.hide();
                } else {
                    frappe.show_alert(`${PREFIX} field ${fieldData.df.fieldname} is not a table`, 8);
                }
            }
        }, {
            fieldtype: "Column Break"
        }, {
            label: 'Insert Table Data',
            fieldname: 'copy_table_data',
            fieldtype: 'Button',
            click: (val)=>{
                if (fieldData.df.fieldtype == "Table") {
                    postMessage({
                        eventName: "cs_request__childtable_insert",
                        payload: targetFieldName
                    });

                    frappe.show_alert(`Table data of: ${targetFieldName} has been inserted`, 8);
                    cur_dialog.hide();
                } else {
                    frappe.show_alert(`Field: ${targetFieldName} is not a Table`, 8);
                }
            }
        }, // Customize Form
        {
            fieldtype: "Section Break"
        }, {
            label: 'Copy customized fields',
            fieldname: 'copy_customized_fields',
            fieldtype: 'Button',
            click: (val)=>{
                if (fieldData.df.parent == "Customize Form" && fieldData.df.fieldname == "fields") {
                    // get custom fields
                    let fields = cur_frm.doc.fields;
                    let customFields = [];

                    for (let i = 0; i < fields.length; i++) {
                        if (fields[i].is_custom_field === 1) {
                            fields[i].insert_after_fieldname = fields[i === 0 ? 0 : (i - 1)].fieldname;
                            customFields.push(fields[i]);
                        }
                    }

                    postMessage({
                        eventName: "cs_request__customized_fields_save",
                        payload: customFields
                    });

                    frappe.show_alert(`${PREFIX} Customized Fields saved`, 8);
                    cur_dialog.hide();
                } else {
                    frappe.show_alert(`${PREFIX} only works on (fields) table in Customize Form doctype.`, 8);
                }
            }
        }, {
            fieldtype: "Column Break"
        }, {
            label: 'Insert customized fields',
            fieldname: 'inser_customized_fields',
            fieldtype: 'Button',
            click: (val)=>{
                if (fieldData.df.parent == "Customize Form" && fieldData.df.fieldname == "fields") {
                    postMessage({
                        eventName: "cs_request__customized_fields_insert"
                    });

                    frappe.show_alert(`${PREFIX} ${fieldData.df.fieldname} has been inserted`, 8);
                    cur_dialog.hide();
                } else {
                    frappe.show_alert(`${PREFIX} only works on (fields) table in Customize Form doctype.`, 8);
                }
            }
        }, {
            fieldtype: "Section Break"
        }, ],
        primary_action_label: 'Done',
        primary_action(values) {
            cur_dialog.hide();
        }
    });
    dialog.show();
}

// payload is cur_frm.doc['field']
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

    exec((args)=>{
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
    , args, tabId)
}

// Customization
async function saveCustomizedFields(payload) {
    console.log(payload)

    await chrome.storage.local.set({
        "storage__customized_fields_data": payload
    });
}

async function insertCustomizedFields(tabId) {
    var savedData = await chrome.storage.local.get('storage__customized_fields_data');
    var args = {
        savedData: savedData.storage__customized_fields_data
    }

    exec((args)=>{
        let rows = args.savedData;

        for (let i = 0; i < rows.length; i++) {
            delete rows[i]["name"];

            let nr = cur_frm.add_child("fields", rows[i]);
            // reposition row to the insert_after_fieldname index
            let new_index = cur_frm.doc.fields.findIndex(o=>o.fieldname === rows[i].insert_after_fieldname) + 1
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
    , args, tabId)
}

// listen for content script messages
chrome.runtime.onMessage.addListener(async(event,sender,sendResponse)=>{
    const tabId = sender.tab.id;
    console.log("BG: ", event.eventName);
    switch (event.eventName) {
    case "bg_request__page_loaded":
        pageLoaded(tabId);
        break;

    case "bg_request__show_field_options_dialog":
        let clipboardImage = chrome.runtime.getURL("images/clipboard.png");
        exec(showOptionsDialog, {
            fieldname: event.payload,
            clipboardImage
        }, tabId);
        break;

    case "bg_request__childtable_save":
        saveChildTableData(event.payload);
        break;

    case "bg_request__childtable_insert":
        insertChildtableData(event.payload, tabId);
        break;

    case "bg_request__customized_fields_save":
        saveCustomizedFields(event.payload);
        break;

    case "bg_request__customized_fields_insert":
        insertCustomizedFields(tabId);
        break;

    }
}
);

// execute functions in page
async function exec(handler, args, tabId) {
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
