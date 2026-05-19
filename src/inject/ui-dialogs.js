// These functions are meant to be injected into the MAIN world of the Frappe page.

window.idfShowInsertDocDataDialog = async function(args) {
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
                            eventName: window.idfState.EVENTS.CS_LISTVIEW_SHOW_INSERT_DIALOG,
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
                            this.layout.set_value("stored_doc_name", args.data[0].name);
                        } else {
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
                        eventName: window.idfState.EVENTS.CS_SAVE_DATA,
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
                    let exist_doc_values = await new Promise((resolve) => {
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

                    if (exist_doc_values.skip_doc) {
                        continue
                    } else if (exist_doc_values.insert_new_name) {
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
                
                try {
                    await frappe.call({
                        method: "frappe.client.insert",
                        args: {
                            doc: args.data[i]
                        }
                    });

                    inserted_docs.push(args.data[i]);
                    remaining_docs.splice(i, i + 1);
                } catch (e) {
                    // handle insertion errors
                    let insertion_error_dialog_values = await new Promise((resolve) => {
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
                                        Some DocTypes depend on link fields which may not exist on your destination site...
                                    </h5>`),
                                __(`${window.idfState.idfLogoUrl1} Insertion Error`)
                            )
                        });

                        setTimeout(() => {
                            frappe.hide_progress();
                            frappe.hide_msgprint();
                        }, 1000);

                        if (e.responseJSON && e.responseJSON._server_messages) {
                            let errorMessage = JSON.parse(JSON.parse(e.responseJSON._server_messages)[0]).message
                            insertion_error_dialog.set_value("ed_insertion_error_traceback", errorMessage);
                        }
                        insertion_error_dialog.set_value("ed_insertion_error_doc_name", args.data[i].name);
                    })

                    if (insertion_error_dialog_values.ed_retry_current_operation) {
                        i -= 1; continue;
                    }
                    else if (insertion_error_dialog_values.ed_insert_as_local_doc) {
                        let new_doc = frappe.model.copy_doc(args.data[i]);
                        frappe.set_route("Form", new_doc.doctype, new_doc.name);
                        frappe.show_alert(`${window.idfState.idfLogoUrl1} Inserted doc (${args.data[i].name}) As a New Local Doc`);
                        remaining_docs.splice(i, i + 1);

                        postMessage({
                            eventName: window.idfState.EVENTS.CS_SAVE_DATA,
                            payload: {
                                doctype: cur_list.doctype,
                                data: remaining_docs,
                                bucket: args.bucket
                            }
                        });
                        return;
                    } else if (insertion_error_dialog_values.ed_skip_doc) {
                        postMessage({
                            eventName: window.idfState.EVENTS.CS_SAVE_DATA,
                            payload: {
                                doctype: cur_list.doctype,
                                data: remaining_docs,
                                bucket: args.bucket
                            }
                        });
                        continue;
                    } else if (insertion_error_dialog_values.ed_stop_operation) {
                        return;
                    }
                }
            }

            postMessage({
                eventName: window.idfState.EVENTS.CS_SAVE_DATA,
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
                frappe.msgprint(insertion_report, __(`${window.idfState.idfLogoUrl1} General Bucket Insert info`))
            }
            frappe.show_alert(`${window.idfState.idfLogoUrl1} Inserted (${inserted_docs.length}) DocType Data Successfully`);
        }
    })
    doc_insert_dialog.show();
    doc_insert_dialog.set_df_property("stored_doc_name", "hidden", 1);
};

window.idfShowCSVToolDialog = function(args) {
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
                eventName: window.idfState.EVENTS.CS_CSV_TOOL_READ_FILE,
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
};

window.idfHandleCSVToolBulkUpdate = function(docs) {
    console.log(docs);
    
    frappe.call({
        method: "frappe.client.bulk_update",
        args: {
            docs: docs
        },
        callback: function (r) {
            frappe.show_alert(`${window.idfState.idfLogoUrl1} Imports (${docs.length}), Fails(${r.message.failed_docs.length})`);
        }
    })
};

window.idfInsertChildtableData = function(args) {
    cur_frm.clear_table(args.fieldname);
    for (let row of args.childData) {
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
};

window.idfInsertCustomizedFields = function(args) {
    let rows = args.savedData;
    for (let i = 0; i < rows.length; i++) {
        delete rows[i]["name"];
        let nr = cur_frm.add_child("fields", rows[i]);
        let new_index = cur_frm.doc.fields.findIndex(o => o.fieldname === rows[i].insert_after_fieldname) + 1
        let new_row = cur_frm.doc.fields.splice(cur_frm.doc.fields.length - 1, 1);
        cur_frm.doc.fields.splice(new_index, 0, new_row[0]);
        nr.idx = new_index + 1;

        // update custom rows highlights
        for (let j = 0; j < cur_frm.doc.fields.length; j++) {
            if (cur_frm.doc.fields[j].is_custom_field === 1) {
                let grid_rows = cur_frm.grids[0].wrapper.querySelector(".form-grid > .grid-body > .rows");
                if (grid_rows.childNodes[j]) {
                    grid_rows.childNodes[j].firstChild.classList.add("highlight");
                }
            }
        }
    }
    cur_frm.refresh_fields();
};

window.idfShowOptionsDialogPage = function(args) {
    let fieldData = frappe.meta.get_docfield(args.doctype, args.fieldname);
    if (!fieldData.options) fieldData.options = "";

    let openDocButtonsHTML = "";
    if (["Link", "Table", "Table MultiSelect"].includes(fieldData.fieldtype)) {
        openDocButtonsHTML = `
            <button class="btn btn-sm btn-options" onclick="event.stopPropagation(); frappe.set_route('Form', 'Customize Form', { doc_type: '${fieldData.options}'})">C</button>
            <button class="btn btn-sm btn-options" onclick="event.stopPropagation(); frappe.set_route('doctype/${fieldData.options}')">D</button>
        `;
    }

    var dialog = new frappe.ui.Dialog({
        title: `${window.idfState.idfLogoUrl2} Field Details`,
        fields: [{
            label: `Details:`,
            fieldname: "tables_options_section",
            fieldtype: "Section Break"
        }, {
            label: `Details:`,
            fieldname: "field_details_html",
            fieldtype: "HTML",
            options: ` <div style="display: grid; grid-template-columns: auto auto">
                        <div><p onclick="frappe.utils.copy_to_clipboard('${fieldData.fieldname}');cur_dialog.hide();" style="cursor: pointer;">Name: <strong>${fieldData.fieldname} </strong> </p></div>
                        <div><p>Field No.: <strong>${fieldData.idx}</strong> </p></div>
                        <div><p>Type: <strong>${fieldData.fieldtype}</strong></p></div>
                        <div><p>In ListView: <strong>${fieldData.in_list_view}</strong> </p></div>
                        <div>
                            <p onclick="frappe.utils.copy_to_clipboard('${fieldData.options.replace(/\s/g, " ")}');cur_dialog.hide();" style="cursor: pointer;">
                                    Options: <strong>${fieldData.options} </strong>
                                    ${openDocButtonsHTML}
                            <p>
                        </div>
                        <div><p>Is Custom: <strong>${fieldData.is_custom_field}</strong> </p></div>
                    </div>
                    <style>
                        .btn-options { height: 20px; padding: 0; width: 18px; }
                    </style>
                `
        }, {
            fieldtype: "Section Break"
        }, {
            label: "Extra Actions:",
            fieldname: "field_options_section",
            fieldtype: "Section Break"
        }, {
            label: 'Copy Table Data',
            fieldname: 'copy_table_data',
            fieldtype: 'Button',
            click: () => {
                if (fieldData.fieldtype == "Table") {
                    let table = dialog.get_value("only_selected_rows") ? fieldData.grid.get_selected_children() : cur_frm.doc[fieldData.fieldname];
                    postMessage({ eventName: window.idfState.EVENTS.CS_CHILDTABLE_SAVE, payload: table });
                    frappe.show_alert(`${window.idfState.idfLogoUrl2} Data saved`, 8);
                    cur_dialog.hide();
                } else {
                    frappe.show_alert(`Field is not a table`, 8);
                }
            }
        }, {
            label: 'Only Selected Rows',
            fieldname: 'only_selected_rows',
            fieldtype: 'Check'
        }, {
            fieldtype: "Column Break"
        }, {
            label: 'Insert Saved Table Data',
            fieldname: 'insert_table_data',
            fieldtype: 'Button',
            click: () => {
                if (fieldData.fieldtype == "Table") {
                    postMessage({ eventName: window.idfState.EVENTS.CS_CHILDTABLE_INSERT, payload: fieldData.fieldname });
                    cur_dialog.hide();
                }
            }
        }, {
            fieldtype: "Section Break"
        }, {
            label: 'Copy Customized Fields',
            fieldname: 'copy_customized_fields',
            fieldtype: 'Button',
            click: () => {
                if (fieldData.parent == "Customize Form" && fieldData.fieldname == "fields") {
                    let fields = cur_frm.doc.fields;
                    let customFields = fields.filter(f => f.is_custom_field === 1).map((f) => {
                        let f_copy = JSON.parse(JSON.stringify(f));
                        f_copy.insert_after_fieldname = fields[fields.indexOf(f) - 1]?.fieldname;
                        return f_copy;
                    });
                    postMessage({ eventName: window.idfState.EVENTS.CS_CUSTOMIZED_FIELDS_SAVE, payload: customFields });
                    cur_dialog.hide();
                }
            }
        }, {
            fieldtype: "Column Break"
        }, {
            label: 'Insert Saved Customized Fields',
            fieldname: 'inser_customized_fields',
            fieldtype: 'Button',
            click: () => {
                if (fieldData.parent == "Customize Form" && fieldData.fieldname == "fields") {
                    postMessage({ eventName: window.idfState.EVENTS.CS_CUSTOMIZED_FIELDS_INSERT });
                    cur_dialog.hide();
                }
            }
        }],
        primary_action_label: 'Done',
        primary_action: () => cur_dialog.hide()
    });
    dialog.show();
};
