<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  type Option = string | { value: string; label: string };

  export let options: Option[] = [];
  export let value = '';
  export let skipEmpty = false;
  export let placeholder = '--';

  const dispatch = createEventDispatcher<{ change: string }>();
  let open = false;
  let wrapper: HTMLDivElement | null = null;

  const isObjectOptions = () => options.length > 0 && typeof options[0] === 'object';

  const getLabel = (opt: Option): string => {
    if (typeof opt === 'string') return opt;
    return opt.label;
  };

  const getValue = (opt: Option): string => {
    if (typeof opt === 'string') return opt;
    return opt.value;
  };

  const getDisplayText = (): string => {
    if (!value) return placeholder;
    const found = options.find((opt) => getValue(opt) === value);
    return found ? getLabel(found) : value;
  };

  function handleSelect(nextValue: string) {
    value = nextValue;
    dispatch('change', value);
    open = false;
  }

  function toggleOpen(event: Event) {
    event.stopPropagation();
    if (!open && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('custom-dropdown-open', { detail: wrapper }));
    }
    open = !open;
  }

  function handleTriggerKey(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleOpen(event);
    }
  }

  function handleOptionKey(event: KeyboardEvent, nextValue: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(nextValue);
    }
  }

  onMount(() => {
    const handleClick = (event: MouseEvent) => {
      if (!wrapper) return;
      if (event.target instanceof Node && !wrapper.contains(event.target)) {
        open = false;
      }
    };

    const handleDropdownOpen = (event: Event) => {
      const customEvent = event as CustomEvent<HTMLDivElement | null>;
      if (customEvent.detail !== wrapper) {
        open = false;
      }
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('custom-dropdown-open', handleDropdownOpen);
    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('custom-dropdown-open', handleDropdownOpen);
    };
  });
</script>

<div class="custom-dropdown" bind:this={wrapper} class:open={open}>
  <div
    class="custom-dropdown-trigger"
    role="button"
    tabindex="0"
    on:click={toggleOpen}
    on:keydown={handleTriggerKey}
  >
    <span class="dropdown-text">{getDisplayText()}</span>
    <span class="custom-dropdown-arrow">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" />
      </svg>
    </span>
  </div>
  <div class="custom-dropdown-menu">
    {#if !skipEmpty}
      <div
        class="custom-dropdown-option"
        class:selected={!value}
        role="button"
        tabindex="0"
        on:click|stopPropagation={() => handleSelect('')}
        on:keydown|stopPropagation={(event) => handleOptionKey(event, '')}
      >
        {placeholder}
      </div>
    {/if}

    {#each options as opt}
      {#if isObjectOptions()}
        <div
          class="custom-dropdown-option"
          class:selected={getValue(opt) === value}
          role="button"
          tabindex="0"
          on:click|stopPropagation={() => handleSelect(getValue(opt))}
          on:keydown|stopPropagation={(event) => handleOptionKey(event, getValue(opt))}
        >
          {getLabel(opt)}
        </div>
      {:else}
        <div
          class="custom-dropdown-option"
          class:selected={getValue(opt) === value}
          role="button"
          tabindex="0"
          on:click|stopPropagation={() => handleSelect(getValue(opt))}
          on:keydown|stopPropagation={(event) => handleOptionKey(event, getValue(opt))}
        >
          {getLabel(opt)}
        </div>
      {/if}
    {/each}
  </div>
</div>
