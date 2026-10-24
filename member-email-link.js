"use strict";

const { normalizeMemberEmail } = require("./member-allowlist");
const { approvedMemberForEmail, dashboardMemberMatchesApproved } = require("./approved-member-mapping");

function validMemberId(value) {
  return typeof value === "string" && /^[\w-]{1,100}$/.test(value);
}

function createMemberEmailLinkHandler({ findDashboardMemberById, findDashboardMemberByEmail, findOtherAuthLinkByEmail, updateDashboardMemberEmail, updateAuthLinkEmail, audit = () => {} }) {
  return async (req, res) => {
    const memberId = req.params.memberId;
    const email = normalizeMemberEmail(req.body?.email);
    const approved = approvedMemberForEmail(email);
    const member = await findDashboardMemberById(memberId);
    if (!validMemberId(memberId) || !approved || !dashboardMemberMatchesApproved(member, approved)) {
      return res.status(400).json({ error: "Choose the approved verified Google email for this existing member." });
    }
    try {
      const [existingMember, existingLink] = await Promise.all([
        findDashboardMemberByEmail(email),
        findOtherAuthLinkByEmail(email, memberId)
      ]);
      if (existingMember && existingMember.id !== memberId) {
        return res.status(409).json({ error: "This email is already linked to another member." });
      }
      if (existingLink) return res.status(409).json({ error: "This email is already linked to another member." });
      const updated = await updateDashboardMemberEmail(memberId, email);
      if (!updated) return res.status(404).json({ error: "Member not found." });
      // This is deliberately a narrow $set: Firebase UID, session version, and
      // every tracker field remain untouched during email reconciliation.
      await updateAuthLinkEmail(memberId, email);
      audit(req, "member-email-linked", memberId);
      return res.json({ ok: true, member: { id: memberId, name: member.name, email } });
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ error: "This email is already linked to another member." });
      return res.status(503).json({ error: "Member email linking is temporarily unavailable." });
    }
  };
}

module.exports = { createMemberEmailLinkHandler, validMemberId };
