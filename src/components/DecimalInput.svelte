<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { MAX_BILL_VALUE } from '../lib/constants';
  import { isBillValue } from '../lib/calculations';
  import { editLock } from '../lib/edit';

  type $$Props = Omit<HTMLInputAttributes, 'value' | 'max'> & { value?: number | ''; max?: number };

  export let value: number | '' = 0;
  export let max = MAX_BILL_VALUE;

  const dispatch = createEventDispatcher<{ input: number }>();
  let text = String(value);
  let previousValue: number | '' = value;
  let focused = false;
  let selection: [number, number] = [0, 0];

  // Preserve partial text only while editing; the ledger and external updates use numbers.
  $: if (value !== previousValue) {
    if (!focused || value === '' || value !== numericValue(text)) text = String(value);
    previousValue = value;
  }

  function numericValue(text: string): number {
    return text === '.' ? 0 : Number(text);
  }

  function accepts(text: string): boolean {
    const number = numericValue(text);
    return /^\d*(?:\.\d{0,2})?$/.test(text) && isBillValue(number) && number <= max;
  }

  function beforeInput(event: InputEvent) {
    const input = event.currentTarget as HTMLInputElement;
    selection = [input.selectionStart ?? 0, input.selectionEnd ?? 0];
    if (event.isComposing || event.data === null || event.inputType !== 'insertText') return;
    const next = input.value.slice(0, selection[0]) + event.data + input.value.slice(selection[1]);
    if (!accepts(next)) event.preventDefault();
  }

  function handleInput(event: Event) {
    if ((event as InputEvent).isComposing) return;
    const input = event.currentTarget as HTMLInputElement;
    // Paste, drop, undo and IME commits also pass through this check.
    if (!accepts(input.value)) {
      input.value = text;
      input.setSelectionRange(...selection);
      return;
    }
    text = input.value;
    dispatch('input', numericValue(text));
  }

  function handleBlur(event: FocusEvent) {
    focused = false;
    const number = numericValue(text);
    text = String(number);
    (event.currentTarget as HTMLInputElement).value = text;
    if (value !== number) dispatch('input', number);
  }
</script>

<input {...$$restProps} type="text" inputmode="decimal" size={10} value={text} use:editLock
  on:beforeinput={beforeInput} on:input={handleInput} on:compositionend={handleInput}
  on:focus={() => (focused = true)} on:blur={handleBlur} />
