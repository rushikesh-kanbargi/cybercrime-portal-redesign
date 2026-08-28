"use server";

// Adding information to a filed report.
//
// The original report is never editable. Changing what a citizen originally
// said would destroy the evidentiary value of the statement — so everything
// here appends, timestamped, and the case page renders it beneath the
// original rather than in place of it.

import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { addComplaintInformation } from "@/lib/actions/tracking";
import { trackCookieName, verifyTrackToken } from "@/lib/track-auth";
import { hashIp, getClientIp } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import { complaints } from "@/lib/db/schema";

const schema = z.object({
  publicId: z.string().trim().min(1),
  body: z.string().trim().min(1, "Write what you want to add.").max(4000),
});

export type AddInformationResult =
  | { ok: true }
  | { ok: false; code: "NOT_VERIFIED" | "NOT_FOUND" | "EMPTY" };

export async function submitAddition(
  input: z.infer<typeof schema>,
): Promise<AddInformationResult> {
  const parsed = schema.parse(input);

  // Same gate as reading the case: proof this browser passed the OTP check
  // for this Complaint ID, OR a logged-in session that owns this complaint
  // (matches app/api/track/[publicId]/status/route.ts's dual-auth pattern).
  // Adding to a report must never be easier than reading one — and reading
  // one already allows the session-owner path, so this has to as well.
  const store = await cookies();
  const token = store.get(trackCookieName(parsed.publicId))?.value;
  let authorized = verifyTrackToken(parsed.publicId, token);

  if (!authorized) {
    const user = await getSessionUser();
    if (user) {
      const complaint = await db.query.complaints.findFirst({
        where: eq(complaints.publicId, parsed.publicId),
      });
      authorized = !!complaint && complaint.userId === user.id;
    }
  }

  if (!authorized) {
    return { ok: false, code: "NOT_VERIFIED" };
  }

  const ipHash = hashIp(getClientIp(await headers()));
  const result = await addComplaintInformation(parsed.publicId, parsed.body, ipHash);
  if (!result.ok) return { ok: false, code: result.code };
  return { ok: true };
}
