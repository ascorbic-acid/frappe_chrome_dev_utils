import { handleMessage } from './messaging.js';
import { idfExec } from './utils.js';
import { EVENTS } from '../shared/events.js';

// Setup tab update listener for script injection
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete' && tab.active && tab.url && tab.url.includes('/app/')) {
        const args = {
            idfLogoUrl1: `<img src="${chrome.runtime.getURL("/logo/logo.png")}" style="width: 20px; margin-left: -5px; margin-right: -5px; margin-top: -5px" />`,
            idfLogoUrl2: `<img src="${chrome.runtime.getURL("/logo/logo.png")}" style="width: 18px;" />`,
            EVENTS: EVENTS
        };

        // Inject dependency scripts
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['src/inject/form.js', 'src/inject/listview.js'],
            world: "MAIN"
        }).then(() => {
            // Initialize Frappe hooks
            idfExec((args) => {
                if (!window["idfState"]) {
                    window["idfState"] = {
                        pageInit: false,
                        idfLogoUrl1: args.idfLogoUrl1,
                        idfLogoUrl2: args.idfLogoUrl2,
                        EVENTS: args.EVENTS
                    };
                }

                if (!frappe.ui.form.ScriptManager) return;

                if (!window.idfState.pageInit) {
                    window.idfState.pageInit = true;

                    // Hooking frappe script manager
                    let oriTrigger = frappe.ui.form.ScriptManager.prototype.trigger;
                    frappe.ui.form.ScriptManager.prototype.trigger = function (...args) {
                        setTimeout(() => {
                            postMessage({ eventName: window.idfState.EVENTS.CS_FORM_TRIGGER, payload: args });
                        }, 100);
                        return oriTrigger.call(this, ...args);
                    };

                    // Hooking frappe setup_view
                    let oriViewSetup = frappe.views.ListView.prototype.setup_view;
                    frappe.views.ListView.prototype.setup_view = function (...args) {
                        setTimeout(() => {
                            postMessage({ eventName: window.idfState.EVENTS.CS_LISTVIEW_SETUP, payload: args });
                        }, 500);
                        return oriViewSetup.call(this, ...args);
                    };
                }
            }, args, tabId);
        });
    }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((event, sender, sendResponse) => {
    handleMessage(event, sender).then(sendResponse);
    return true; // Keep message channel open for async response
});
