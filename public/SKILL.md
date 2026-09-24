---
name: aassistant
description: Split shared expenses, edit bills, and export settlement plans with AAssistant.
---

# AAssistant

Reuse the task's AAssistant page; otherwise open the [official site](https://2005czq.github.io/AAssistant). Use `window.aassistant` (API version 2), not direct localStorage writes.

1. Call `await api.beginEdit()`. Success returns `{ok:true,sessionId,ledger}` with freshly loaded data and exclusive editing rights across tabs. Web input and dragging acquire locks automatically and release on blur/drop; if `EDIT_BUSY`, wait for that interaction to finish before retrying.
2. Work from that ledger, call the operations below, and inspect each response. Mutations require the same `sessionId`, omitted in the table. `ok:false` supplies an `error` to address; `ok:true` with nonempty `issues` means the change was saved but the bill is not ready to export. Continue until the user's requested result is complete.
3. Deliver `api.getText()`'s `text`, or `await api.downloadImage()` for PNG (listen for the download first). Check `ok` on exports too.
4. Release with `await api.endEdit({sessionId})`, including when stopping after an error. `EDIT_REQUIRED` means the session ended and its pending writes must stop.

`api.getLedger()` returns the current ledger directly. Reads and exports do not require an edit session. If `persisted:false`, keep the page open and export the results before leaving.

| Operation | API and arguments |
| --- | --- |
| Members | `addMember({name})`; `renameMember({name,newName})`; `removeMember({name})`; `moveMember({name,beforeName})` |
| Bills | `addBill({bill})`; `updateBill({id,changes})`; `removeBill({id})`; `moveBill({id,beforeId})` |
| Whole ledger | `renameLedger({name})`; `setLedger({name,members,bills})`; `clearLedger({})`; `loadDemo({})` |
| Preferences | `setPreferences({currentLang?,currentTheme?})`: `en`/`zh`, `light`/`dark` |

Use incremental edits for existing data. Whole-ledger replacement, clearing, and demo loading replace data and reset drafts. For moves, `beforeName:null` or `beforeId:null` appends to the end.

A bill has `payer`, `reason`, `type`, and the corresponding fields:

| Type | Fields and split |
| --- | --- |
| `AA` | `amount`; equal shares for all members |
| `Join` / `Remove` | `amount, involved`; include / exclude the selected members |
| `Ratio` | `amount, ratios: {name: weight}` |
| `Distribution` | `distribution: {name: amount}`; total is calculated |

Share maps contain every member and are replaced in full. Changing type resets selections and shares. `addBill` assigns and returns `billId`; `setLedger` needs unique positive IDs on its bills. `updateBill.changes` contains only the fields to change, without `id`. Present transfers in their returned order.
