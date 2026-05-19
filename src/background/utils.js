export async function idfExec(handler, args, tabId) {
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

export function formTrigger(tabId, eventName, doctype, docname) {
    // This assumes formEvent is available in the page context (injected via form.js)
    idfExec(({ eventName, doctype, docname }) => {
        if (typeof formEvent === 'function') {
            formEvent(null, eventName, doctype, docname);
        }
    }, { eventName, doctype, docname }, tabId);
}

export function listviewSetup(tabId) {
    // This assumes ListviewSetup is available in the page context (injected via listview.js)
    idfExec(() => {
        if (typeof ListviewSetup === 'function') {
            ListviewSetup();
        }
    }, {}, tabId);
}
