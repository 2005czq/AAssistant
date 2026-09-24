<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import { presence } from '../lib/motion';
  import { editLock } from '../lib/edit';

  type Option = string | { value: string; label: string };

  export let options: Option[] = [];
  export let value = '';
  export let placeholder = '--';
  export let label = '';

  const dispatch = createEventDispatcher<{ change: string }>();
  let open = false;
  let wrapper: HTMLDivElement;
  let trigger: HTMLButtonElement;
  let menu: HTMLDivElement;
  let search = '';
  let searchTimer: ReturnType<typeof setTimeout>;
  $: if (open) void tick().then(positionMenu);

  function positionMenu() {
    if (!open || !menu) return;
    const bounds = wrapper.getBoundingClientRect();
    const below = window.innerHeight - bounds.bottom - 16;
    const above = bounds.top - 16;
    const useAbove = below < Math.min(180, menu.scrollHeight) && above > below;
    menu.dataset.above = String(useAbove);
    menu.style.setProperty('--menu-height', `${Math.max(60, Math.min(240, useAbove ? above : below))}px`);
    const shift = Math.min(0, window.innerWidth - 16 - bounds.left - menu.offsetWidth);
    menu.style.setProperty('--menu-left', `${Math.max(16 - bounds.left, shift)}px`);
  }

  $: items = options.map((option) => typeof option === 'string' ? { value: option, label: option } : option);
  $: displayText = items.find((option) => option.value === value)?.label ?? (value || placeholder);

  function select(nextValue: string) {
    dispatch('change', nextValue);
    open = false;
    trigger.focus();
  }

  function toggleOpen() {
    if (!open) window.dispatchEvent(new CustomEvent('custom-dropdown-open', { detail: wrapper }));
    open = !open;
  }

  async function handleKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      open = false;
      trigger.focus();
      return;
    }
    if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      search += event.key.toLocaleLowerCase();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { search = ''; }, 500);
      if (!open) toggleOpen();
      await tick();
      const index = items.findIndex((option) => option.label.toLocaleLowerCase().startsWith(search));
      menu.querySelectorAll<HTMLButtonElement>('button')[index]?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (!open) toggleOpen();
    await tick();
    const buttons = Array.from(wrapper.querySelectorAll<HTMLButtonElement>('.custom-dropdown-option'));
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : event.key === 'ArrowDown' ? (current + 1) % buttons.length
      : (current <= 0 ? buttons.length : current) - 1;
    buttons[next]?.focus();
  }

  function handleFocusOut(event: FocusEvent) {
    if (!(event.relatedTarget instanceof Node) || !wrapper.contains(event.relatedTarget)) open = false;
  }

  onMount(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !wrapper.contains(event.target)) open = false;
    };
    const handleDropdownOpen = (event: Event) => {
      if ((event as CustomEvent).detail !== wrapper) open = false;
    };
    document.addEventListener('click', handleClick);
    window.addEventListener('resize', positionMenu);
    window.addEventListener('custom-dropdown-open', handleDropdownOpen);
    return () => {
      clearTimeout(searchTimer);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('custom-dropdown-open', handleDropdownOpen);
    };
  });
</script>

<div class="custom-dropdown" bind:this={wrapper} class:open use:editLock on:focusout={handleFocusOut}>
  <button
    type="button"
    class="custom-dropdown-trigger"
    bind:this={trigger}
    aria-label={label ? `${label}: ${displayText}` : displayText}
    aria-haspopup="listbox"
    aria-expanded={open}
    on:click={toggleOpen}
    on:keydown={handleKey}
  >
    <span class="dropdown-text">{displayText}</span>
    <ChevronDown class="custom-dropdown-arrow" size={16} aria-hidden="true" />
  </button>
    <div class="custom-dropdown-menu" bind:this={menu} use:presence={open} role="listbox" aria-label={label}>
      {#each items as option, index (option.value)}
        <button type="button" class="custom-dropdown-option" class:selected={option.value === value}
          role="option" aria-selected={option.value === value} tabindex={option.value === value || (!value && index === 0) ? 0 : -1}
          on:click={() => select(option.value)} on:keydown={handleKey}>
          {option.label}
        </button>
      {/each}
    </div>
</div>
