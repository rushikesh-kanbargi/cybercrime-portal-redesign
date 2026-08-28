// Synthetic data seed (§25.4 item 16, §27 Day-3 item 3, D42).
//
// Everything this script inserts is INVENTED — the names, the mobile numbers,
// the Aadhaar numbers, the bank and UPI handles, the transaction references,
// and the police offices. No real victim data anywhere in this repo (§3.8,
// §18.1). Two of those choices are load-bearing safety properties, not
// cosmetics, and must not be "made more realistic":
//
//   * Mobile numbers use the `70000-xxxxx` range, which is not TRAI-allocated,
//     so they cannot collide with a real person's number.
//   * Aadhaar numbers begin `0000`. UIDAI never issues a number starting with
//     0, so these cannot be anyone's real number.
//
// The cyber offices below are NOT real police stations. Nothing filed in this
// prototype is ever sent to any of them, or to any real unit (hard rule 2).
//
// Run: DATABASE_URL=... npm run db:seed-demo
//
// Idempotency: this script owns a fixed set of Complaint IDs (SEEDED_IDS) and
// deletes exactly those, plus its own accounts, offices and Aadhaar records,
// before re-inserting. Safe to run repeatedly; never accumulates duplicates.

import { db } from "@/lib/db";
import {
  complaints,
  incidents,
  complaintStatuses,
  notifications,
  auditLogs,
  users,
  profiles,
  aadhaarRecordsSim,
  cyberOffices,
  officers,
  suspectIdentifiers,
  evidence,
  caseDocuments,
  type complaintStatusCodeEnum,
  type suspectIdentifierTypeEnum,
} from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  chatScreenshot,
  statementScreenshot,
  sha256,
  type ChatLine,
  type StatementRow,
} from "./make-demo-screenshots";
import { MONEY_FRAUD_CATEGORY_CODE } from "@/lib/classify";
import { routeToOffice } from "@/lib/offices";
import { normaliseIdentifier, hashIdentifier } from "@/lib/suspects";

type StatusCode = (typeof complaintStatusCodeEnum.enumValues)[number];
type SuspectType = (typeof suspectIdentifierTypeEnum.enumValues)[number];

const EVIDENCE_DIR = path.join(process.cwd(), ".data", "evidence");

const demoMobile = (n: number) => `70000${String(n).padStart(5, "0")}`;

// ---------------------------------------------------------------------------
// Cyber offices — invented. See the header note.
// ---------------------------------------------------------------------------

interface SeedOffice {
  name: string;
  addressLine: string;
  district: string;
  state: string;
  pincode: string;
  phone: string;
  jurisdictionPins: string[];
  officers: Array<{ name: string; rank: string }>;
}

const SEED_OFFICES: SeedOffice[] = [
  {
    name: "Belagavi Cyber Crime Police Station",
    addressLine: "2nd Floor, District Police Office, Club Road",
    district: "Belagavi",
    state: "Karnataka",
    pincode: "590001",
    phone: "0831 240 0000",
    jurisdictionPins: ["590001", "590002", "590003", "590006", "590010"],
    officers: [
      { name: "Meera Kulkarni", rank: "Sub-Inspector" },
      { name: "Vinayak Patil", rank: "Head Constable" },
    ],
  },
  {
    name: "Pune Cyber Crime Cell",
    addressLine: "Police Commissionerate, Sadhu Vaswani Chowk, Camp",
    district: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    phone: "020 2612 0000",
    jurisdictionPins: ["411001", "411004", "411007", "411030", "411038", "411045"],
    officers: [
      { name: "Rohan Deshmukh", rank: "Inspector" },
      { name: "Anjali Bhosale", rank: "Sub-Inspector" },
    ],
  },
  {
    name: "Bengaluru City Cyber Crime Police Station",
    addressLine: "1st Floor, CID Annexe, Palace Road",
    district: "Bengaluru Urban",
    state: "Karnataka",
    pincode: "560001",
    phone: "080 2294 0000",
    jurisdictionPins: ["560001", "560025", "560034", "560066", "560076", "560103"],
    officers: [{ name: "Kavya Srinivasan", rank: "Inspector" }],
  },
  {
    name: "Chennai Central Cyber Crime Wing",
    addressLine: "Commissioner's Office Campus, Vepery",
    district: "Chennai",
    state: "Tamil Nadu",
    pincode: "600007",
    phone: "044 2345 0000",
    jurisdictionPins: ["600002", "600007", "600017", "600042", "600096"],
    officers: [{ name: "S. Arunkumar", rank: "Inspector" }],
  },
  {
    name: "South Delhi Cyber Police Station",
    addressLine: "Police Station Complex, Hauz Khas",
    district: "South Delhi",
    state: "Delhi",
    pincode: "110016",
    phone: "011 2696 0000",
    jurisdictionPins: ["110016", "110017", "110019", "110024", "110049", "110065"],
    officers: [{ name: "Farhan Siddiqui", rank: "Sub-Inspector" }],
  },
  {
    name: "Mumbai Cyber Crime Investigation Cell",
    addressLine: "BKC Police Station Building, Bandra East",
    district: "Mumbai",
    state: "Maharashtra",
    pincode: "400051",
    phone: "022 2612 0000",
    jurisdictionPins: ["400001", "400020", "400050", "400051", "400070", "400703"],
    officers: [{ name: "Priya Nadkarni", rank: "Inspector" }],
  },
];

// ---------------------------------------------------------------------------
// Accounts. Account 1 owns three reports on purpose — signing in as them lands
// on a /profile with a real history, which is the point of an account existing
// at all (§7.2 #16: a list, not a dashboard).
// ---------------------------------------------------------------------------

interface SeedAccount {
  aadhaar: string;
  holderName: string;
  mobile: string;
  email: string;
  state: string;
  district: string;
  pincode: string;
}

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    aadhaar: "000012345678",
    holderName: "Sunita Rao",
    mobile: demoMobile(1),
    email: "sunita.rao@example.invalid",
    state: "Karnataka",
    district: "Belagavi",
    pincode: "590001",
  },
  {
    aadhaar: "000011112222",
    holderName: "Imran Qureshi",
    mobile: demoMobile(2),
    email: "imran.qureshi@example.invalid",
    state: "Maharashtra",
    district: "Pune",
    pincode: "411038",
  },
];

// ---------------------------------------------------------------------------
// Complaints. IDs are fixed rather than random so the README, the sign-in
// table and the verification steps can all name them, and so a re-run deletes
// exactly these rows. Format matches lib/complaint-id.ts's unambiguous charset.
// ---------------------------------------------------------------------------

interface SeedComplaint {
  publicId: string;
  subCategoryCode: string;
  narrative: string;
  amountLost: string;
  debitedInstrument: string;
  transactionRef: string | null;
  channelUsed: "call" | "sms" | "whatsapp" | "app" | "website";
  platform: string | null;
  suspectName: string | null;
  suspectClaims: string | null;
  suspects: Array<{ type: SuspectType; value: string }>;
  /** Placeholder screenshots this report carries as evidence. Their contents
   *  are invented and match the invented identifiers on the same report. */
  screenshots: Array<
    | { filename: string; kind: "chat"; title: string; subtitle: string; lines: ChatLine[] }
    | { filename: string; kind: "statement"; title: string; subtitle: string; rows: StatementRow[] }
  >;
  /** An FIR the officer registered, if the case got that far. */
  fir: { referenceNumber: string; note: string } | null;
  accountIndex: number;
  daysAgo: number;
  statusHistory: { code: StatusCode; daysAfterFiling: number; note: string }[];
}

const SEED_COMPLAINTS: SeedComplaint[] = [
  {
    publicId: "CC-7K2M-4PQR",
    subCategoryCode: "UPI_FRAUD",
    narrative:
      "Received a call from someone claiming to be from my bank asking me to approve a UPI collect request to 'verify' my account. I approved it without reading properly and ₹18,500 was debited.",
    amountLost: "18500.00",
    debitedInstrument: "UPI — my savings account ending 7712",
    transactionRef: "UPI2608194512773",
    channelUsed: "call",
    platform: "PhonePe",
    suspectName: "Said he was 'Rakesh from the HDFC card division'",
    suspectClaims:
      "Told me my card would be blocked within the hour unless I approved a verification request, and stayed on the line telling me not to hang up.",
    suspects: [
      { type: "upi", value: "rkshverify@ybl" },
      { type: "mobile", value: "7000099001" },
    ],
    screenshots: [
      {
        filename: "sms-from-bank.png",
        kind: "chat",
        title: "VM-HDFCBK",
        subtitle: "SMS",
        lines: [
          { text: "Collect request of Rs 18,500.00 received. Approve in your UPI app to complete verification.", time: "6:41 pm" },
          { text: "Rs 18,500.00 debited from a/c XX7712 via UPI. Ref UPI2608194512773.", time: "6:42 pm" },
          { text: "Not you? Call 1930 immediately.", time: "6:42 pm" },
        ],
      },
    ],
    fir: null,
    accountIndex: 0,
    daysAgo: 25,
    statusHistory: [
      { code: "RECEIVED", daysAfterFiling: 0, note: "Complaint received via the web report flow." },
    ],
  },
  {
    publicId: "CC-9XTB-36HN",
    subCategoryCode: "INVESTMENT_FRAUD",
    narrative:
      "Joined a WhatsApp group promising guaranteed 30% returns on a stock trading app. Invested in stages totalling ₹95,000 over two weeks before the app stopped letting me withdraw.",
    amountLost: "95000.00",
    debitedInstrument: "Net banking — my current account ending 4109",
    transactionRef: "NEFT2608073321045",
    channelUsed: "whatsapp",
    platform: "WhatsApp",
    suspectName: "'Vikram Mehta, senior analyst'",
    suspectClaims:
      "Posted screenshots of other members' profits every morning and said the fund was closing to new members that week.",
    suspects: [
      { type: "url", value: "https://alphagrowth-invest.example" },
      { type: "bank_account", value: "000055558213" },
    ],
    screenshots: [
      {
        filename: "whatsapp-group-messages.png",
        kind: "chat",
        title: "Alpha Growth VIP 4",
        subtitle: "218 members",
        lines: [
          { text: "Todays close: every member up 31 percent. Screenshots below.", time: "9:05 am" },
          { text: "Sir how do I withdraw my profit?", outgoing: true, time: "9:12 am" },
          { text: "Withdrawal opens after you reach tier 3. Deposit 40,000 more to unlock.", time: "9:14 am" },
          { text: "Fund closes to new members on Friday. Do not miss it.", time: "9:15 am" },
        ],
      },
      {
        filename: "trading-app-balance.png",
        kind: "statement",
        title: "Alpha Growth",
        subtitle: "Portfolio - withdrawals locked",
        rows: [
          { label: "Deposit", detail: "NEFT2608073321045", amount: "45,000", debit: true },
          { label: "Deposit", detail: "NEFT2608081142290", amount: "30,000", debit: true },
          { label: "Deposit", detail: "NEFT2608094417736", amount: "20,000", debit: true },
          { label: "Shown profit", detail: "Not withdrawable", amount: "38,400" },
          { label: "Withdrawal", detail: "Rejected - tier 3 required", amount: "0" },
        ],
      },
    ],
    fir: null,
    accountIndex: 0,
    daysAgo: 40,
    statusHistory: [
      { code: "RECEIVED", daysAfterFiling: 0, note: "Complaint received via the web report flow." },
      {
        code: "SENT_TO_BANK",
        daysAfterFiling: 2,
        note: "Hold requested on beneficiary account 000055558213, named in your report.",
      },
      { code: "WITH_CYBER_CELL", daysAfterFiling: 6, note: "Assigned to the district cyber cell for review." },
    ],
  },
  {
    publicId: "CC-4DFW-8RJ5",
    subCategoryCode: "DIGITAL_ARREST",
    narrative:
      "I got a video call from a man in a police uniform who said my Aadhaar had been used in a money laundering case and that there was an arrest warrant against me. He kept me on the call for almost four hours and said I would be arrested if I disconnected or told anyone. He made me transfer ₹2,80,000 to what he called a verification account, saying it would be returned after clearance.",
    amountLost: "280000.00",
    debitedInstrument: "Net banking — my savings account ending 7712",
    transactionRef: "IMPS260722556784",
    channelUsed: "call",
    platform: "Skype",
    suspectName: "Claimed to be 'Inspector Deshpande, CBI Mumbai'",
    suspectClaims:
      "Showed an ID card on camera and a document he called an arrest warrant. Said the case was confidential and that speaking to my family would be obstruction of justice.",
    suspects: [
      { type: "bank_account", value: "000077770027" },
      { type: "mobile", value: "7000099003" },
    ],
    screenshots: [
      {
        filename: "call-messages.png",
        kind: "chat",
        title: "Unknown number",
        subtitle: "Video call - 3h 52m",
        lines: [
          { text: "This is Inspector Deshpande, CBI Mumbai. Your Aadhaar is linked to a money laundering case.", time: "11:02 am" },
          { text: "Do not disconnect this call. Do not speak to your family. This is a confidential matter.", time: "11:04 am" },
          { text: "I have not done anything. Please I am scared.", outgoing: true, time: "11:06 am" },
          { text: "Transfer 2,80,000 to the verification account. It will be returned after clearance.", time: "1:20 pm" },
        ],
      },
      {
        filename: "bank-statement-transfer.png",
        kind: "statement",
        title: "Account XX7712",
        subtitle: "Statement - 22 Jul 2026",
        rows: [
          { label: "IMPS transfer", detail: "To 000077770027 - IMPS260722556784", amount: "2,80,000", debit: true },
          { label: "Available balance", detail: "After transfer", amount: "6,214" },
          { label: "Opening balance", detail: "22 Jul 2026", amount: "2,86,214" },
        ],
      },
    ],
    fir: {
      referenceNumber: "0142/2026",
      note: "Registered u/s 318(4) and 319(2) BNS, 2023 r/w s.66D IT Act, 2000. Beneficiary account 000077770027 communicated to the nodal officer for a hold request.",
    },
    accountIndex: 0,
    daysAgo: 55,
    // Full timeline through DISPOSED — exercises D18's "Disposed ≠ closed"
    // plain-language translation end to end.
    statusHistory: [
      { code: "RECEIVED", daysAfterFiling: 0, note: "Complaint received via the web report flow." },
      {
        code: "SENT_TO_BANK",
        daysAfterFiling: 1,
        note: "Hold requested on beneficiary account 000077770027, named in your report.",
      },
      { code: "WITH_CYBER_CELL", daysAfterFiling: 4, note: "Assigned to the district cyber cell for review." },
      {
        code: "FIR_REGISTERED",
        daysAfterFiling: 8,
        note: "FIR 0142/2026 registered. A copy is attached to this case and you can print it.",
      },
      { code: "UNDER_INVESTIGATION", daysAfterFiling: 10, note: "Cyber cell opened a formal investigation." },
      {
        code: "DISPOSED",
        daysAfterFiling: 30,
        note: "Handed to a local police unit for investigation — not a rejection, the case remains open there.",
      },
    ],
  },
  {
    publicId: "CC-6HPN-2WQ4",
    subCategoryCode: "CARD_FRAUD",
    narrative:
      "Noticed three unfamiliar international transactions on my credit card statement totalling ₹27,300. I never shared my card details or any OTP with anyone.",
    amountLost: "27300.00",
    debitedInstrument: "Credit card ending 8820",
    // Deliberately incomplete — no transaction reference and no suspect
    // details at all. This is the row that exercises the "still needed from
    // you" card on the case page.
    transactionRef: null,
    channelUsed: "app",
    platform: null,
    suspectName: null,
    suspectClaims: null,
    suspects: [],
    // No screenshots and no FIR — this is the report that exercises the
    // "still needed from you" card.
    screenshots: [],
    fir: null,
    accountIndex: 1,
    daysAgo: 12,
    statusHistory: [
      { code: "RECEIVED", daysAfterFiling: 0, note: "Complaint received via the web report flow." },
      { code: "SENT_TO_BANK", daysAfterFiling: 1, note: "Forwarded to the reporting bank for a freeze request." },
    ],
  },
];

const SEEDED_IDS = SEED_COMPLAINTS.map((c) => c.publicId);

function daysAgoDate(days: number, extraDays = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days + extraDays);
  return d;
}

async function main() {
  // --- clear what this script owns (idempotent re-run) -----------------------
  const existing = await db
    .select({ id: complaints.id })
    .from(complaints)
    .where(inArray(complaints.publicId, SEEDED_IDS));

  if (existing.length > 0) {
    const ids = existing.map((c) => c.id);
    // audit_logs.targetId is plain text, not a FK — it does not cascade with
    // the complaints delete, so clean it explicitly or a second run silently
    // doubles the audit trail.
    await db.delete(auditLogs).where(inArray(auditLogs.targetId, ids));
    await db.delete(complaints).where(inArray(complaints.id, ids));
    // cascades: incidents, complaint_statuses, evidence, notifications, consents
  }
  await db.delete(users).where(
    inArray(
      users.mobile,
      SEED_ACCOUNTS.map((a) => a.mobile),
    ),
  );
  await db.delete(aadhaarRecordsSim);
  await db.delete(cyberOffices); // cascades to officers

  // --- offices and officers ---------------------------------------------------
  for (const seed of SEED_OFFICES) {
    const [office] = await db
      .insert(cyberOffices)
      .values({
        name: seed.name,
        addressLine: seed.addressLine,
        district: seed.district,
        state: seed.state,
        pincode: seed.pincode,
        phone: seed.phone,
        jurisdictionPins: seed.jurisdictionPins,
      })
      .returning({ id: cyberOffices.id });

    await db
      .insert(officers)
      .values(seed.officers.map((o) => ({ officeId: office.id, name: o.name, rank: o.rank })));
  }

  // --- accounts, created before any complaint so several can share one -------
  const accountUserIds: string[] = [];
  for (const account of SEED_ACCOUNTS) {
    const [user] = await db
      .insert(users)
      .values({
        mobile: account.mobile,
        mobileVerifiedAt: daysAgoDate(60),
        createdAt: daysAgoDate(60),
      })
      .returning({ id: users.id });

    await db.insert(profiles).values({
      userId: user.id,
      displayName: account.holderName,
      state: account.state,
      district: account.district,
      pincode: account.pincode,
    });

    accountUserIds.push(user.id);
  }

  await db.insert(aadhaarRecordsSim).values(
    SEED_ACCOUNTS.map((a) => ({
      aadhaar: a.aadhaar,
      holderName: a.holderName,
      mobile: a.mobile,
      email: a.email,
      state: a.state,
      district: a.district,
      pincode: a.pincode,
    })),
  );

  // --- complaints -------------------------------------------------------------
  for (const seed of SEED_COMPLAINTS) {
    const filedAt = daysAgoDate(seed.daysAgo);
    const account = SEED_ACCOUNTS[seed.accountIndex];
    const ownerId = accountUserIds[seed.accountIndex];
    const routed = await routeToOffice(account.pincode, account.district, account.state);

    await db.transaction(async (tx) => {
      const [complaint] = await tx
        .insert(complaints)
        .values({
          publicId: seed.publicId,
          channel: "web",
          isAnonymous: false,
          categoryCode: MONEY_FRAUD_CATEGORY_CODE,
          subCategoryCode: seed.subCategoryCode,
          categorySource: "rules",
          categoryConfirmedByUser: true,
          userId: ownerId,
          state: account.state,
          district: account.district,
          pincode: account.pincode,
          assignedOfficeId: routed?.office.id ?? null,
          assignedOfficerId: routed?.officer?.id ?? null,
          contactMobile: account.mobile,
          createdAt: filedAt,
          submittedAt: filedAt,
        })
        .returning({ id: complaints.id });

      await tx.insert(incidents).values({
        complaintId: complaint.id,
        narrative: seed.narrative,
        occurredAt: filedAt,
        amountLost: seed.amountLost,
        currency: "INR",
        debitedInstrument: seed.debitedInstrument,
        transactionRef: seed.transactionRef,
        channelUsed: seed.channelUsed,
        platform: seed.platform,
        suspectName: seed.suspectName,
        suspectClaims: seed.suspectClaims,
        extractedFields: [
          {
            field: "amountLost",
            value: seed.amountLost,
            sourceSpan: seed.narrative,
            confirmed: true,
          },
        ],
      });

      // Placeholder screenshots, written to the same .data/evidence store the
      // real upload path uses, so the case page and the download route treat
      // them identically to a genuinely uploaded file.
      for (const shot of seed.screenshots) {
        const bytes =
          shot.kind === "chat"
            ? chatScreenshot(shot.title, shot.subtitle, shot.lines)
            : statementScreenshot(shot.title, shot.subtitle, shot.rows);
        const storageKey = `${crypto.randomUUID()}.png`;
        await mkdir(EVIDENCE_DIR, { recursive: true });
        await writeFile(path.join(EVIDENCE_DIR, storageKey), bytes);
        await tx.insert(evidence).values({
          complaintId: complaint.id,
          storageKey,
          originalFilename: shot.filename,
          mimeType: "image/png",
          sizeBytes: bytes.length,
          sha256: sha256(bytes),
          uploadedAt: filedAt,
        });
      }

      if (seed.fir) {
        await tx.insert(caseDocuments).values({
          complaintId: complaint.id,
          kind: "fir",
          referenceNumber: seed.fir.referenceNumber,
          note: seed.fir.note,
          issuedAt: daysAgoDate(seed.daysAgo, 8),
          issuedByOfficeId: routed?.office.id ?? null,
        });
      }

      for (const suspect of seed.suspects) {
        const normalised = normaliseIdentifier(suspect.type, suspect.value);
        await tx.insert(suspectIdentifiers).values({
          type: suspect.type,
          valueNormalised: normalised,
          valueHash: hashIdentifier(suspect.type, normalised),
          complaintId: complaint.id,
          isSynthetic: true,
        });
      }

      // The real submit flow inserts exactly one RECEIVED row; the rest of a
      // timeline accrues later via backend updates. Backdated here so /track
      // shows a real multi-step timeline, not four rows all stamped "now".
      for (const step of seed.statusHistory) {
        await tx.insert(complaintStatuses).values({
          complaintId: complaint.id,
          code: step.code,
          occurredAt: daysAgoDate(seed.daysAgo, step.daysAfterFiling),
          note: step.note,
        });
      }

      await tx.insert(notifications).values({
        complaintId: complaint.id,
        channel: "sms",
        templateKey: "complaint_confirmation",
        renderedBody: `Your complaint ${seed.publicId} has been registered. Track it anytime at /track.`,
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
          subCategoryCode: seed.subCategoryCode,
          synthetic: true,
        },
      });
    });
  }

  // --- reviewer-facing output -------------------------------------------------
  console.log("\nSeeded synthetic data. Every name, number and office below is invented.\n");

  console.log("Sign in at /login — the code is always 123456:\n");
  SEED_ACCOUNTS.forEach((account, index) => {
    const owned = SEED_COMPLAINTS.filter((c) => c.accountIndex === index);
    console.log(`  ${account.aadhaar.replace(/(\d{4})(?=\d)/g, "$1 ")}  |  ${account.holderName}`);
    console.log(
      `                  ${account.district}, ${account.state} ${account.pincode}  |  mobile ${account.mobile}`,
    );
    console.log(
      `                  ${owned.length} report${owned.length === 1 ? "" : "s"}: ${owned.map((c) => c.publicId).join(", ")}\n`,
    );
  });

  console.log("Track by Complaint ID + mobile:\n");
  for (const seed of SEED_COMPLAINTS) {
    const account = SEED_ACCOUNTS[seed.accountIndex];
    const final = seed.statusHistory[seed.statusHistory.length - 1].code;
    console.log(
      `  ${seed.publicId}  |  mobile ${account.mobile}  |  ${seed.subCategoryCode}  |  ${final}`,
    );
  }

  console.log(`\n  ${SEED_COMPLAINTS[2].publicId} runs the full timeline through DISPOSED.`);
  console.log(
    `  ${SEED_COMPLAINTS[3].publicId} has no transaction ref and no suspect details — it exercises\n  the "still needed from you" card.\n`,
  );
  console.log(
    `Seeded ${SEED_OFFICES.length} cyber offices. These are invented, not real police stations.`,
  );
  console.log(
    "Aadhaar numbers begin 0000, which UIDAI never issues. Nothing is checked against UIDAI.\n",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  });
