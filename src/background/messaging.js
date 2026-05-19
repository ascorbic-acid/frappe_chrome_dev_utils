import { saveDocData, saveChildTableData, saveCustomizedFields, getStorageData } from './storage.js';
import { idfExec, formTrigger, listviewSetup } from './utils.js';
import { EVENTS } from '../shared/events.js';

export async function handleMessage(event, sender) {
    const tabId = sender.tab.id;

    switch (event.eventName) {
        case EVENTS.BG_FORM_TRIGGER:
            formTrigger(tabId, ...event.payload);
            break;
        case EVENTS.BG_LISTVIEW_SETUP:
            listviewSetup(tabId);
            break;
        case EVENTS.BG_SHOW_OPTIONS_DIALOG:
            await injectUIDialogs(tabId);
            idfExec((args) => window.idfShowOptionsDialogPage(args), event.payload, tabId);
            break;
        case EVENTS.BG_SAVE_DATA:
            saveDocData(
                event.payload.doctype,
                event.payload.data,
                event.payload.bucket,
                event.payload.keepOld,
                event.payload.addToTop
            );
            break;
        case EVENTS.BG_LISTVIEW_SHOW_INSERT_DIALOG:
            await showInsertDocDataDialogHandler(event.payload.doctype, event.payload.bucket, tabId);
            break;
        case EVENTS.BG_LISTVIEW_SHOW_CSV_DIALOG:
            await injectUIDialogs(tabId);
            idfExec((args) => window.idfShowCSVToolDialog(args), event.payload, tabId);
            break;
        case EVENTS.BG_CSV_TOOL_BULK_UPDATE:
            await injectUIDialogs(tabId);
            idfExec((args) => window.idfHandleCSVToolBulkUpdate(args), event.payload, tabId);
            break;
        case EVENTS.BG_CHILDTABLE_SAVE:
            saveChildTableData(event.payload);
            break;
        case EVENTS.BG_CHILDTABLE_INSERT:
            await insertChildtableDataHandler(event.payload, tabId);
            break;
        case EVENTS.BG_CUSTOMIZED_FIELDS_SAVE:
            saveCustomizedFields(event.payload);
            break;
        case EVENTS.BG_CUSTOMIZED_FIELDS_INSERT:
            await insertCustomizedFieldsHandler(tabId);
            break;
    }
}

async function injectUIDialogs(tabId) {
    await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['src/inject/ui-dialogs.js'],
        world: "MAIN"
    });
}

async function showInsertDocDataDialogHandler(doctype, bucket = "Current Doc", tabId) {
    let storageKey = "storage__doc_data-";
    if (bucket === "General") {
        storageKey += "General";
    } else {
        storageKey += doctype;
    }

    const data = await getStorageData(storageKey);
    const args = { data: data || [], bucket };

    await injectUIDialogs(tabId);
    idfExec((args) => window.idfShowInsertDocDataDialog(args), args, tabId);
}

async function insertChildtableDataHandler(fieldname, tabId) {
    const childData = await getStorageData('storage__childtable_data');
    const args = { fieldname, childData: childData || [] };

    await injectUIDialogs(tabId);
    idfExec((args) => window.idfInsertChildtableData(args), args, tabId);
}

async function insertCustomizedFieldsHandler(tabId) {
    const savedData = await getStorageData('storage__customized_fields_data');
    const args = { savedData: savedData || [] };

    await injectUIDialogs(tabId);
    idfExec((args) => window.idfInsertCustomizedFields(args), args, tabId);
}
