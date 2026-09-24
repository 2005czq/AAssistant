---
name: aassistant
description: Split shared expenses, manage bills, and calculate minimal settlements with AAssistant.
---

# AAssistant

Reuse the task's AAssistant page; otherwise open the [official site](https://2005czq.github.io/AAssistant). The automation API is available at `window.aassistant`.

```javascript
const api = window.aassistant;
```

---

## Read & Export

Reads and exports do not modify data and can be called directly at any time:

```javascript
// Get snapshot of current ledger
const ledger = api.getLedger(); // { name, members, bills, issues, persisted }

// Get formatted settlement text
const report = api.getText();   // { ok: true, text, billSection, settlementSection, ... }

// Download bill PNG image
const download = await api.downloadImage(); // { ok: true, fileName: 'bill-details.png', ... }
```

## Mutating the Ledger

All mutations execute as atomic operations and return `{ ok: boolean, issues?, error? }`:
- `ok: true`: change committed and saved. If `issues` is nonempty, the ledger has incomplete items (e.g. fewer than 2 members) and cannot be exported yet.
- `ok: false`: check `error.code`. If `EDIT_BUSY`, the user is currently interacting (e.g. typing in an input, in edit mode, or dragging); wait briefly and retry.

```javascript
// Example workflow
await api.addMember({ name: 'Alice' });
await api.addMember({ name: 'Bob' });

const res = await api.addBill({
  bill: { payer: 'Alice', reason: 'Dinner', type: 'AA', amount: 100 }
});
console.log('Created bill ID:', res.billId);
```

### Available Operations

| Category | API Call and Arguments |
| :--- | :--- |
| **Members** | `api.addMember({ name })`<br>`api.renameMember({ name, newName })`<br>`api.removeMember({ name })`<br>`api.moveMember({ name, beforeName })` (set `beforeName: null` to append) |
| **Bills** | `api.addBill({ bill })` (returns `billId`; do not specify `id` in bill)<br>`api.updateBill({ id, changes })`<br>`api.removeBill({ id })`<br>`api.moveBill({ id, beforeId })` (set `beforeId: null` to append) |
| **Ledger** | `api.renameLedger({ name })`<br>`api.setLedger({ name, members, bills })`<br>`api.clearLedger()`<br>`api.loadDemo()` |
| **Preferences** | `api.setPreferences({ currentLang?: 'en'\|'zh', currentTheme?: 'light'\|'dark', animations?: boolean })`<br>`api.getPreferences()` |

---

## Bill Types and Fields

Every bill requires `payer` (existing member name), `reason` (string, max 60 ASCII chars), `type`, and corresponding fields:

| Type | Additional Fields and Rules |
| ---: | :--- |
| `AA` | `amount`: total amount split equally among all members |
| `Join` | `amount`, `involved`: split equally only among members listed in `involved` |
| `Remove` | `amount`, `involved`: split equally among all members *except* those in `involved` |
| `Ratio` | `amount`, `ratios: { [name]: weight }`: weights must include **every member** |
| `Distribution` | `distribution: { [name]: amount }`: exact amounts for **every member** (total is calculated automatically) |

- In `updateBill({ id, changes })`, pass only the fields to change. Changing `type` resets selections and shares.
- In `addBill`, omit `id` (assigned automatically). In `setLedger`, each bill must include a positive safe integer `id`.
