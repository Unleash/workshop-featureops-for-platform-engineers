/**
 * DESTROY entrypoint — the counterpart to index.ts. Removes everything the provisioner created
 * from EVERY project in UNLEASH_PROJECTS, so `terraform destroy` can then drop the projects:
 *   1. remove every flag — archive the active ones, then delete them from the archive (a
 *      change-request guard, if the attendee enabled one, is lifted and then restored) — per project
 *   2. delete the project release template (before the segment + email context field it references)
 *   3. delete the internal-users segment (before the email context field it references)
 *   4. delete the project-scoped context fields (region, email)
 *   5. delete the app's SDK tokens `make workshop-configure` created (no longer Terraform-managed)
 * then undo the instance-global actions once: delete the Layer tag type, the Golden Release
 * Rollout, and the master-kill-switch signal endpoint (its per-project Actions are removed in the
 * loop), and revive the built-in "Default" project.
 *
 * The actor service account, its role, and project access are owned by Terraform and removed by
 * `terraform destroy` — which the Makefile runs AFTER this, so the Actions are gone first.
 *
 * Under UNLEASH_SELF_PACED the master kill switch and the "Default" project were never touched on
 * the way in (see index.ts), so they are left alone on the way out. There is no Terraform behind
 * that flow to drop the project, so this deletes it too (step 6) — `make workshop-teardown` asks
 * first — leaving a clean instance for a fresh `make workshop-configure`.
 *
 * Idempotent: a missing resource (404) is fine, so this is safe to run standalone or twice. In the
 * facilitated flow the per-project block is sentinel-guarded — it runs only for projects carrying
 * the Layer sentinel (the same "provisioned?" probe the create loop uses); UNLEASH_FORCE_DESTROY
 * bypasses the guard. The self-paced flow has one project and the attendee's go-ahead, so it always
 * runs — which also lets it finish a teardown that stopped halfway.
 */
import { PROJECTS, FORCE_DESTROY, SELF_PACED } from './config';
import { deleteProject, projectExists, projectProvisioned } from './setup/projects';
import { withChangeRequestsDisabled } from './setup/change-requests';
import { deleteFlags } from './flags/flags';
import { deleteSegments } from './setup/segments';
import { deleteProjectTokens } from './setup/api-tokens';
import { deleteContextFields } from './setup/context-fields';
import { deleteTagType } from './flags/tags';
import { deleteProjectReleaseTemplate, deleteReleaseTemplate } from './setup/release-templates';
import { reviveDefaultProject } from './setup/default-project';
import { disableRemoteMcp } from './setup/remote-mcp';
import { deleteMasterKillSwitchSignal } from './setup/master-kill-switch-signal';
import { deleteMasterKillSwitchAction } from './setup/master-kill-switch-actions';

const run = async (): Promise<void> => {
  try {
    console.log(
      `[destroy] Tearing down ${PROJECTS.length.toString()} project(s): ${PROJECTS.join(', ')}`,
    );
    for (const project of PROJECTS) {
      if (!(await projectExists(project))) {
        console.warn(`[destroy] ${project} not found — already gone, skipping teardown.`);
        continue;
      }
      // Reuse the create-side sentinel: deleteFlags (below) removes the kill-switch flag the
      // Layer tag lives on, so this probe MUST run first. No sentinel → nothing of ours to remove
      // (never provisioned, or already torn down) — skip the wasted per-project teardown calls.
      if (!SELF_PACED && !FORCE_DESTROY && !(await projectProvisioned(project))) {
        console.warn(
          `[destroy] ${project} already deprovisioned — skipping (set UNLEASH_FORCE_DESTROY=1 to re-run).`,
        );
        continue;
      }
      if (!SELF_PACED) {
        await deleteMasterKillSwitchAction(project);
      }
      await withChangeRequestsDisabled(project, () => deleteFlags(project));
      await deleteProjectReleaseTemplate(project);
      await deleteSegments(project);
      await deleteContextFields(project);
      await deleteProjectTokens(project);
      if (SELF_PACED) {
        await deleteProject(project);
      }
    }
    await deleteTagType();
    await deleteReleaseTemplate();
    await disableRemoteMcp();
    if (!SELF_PACED) {
      await deleteMasterKillSwitchSignal();
      await reviveDefaultProject();
    }
    console.log('[destroy] Done.');
  } catch (error: unknown) {
    console.error('[destroy] Failed:', error);
    process.exitCode = 1;
  }
};

void run();
