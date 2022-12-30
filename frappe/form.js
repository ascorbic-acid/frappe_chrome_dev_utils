function formRefresh(tabId, eventName, doctype, name) {
    idfExec(({ eventName, doctype, name }) => {
        let frm = cur_frm;
        
        // add force save button
        if(!frm.is_dirty() && (frm.doc.docstatus === 0 || frm.doc.docstatus === 1)) {
            // temp fix to avoid duplicate buttons
            if(document.querySelector(".idf__force-save-btn")) {
                document.querySelector(".idf__force-save-btn").remove();
            }
            frm.page.add_button(frm.doc.docstatus === 0 ? "Force Save" : "Force Submit", function () {
                frm.dirty();
                frm.save_or_update();
            }, {btn_class: "btn-warning idf__force-save-btn"});
        }
        
        if (frm["idf_inited"]) {
            return;
        } else {
            frm["idf_inited"] = true;
        }
        
        // patch fields
        for (let i = 0; i < frm.fields.length; i++) {
            let field = frm.fields[i];
            if (!field.wrapper.querySelector)
                continue;

            if (field.df.fieldname == "__newname")
                continue;

            let opsDiv = document.createElement("div");
            opsDiv.style.display = "inline-block"
            opsDiv.style.cursor = "pointer";
            opsDiv.style.marginRight = "10px";
            opsDiv.style.marginLeft = "10px";

            opsDiv.innerHTML = `
                <svg class="icon icon-sm" style="fill: aliceblue"><use href="#icon-tool"></use></svg>
            `;
            opsDiv.addEventListener("click", function (e) {
                postMessage({
                    eventName: "idf_cs_request__show_options_dialog",
                    payload: field.df.fieldname
                });
            });

            if (field.wrapper.firstElementChild) {
                // checkbox fields
                if (field.wrapper.firstElementChild.classList.contains("checkbox")) {
                    const label = field.wrapper.firstElementChild.querySelector("label")
                    label.appendChild(opsDiv);
                    // standard fields
                } else if (field.wrapper.firstElementChild.classList.contains("form-group")) {
                    const label = field.wrapper.firstElementChild.querySelector(".form-group > .clearfix")
                    label.appendChild(opsDiv);
                    // table field
                } else if (field.wrapper.firstElementChild.classList.contains("control-label")) {
                    const label = field.wrapper.firstElementChild;
                    label.appendChild(opsDiv);
                    // table field v14
                } else if (field.wrapper.firstElementChild.classList.contains("grid-field")) {
                    const label = field.wrapper.firstElementChild;
                    label.prepend(opsDiv);
                }
            }

            if (!field.df.is_custom_field)
                field.df.is_custom_field = "0";
            if (!field.df.hidden)
                field.df.hidden = "0";

            if (location.pathname.includes("/app/customize-form"))
                field.df.old_hidden = field.df.hidden;

            // show all hidden fields & highlight custom fields
            if (field.df.hidden === 1) {
                //save old hidden value
                field.df.old_hidden = 1;
                field.df.hidden = 0;

                let control_label = field.wrapper.querySelector(".control-label");
                if (field.df.is_custom_field === 1) {
                    field.df.label += "  (HIDDEN)";
                    field.wrapper.style.color = "darksalmon";
                    if (control_label) {
                        control_label.style.color = "darksalmon";
                    }
                } else {
                    field.df.label += "  (HIDDEN)";
                    field.wrapper.style.color = "brown";
                    if (control_label) {
                        control_label.style.color = "brown";
                    }
                }
            }
        }
        frm.refresh_fields();
    }
        , { eventName, doctype, name }, tabId);
}

function idfShowOptionsDialog(args, tabId) {
    idfExec((args) => {
        let fieldData = cur_frm.get_field(args.fieldname);
        // prepare field info
        if (!fieldData.df.options) {
            fieldData.df.options = "";
        }

        let openDocButtonsHTML = "";

        if (["Link", "Table", "Table MultiSelect"].includes(fieldData.df.fieldtype)) {
            openDocButtonsHTML = `
                <button
                    class="btn btn-sm btn-options" 
                    onclick="event.stopPropagation(); frappe.set_route('Form', 'Customize Form', { doc_type: '${fieldData.df.options}'})"
                >C</button>
                <button
                    class="btn btn-sm btn-options" 
                    onclick="event.stopPropagation(); frappe.set_route('doctype/${fieldData.df.options}')"
                >D</button>
            `;
        }

        var dialog = new frappe.ui.Dialog({
            title: `IDF: Field Info`,
            fields: [{
                label: `Details:`,
                fieldname: "tables_options_section",
                fieldtype: "Section Break"
            }, {
                label: `Details:`,
                fieldname: "field_details_html",
                fieldtype: "HTML",
                options: ` <div style="display: grid; grid-template-columns: auto auto">

                            <div><p onclick="frappe.utils.copy_to_clipboard('${fieldData.df.fieldname}');cur_dialog.hide();" style="cursor: pointer;">Name: <strong>${fieldData.df.fieldname} </strong> </p></div>
                            <div><p>Field No.: <strong>${fieldData.df.idx}</strong> </p></div>
                            
                            <div><p>Type: <strong>${fieldData.df.fieldtype}</strong></p></div>
                            <div><p>In ListView: <strong>${fieldData.df.in_list_view}</strong> </p></div>
                            
                            <div>
                                <p
                                    onclick="frappe.utils.copy_to_clipboard('${fieldData.df.options.replace(/\s/g, " ")}');cur_dialog.hide();"
                                    style="cursor: pointer;">
                                        Options: <strong>${fieldData.df.options} </strong>
                                        ${openDocButtonsHTML}
                                <p>
                            </div>
                            <div><p>Is Custom: <strong>${fieldData.df.is_custom_field}</strong> </p></div>
                        </div>
                        <style>
                            .btn-options {
                                height: 20px;
                                padding-top: 0px;
                                padding-right: 0px;
                                width: 18px;
                                padding-bottom: 0px;
                                padding-left: 0px;
                            }
                        </style>
                    `
            }, {
                fieldtype: "Section Break"
            }, {
                label: "Extra Actions:",
                fieldname: "field_options_section",
                fieldtype: "Section Break"
            },
            {
                label: 'Copy Table Data',
                fieldname: 'copy_table_data',
                fieldtype: 'Button',
                click: (val) => {
                    if (fieldData.df.fieldtype == "Table") {
                        let table;
                        if (dialog.get_value("only_selected_rows")) {
                            table = fieldData.grid.get_selected_children()
                        } else {
                            table = cur_frm.doc[fieldData.df.fieldname];
                        }
                        postMessage({
                            eventName: "idf_cs_request__childtable_save",
                            payload: table
                        });

                        frappe.show_alert(`IDF: Date of table: (${fieldData.df.fieldname}) saved to browser storage`, 8);
                        cur_dialog.hide();
                    } else {
                        frappe.show_alert(`IDF: Field: (${fieldData.df.fieldname}) is not a table`, 8);
                    }
                }
            },
            {
                label: 'Only Selected Rows',
                fieldname: 'only_selected_rows',
                fieldtype: 'Check',
                description: 'if not checked copy all rows'
            }
                , {
                fieldtype: "Column Break"
            }, {
                label: 'Insert Saved Table Data',
                fieldname: 'copy_table_data',
                fieldtype: 'Button',
                click: (val) => {
                    if (fieldData.df.fieldtype == "Table") {
                        postMessage({
                            eventName: "idf_cs_request__childtable_insert",
                            payload: fieldData.df.fieldname
                        });

                        frappe.show_alert(`IDF: Data of table: (${fieldData.df.fieldname}) has been inserted`, 8);
                        cur_dialog.hide();
                    } else {
                        frappe.show_alert(`IDF: Field: (${fieldData.df.fieldname}) is not a table`, 8);
                    }
                }
            }, // Customize Form
            {
                fieldtype: "Section Break"
            }, {
                label: 'Copy Customized Fields',
                fieldname: 'copy_customized_fields',
                fieldtype: 'Button',
                click: (val) => {
                    if (fieldData.df.parent == "Customize Form" && fieldData.df.fieldname == "fields") {
                        let fields = cur_frm.doc.fields;
                        let customFields = [];

                        for (let i = 0; i < fields.length; i++) {
                            if (fields[i].is_custom_field === 1) {
                                fields[i].insert_after_fieldname = fields[i === 0 ? 0 : (i - 1)].fieldname;
                                customFields.push(fields[i]);
                            }
                        }
                        postMessage({
                            eventName: "idf_cs_request__customized_fields_save",
                            payload: customFields
                        });

                        frappe.show_alert(`IDF: Customized Fields saved to browser storage`, 8);
                        cur_dialog.hide();
                    } else {
                        frappe.show_alert(`IDF: Only works on (fields) table in Customize Form doctype.`, 8);
                    }
                }
            }, {
                fieldtype: "Column Break"
            }, {
                label: 'Insert Saved Customized Fields',
                fieldname: 'inser_customized_fields',
                fieldtype: 'Button',
                click: (val) => {
                    if (fieldData.df.parent == "Customize Form" && fieldData.df.fieldname == "fields") {
                        postMessage({
                            eventName: "idf_cs_request__customized_fields_insert"
                        });

                        frappe.show_alert(`IDF: Customized Fields has been inserted`, 8);
                        cur_dialog.hide();
                    } else {
                        frappe.show_alert(`IDF: Only works on (fields) table in Customize Form doctype.`, 8);
                    }
                }
            }, {
                fieldtype: "Section Break"
            },],
            primary_action_label: 'Done',
            primary_action(values) {
                cur_dialog.hide();
            }
        });
        dialog.show();
    }
        , args, tabId);
}
