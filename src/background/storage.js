export async function saveDocData(doctype, data = [], bucket = "General", keepOld = 0, addToTop = 0) {
    let storageObject = {};
    let storageKey = "storage__doc_data-";

    if (bucket === "General") {
        storageKey += "General";
    } else {
        storageKey += doctype;
    }

    if (keepOld) {
        let oldData = await chrome.storage.local.get(storageKey);
        oldData = oldData[storageKey] || [];

        if (addToTop) {
            oldData.unshift(...data);
        } else {
            oldData.push(...data);
        }

        // Filter duplicates by name
        oldData = oldData.filter((v, i, a) => a.findIndex(v2 => (v2.name === v.name)) === i);
        storageObject[storageKey] = oldData;
        await chrome.storage.local.set(storageObject);
    } else {
        storageObject[storageKey] = data;
        await chrome.storage.local.set(storageObject);
    }
}

export async function saveChildTableData(payload) {
    await chrome.storage.local.set({
        "storage__childtable_data": payload
    });
}

export async function saveCustomizedFields(payload) {
    await chrome.storage.local.set({
        "storage__customized_fields_data": payload
    });
}

export async function getStorageData(key) {
    const data = await chrome.storage.local.get(key);
    return data[key];
}
