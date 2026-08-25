// Synthetic demo data seed (§25.4 item 16, §27 Day-3 item 3, D42).
//
// Everything this script inserts is FAKE — invented names, invented mobile
// numbers, invented bank/UPI handles, invented transaction references. No
// real victim data anywhere in this repo (§3.8, §18.1). Mobile numbers use
// the 70000-prefix range (`70000-xxxxx`), which is not a real Indian
// operator-allocated series, so they can never collide with a real number.
//
// Run: DATABASE_URL=... npx tsx scripts/seed-demo-data.ts
//
// Idempotency: every row this script creates is tagged with a `CC-DEMO-`
// public Complaint ID prefix instead of the normal random `generatePublicComplaintId()`
// format. Re-running the script first deletes every complaint whose publicId
// starts with `CC-DEMO-` (cascades to incidents/statuses/evidence/notifications/
// consents via the schema's onDelete rules) and its matching demo users, then
// re-inserts fresh rows — safe to run repeatedly, never accumulates duplicates.

import { db } from "@/lib/db";
import {
  complaints,
  incidents,
  complaintStatuses,
  notifications,
  auditLogs,
  users,
  type complaintStatusCodeEnum,
} from "@/lib/db/schema";
import { like, inArray, eq } from "drizzle-orm";
import { MONEY_FRAUD_CATEGORY_CODE } from "@/lib/classify";

type StatusCode = (typeof complaintStatusCodeEnum.enumValues)[number];

const DEMO_PREFIX = "CC-DEMO-";

// Fake Indian mobile numbers — 70000-xxxxx is not a real TRAI-allocated
// series, unmistakably synthetic, easy for a reviewer to recognise as fake.
const demoMobile = (n: number) => `70000${String(n).padStart(5, "0")}`;

interface DemoComplaint {
  publicId: string;
  subCategoryCode: string;
  narrative: string;
  amountLost: string;
  debitedInstrument: string;
  transactionRef: string;
  channelUsed: "call" | "sms" | "whatsapp" | "app" | "website";
  state: string;
  district: string;
  mobile: string;
  displayName: string;
  daysAgo: number; // when the complaint was filed
  statusHistory: { code: StatusCode; daysAfterFiling: number; note: string }[];
}

const DEMO_COMPLAINTS: DemoComplaint[] = [
  {
    publicId: `${DEMO_PREFIX}0001`,
    subCategoryCode: "UPI_FRAUD",
    narrative:
      "[SYNTHETIC DEMO DATA] Received a call from someone claiming to be from my bank asking me to share a UPI collect request to 'verify' my account. I approved it without reading properly and ₹18,500 was debited from my account via UPI.",
    amountLost: "18500.00",
    debitedInstrument: "UPI - fakebank@upi",
    transactionRef: "UPI2026081912345DEMO",
    channelUsed: "call",
    state: "Karnataka",
    district: "Belagavi",
    mobile: demoMobile(1),
    displayName: "Demo Citizen One (synthetic)",
    daysAgo: 25,
    statusHistory: [
      { code: "RECEIVED", daysAfterFiling: 0, note: "Complaint received via the web emergency report flow." },
    ],
  },
  {
    publicId: `${DEMO_PREFIX}0002`,
    subCategoryCode: "INVESTMENT_FRAUD",
    narrative:
      "[SYNTHETIC DEMO DATA] Joined a WhatsApp group promising guaranteed 30% returns on a stock trading app. Invested in stages totalling ₹95,000 over two weeks before the app stopped letting me withdraw.",
    amountLost: "95000.00",
    debitedInstrument: "Net banking - Demo Bank Ltd",
    transactionRef: "NEFT2026080733210DEMO",
    channelUsed: "whatsapp",
    state: "Maharashtra",
    district: "Pune",
    mobile: demoMobile(2),
    displayName: "Demo Citizen Two (synthetic)",
    daysAgo: 40,
    statusHistory: [
      { code: "RECEIVED", daysAfterFiling: 0, note: "Complaint received via the web emergency report flow." },
      { code: "SENT_TO_BANK", daysAfterFiling: 2, note: "Forwarded to the reporting bank for a freeze request." },
      { code: "WITH_CYBER_CELL", daysAfterFiling: 6, note: "Assigned to the district cyber cell for review." },
    ],
  },
  {
    publicId: `${DEMO_PREFIX}0003`,
    subCategoryCode: "KYC_OTP_SCAM",
    narrative:
      "[SYNTHETIC DEMO DATA] Got an SMS saying my SIM/KYC would be blocked unless I updated details via a link. The link asked for an OTP which I entered, and ₹42,000 was withdrawn via card the same evening.",
    amountLost: "42000.00",
    debitedInstrument: "Debit card ending 4471",
    transactionRef: "CARD2026072255678DEMO",
    channelUsed: "sms",
    state: "Delhi",
    district: "South Delhi",
    mobile: demoMobile(3),
    displayName: "Demo Citizen Three (synthetic)",
    daysAgo: 55,
    // Full timeline through DISPOSED — exercises D18's "Disposed ≠ closed"
    // plain-language translation end to end.
    statusHistory: [
      { code: "RECEIVED", daysAfterFiling: 0, note: "Complaint received via the web emergency report flow." },
      { code: "SENT_TO_BANK", daysAfterFiling: 1, note: "Forwarded to the reporting bank for a freeze request." },
      { code: "WITH_CYBER_CELL", daysAfterFiling: 4, note: "Assigned to the district cyber cell for review." },
      { code: "UNDER_INVESTIGATION", daysAfterFiling: 10, note: "Cyber cell opened a formal investigation." },
      {
        code: "DISPOSED",
        daysAfterFiling: 30,
        note: "Handed to a local police unit for investigation — not a rejection, case remains open there.",
      },
    ],
  },
  {
    publicId: `${DEMO_PREFIX}0004`,
    subCategoryCode: "CARD_FRAUD",
    narrative:
      "[SYNTHETIC DEMO DATA] Noticed three unfamiliar international transactions on my credit card statement totalling ₹27,300. I never shared my card details or OTP with anyone.",
    amountLost: "27300.00",
    debitedInstrument: "Credit card ending 8820",
    transactionRef: "CARD2026081409988DEMO",
    channelUsed: "app",
    state: "Tamil Nadu",
    district: "Chennai",
    mobile: demoMobile(4),
    displayName: "Demo Citizen Four (synthetic)",
    daysAgo: 12,
    statusHistory: [
      { code: "RECEIVED", daysAfterFiling: 0, note: "Complaint received via the web emergency report flow." },
      { code: "SENT_TO_BANK", daysAfterFiling: 1, note: "Forwarded to the reporting bank for a freeze request." },
    ],
  },
];

function daysAgoDate(days: number, extraDays = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days + extraDays);
  return d;
}

async function main() {
  // --- clear previous demo rows (idempotent re-run) ------------------------
  const existingDemo = await db
    .select({ id: complaints.id, mobile: complaints.contactMobile })
    .from(complaints)
    .where(like(complaints.publicId, `${DEMO_PREFIX}%`));

  if (existingDemo.length > 0) {
    const ids = existingDemo.map((c) => c.id);
    // audit_logs.targetId is a plain text column, not a FK — it does not
    // cascade with the complaints delete below, so clean it explicitly or
    // a second run silently doubles the audit trail.
    await db.delete(auditLogs).where(inArray(auditLogs.targetId, ids));
    await db.delete(complaints).where(inArray(complaints.id, ids));
    // cascades: incidents, complaint_statuses, evidence, notifications(complaintId), consents
  }
  const demoMobiles = DEMO_COMPLAINTS.map((c) => c.mobile);
  await db.delete(users).where(inArray(users.mobile, demoMobiles));

  // --- insert fresh demo rows ------------------------------------------------
  for (const demo of DEMO_COMPLAINTS) {
    const filedAt = daysAgoDate(demo.daysAgo);

    await db.transaction(async (tx) => {
      const [complaint] = await tx
        .insert(complaints)
        .values({
          publicId: demo.publicId,
          channel: "web",
          isAnonymous: false,
          categoryCode: MONEY_FRAUD_CATEGORY_CODE,
          subCategoryCode: demo.subCategoryCode,
          categorySource: "rules",
          categoryConfirmedByUser: true,
          state: demo.state,
          district: demo.district,
          contactMobile: demo.mobile,
          createdAt: filedAt,
          submittedAt: filedAt,
        })
        .returning({ id: complaints.id });

      await tx.insert(incidents).values({
        complaintId: complaint.id,
        narrative: demo.narrative,
        occurredAt: filedAt,
        amountLost: demo.amountLost,
        currency: "INR",
        debitedInstrument: demo.debitedInstrument,
        transactionRef: demo.transactionRef,
        channelUsed: demo.channelUsed,
        extractedFields: [
          {
            field: "amountLost",
            value: demo.amountLost,
            sourceSpan: demo.narrative,
            confirmed: true,
          },
        ],
      });

      // Real submit flow inserts exactly one RECEIVED row at submit time;
      // the rest of a real timeline accrues later via backend status
      // updates. We backdate every row here to simulate that same passage
      // of time so /track shows a real multi-step timeline, not four rows
      // all timestamped "now".
      for (const step of demo.statusHistory) {
        await tx.insert(complaintStatuses).values({
          complaintId: complaint.id,
          code: step.code,
          occurredAt: daysAgoDate(demo.daysAgo, step.daysAfterFiling),
          note: step.note,
        });
      }

      const smsPreview = `Your complaint ${demo.publicId} has been registered. Track it anytime at /track.`;
      await tx.insert(notifications).values({
        complaintId: complaint.id,
        channel: "sms",
        templateKey: "complaint_confirmation",
        renderedBody: smsPreview,
        createdAt: filedAt,
      });

      await tx.insert(auditLogs).values({
        actorType: "citizen",
        action: "complaint_created",
        targetType: "complaint",
        targetId: complaint.id,
        occurredAt: filedAt,
        metadata: {
          categoryCode: MONEY_FRAUD_CATEGORY_CODE,
          subCategoryCode: demo.subCategoryCode,
          synthetic: true,
        },
      });

      // Mirror the mocked-OTP account-upgrade path a real filer might take,
      // so the demo user's shape matches a real one (§25 requirement).
      const [user] = await tx
        .insert(users)
        .values({
          mobile: demo.mobile,
          mobileVerifiedAt: filedAt,
          createdAt: filedAt,
        })
        .returning({ id: users.id });

      await tx
        .update(complaints)
        .set({ userId: user.id })
        .where(eq(complaints.id, complaint.id));

      await tx.insert(auditLogs).values({
        actorType: "citizen",
        action: "updates_opt_in_confirmed",
        targetType: "complaint",
        targetId: complaint.id,
        occurredAt: filedAt,
        metadata: { synthetic: true },
      });
    });
  }

  // --- reviewer-facing output -------------------------------------------------
  console.log("\nSeeded synthetic demo complaints (§25.4 item 16 / §27 Day-3 item 3):\n");
  console.log("All data below is FAKE — synthetic names, synthetic mobile numbers");
  console.log("(70000-xxxxx range), synthetic bank/transaction references.\n");
  for (const demo of DEMO_COMPLAINTS) {
    const finalStatus = demo.statusHistory[demo.statusHistory.length - 1].code;
    console.log(
      `  ${demo.publicId}  |  mobile ${demo.mobile}  |  ${demo.subCategoryCode}  |  status: ${finalStatus}`,
    );
  }
  console.log(
    `\nTrack any of these at /track using the Complaint ID + mobile number above.`,
  );
  console.log(
    `${DEMO_PREFIX}0003 exercises the full status timeline through DISPOSED (D18's "Disposed ≠ case closed" string).\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  });
