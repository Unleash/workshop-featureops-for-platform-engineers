/**
 * CREATE entrypoint. Provisions everything the official Unleash Terraform provider can't, for
 * EVERY attendee project (project-001, project-002, …) listed in UNLEASH_PROJECTS:
 *   1. project-scoped context fields (pNNN_region, pNNN_email)
 *   2. the workshop's feature flags (+ strategies, variants, per-env enabled state)
 *   3. the pNNN_internal-users segment (references pNNN_email)
 *   4. per-flag Layer tags (the global Layer tag type is created once)
 *
 * Plus two instance-global resources created once (not per project): the Layer tag type and the
 * "Golden Release Template" (the org-wide rollout policy of Segment 6).
 *
 * Run after `terraform apply`. Flag mutations on the change-request-guarded `production`
 * environment are wrapped so the guard is lifted, applied, then restored — per project.
 */
import { PROJECTS } from './config';
import { createContextFields } from './setup/context-fields';
import { withChangeRequestsDisabled } from './setup/change-requests';
import { createFlags } from './flags/flags';
import { createSegments } from './setup/segments';
import { applyTags, createTagType } from './flags/tags';
import { createReleaseTemplate } from './setup/release-templates';

const run = async (): Promise<void> => {
  try {
    console.log(
      `[provision] Provisioning ${PROJECTS.length.toString()} project(s): ${PROJECTS.join(', ')}`,
    );
    await createTagType();
    await createReleaseTemplate();
    for (const project of PROJECTS) {
      await createContextFields(project);
      await withChangeRequestsDisabled(project, () => createFlags(project));
      await createSegments(project);
      await applyTags(project);
    }
    console.log('[provision] Done.');
  } catch (error: unknown) {
    console.error('[provision] Failed:', error);
    process.exitCode = 1;
  }
};

void run();
