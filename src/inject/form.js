
window.formGridRender = function(doctype, docname) {
    let frm = cur_frm;
    let parentField = frappe.meta.get_parentfield(frm.doctype, doctype);
    let openFormGrid = frm.fields_dict[parentField].grid.open_grid_row;

    for (let k in openFormGrid.fields_dict) {
        let field = openFormGrid.fields_dict[k];
        if (["Column Break", "Section Break", "Tab Break"].includes(field.df.fieldtype)) continue;

        let opsDiv = document.createElement("div");
        opsDiv.classList.add("idf-child-control");
        opsDiv.style.display = "inline-block";
        opsDiv.style.cursor = "pointer";
        opsDiv.style.marginRight = "3px";
        opsDiv.style.marginLeft = "3px";
        opsDiv.innerHTML = window.idfState.idfLogoUrl2;

        opsDiv.addEventListener("click", function (event) {
            event.stopPropagation();
            postMessage({
                eventName: window.idfState.EVENTS.CS_SHOW_OPTIONS_DIALOG,
                payload: { doctype: doctype, fieldname: field.df.fieldname }
            });
        });

        if (field.wrapper.firstElementChild) {
            if (field.wrapper.firstElementChild.classList.contains("checkbox")) {
                const label = field.wrapper.firstElementChild.querySelector("label");
                label.appendChild(opsDiv);
            } else if (field.wrapper.firstElementChild.classList.contains("form-group")) {
                const label = field.wrapper.firstElementChild.querySelector(".form-group > .clearfix");
                label.appendChild(opsDiv);
            }
        }
    }
};

window.formRefresh = function(doctype, name) {
    let frm = cur_frm;

    // Add force save button
    if (!frm.is_dirty() && (frm.doc.docstatus === 0 || frm.doc.docstatus === 1)) {
        if (document.querySelector(".idf__force-save-btn")) {
            document.querySelector(".idf__force-save-btn").remove();
        }
        frm.page.add_button(frm.doc.docstatus === 0 ? "Force Save" : "Force Submit", function () {
            frm.dirty();
            frm.save_or_update();
        }, { btn_class: "btn-warning idf__force-save-btn" });
    }

    if (frm["idf_inited"]) return;
    frm["idf_inited"] = true;

    // Patch fields
    for (let i = 0; i < frm.fields.length; i++) {
        let field = frm.fields[i];
        if (!field.wrapper.querySelector) continue;

        let opsDiv = document.createElement("div");
        opsDiv.style.display = "inline-block";
        opsDiv.style.cursor = "pointer";
        opsDiv.style.marginRight = "3px";
        opsDiv.style.marginLeft = "3px";
        opsDiv.innerHTML = window.idfState.idfLogoUrl2;

        opsDiv.addEventListener("click", function (event) {
            postMessage({
                eventName: window.idfState.EVENTS.CS_SHOW_OPTIONS_DIALOG,
                payload: { doctype: frm.doctype, fieldname: field.df.fieldname }
            });
        });

        if (field.wrapper.firstElementChild) {
            if (field.wrapper.firstElementChild.classList.contains("checkbox")) {
                field.wrapper.firstElementChild.querySelector("label").appendChild(opsDiv);
            } else if (field.wrapper.firstElementChild.classList.contains("form-group")) {
                field.wrapper.firstElementChild.querySelector(".form-group > .clearfix").appendChild(opsDiv);
            } else if (field.wrapper.firstElementChild.classList.contains("control-label")) {
                field.wrapper.firstElementChild.appendChild(opsDiv);
            } else if (field.wrapper.firstElementChild.classList.contains("grid-field")) {
                field.wrapper.firstElementChild.prepend(opsDiv);
            }
        }

        if (!field.df.is_custom_field) field.df.is_custom_field = "0";
        if (!field.df.hidden) field.df.hidden = "0";

        if (location.pathname.includes("/app/customize-form"))
            field.df.old_hidden = field.df.hidden;

        // Show all hidden fields & highlight custom fields
        if (field.df.hidden === 1) {
            field.df.old_hidden = 1;
            field.df.hidden = 0;
            let control_label = field.wrapper.querySelector(".control-label");
            field.df.label += "  (HIDDEN)";
            let color = field.df.is_custom_field === 1 ? "darksalmon" : "brown";
            field.wrapper.style.color = color;
            if (control_label) control_label.style.color = color;
        }
    }
    frm.refresh_fields();
};

window.formEvent = function(tabId, eventName, doctype, docname) {
    if (eventName === "refresh") {
        window.formRefresh(doctype, docname);
    } else if (eventName == "form_render") {
        window.formGridRender(doctype, docname);
    }
};
