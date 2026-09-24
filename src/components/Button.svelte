<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import LoaderCircle from 'lucide-svelte/icons/loader-circle';

  type Variant = 'default' | 'success' | 'danger';
  type $$Props = HTMLButtonAttributes & { loading?: boolean; variant?: Variant };
  export let type: HTMLButtonAttributes['type'] = 'button';
  export let disabled: HTMLButtonAttributes['disabled'] = false;
  export let loading = false;
  export let variant: Variant = 'default';
  let className: HTMLButtonAttributes['class'] = '';
  export { className as class };
</script>

<button {...$$restProps} {type} disabled={disabled || loading} aria-busy={loading || $$restProps['aria-busy']}
  class={className} class:button-loading={loading}
  class:button-success={variant === 'success'} class:button-danger={variant === 'danger'}
  on:click>
  {#if loading}<LoaderCircle class="button-spinner" size={18} aria-hidden="true" />{/if}
  <slot />
</button>

<style>
  .button-success {
    color: var(--success-color);
    border-color: var(--success-color);
  }

  .button-danger {
    color: var(--danger-color);
    border-color: var(--danger-color);
  }

  button:disabled {
    color: var(--muted-color);
    border-color: var(--line-color);
  }
</style>
