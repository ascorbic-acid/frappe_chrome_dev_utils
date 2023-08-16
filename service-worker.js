importScripts('frappe/form.js');
importScripts('frappe/listview.js')


function formTrigger(tabId, eventName, doctype, docname) {
    formEvent(tabId, eventName, doctype, docname);
}

function listviewSetup(tabId) {
    ListviewSetup(tabId);
}

async function saveDocData(doctype, data = [], bucket = "General", keepOld = 0, addToTop = 0) {

    let storageObject = {};
    let storageKey = "storage__doc_data-";

    if (bucket === "General") {
        storageKey += "General";
    } else {
        storageKey += doctype;
    }

    if (keepOld) {
        let oldData = await chrome.storage.local.get(storageKey);
        oldData = oldData[storageKey];

        if (addToTop) {
            oldData.unshift(...data);
        } else {
            oldData.push(...data);
        }

        oldData = oldData.filter((v, i, a) => a.findIndex(v2 => (v2.name === v.name)) === i);
        storageObject[storageKey] = oldData;
        await chrome.storage.local.set(storageObject);
    } else {
        storageObject[storageKey] = data;
        await chrome.storage.local.set(storageObject);
    }

    let res = await chrome.storage.local.get(storageKey);
}

async function showInsertDocDataDialog(doctype, bucket = "Current Doc", tabId) {
    let storageKey = "storage__doc_data-";

    if (bucket === "General") {
        storageKey += "General";
    } else {
        storageKey += doctype;
    }

    var data = await chrome.storage.local.get(storageKey);
    var args = { data: data[storageKey], bucket };

    idfExec((args) => {
        if (args.data === undefined || (args.data && args.data.length === 0)) {
            frappe.show_alert(`${window.idfState.idfLogoUrl1} No Data Saved`, 2);
        }
        let doc_insert_dialog = new frappe.ui.Dialog({
            title: `${window.idfState.idfLogoUrl1} Insert (${args.data.length}) Saved Doc Data of (${cur_list.doctype})`,
            fields: [
                {
                    label: __("Dont Submit Records"),
                    fieldname: "submitted_as_draft",
                    fieldtype: "Check",
                    description: __("Insert Submitted Docs as Draft"),
                    read_only_depends_on: "eval:doc.insert_doc_as_local===1",
                    default: 0
                },
                { fieldtype: "Column Break" },
                {
                    label: __("Storage Bucket"),
                    fieldname: "storage_bucket",
                    fieldtype: "Select",
                    description: __("Select bucket to fetch from"),
                    options: ["General", "Current Doc"],
                    default: args.bucket,
                    onchange: function (e) {
                        if (e && e.type == "change") {
                            this.layout.hide();
                            postMessage({
                                eventName: "idf_cs_request__listview_show-insert-doc-data-dialog",
                                payload: {
                                    doctype: cur_list.doctype,
                                    bucket: this.value
                                }
                            });
                        }
                    }
                },
                { fieldtype: "Section Break" },
                {
                    label: __("Insert One as Local"),
                    fieldname: "insert_doc_as_local",
                    fieldtype: "Check",
                    description: __("Inserting one doc record localy to edit"),
                    default: 0,
                    onchange: function (e) {
                        if (e && e.type == "change") {
                            if (this.value) {
                                // this.layout.set_df_property("submitted_as_draft", "read_only", 1);
                                // this.layout.set_df_property("stored_doc_name", "hidden", 0);
                                this.layout.set_value("stored_doc_name", args.data[0].name);
                            } else {
                                // this.layout.set_df_property("submitted_as_draft", "read_only", 0);
                                // this.layout.set_df_property("stored_doc_name", "hidden", 1)
                                this.layout.set_value("stored_doc_name", "");
                            }
                        }
                    }
                },
                { fieldtype: "Column Break" },
                {
                    label: __("Stored Doc to Insert"),
                    fieldname: "stored_doc_name",
                    fieldtype: "Data",
                    depends_on: "eval:doc.insert_doc_as_local===1",
                    read_only: 1,
                }
            ],
            primary_action_label: `${window.idfState.idfLogoUrl1} Insert Docs`,
            primary_action: async function (values) {
                doc_insert_dialog.hide();
                let inserted_docs = [];
                let remaining_docs = args.data.slice();

                for (let i = 0; i < args.data.length; i++) {

                    if (values.insert_doc_as_local) {
                        let new_doc = frappe.model.copy_doc(args.data[0]);

                        frappe.set_route("Form", new_doc.doctype, new_doc.name);
                        frappe.show_alert(`${window.idfState.idfLogoUrl1} Inserted doc (${args.data[0].name}) As a New Local Doc`);
                        remaining_docs.splice(0, 1);

                        postMessage({
                            eventName: "idf_cs_request__save-data",
                            payload: {
                                doctype: cur_list.doctype,
                                data: remaining_docs,
                                bucket: args.bucket
                            }
                        });
                        return;
                    }

                    frappe.show_progress(`${window.idfState.idfLogoUrl1} Inserting Data`, i + 1, args.data.length, `Inserting ${args.data[i].name}`, true);

                    let doc_exists = await frappe.db.exists(cur_list.doctype, args.data[i].name);

                    if (doc_exists) {
                        let exist_doc_values = await new Promise((resolve, reject) => {
                            let exist_doc_dialog = new frappe.ui.Dialog({
                                title: __(`${window.idfState.idfLogoUrl1} Please Select Action`),
                                fields: [{
                                    label: __("Info:"),
                                    fieldname: "info_data",
                                    fieldtype: "Data",
                                    read_only: 1
                                }, {
                                    fieldtype: "Section Break"
                                }, {
                                    label: __("Skip This Doc"),
                                    fieldname: "skip_doc",
                                    fieldtype: "Check",
                                    default: 1,
                                    onchange: function (e) {
                                        if (e && e.type == "change") {
                                            if (this.value) {
                                                this.layout.set_value("insert_new_name", 0);
                                                this.layout.set_df_property("new_name", "read_only", 1);
                                            } else {
                                                this.layout.set_value("insert_new_name", 1);

                                            }
                                        }
                                    }
                                }, {
                                    fieldtype: "Column Break"
                                }, {
                                    label: __("Insert with New Name"),
                                    fieldname: "insert_new_name",
                                    fieldtype: "Check",
                                    onchange: function (e) {
                                        if (e && e.type == "change") {
                                            if (this.value) {
                                                this.layout.set_value("skip_doc", 0);
                                                this.layout.set_df_property("new_name", "read_only", 0);
                                            } else {
                                                this.layout.set_value("skip_doc", 1);
                                                this.layout.set_df_property("new_name", "read_only", 1);
                                            }
                                        }
                                    }
                                }, {
                                    fieldtype: "Section Break"
                                }, {
                                    label: __("New Name"),
                                    fieldname: "new_name",
                                    fieldtype: "Data",
                                    description: __("Note: System may force auto unique naming, this depend on your config"),
                                    read_only: 1
                                }],
                                primary_action_label: __("Apply"),
                                primary_action: function (values) {
                                    if (this.get_value("insert_new_name") && this.get_value("new_name") === args.data[i].name) {
                                        frappe.show_alert(`${window.idfState.idfLogoUrl1} Please select a new name`);
                                        return;
                                    }
                                    resolve(values);
                                }
                            });
                            exist_doc_dialog.show();
                            exist_doc_dialog.set_value("new_name", args.data[i].name)
                            exist_doc_dialog.set_value("info_data", `Doc: (${args.data[i].name}) Already Exist`);
                        })

                        cur_dialog.hide();
                        frappe.hide_progress();

                        if (exist_doc_values.skip_doc) {
                            continue
                        } else if (exist_doc_values.insert_new_name) {
                            // args.data[i]["__newname"] = exist_doc_values.new_name;
                            args.data[i]["name"] = exist_doc_values.new_name;
                        }
                    }

                    if (values.submitted_as_draft) {
                        args.data[i]["docstatus"] = 0;
                        args.data[i]["status"] = null;
                    }
                    if (args.data[i]["docstatus"] === 2) {
                        args.data[i]["docstatus"] = 0
                    }
                    let res = null;
                    try {

                        res = await frappe.call({
                            method: "frappe.client.insert",
                            args: {
                                doc: args.data[i]
                            }
                        });

                        inserted_docs.push(args.data[i]);
                        remaining_docs.splice(i, i + 1);
                    } catch (e) {
                        // handle insertion errors
                        let insertion_error_dialog_values = await new Promise((resolve, reject) => {
                            let insertion_error_dialog = new frappe.ui.Dialog({
                                title: __(`${window.idfState.idfLogoUrl1} Insertion Error`),
                                fields: [
                                    {
                                        label: __("Sugessted Solutions"),
                                        fieldtype: "Section Break"
                                    }, {
                                        label: __("Skip This Doc"),
                                        fieldname: "ed_skip_doc",
                                        fieldtype: "Check",
                                        default: 1,
                                        change: function () {
                                            if (this.value) {
                                                this.layout.set_value("ed_stop_operation", 0);
                                                this.layout.set_value("ed_retry_current_operation", 0);
                                                this.layout.set_value("ed_insert_as_local_doc", 0);


                                            }

                                        }
                                    },
                                    { fieldtype: "Column Break" },
                                    {
                                        label: __("Stop the Operation"),
                                        fieldname: "ed_stop_operation",
                                        fieldtype: "Check",
                                        default: 0,
                                        change: function () {
                                            if (this.value) {
                                                this.layout.set_value("ed_skip_doc", 0);
                                                this.layout.set_value("ed_retry_current_operation", 0);
                                                this.layout.set_value("ed_insert_as_local_doc", 0);

                                            }
                                        }
                                    },
                                    { fieldtype: "Section Break" },
                                    {
                                        label: __("Try Inserting as Local Doc"),
                                        fieldname: "ed_insert_as_local_doc",
                                        fieldtype: "Check",
                                        change: function () {
                                            if (this.value) {
                                                this.layout.set_value("ed_stop_operation", 0);
                                                this.layout.set_value("ed_retry_current_operation", 0);
                                                this.layout.set_value("ed_skip_doc", 0);
                                            }
                                        }
                                    },
                                    { fieldtype: "Column Break" },
                                    {
                                        label: __("Retry Current Operation"),
                                        fieldname: "ed_retry_current_operation",
                                        fieldtype: "Check",
                                        change: function () {
                                            if (this.value) {
                                                this.layout.set_value("ed_stop_operation", 0);
                                                this.layout.set_value("ed_insert_as_local_doc", 0);
                                                this.layout.set_value("ed_skip_doc", 0);
                                            }
                                        }
                                    }, {
                                        label: __("Extra Details"),
                                        fieldtype: "Section Break"
                                    },
                                    {
                                        label: __("Error Doc"),
                                        fieldname: "ed_insertion_error_doc_name",
                                        fieldtype: "Data",
                                        read_only: 1
                                    }, {
                                        label: __("Error Reason"),
                                        fieldname: "ed_insertion_error_traceback",
                                        fieldtype: "Small Text",
                                        read_only: 1
                                    }
                                ],
                                primary_action_label: __("Apply"),
                                primary_action: (values) => resolve(values)
                            });

                            insertion_error_dialog.show();
                            insertion_error_dialog.wrapper.find(".form-section:nth-child(2)").
                                css("border-top", "0px").css("margin-top", "-20px");

                            insertion_error_dialog.add_custom_action("Help", () => {
                                frappe.msgprint(
                                    __(`<h5>
                                            Some DocTypes depend on link fields which may not exist on your destination site,
                                            For example DocTypes amended from others or return Sales Invoices which has return aginst, etc
                                            One Solution to solve this problem is by trying to insert the required docs first which then will solve them problem.

                                            <br><br>
                                            To insert the required docs data follow steps:
                                            <br><br>

                                            When saving docs select the General Bucket then copy your required docs <br>
                                            and whenever you get insertion error due to required docs select (Stop Operation) 
                                            And go to the source site and save the required doc data with the options (Keep Old) 
                                            & (Add to Storage Top) both selected then you can go back to the destination site 
                                            and try to insert again, this time the required docs will be inserted first.
                                        </h5>`),
                                    __(`${window.idfState.idfLogoUrl1} Insertion Error`)
                                )
                            });

                            setTimeout(() => {
                                frappe.hide_progress();
                                frappe.hide_msgprint();
                            }, 1000);

                            if (e.responseJSON._server_messages) {
                                let errorMessage = JSON.parse(JSON.parse(e.responseJSON._server_messages)[0]).message
                                insertion_error_dialog.set_value("ed_insertion_error_traceback", errorMessage);
                            }
                            insertion_error_dialog.set_value("ed_insertion_error_doc_name", args.data[i].name);

                        })

                        cur_dialog.hide();

                        if (insertion_error_dialog_values.ed_retry_current_operation) {
                            cur_dialog.hide();
                            i -= 1; continue;
                        }
                        else if (insertion_error_dialog_values.ed_insert_as_local_doc) {
                            let new_doc = frappe.model.copy_doc(args.data[i]);

                            frappe.set_route("Form", new_doc.doctype, new_doc.name);

                            frappe.show_alert(`${window.idfState.idfLogoUrl1} Inserted doc (${args.data[i].name}) As a New Local Doc`);
                            remaining_docs.splice(i, i + 1);

                            postMessage({
                                eventName: "idf_cs_request__save-data",
                                payload: {
                                    doctype: cur_list.doctype,
                                    data: remaining_docs,
                                    bucket: args.bucket
                                }
                            });

                            return;
                        } else if (insertion_error_dialog_values.ed_skip_doc) {
                            postMessage({
                                eventName: "idf_cs_request__save-data",
                                payload: {
                                    doctype: cur_list.doctype,
                                    data: remaining_docs,
                                    bucket: args.bucket
                                }
                            });
                            continue;
                        } else if (insertion_error_dialog_values.ed_stop_operation) {
                            cur_dialog.hide();
                            return;
                        }
                    }
                }

                postMessage({
                    eventName: "idf_cs_request__save-data",
                    payload: {
                        doctype: cur_list.doctype,
                        data: remaining_docs,
                        bucket: args.bucket
                    }
                });
                if (inserted_docs.length > 0 && args.bucket == "General") {
                    let insertion_report = "";

                    for (let insert_doc of inserted_docs) {
                        insertion_report += `(DocType: ${insert_doc.doctype} | DocName: ${insert_doc.name})<br>`;
                    }
                    frappe.msgprint(
                        insertion_report,
                        __(`${window.idfState.idfLogoUrl1} General Bucket Insert info`)
                    )
                }
                frappe.show_alert(`${window.idfState.idfLogoUrl1} Inserted (${inserted_docs.length}) DocType Data Successfully`);
            }
        })
        doc_insert_dialog.show();
        doc_insert_dialog.set_df_property("stored_doc_name", "hidden", 1);
    }
        , args, tabId);
}

async function showCSVToolDialog(payload, tabId) {
    let args = {}
    idfExec((args) => {
        let csv_tool_dialog = new frappe.ui.Dialog({
            title: `${window.idfState.idfLogoUrl1} CSV Tool`,
            fields: [
                { label: __("Doctype"), fieldtype: "Data", fieldname: "current_doctype", read_only: 1, default: cur_list.doctype },
                { fieldtype: "Column Break" },
                {
                    label: __("Get Import Template"),
                    fieldtype: "Button",
                    description: __("Note: Child Table Fields not supported when importing with this tool"),
                    click: () => {
                        frappe.new_doc("Data Import", {
                            reference_doctype: csv_tool_dialog.get_field("current_doctype").value,
                            import_type: __("Update Existing Records")
                        }, () => {
                            setTimeout(() => {
                                cur_frm.script_manager.trigger("download_template")
                            }, 2000)
                        })


                    }
                },
                { label: __("Data Import"), fieldtype: "Section Break" },
                { label: __("Import Type"), fieldtype: "Select", options: ["Create Records", "Update Records"], default: "Update Records", read_only: 1 },
                {
                    fieldtype: "HTML",
                    fieldname: "file_type",
                    options: `
                        <div>
                            <label for="formFileLg" class="form-label">CSV File</label>
                            <input class="form-control form-control-lg" id="formFileLg" type="file" accept=".csv">
                        </div>
                    `
                },
            ],
            primary_action_label: `${window.idfState.idfLogoUrl1} Apply`,
            primary_action: async function (values) {
                csv_tool_dialog.hide();
                let csvFile = document.querySelector("#formFileLg").files[0];
                postMessage({
                    eventName: "idf_cs_request__csv-tool-read_file",
                    payload: {
                        doctype: cur_list.doctype,
                        docfields: frappe.meta.get_docfields(cur_list.doctype).map(df => {
                            return { label: df.label, fieldname: df.fieldname }
                        }),
                        file: csvFile
                    }
                });
                frappe.show_alert(`${window.idfState.idfLogoUrl1} in progress, pelase wait...`);
            }
        })
        csv_tool_dialog.show();
    }
        , args, tabId);
}

async function handleCSVToolBulkUpdate(docs, tabId) {
    const args = { docs: docs }

    idfExec((args) => {
        frappe.call({
            method: "frappe.client.bulk_update",
            args: {
                docs: args.docs
            },
            callback: function (r) {
                console.log(r.message);
                frappe.show_alert(`${window.idfState.idfLogoUrl1} Imports (${args.docs.length}), Fails(${r.message.failed_docs.length})`);
            }
        })
    }
        , args, tabId);

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
        let args = {}
        args.idfLogoUrl1 = `
            <img src="${chrome.runtime.getURL("/logo/logo.png")}"
            style="width: 20px; margin-left: -5px; margin-right: -5px; margin-top: -5px" />`;
        args.idfLogoUrl2 = `
            <img src="${chrome.runtime.getURL("/logo/logo.png")}" style="width: 18px;" />`;

        idfExec((args) => {
            // init idf state
            if (!window["idfState"]) {
                window["idfState"] = {
                    pageInit: false,
                    idfLogoUrl1: args.idfLogoUrl1,
                    idfLogoUrl2: args.idfLogoUrl2
                }
            }

            // perfect & official way to detect frappe form events and run scripts
            // patch script manager to listen for frappe forms onload, refresh etc
            if (!frappe.ui.form.ScriptManager) return;

            if (!window.idfState.pageInit) {
                window.idfState.pageInit = true;

                // hooking frappe script manager to add forms scripting features
                let oriTrigger = frappe.ui.form.ScriptManager.prototype.trigger;
                frappe.ui.form.ScriptManager.prototype.trigger = function (...args) {
                    setTimeout(() => {
                        postMessage({
                            eventName: "idf_cs_request__form_trigger",
                            payload: args
                        });
                    }
                        , 100);
                    return oriTrigger.call(this, ...args);
                }
                // hooking frappe setup_view to add listview scripting features
                let oriViewSetup = frappe.views.ListView.prototype.setup_view;
                frappe.views.ListView.prototype.setup_view = function (...args) {
                    setTimeout(() => {
                        postMessage({
                            eventName: "idf_cs_request__listview_setup",
                            payload: args
                        });
                    }
                        , 500);
                    return oriViewSetup.call(this, ...args);
                }
            }
        },
            args, tab.id);
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
        case "idf_bg_request__listview_setup":
            listviewSetup(tabId);
            break;
        case "idf_bg_request__show_options_dialog":
            idfShowOptionsDialog(event.payload, tabId);
            break;
        case "idf_bg_request__save-data":
            saveDocData(
                event.payload.doctype,
                event.payload.data,
                event.payload.bucket,
                event.payload.keepOld,
                event.payload.addToTop
            );
            break;
        case "idf_bg_request__listview_show-insert-doc-data-dialog":
            showInsertDocDataDialog(event.payload.doctype, event.payload.bucket, tabId);
            break;
        case "idf_bg_request__listview_show-csv-tool-dialog":
            showCSVToolDialog(event.payload, tabId);
            break;
        case "idf_bg_request__csv-tool-bulk_update":
            handleCSVToolBulkUpdate(event.payload, tabId);
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
