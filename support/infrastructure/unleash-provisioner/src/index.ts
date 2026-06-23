/**
 * CREATE entrypoint. Provisions everything the official Unleash Terraform provider can't, for
 * EVERY attendee project (project-001, project-002, …) listed in UNLEASH_PROJECTS:
 *   1. project-scoped context fields (pNNN_region, pNNN_email)
 *   2. the workshop's feature flags (+ strategies, variants, per-env enabled state)
 *   3. the pNNN_internal-users segment (references pNNN_email)
 *   4. per-flag Layer tags (the global Layer tag type is created once)
 *
 * Plus instance-global actions done once (not per project): archiving the built-in "Default"
 * project, the Layer tag type, the "Golden Release Rollout" (the org-wide rollout policy of
 * Segment 6), and the master-kill-switch signal endpoint (whose per-project Actions are then
 * created in the loop).
 *
 * Run after `terraform apply`. Flag mutations on the change-request-guarded `production`
 * environment are wrapped so the guard is lifted, applied, then restored — per project.
 */
import { PROJECTS, FORCE_PROVISION } from './config';
import { projectExists, projectProvisioned } from './setup/projects';
import { createContextFields } from './setup/context-fields';
import { withChangeRequestsDisabled } from './setup/change-requests';
import { createFlags } from './flags/flags';
import { createSegments } from './setup/segments';
import { applyTags, createTagType } from './flags/tags';
import { createReleaseTemplate } from './setup/release-templates';
import { archiveDefaultProject } from './setup/default-project';
import { enableRemoteMcp } from './setup/remote-mcp';
import { createMasterKillSwitchSignal } from './setup/master-kill-switch-signal';
import { createMasterKillSwitchAction, resolveActorId } from './setup/master-kill-switch-actions';

const run = async (): Promise<void> => {
  try {
    console.log(
      `[provision] Provisioning ${PROJECTS.length.toString()} project(s): ${PROJECTS.join(', ')}`,
    );
    await archiveDefaultProject();
    await createTagType();
    await createReleaseTemplate();
    await enableRemoteMcp();
    // The signal endpoint + actor are instance-wide; the per-project Actions bind to them below.
    const signal = await createMasterKillSwitchSignal();
    const actorId = signal ? await resolveActorId() : null;
    for (const project of PROJECTS) {
      if (!(await projectExists(project))) {
        console.warn(`[provision] ${project} not found — skipping project-dependent steps.`);
        continue;
      }
      // Skip the ~30 idempotent per-project calls when the project is already provisioned (one probe).
      // applyTags is the LAST step below, so its Layer tag is a reliable "fully done" sentinel.
      // UNLEASH_FORCE_PROVISION re-reconciles everything (e.g. after editing FLAGS).
      if (!FORCE_PROVISION && (await projectProvisioned(project))) {
        console.log(
          `[provision] ${project} already provisioned — skipping (set UNLEASH_FORCE_PROVISION=1 to re-run).`,
        );
        continue;
      }
      await createContextFields(project);
      await withChangeRequestsDisabled(project, () => createFlags(project));
      await createSegments(project);
      if (signal && actorId !== null) {
        await createMasterKillSwitchAction(project, signal.endpointId, actorId);
      }
      await applyTags(project);
    }
    console.log('[provision] Done.');
  } catch (error: unknown) {
    console.error('[provision] Failed:', error);
    process.exitCode = 1;
  }
};

void run();
