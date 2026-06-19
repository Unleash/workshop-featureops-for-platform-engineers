/**
 * DESTROY entrypoint — the counterpart to index.ts. Removes everything the provisioner created
 * from EVERY project in UNLEASH_PROJECTS, so `terraform destroy` can then drop the projects:
 *   1. archive the feature flags (CR-guarded production lifted/restored) — per project
 *   2. delete the pNNN_internal-users segment (before the pNNN_email field it references)
 *   3. delete the project-scoped context fields (pNNN_region, pNNN_email)
 * then delete the instance-global resources once: the Layer tag type, the Golden Release Template,
 * and the master-kill-switch signal endpoint (its per-project Actions are removed in the loop).
 *
 * The actor service account, its role, and project access are owned by Terraform and removed by
 * `terraform destroy` — which the Makefile runs AFTER this, so the Actions are gone first.
 *
 * Idempotent: a missing resource (404) is fine, so this is safe to run standalone or twice.
 */
import { PROJECTS } from './config';
import { withChangeRequestsDisabled } from './setup/change-requests';
import { archiveFlags } from './flags/flags';
import { deleteSegments } from './setup/segments';
import { deleteContextFields } from './setup/context-fields';
import { deleteTagType } from './flags/tags';
import { deleteReleaseTemplate } from './setup/release-templates';
import { deleteMasterKillSwitchSignal } from './setup/master-kill-switch-signal';
import { deleteMasterKillSwitchAction } from './setup/master-kill-switch-actions';

const run = async (): Promise<void> => {
  try {
    console.log(
      `[destroy] Tearing down ${PROJECTS.length.toString()} project(s): ${PROJECTS.join(', ')}`,
    );
    for (const project of PROJECTS) {
      await deleteMasterKillSwitchAction(project);
      await withChangeRequestsDisabled(project, () => archiveFlags(project));
      await deleteSegments(project);
      await deleteContextFields(project);
    }
    await deleteTagType();
    await deleteReleaseTemplate();
    await deleteMasterKillSwitchSignal();
    console.log('[destroy] Done.');
  } catch (error: unknown) {
    console.error('[destroy] Failed:', error);
    process.exitCode = 1;
  }
};

void run();
