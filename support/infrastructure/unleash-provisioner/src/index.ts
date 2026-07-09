/**
 * CREATE entrypoint. Provisions everything the official Unleash Terraform provider can't, for
 * EVERY project listed in UNLEASH_PROJECTS:
 *   1. project-scoped context fields (p001_region, p001_email — unprefixed when self-paced)
 *   2. the workshop's feature flags (+ strategies, variants, per-env enabled state)
 *   3. the internal-users segment (references the email context field)
 *   4. per-flag Layer tags (the global Layer tag type is created once)
 *
 * Plus instance-global actions done once (not per project): the Layer tag type, the "Golden Release
 * Rollout" (the org-wide rollout policy of Segment 6), and the remote MCP server.
 *
 * Two flows share this code:
 *   • FACILITATED (default) — run after `terraform apply`, which owns the projects, users, roles and
 *     SDK tokens. Also archives the built-in "Default" project and provisions the master kill switch
 *     (whose Actions need a Terraform service account).
 *   • SELF-PACED (UNLEASH_SELF_PACED=1) — one attendee, one project, no Terraform. This CREATES the
 *     project and its SDK tokens, and skips both the "Default" archive (destructive on an instance we
 *     don't own) and the master kill switch (a facilitator tool with no Terraform behind it here).
 *
 * Flag mutations on a change-request-guarded environment are wrapped so the guard is lifted, applied,
 * then restored to whatever it was — per project.
 */
import { PROJECTS, PROJECT_NAME, FORCE_PROVISION, SELF_PACED } from './config';
import {
  applyProjectSettings,
  createProject,
  projectExists,
  projectProvisioned,
} from './setup/projects';
import { createContextFields } from './setup/context-fields';
import { withChangeRequestsDisabled } from './setup/change-requests';
import { createFlags } from './flags/flags';
import { createSegments } from './setup/segments';
import { createProjectTokens } from './setup/api-tokens';
import { applyTags, createTagType } from './flags/tags';
import { createReleaseTemplate } from './setup/release-templates';
import { archiveDefaultProject } from './setup/default-project';
import { enableRemoteMcp } from './setup/remote-mcp';
import { createMasterKillSwitchSignal } from './setup/master-kill-switch-signal';
import { createMasterKillSwitchAction, resolveActorId } from './setup/master-kill-switch-actions';

const run = async (): Promise<void> => {
  try {
    console.log(
      `[provision] Provisioning ${PROJECTS.length.toString()} project(s): ${PROJECTS.join(', ')}` +
        (SELF_PACED ? ' (self-paced)' : ''),
    );
    if (!SELF_PACED) {
      await archiveDefaultProject();
    }
    await createTagType();
    await createReleaseTemplate();
    await enableRemoteMcp();

    // The signal endpoint + actor are instance-wide; the per-project Actions bind to them below.
    // Self-paced attendees have neither (both are Terraform-provisioned), so skip the whole thing.
    const signal = SELF_PACED ? null : await createMasterKillSwitchSignal();
    const actorId = signal ? await resolveActorId() : null;

    for (const project of PROJECTS) {
      // Self-paced: stand the project up before anything can be written into it. These three are
      // idempotent and deliberately sit BEFORE the "already provisioned" skip below, so a run that
      // died midway (project created, flags tagged, tokens not yet minted) converges on a re-run.
      if (SELF_PACED) {
        if (!(await createProject(project, PROJECT_NAME))) {
          continue;
        }
        await applyProjectSettings(project);
        await createProjectTokens(project);
      }
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
