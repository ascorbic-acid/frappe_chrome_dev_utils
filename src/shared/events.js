export const EVENTS = {
    // Content Script -> Background
    CS_FORM_TRIGGER: "idf_cs_request__form_trigger",
    CS_LISTVIEW_SETUP: "idf_cs_request__listview_setup",
    CS_SHOW_OPTIONS_DIALOG: "idf_cs_request__show_options_dialog",
    CS_SAVE_DATA: "idf_cs_request__save-data",
    CS_LISTVIEW_SHOW_INSERT_DIALOG: "idf_cs_request__listview_show-insert-doc-data-dialog",
    CS_LISTVIEW_SHOW_CSV_DIALOG: "idf_cs_request__listview_show-csv-tool-dialog",
    CS_CSV_TOOL_READ_FILE: "idf_cs_request__csv-tool-read_file",
    CS_CHILDTABLE_SAVE: "idf_cs_request__childtable_save",
    CS_CHILDTABLE_INSERT: "idf_cs_request__childtable_insert",
    CS_CUSTOMIZED_FIELDS_SAVE: "idf_cs_request__customized_fields_save",
    CS_CUSTOMIZED_FIELDS_INSERT: "idf_cs_request__customized_fields_insert",

    // Background -> Internal Logic (used in messaging.js)
    BG_FORM_TRIGGER: "idf_bg_request__form_trigger",
    BG_LISTVIEW_SETUP: "idf_bg_request__listview_setup",
    BG_SHOW_OPTIONS_DIALOG: "idf_bg_request__show_options_dialog",
    BG_SAVE_DATA: "idf_bg_request__save-data",
    BG_LISTVIEW_SHOW_INSERT_DIALOG: "idf_bg_request__listview_show-insert-doc-data-dialog",
    BG_LISTVIEW_SHOW_CSV_DIALOG: "idf_bg_request__listview_show-csv-tool-dialog",
    BG_CSV_TOOL_BULK_UPDATE: "idf_bg_request__csv-tool-bulk_update",
    BG_CHILDTABLE_SAVE: "idf_bg_request__childtable_save",
    BG_CHILDTABLE_INSERT: "idf_bg_request__childtable_insert",
    BG_CUSTOMIZED_FIELDS_SAVE: "idf_bg_request__customized_fields_save",
    BG_CUSTOMIZED_FIELDS_INSERT: "idf_bg_request__customized_fields_insert",
};
