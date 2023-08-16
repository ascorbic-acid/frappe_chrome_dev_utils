function ListviewSetup(tabId) {
    idfExec((args) => {
        if (cur_list) {
            // add bulk edit to list views
            // if (cur_list.page.clear_custom_actions) {
            //     cur_list.page.clear_custom_actions();
            // }
            let idfGroup = cur_list.page.add_custom_button_group("IDF")

            // set group btn icon
            idfGroup.parent().find("span.custom-btn-group-label").html(window.idfState.idfLogoUrl1);

            // save docs
            cur_list.page.add_custom_menu_item(idfGroup, "Save Docs", async () => {
                let selected_docs = cur_list.get_checked_items();

                if (selected_docs.length == 0) {
                    frappe.show_alert(`${window.idfState.idfLogoUrl1} Please Select at least one row`, 2);
                    return;
                }

                let docs_insert_dialog = new frappe.ui.Dialog({
                    title: `${window.idfState.idfLogoUrl1} Saving (${selected_docs.length}) Doc Data of (${cur_list.doctype})`,
                    fields: [
                        {
                            label: __("Include Cancelled Docs"),
                            fieldname: "include_cancelled",
                            fieldtype: "Check",
                            description: __("Note: Cancelled Docs will be inserted as Draft"),
                        },
                        { fieldtype: "Column Break" },
                        {
                            label: __("Storage Bucket"),
                            fieldname: "storage_bucket",
                            fieldtype: "Select",
                            description: __("Select bucket to store to"),
                            options: ["General", "Current Doc"],
                            default: "Current Doc"
                        },
                        { fieldtype: "Section Break" },
                        {
                            label: __("Keep Old"),
                            fieldname: "keep_old_data",
                            fieldtype: "Check",
                            description: __("Append to Old Docs Data"),
                        },
                        { fieldtype: "Column Break" },
                        {
                            label: __("Add to Storage Top"),
                            fieldname: "add_data_to_top",
                            fieldtype: "Check",
                            description: __("Useful if you want later insert this group of data first before the old one"),
                            depends_on: "eval:doc.keep_old_data==1",
                        }
                    ],
                    primary_action_label: `${window.idfState.idfLogoUrl1} Save Docs`,
                    primary_action: async function (values) {
                        let docs = []

                        for (let i = 0; i < selected_docs.length; i++) {
                            if (!values.include_cancelled && selected_docs[i].docstatus === 2) continue;

                            let res = await frappe.call({
                                method: "frappe.client.get",
                                args: { doctype: cur_list.doctype, name: selected_docs[i].name },
                            })
                            let res_docs = res.message;

                            if (res_docs) {
                                frappe.show_progress(
                                    `${window.idfState.idfLogoUrl1} Fetching DocType Data`,
                                    i + 1,
                                    selected_docs.length,
                                    `Fetching ${selected_docs[i].name}`,
                                    true
                                )
                                docs.push(res_docs)
                            }

                        }
                        postMessage({
                            eventName: "idf_cs_request__save-data",
                            payload: {
                                doctype: cur_list.doctype,
                                data: docs,
                                bucket: values.storage_bucket,
                                keepOld: values.keep_old_data,
                                addToTop: values.add_data_to_top
                            }
                        });
                        frappe.show_alert(`${window.idfState.idfLogoUrl1} Saved ${docs.length} DocType Data Successfully`)
                        docs_insert_dialog.hide()
                    }
                })
                docs_insert_dialog.show()
            });

            // insert docs
            cur_list.page.add_custom_menu_item(idfGroup, "Insert Docs", () => {
                postMessage({
                    eventName: "idf_cs_request__listview_show-insert-doc-data-dialog",
                    payload: {
                        doctype: cur_list.doctype
                    }
                });
            });

            // insert docs
            cur_list.page.add_custom_menu_item(idfGroup, "CSV Tool", () => {
                postMessage({
                    eventName: "idf_cs_request__listview_show-csv-tool-dialog",
                    payload: {
                        doctype: cur_list.doctype
                    }
                });
            });
        }
    }
        , {}, tabId);
}
