<script lang="ts">
  import { autoHeight } from '../lib/motion';
  import { createPaperShape } from '../lib/paper';
  export let label: string;
  const clipPath = createPaperShape();
</script>

<section class="paper" aria-label={label} use:autoHeight>
  <div class="paper-content"><slot /></div>
  <div class="paper-surface" aria-hidden="true"><div class="paper-cutout" style:clip-path={clipPath}></div></div>
</section>
