<script lang="ts">
  import { onMount } from 'svelte';
  import { createTextMorph } from '../lib/text-motion';
  import { REPORT_STYLE } from '../lib/report';

  export let state: 'normal' | 'settled' = 'normal';
  let visual: HTMLDivElement;
  let measure: HTMLDivElement;
  let readable = '';
  let run = 0;
  let morph: ReturnType<typeof createTextMorph>;

  onMount(() => {
    morph = createTextMorph(visual);
    return () => { run += 1; morph.destroy(); };
  });

  export function stop() { run += 1; morph?.stop(); }
  export function reserve(text: string) {
    measure.style.minHeight = '0';
    measure.textContent = text;
  }
  export async function write(text: string, holdHeight = false): Promise<boolean> {
    const ownRun = ++run;
    readable = text;
    const previousHeight = measure.getBoundingClientRect().height;
    reserve(text);
    const nextHeight = measure.getBoundingClientRect().height;
    // Reserve the old height until backspacing finishes; growth is reserved first.
    if (nextHeight < previousHeight) measure.style.minHeight = `${previousHeight}px`;
    const finished = await morph.set(text);
    if (run !== ownRun) return false;
    if (finished && !holdHeight) measure.style.minHeight = '0';
    return finished;
  }
</script>

<div class="report-text" class:settled-result={state === 'settled'}
  style:font={REPORT_STYLE.font} style:line-height={`${REPORT_STYLE.lineHeight}px`}>
  <div class="report-measure" aria-hidden="true" bind:this={measure}></div>
  <div class="report-visual" aria-hidden="true" bind:this={visual}></div>
  <span class="sr-only" aria-live="polite" aria-atomic="true">{readable}</span>
</div>
