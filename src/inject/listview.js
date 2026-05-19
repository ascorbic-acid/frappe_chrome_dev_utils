
window.ListviewSetup = function() {
    if (cur_list) {
        let idfGroup = cur_list.page.add_custom_button_group("IDF");
        idfGroup.parent().find("span.custom-btn-group-label").html(window.idfState.idfLogoUrl1);

        // Save docs
        cur_list.page.add_custom_menu_item(idfGroup, "Save Docs", async () => {
            let selected_docs = cur_list.get_checked_items();
            if (selected_docs.length == 0) {
                frappe.show_alert(`${window.idfState.idfLogoUrl1} Please Select at least one row`, 2);
                return;
            }

            let docs_insert_dialog = new frappe.ui.Dialog({
                title: `${window.idfState.idfLogoUrl1} Saving (${selected_docs.length}) Doc Data of (${cur_list.doctype})`,
                fields: [
                    { label: __("Include Cancelled Docs"), fieldname: "include_cancelled", fieldtype: "Check" },
                    { fieldtype: "Column Break" },
                    { label: __("Storage Bucket"), fieldname: "storage_bucket", fieldtype: "Select", options: ["General", "Current Doc"], default: "Current Doc" },
                    { fieldtype: "Section Break" },
                    { label: __("Keep Old"), fieldname: "keep_old_data", fieldtype: "Check" },
                    { fieldtype: "Column Break" },
                    { label: __("Add to Storage Top"), fieldname: "add_data_to_top", fieldtype: "Check", depends_on: "eval:doc.keep_old_data==1" }
                ],
                primary_action_label: `${window.idfState.idfLogoUrl1} Save Docs`,
                primary_action: async function (values) {
                    let docs = [];
                    for (let i = 0; i < selected_docs.length; i++) {
                        if (!values.include_cancelled && selected_docs[i].docstatus === 2) continue;
                        let res = await frappe.call({
                            method: "frappe.client.get",
                            args: { doctype: cur_list.doctype, name: selected_docs[i].name },
                        });
                        let res_docs = res.message;
                        if (res_docs) {
                            frappe.show_progress(`${window.idfState.idfLogoUrl1} Fetching Data`, i + 1, selected_docs.length, `Fetching ${selected_docs[i].name}`, true);
                            docs.push(res_docs);
                        }
                    }
                    postMessage({
                        eventName: window.idfState.EVENTS.CS_SAVE_DATA,
                        payload: {
                            doctype: cur_list.doctype,
                            data: docs,
                            bucket: values.storage_bucket,
                            keepOld: values.keep_old_data,
                            addToTop: values.add_data_to_top
                        }
                    });
                    frappe.show_alert(`${window.idfState.idfLogoUrl1} Saved ${docs.length} Successfully`);
                    docs_insert_dialog.hide();
                }
            });
            docs_insert_dialog.show();
        });

        // Insert docs
        cur_list.page.add_custom_menu_item(idfGroup, "Insert Docs", () => {
            postMessage({
                eventName: window.idfState.EVENTS.CS_LISTVIEW_SHOW_INSERT_DIALOG,
                payload: { doctype: cur_list.doctype }
            });
        });

        // CSV Tool
        cur_list.page.add_custom_menu_item(idfGroup, "CSV Tool", () => {
            postMessage({
                eventName: window.idfState.EVENTS.CS_LISTVIEW_SHOW_CSV_DIALOG,
                payload: { doctype: cur_list.doctype }
            });
        });
    }
};
