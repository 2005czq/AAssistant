<script lang="ts">
  export let open = false;
  export let title = '';
  export let large = false;
  export let onClose: () => void;

  let overlay: HTMLDivElement | null = null;

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === overlay) {
      onClose();
    }
  }
</script>

<div
  class="modal-overlay"
  class:active={open}
  bind:this={overlay}
  on:click={handleOverlayClick}
  role="button"
  tabindex="0"
  aria-label="Close modal"
  on:keydown={(event) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClose();
    }
  }}
>
  <div class="modal-content" class:modal-large={large}>
    <h2 id="modal-title">{title}</h2>
    <div class="modal-body">
      <slot />
    </div>
  </div>
</div>
