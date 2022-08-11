function idfFormRefresh(tabId) {
    idfExec((args)=>{
        let[route_type,doctype,docname] = frappe.router.current_route;
        let routeID = `${route_type}/${doctype}/${docname}`;

        if (cur_frm) {
            if (idfConfig.inited_routes.find(el=>el === routeID)) {
                console.log('inited return');
                return
            }
            console.log('not inited, init');

            idfConfig.inited_routes.push(`${route_type}/${doctype}/${docname}`);

            // patch save button to force save if the form did not change
            var origina_save_func = frappe.ui.form.save

            frappe.ui.form.save = function(frm, action, callback, btn) {
                frm.dirty();
                origina_save_func.apply(this, [frm, action, callback, btn]);
            }

            // patch fields
            for (let i = 0; i < cur_frm.fields.length; i++) {
                let field = cur_frm.fields[i];
                if (!field.wrapper.querySelector)
                    continue;

                // init tooltip for each field
                $(field.wrapper).tooltip({
                    animation: true,
                    title: field.df.fieldname + "  (Ctrl+X)"
                });

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
            cur_frm.refresh_fields();

            // register keyboard event Ctrl+X
            if (!idfConfig.ctrl_x) {
                idfConfig.ctrl_x = true;
                $(document).keydown(function(e) {
                    if (e.ctrlKey && e.keyCode == 88) {
                        let targetField = document.querySelectorAll("div.frappe-control[aria-describedby]");
                        let fieldname = targetField[0].getAttribute("data-fieldname");
                        postMessage({
                            eventName: "idf_cs_request__show_options_dialog",
                            payload: fieldname
                        });
                    }
                    ;
                });
            }

        }

    }
    , {}, tabId);
}

function idfShowOptionsDialog(args, tabId) {
    idfExec((args)=>{
        const fieldData = cur_frm.get_field(args.fieldname);
        // prepare field info
        if (!fieldData.df.options)
            fieldData.df.options = "";

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
                            <div><p>Is Custom: <strong>${fieldData.df.is_custom_field}</strong> </p></div>

                            <div><p>Type: <strong>${fieldData.df.fieldtype}</strong></p></div>
                            <div><p>Hidden: <strong>${fieldData.df.hidden}</strong> </p></div>

                            <div><p onclick="frappe.utils.copy_to_clipboard('${fieldData.df.options}');cur_dialog.hide();" style="cursor: pointer;">Options: <strong>${fieldData.df.options} </strong> <p></div>
                            <div><p>In ListView: <strong>${fieldData.df.in_list_view}</strong> </p></div>
                        </div>
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
                click: (val)=>{
                    if (fieldData.df.fieldtype == "Table") {
                        postMessage({
                            eventName: "idf_cs_request__childtable_save",
                            payload: cur_frm.doc[fieldData.df.fieldname]
                        });

                        frappe.show_alert(`IDF: Date of table: (${fieldData.df.fieldname}) saved to browser storage`, 8);
                        cur_dialog.hide();
                    } else {
                        frappe.show_alert(`IDF: Field: (${fieldData.df.fieldname}) is not a table`, 8);
                    }
                }
            }, {
                fieldtype: "Column Break"
            }, {
                label: 'Insert Saved Table Data',
                fieldname: 'copy_table_data',
                fieldtype: 'Button',
                click: (val)=>{
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
                click: (val)=>{
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
            }, ],
            primary_action_label: 'Done',
            primary_action(values) {
                cur_dialog.hide();
            }
        });
        dialog.show();

    }
    , args, tabId);
}
