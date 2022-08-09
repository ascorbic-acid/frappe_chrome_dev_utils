function idfListviewRefresh(tabId) {    
    idfExec((args)=>{
        if(cur_list)   { 
            // add bulk edit to list views
            cur_list.page.clear_custom_actions();
            let idf_group = cur_list.page.add_custom_button_group("IDF")
    
            // Bulk Fields Edit
            cur_list.page.add_custom_menu_item(idf_group, "Bulk Edit", ()=>{
                let checked = cur_list.get_checked_items();
    
                if (checked.length == 0) {
                    frappe.show_alert("IDF: Please Select at least one row", 5);
                    return undefined;
                }
                let dialog_fields = []
    
                // for (let i = 0; i < 38; i++) {
                for (let i = 0; i < cur_list.meta.fields.length; i++) {
    
                    let field = cur_list.meta.fields[i];
                    if(field.fieldtype==="Table") continue;
    
                    dialog_fields.push({
                        label: field.label,
                        fieldname: field.fieldname,
                        fieldtype: field.fieldtype,
                        reqd: field.reqd,
                        options: field.options
                    })
                }
    
                let d = new frappe.ui.Dialog({
                    title: `IDF: Bulk Edit for ${checked.length} Row(s).`,
                    fields: dialog_fields,
                    primary_action_label: "Submit",
                    primary_action: function(values) {
                        for (let i = checked.length - 1; i >= 0; i--) {    
                            frappe.call({
                                method: "frappe.client.set_value",
                                args: {
                                    doctype: cur_list.doctype,
                                    name: checked[i].name,
                                    fieldname: values
                                },
                                callback: function(r) {
                                    console.log(r.message)
                                }
                            })
                        }
    
                        d.hide()
    
                    }
                })
                d.show()
            }
            );
        }
    
    
    }
    , {}, tabId);
}