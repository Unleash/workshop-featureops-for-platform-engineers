import { unleashApi } from '../api';
import { projectPrefix } from '../config';

// Orange "Layer" tag type describing WHERE each flag is evaluated. #F97316 is Tailwind's
// orange-500 — the same orange the wider Unleash demos use for this kind of tag. The tag TYPE is
// instance-global (shared by every project), so it is created/deleted once.
const TAG_TYPE = {
  name: 'Layer',
  description: 'Where the flag is evaluated: front-end, back-end, or both.',
  color: '#F97316',
};

// One Layer value per flag suffix, by evaluation location. product-images is BackEnd+FrontEnd: the
// web app gates the thumbnails (so the Toolbar flips them live) and the catalog API gates its own
// image URLs on the same flag.
const FLAG_LAYER: Record<string, string> = {
  'rl_checkout-page_payment-section_promo-code': 'BackEnd+FrontEnd',
  'rl_checkout-page_basket-preview_product-images': 'BackEnd+FrontEnd',
  'kx_checkout-page_headline_link-to-real-unleash-store': 'FrontEndOnly',
  'ex_v_checkout-page_payment-section_free-shipping-nudge': 'FrontEndOnly',
};

/** Create the global Layer tag type (idempotent). Run once, not per project. */
export const createTagType = async (): Promise<void> => {
  const { status } = await unleashApi('/tag-types', {
    method: 'POST',
    body: JSON.stringify(TAG_TYPE),
  });
  if (status === 200 || status === 201) {
    console.log(`[tags] Tag type "${TAG_TYPE.name}" created.`);
  } else if (status === 409) {
    console.log(`[tags] Tag type "${TAG_TYPE.name}" already exists.`);
  } else {
    console.warn(
      `[tags] Failed to create tag type "${TAG_TYPE.name}" (HTTP ${status.toString()}).`,
    );
  }
};

/** Delete the global Layer tag type. Run once, after every project's flags are archived. */
export const deleteTagType = async (): Promise<void> => {
  const { status } = await unleashApi(`/tag-types/${TAG_TYPE.name}`, { method: 'DELETE' });
  console.log(`[tags] Deleted tag type "${TAG_TYPE.name}" (HTTP ${status.toString()}).`);
};

/** Apply the per-flag Layer tags within one project, using that project's prefixed flag names. */
export const applyTags = async (project: string): Promise<void> => {
  console.log(`[tags] ${project}: applying Layer tags ...`);
  const prefix = projectPrefix(project);
  for (const [suffix, value] of Object.entries(FLAG_LAYER)) {
    const flag = `${prefix}${suffix}`;
    const { status } = await unleashApi(`/projects/${project}/tags`, {
      method: 'PUT',
      body: JSON.stringify({
        features: [flag],
        tags: { addedTags: [{ type: TAG_TYPE.name, value }], removedTags: [] },
      }),
    });
    console.log(`[tags] ${project}: tagged "${flag}" → ${value} (HTTP ${status.toString()}).`);
  }
};
