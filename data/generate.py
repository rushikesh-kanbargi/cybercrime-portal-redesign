#!/usr/bin/env python3
"""
Builds the mock database from a single source of truth.

Emits:
  data/*.json      one file per entity in docs/specs/02-schema.md
  mock/seed.js     the same data as a JS global, so mock/portal.html works
                   by double-click (file:// cannot fetch local JSON)

Run:  python3 data/generate.py

HARD RULE 1: every identifier here is simulated. Aadhaar numbers begin 0000,
a range no real Aadhaar can occupy. Phones, UPI IDs, UTRs, accounts and card
numbers are placeholders. Nothing validates against any real service.
"""
import json, os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MOCK = ROOT / "mock"

# ─────────────────────────────────────────────────────── identity
aadhaar_record_sim = [
    dict(aadhaar_sim="000012345678", name="Sunita Deshpande",  dob="1958-03-14",
         mobile_sim="+91 98765 43210", email_sim="sunita@example.com",  address_pincode="411038"),
    dict(aadhaar_sim="000023456789", name="Rahul Verma",       dob="2010-11-02",
         mobile_sim="+91 98765 43211", email_sim="rahul@example.com",   address_pincode="560076"),
    dict(aadhaar_sim="000034567890", name="Priya Nair",        dob="1999-06-21",
         mobile_sim="+91 98765 43212", email_sim="priya@example.com",   address_pincode="682024"),
    dict(aadhaar_sim="000045678901", name="Imran Qureshi",     dob="1987-01-09",
         mobile_sim="+91 98765 43213", email_sim="imran@example.com",   address_pincode="226010"),
    dict(aadhaar_sim="000056789012", name="Meera Iyer",        dob="1994-09-30",
         mobile_sim="+91 98765 43214", email_sim="meera@example.com",   address_pincode="600042"),
    dict(aadhaar_sim="000067890123", name="Devendra Patil",    dob="1976-04-17",
         mobile_sim="+91 98765 43215", email_sim="devendra@example.com", address_pincode="440015"),
]
citizen_account = [
    dict(id=f"acc_{i+1:02d}", aadhaar_sim=a["aadhaar_sim"], created_at="2026-08-01T09:00:00+05:30",
         accessibility_prefs={"large_text": a["dob"] < "1966", "read_aloud": False, "language": "en"})
    for i, a in enumerate(aadhaar_record_sim)
]

# ─────────────────────────────────────────────────────── routing
cyber_office = [
    dict(id="off_01", name="Cyber Crime Police Station, Pune City",
         address="2nd Floor, Police Commissionerate, Camp", pincode="411001",
         jurisdiction_pincodes=["411001", "411038", "411045"],
         phone="+91 80 4710 1001", email="cyber.pune@example.com"),
    dict(id="off_02", name="Cyber Crime Police Station, Bengaluru South",
         address="CID Annexe, Palace Road", pincode="560001",
         jurisdiction_pincodes=["560001", "560076", "560103"],
         phone="+91 80 4710 1002", email="cyber.blr@example.com"),
    dict(id="off_03", name="Cyber Crime Police Station, Kochi City",
         address="Commissioner's Office, Marine Drive", pincode="682011",
         jurisdiction_pincodes=["682011", "682024"],
         phone="+91 80 4710 1003", email="cyber.kochi@example.com"),
    dict(id="off_04", name="Cyber Crime Police Station, Lucknow",
         address="Gomti Nagar Extension", pincode="226010",
         jurisdiction_pincodes=["226010", "226016"],
         phone="+91 80 4710 1004", email="cyber.lko@example.com"),
    dict(id="off_05", name="Cyber Crime Police Station, Chennai Central",
         address="Vepery High Road", pincode="600007",
         jurisdiction_pincodes=["600007", "600042"],
         phone="+91 80 4710 1005", email="cyber.chn@example.com"),
    dict(id="off_06", name="Cyber Crime Police Station, Nagpur",
         address="Civil Lines", pincode="440001",
         jurisdiction_pincodes=["440001", "440015"],
         phone="+91 80 4710 1006", email="cyber.ngp@example.com"),
]
officer = [
    dict(id="ofc_01", office_id="off_01", name="Insp. A. Kulkarni",  designation="Inspector",
         phone="+91 80 4710 2010", email="a.kulkarni@example.com", languages=["Marathi", "Hindi", "English"]),
    dict(id="ofc_02", office_id="off_02", name="SI R. Gowda",        designation="Sub-Inspector",
         phone="+91 80 4710 2020", email="r.gowda@example.com",    languages=["Kannada", "Hindi", "English"]),
    dict(id="ofc_03", office_id="off_03", name="Insp. S. Menon",     designation="Inspector",
         phone="+91 80 4710 2030", email="s.menon@example.com",    languages=["Malayalam", "English"]),
    dict(id="ofc_04", office_id="off_04", name="SI N. Yadav",        designation="Sub-Inspector",
         phone="+91 80 4710 2040", email="n.yadav@example.com",    languages=["Hindi", "English"]),
    dict(id="ofc_05", office_id="off_05", name="Insp. K. Rajan",     designation="Inspector",
         phone="+91 80 4710 2050", email="k.rajan@example.com",    languages=["Tamil", "English"]),
    dict(id="ofc_06", office_id="off_06", name="Insp. V. Thakre",    designation="Inspector",
         phone="+91 80 4710 2060", email="v.thakre@example.com",   languages=["Marathi", "Hindi"]),
]

# ─────────────────────────────────────────────────────── status copy map
# Per 02-schema.md §7: meaning and next action are CONSTANTS keyed on
# status + action_subtype, never stored per row.
status_copy = {
    "SUBMITTED": dict(
        title="Report sent",
        means="Your report reached the cyber cell. The clock on the bank request starts now.",
        do="Nothing. Keep your reference number somewhere you can find it.", sla_days=0),
    "RECEIVED_BY_UNIT": dict(
        title="Received by the unit",
        means="A person has it in their queue. It is not sitting in a system waiting to be noticed.",
        do="Nothing yet.", sla_days=1),
    "ASSIGNED": dict(
        title="Assigned to an officer",
        means="A named officer is handling it.",
        do="You can call the desk number on your report and quote your reference.", sla_days=2),
    "NEEDS_INFO": dict(
        title="They need one more thing",
        means="The officer cannot go further without one specific thing. It is always named.",
        do="Add the item they asked for. This is the only thing holding the case up.", sla_days=1),
    "ACTION_TAKEN:LIEN_REQUESTED": dict(
        title="Hold requested from the bank",
        means="Police have asked your bank to hold the money. The bank decides, not the police and not us.",
        do="Nothing. Most banks reply within a day or two, and you get an SMS either way.", sla_days=3),
    "ACTION_TAKEN:TAKEDOWN_REQUESTED": dict(
        title="Takedown requested from the platform",
        means="Police have asked the platform to remove the content.",
        do="Do not contact the poster yourself. Save any new copies you find.", sla_days=7),
    "ACTION_TAKEN:NOTICE_ISSUED": dict(
        title="Notice issued",
        means="A formal notice has gone to the person or company involved.",
        do="Nothing.", sla_days=15),
    "ACTION_TAKEN:SUSPECT_TRACED": dict(
        title="Account traced",
        means="The account or person that received your money has been identified.",
        do="Nothing. Your officer will tell you if a statement is needed.", sla_days=10),
    "FIR_REGISTERED": dict(
        title="FIR registered",
        means="A formal police case exists. An FIR is what lets police compel banks and platforms.",
        do="Keep the FIR number with your reference number.", sla_days=30),
    "CLOSED": dict(
        title="Closed",
        means="The case is finished. The outcome is stated plainly, good or bad.",
        do="If you disagree, the escalation ladder on your report still works.", sla_days=0),
    "WITHDRAWN": dict(
        title="Withdrawn",
        means="You asked for this report to be withdrawn.",
        do="Nothing. You can file again at any time.", sla_days=0),
}


# ─────────────────────────────────────────────────────── scenario catalogue
# docs/specs/01-scenarios.md as data. Grouped by what the victim needs.
scenario = [
    ("A1","A","Cyber bullying, harassment or stalking","P1-LIVE","Is it still happening right now?"),
    ("A2","A","Someone made a fake account of me","P1-LIVE","Is the fake profile still up?"),
    ("A3","A","Fake news or a defamatory post about me","P1-LIVE","Where is it posted, and how many have seen it?"),
    ("A4","A","Morphed or obscene images of me","P0-THREAT","Is it public, or only threatened?"),
    ("A5","A","My account was taken over","P1-ACCESS","Can you still log in?"),
    ("B1","B","Sextortion or blackmail","P0-THREAT","Is there a deadline they gave you?"),
    ("B2","B","Fake CBI or police call (digital arrest)","P0-THREAT","Are you on a call with them right now?"),
    ("B3","B","Intimidating messages or emails","P0-THREAT","Do they know where you live?"),
    ("C1","C","Fraud call, then I transferred money","P0-MONEY","When did the money leave?"),
    ("C2","C","UPI or wallet fraud","P0-MONEY","When did the money leave?"),
    ("C3","C","Card fraud or SIM swap","P0-MONEY","Is your SIM still working?"),
    ("C4","C","Net banking fraud","P0-MONEY","Do you still control the account?"),
    ("C5","C","Fake investment or trading app","P0-MONEY","How many payments did you make?"),
    ("C6","C","Loan app fraud and harassment","P0-THREAT","Are they contacting your contacts?"),
    ("C7","C","Job fraud","P2","Did you pay a registration fee?"),
    ("C8","C","Matrimonial fraud","P2","How long did it go on?"),
    ("C9","C","Crypto fraud","P0-MONEY","Do you have the wallet address?"),
    ("D1","D","Phishing link","P1-ACCESS","Did you enter anything on it?"),
    ("D2","D","Fake website or app","P1-LIVE","Is it still online?"),
    ("D3","D","QR code scam","P0-MONEY","Did you scan to receive, or to pay?"),
    ("D4","D","Fake customer care number","P0-MONEY","Where did you find the number?"),
    ("E1","E","In-game items or currency stolen","P1-ACCESS","Can you still log in to the game?"),
    ("E2","E","Gaming account taken over","P1-ACCESS","Is the email on the account still yours?"),
    ("E3","E","Paid for game currency, never received","P2","Who did you pay, and how?"),
    ("E4","E","Grooming or bullying inside a game","P0-CHILD","How old is the person affected?"),
    ("F1","F","Hacking or unauthorised access","P1-ACCESS","Is the attacker still in?"),
    ("F2","F","Ransomware","P1-ACCESS","Have you disconnected the machine?"),
    ("F3","F","My data was leaked or breached","P2","What data, and where did you see it?"),
]
GROUPS = {"A":"Harm to identity and reputation","B":"Threats and coercion","C":"Money is gone",
          "D":"Deception vectors","E":"Gaming","F":"Device and data"}
SCEN_MODULES = {
 "A1":["web_artifact","online_identity","communication_event"],
 "A2":["online_identity","web_artifact"], "A3":["web_artifact","online_identity"],
 "A4":["web_artifact","threat_record"],   "A5":["online_identity","device_event"],
 "B1":["threat_record","communication_event","online_identity"],
 "B2":["communication_event","complaint_money","financial_transaction","threat_record"],
 "B3":["communication_event"],
 "C1":["complaint_money","financial_transaction","communication_event"],
 "C2":["complaint_money","financial_transaction"],
 "C3":["complaint_money","financial_transaction","device_event"],
 "C4":["complaint_money","financial_transaction","device_event"],
 "C5":["complaint_money","financial_transaction","web_artifact"],
 "C6":["complaint_money","financial_transaction","communication_event","threat_record"],
 "C7":["complaint_money","financial_transaction","communication_event"],
 "C8":["complaint_money","financial_transaction","online_identity"],
 "C9":["complaint_money","financial_transaction"],
 "D1":["web_artifact","communication_event"], "D2":["web_artifact"],
 "D3":["web_artifact","complaint_money","financial_transaction"],
 "D4":["communication_event","complaint_money","financial_transaction"],
 "E1":["online_identity"], "E2":["online_identity","device_event"],
 "E3":["complaint_money","financial_transaction","online_identity"],
 "E4":["communication_event","online_identity","web_artifact"],
 "F1":["device_event","online_identity"], "F2":["device_event","threat_record"],
 "F3":["web_artifact","online_identity"],
}

# ─────────────────────────────────────────────────────── entry categories
# What a citizen would actually call the thing that happened to them.
# The legal grouping (A–F) still exists in `scenario`; this is the front door.
category = [
 ("scam_call","Scam calls","Someone called pretending to be your bank, a company or an officer.","phone",["C1","D4"]),
 ("money_gone","Money gone from my account","UPI, card, net banking or a wallet.","card",["C2","C3","C4"]),
 ("fake_invest","Fake investment or trading","An app or a group that promised returns.","chart",["C5","C9"]),
 ("loan_app","Loan app trouble","Harassment, threats, or your contacts being called.","alert",["C6"]),
 ("digital_arrest","Fake police or CBI call","Being told you will be arrested unless you pay.","badge",["B2"]),
 ("blackmail","Blackmail or threats","Someone demanding money, or threatening to share something.","shield",["B1","B3","A4"]),
 ("job_marriage","Job or marriage fraud","A fee you paid, or someone you met online.","briefcase",["C7","C8"]),
 ("fake_profile","Fake profile or photos of me","Someone pretending to be you, or posting about you.","user",["A2","A3"]),
 ("bullying","Online bullying or stalking","Repeated messages, harassment or threats.","message",["A1"]),
 ("hacked","Account or device hacked","You cannot get in, or someone else is inside.","lock",["A5","F1"]),
 ("suspicious","Suspicious link, QR or website","You spotted something and want it checked.","link",["D1","D2","D3"]),
 ("gaming","Gaming","In-game items, currency, or a game account.","game",["E1","E2","E3","E4"]),
 ("ransomware","Files locked or data leaked","Ransomware, or your information appearing somewhere.","file",["F2","F3"]),
]
category = [dict(id=i, title=t, blurb=b, icon=ic, scenario_ids=sc, urgent=(sc[0][0] in "BC"))
            for i, t, b, ic, sc in category]

# Whether money necessarily moved.
#   required — the scenario is defined by the loss
#   optional — it may or may not have happened yet, so we ask before we ask for details
#   none     — no plausible payment
MONEY_REQUIRED = ["C1","C2","C3","C4","C5","C7","C8","C9"]
MONEY_OPTIONAL = ["A4","B1","B2","B3","C6","D1","D2","D3","D4","E3","E4","F2"]
def money_mode(i):
    return "required" if i in MONEY_REQUIRED else "optional" if i in MONEY_OPTIONAL else "none"

def mods_for(i):
    m = [x for x in SCEN_MODULES[i] if x not in ("complaint_money", "financial_transaction")]
    if money_mode(i) != "none":
        m = ["complaint_money", "financial_transaction"] + m
    return m

scenario = [dict(id=i, group=g, group_name=GROUPS[g], title=t, urgency=u,
                 first_question=q, modules=mods_for(i), money=money_mode(i))
            for i, g, t, u, q in scenario]

# ── the form each module renders ────────────────────────────────
# Field order is deliberate: what the victim can answer fastest comes first,
# and the seven CFCFRMS points are flagged so the UI can send them early.
def F(n, label, kind, **kw):
    return dict(name=n, label=label, kind=kind, help=kw.get("help",""),
                options=kw.get("options"), seven=kw.get("seven", False),
                optional=kw.get("optional", False))

form_field = {
 "complaint_money":[
   F("from_bank_wallet_sim","Which bank, wallet or app did the money leave?","text",seven=True,
     help="The one that sent the money, not the one that received it."),
   F("from_account_last4_sim","Last 4 digits of that account","text",seven=True,
     help="Only the last four. Never the full number."),
   F("card_last4_sim","Last 4 digits of the card","text",seven=True,optional=True,
     help="Only if a card was used."),
   F("noticed_at","When did you notice?","datetime",optional=True,
     help="Different from when it happened, and both are useful."),
 ],
 "financial_transaction":[
   F("amount_inr","How much left your account?","money",
     help="If there were several payments, add each one — the total is what matters."),
   F("rail","How was it paid?","select",
     options=["UPI","Net banking","IMPS or NEFT","Card","Wallet","Crypto"]),
   F("txn_id_utr_sim","Transaction ID or UTR","text",seven=True,optional=True,
     help="Usually 12 digits. The one number a bank uses to find the money. Leave blank if you cannot find it."),
   F("txn_at","When did the money leave?","datetime",seven=True),
   F("to_identifier_sim","Where did it go?","text",optional=True,
     help="A UPI ID, account number, merchant name or wallet address, if you have it."),
   F("to_identifier_kind","What kind of destination was that?","select",optional=True,
     options=["UPI ID","Bank account","Merchant","Wallet","Crypto wallet","Card"]),
 ],
 "communication_event":[
   F("still_ongoing","Are they contacting you right now?","bool",
     help="Answer this first. It changes what we show you next."),
   F("medium","How did they reach you?","select",
     options=["Phone call","Video call","SMS","WhatsApp","Email","Social media","In an app"]),
   F("direction","Who contacted whom?","select",
     options=["They contacted me","I contacted them"],
     help="If you called a number you found online, say so — that number is the lead."),
   F("counterparty_number_sim","Their number or username","text",optional=True),
   F("occurred_at","When?","datetime"),
   F("duration_sec","Roughly how long did it last, in minutes?","number",optional=True),
   F("content_text","What did they say?","textarea",optional=True,
     help="Paste the message if you still have it."),
 ],
 "online_identity":[
   F("role","What is this account?","select",
     options=["The suspect's account","An account pretending to be me","My own account, compromised"]),
   F("platform","Which platform or game?","text"),
   F("handle_sim","Username or handle","text",optional=True),
   F("profile_url_sim","Link to the profile","url",optional=True),
   F("is_active","Is the account still active?","bool"),
   F("asset_description","What was taken?","textarea",optional=True,
     help="Items, currency, followers, anything of value."),
   F("asset_value_inr","Roughly what was it worth in rupees?","money",optional=True,
     help="Give a figure even if you are guessing. Without one, this gets treated as trivial."),
 ],
 "web_artifact":[
   F("kind","What is it?","select",
     options=["A post","An image","A video","A comment","An article","A profile",
              "A link","A QR code","A website","An app"]),
   F("is_live","Is it still up?","bool"),
   F("url_sim","Link to it","url",optional=True),
   F("is_public","Can anyone see it, or only certain people?","select",
     options=["Anyone can see it","Only certain people"]),
   F("received_via","How did it reach you?","text",optional=True,
     help="SMS, WhatsApp, email, a search result, a group."),
   F("what_it_asked_for","What did it ask you to do?","text",optional=True,
     help="Log in, pay, scan, install, share a code."),
   F("credentials_entered","Did you enter anything on it?","bool",
     help="A password, a PIN, an OTP, card details."),
   F("depicts_victim","Does it show or name the person affected?","bool"),
   F("first_seen_at","When did you first see it?","datetime",optional=True),
 ],
 "threat_record":[
   F("threat_type","What are they threatening to do?","select",
     options=["Publish or share content","Have someone arrested","Physical harm",
              "Contact family or employer","Damage or leak data"]),
   F("deadline_at","Did they give you a deadline?","datetime",optional=True,
     help="If there is one, this moves to the front of the queue."),
   F("demand_amount_inr","How much are they demanding?","money",optional=True),
   F("contacted_known_contacts","Have they contacted people you know?","bool"),
 ],
 "attachment":[
   F("files","Screenshots, photos, recordings or documents","files",optional=True,
     help="A screenshot of the message, a photo of the receipt, a recording of the call, a screen "
          "recording, a bank statement. Any type, any size — attach as many as you like."),
   F("what_it_shows","What do these show?","text",optional=True,
     help="One line is enough. It saves the officer opening every file to find out."),
 ],
 "location":[
   F("current_pincode","PIN code where you are staying now","text",
     help="This decides which cyber crime unit receives your report. If you are away from your "
          "registered address — studying, working, travelling — put where you actually are."),
 ],
 "device_event":[
   F("device_kind","Which device?","select",
     options=["Phone","Laptop","Desktop","Tablet","Router or network","Business system"]),
   F("attacker_still_has_access","Do they still have access?","bool",
     help="If you are not sure, say no and we will treat it as ongoing anyway."),
 ],
}

# ─────────────────────────────────────────────────────── complaints
# Each entry is one worked example: the complaint core plus only the evidence
# modules its scenario actually needs.
C = []


def complaint(ref, acct, scen, band, rel, narrative, submitted, office, ofc,
              protected=False, display=None, money=None, txns=(), modules=None,
              statuses=(), notes=(), attachments=()):
    C.append(dict(
        complaint=dict(
            id=f"cmp_{len(C)+1:02d}", reference_no=ref, account_id=acct,
            reporter_relationship=rel, victim_age_band=band, victim_display_name=display,
            narrative_raw=narrative, scenario_ids=scen, submitted_at=submitted,
            is_protected_identity=protected),
        routing=dict(id=f"rt_{len(C)+1:02d}", office_id=office, officer_id=ofc,
                     routed_at=submitted, routed_by_rule="victim_pincode", is_cross_state=False),
        money=money, transactions=list(txns), modules=modules or {},
        statuses=list(statuses), notes=list(notes), attachments=list(attachments)))


def st(n, s, at, sub=None, actor="system"):
    return dict(id=f"se_{n}", status=s, action_subtype=sub, occurred_at=at, actor=actor)


# ── C1 · vishing → UPI · the flagship worked example ──────────────
complaint(
    "CCR-SIM-2026-004182", "acc_01", ["C1", "C2"], "senior", "self",
    "Got a call from someone saying he was from my bank and my account would be blocked today. "
    "He knew my name. He asked for the OTP and I gave it. Rs 80,000 went out on UPI around 7:40 pm.",
    "2026-08-25T19:52:00+05:30", "off_01", "ofc_01",
    money=dict(from_bank_wallet_sim="State Bank of India", from_account_last4_sim="4471",
               card_last4_sim=None, noticed_at="2026-08-25T19:48:00+05:30"),
    txns=[dict(id="txn_01", amount_inr=80000, rail="upi", txn_id_utr_sim="441922078853",
               txn_at="2026-08-25T19:42:00+05:30", to_identifier_sim="rk.traders@ybl",
               to_identifier_kind="upi")],
    modules=dict(communication_event=[dict(
        id="ce_01", medium="call", direction="inbound",
        counterparty_number_sim="+91 79045 11238", counterparty_handle_sim=None,
        occurred_at="2026-08-25T19:31:00+05:30", duration_sec=640,
        content_text="Caller claimed to be from the bank's fraud desk.",
        still_ongoing=False, evidence_attachment_id="att_01")]),
    statuses=[st("01a", "SUBMITTED", "2026-08-25T19:52:00+05:30"),
              st("01b", "RECEIVED_BY_UNIT", "2026-08-25T19:53:00+05:30"),
              st("01c", "ASSIGNED", "2026-08-25T20:01:00+05:30", actor="officer"),
              st("01d", "ACTION_TAKEN", "2026-08-25T20:06:00+05:30", "LIEN_REQUESTED", "officer")],
    attachments=[dict(id="att_01", filename="bank-sms.png", mime="image/png",
                      capture_method="screenshot", sha256="9f2c41ab7e05d3ca8814bb60f7392ad1c04e6b95",
                      scan_status="clean", what_it_shows="The debit SMS from the bank",
                      uploaded_at="2026-08-25T19:50:00+05:30")],
    notes=[dict(id="nt_01", body="Victim called 1930 before filing. Reference quoted.",
                author="citizen", created_at="2026-08-25T19:55:00+05:30")])

# ── C5 · fake investment app · proves the repeating transaction row ──
complaint(
    "CCR-SIM-2026-003911", "acc_04", ["C5"], "adult", "self",
    "I joined a WhatsApp group about share trading. The app showed my profit going up. I paid four "
    "times. When I tried to withdraw they asked for a tax payment and then removed me from the group.",
    "2026-08-18T14:10:00+05:30", "off_04", "ofc_04",
    money=dict(from_bank_wallet_sim="State Bank of India", from_account_last4_sim="8820",
               card_last4_sim=None, noticed_at="2026-08-18T13:30:00+05:30"),
    txns=[dict(id="txn_02", amount_inr=5000,   rail="upi",        txn_id_utr_sim="338104772910",
               txn_at="2026-07-02T11:15:00+05:30", to_identifier_sim="gm.ventures@okaxis", to_identifier_kind="upi"),
          dict(id="txn_03", amount_inr=25000,  rail="imps",       txn_id_utr_sim="338119024466",
               txn_at="2026-07-14T16:40:00+05:30", to_identifier_sim="A/c ending 3391", to_identifier_kind="account"),
          dict(id="txn_04", amount_inr=120000, rail="netbanking", txn_id_utr_sim="441806335128",
               txn_at="2026-08-01T10:05:00+05:30", to_identifier_sim="A/c ending 3391", to_identifier_kind="account"),
          dict(id="txn_05", amount_inr=200000, rail="netbanking", txn_id_utr_sim="441822901774",
               txn_at="2026-08-18T09:22:00+05:30", to_identifier_sim="A/c ending 3391", to_identifier_kind="account")],
    modules=dict(web_artifact=[dict(
        id="wa_01", url_sim="https://quantx-pro.trade", kind="app",
        is_public=True, is_live=True, first_seen_at="2026-06-28T00:00:00+05:30",
        received_via="WhatsApp group invite", what_it_asked_for="deposits and a withdrawal tax",
        credentials_entered=False, depicts_victim=False, evidence_attachment_id="att_02")]),
    statuses=[st("02a", "SUBMITTED", "2026-08-18T14:10:00+05:30"),
              st("02b", "RECEIVED_BY_UNIT", "2026-08-18T14:12:00+05:30"),
              st("02c", "ASSIGNED", "2026-08-18T15:30:00+05:30", actor="officer"),
              st("02d", "ACTION_TAKEN", "2026-08-18T17:02:00+05:30", "LIEN_REQUESTED", "officer"),
              st("02e", "NEEDS_INFO", "2026-08-20T10:15:00+05:30", actor="officer")],
    attachments=[dict(id="att_02", filename="app-screen-recording.mp4", mime="video/mp4",
                      capture_method="screen_recording", sha256="9f2c41ab7e05d3ca8814bb60f7392ad1c04e6b95",
                      scan_status="clean", what_it_shows="The fake profit dashboard, and the withdrawal being refused",
                      uploaded_at="2026-08-18T14:08:00+05:30")],
    notes=[dict(id="nt_02", body="Officer asked for the UTR of the first payment.",
                author="officer", created_at="2026-08-20T10:15:00+05:30")])

# ── B2 · digital arrest · two urgency tiers at once ────────────────
complaint(
    "CCR-SIM-2026-004055", "acc_06", ["B2", "C1"], "senior", "child_relative",
    "A video call came from people in police uniform saying a parcel in my father's name had drugs "
    "and he would be arrested. They kept him on the call for two hours. He transferred Rs 2,50,000.",
    "2026-08-22T12:05:00+05:30", "off_06", "ofc_06", display="D. Patil",
    money=dict(from_bank_wallet_sim="State Bank of India", from_account_last4_sim="6612",
               card_last4_sim=None, noticed_at="2026-08-22T11:55:00+05:30"),
    txns=[dict(id="txn_06", amount_inr=250000, rail="netbanking", txn_id_utr_sim="552211480637",
               txn_at="2026-08-22T11:40:00+05:30", to_identifier_sim="A/c ending 7745",
               to_identifier_kind="account")],
    modules=dict(
        communication_event=[dict(
            id="ce_02", medium="video_call", direction="inbound",
            counterparty_number_sim="+91 63820 77451", counterparty_handle_sim=None,
            occurred_at="2026-08-22T09:38:00+05:30", duration_sec=7920,
            content_text="Callers in uniform, fake CBI backdrop. Told him hanging up was an admission of guilt.",
            still_ongoing=False, evidence_attachment_id=None)],
        threat_record=[dict(id="tr_01", threat_type="arrest", demand_amount_inr=250000,
                            deadline_at="2026-08-22T13:00:00+05:30", contacted_known_contacts=False)]),
    statuses=[st("03a", "SUBMITTED", "2026-08-22T12:05:00+05:30"),
              st("03b", "RECEIVED_BY_UNIT", "2026-08-22T12:06:00+05:30"),
              st("03c", "ASSIGNED", "2026-08-22T12:20:00+05:30", actor="officer"),
              st("03d", "ACTION_TAKEN", "2026-08-22T12:44:00+05:30", "LIEN_REQUESTED", "officer"),
              st("03e", "ACTION_TAKEN", "2026-08-24T16:00:00+05:30", "SUSPECT_TRACED", "officer"),
              st("03f", "FIR_REGISTERED", "2026-08-25T11:00:00+05:30", actor="officer")],
    notes=[dict(id="nt_03", body="Reported by the victim's daughter. Victim is 72 and still shaken.",
                author="citizen", created_at="2026-08-22T12:07:00+05:30")])

# ── C3 · card fraud + SIM swap · the OTP catch-22 ──────────────────
complaint(
    "CCR-SIM-2026-004120", "acc_05", ["C3"], "adult", "self",
    "My phone stopped getting signal in the evening. By morning Rs 62,000 had gone from my card. "
    "The bank said an OTP was used. I never received it.",
    "2026-08-24T08:30:00+05:30", "off_05", "ofc_05",
    money=dict(from_bank_wallet_sim="State Bank of India", from_account_last4_sim="4471",
               card_last4_sim="4471", noticed_at="2026-08-24T07:50:00+05:30"),
    txns=[dict(id="txn_07", amount_inr=62000, rail="card", txn_id_utr_sim="771043928155",
               txn_at="2026-08-24T02:11:00+05:30", to_identifier_sim="Online merchant, Singapore",
               to_identifier_kind="merchant")],
    modules=dict(device_event=[dict(id="de_01", device_kind="phone",
                                    attacker_still_has_access=True)]),
    statuses=[st("04a", "SUBMITTED", "2026-08-24T08:30:00+05:30"),
              st("04b", "RECEIVED_BY_UNIT", "2026-08-24T08:31:00+05:30"),
              st("04c", "ASSIGNED", "2026-08-24T09:15:00+05:30", actor="officer"),
              st("04d", "ACTION_TAKEN", "2026-08-24T09:40:00+05:30", "LIEN_REQUESTED", "officer")],
    notes=[dict(id="nt_04",
                body="All contact by email. SMS channel unusable — this is the scenario that breaks it.",
                author="system", created_at="2026-08-24T08:30:00+05:30")])

# ── D3 · QR code scam · near the money, teaches while it collects ──
complaint(
    "CCR-SIM-2026-004160", "acc_03", ["D3"], "adult", "self",
    "Someone wanted to buy my sofa on a marketplace. He sent a QR code and said scanning it would "
    "send me the money. I scanned it and entered my PIN and Rs 14,500 left my account instead.",
    "2026-08-24T16:20:00+05:30", "off_03", "ofc_03",
    money=dict(from_bank_wallet_sim="Paytm Wallet", from_account_last4_sim="9013",
               card_last4_sim=None, noticed_at="2026-08-24T16:07:00+05:30"),
    txns=[dict(id="txn_08", amount_inr=14500, rail="upi", txn_id_utr_sim="441924460388",
               txn_at="2026-08-24T16:05:00+05:30", to_identifier_sim="rk.traders@ybl",
               to_identifier_kind="upi")],
    modules=dict(web_artifact=[dict(
        id="wa_02", url_sim="upi://pay?pa=rk.traders@ybl&am=14500", kind="qr",
        is_public=False, is_live=False, first_seen_at="2026-08-24T16:02:00+05:30",
        received_via="WhatsApp, from the buyer", what_it_asked_for="payment",
        credentials_entered=True, depicts_victim=False, evidence_attachment_id=None)]),
    statuses=[st("05a", "SUBMITTED", "2026-08-24T16:20:00+05:30"),
              st("05b", "RECEIVED_BY_UNIT", "2026-08-24T16:21:00+05:30")])

# ── A1 · cyber bullying · minor, no money, no guardian gate ────────
complaint(
    "CCR-SIM-2026-004044", "acc_02", ["A1", "A2"], "minor", "self",
    "A group from my class made a page about me and keep posting edited photos. "
    "I do not want my parents to find out.",
    "2026-08-19T21:40:00+05:30", "off_02", "ofc_02", protected=True,
    modules=dict(
        web_artifact=[dict(id="wa_03", url_sim="https://socialapp.example/p/9f31c",
                           kind="profile", is_public=True, is_live=True,
                           first_seen_at="2026-08-19T00:00:00+05:30", received_via=None,
                           what_it_asked_for=None, credentials_entered=False,
                           depicts_victim=True, evidence_attachment_id="att_03")],
        online_identity=[dict(id="oi_01", role="impersonating_victim", platform="SocialApp",
                              handle_sim="notpriya_real",
                              profile_url_sim="https://socialapp.example/notpriya_real",
                              display_name_sim="Priya N.",
                              first_seen_at="2026-08-19T00:00:00+05:30", is_active=True,
                              asset_description=None, asset_value_inr=None)]),
    statuses=[st("06a", "SUBMITTED", "2026-08-19T21:40:00+05:30"),
              st("06b", "RECEIVED_BY_UNIT", "2026-08-19T21:42:00+05:30"),
              st("06c", "ASSIGNED", "2026-08-20T10:00:00+05:30", actor="officer"),
              st("06d", "ACTION_TAKEN", "2026-08-20T12:30:00+05:30", "TAKEDOWN_REQUESTED", "officer")],
    attachments=[dict(id="att_03", filename="screenshots.pdf", mime="application/pdf",
                      capture_method="file_picker", sha256="9f2c41ab7e05d3ca8814bb60f7392ad1c04e6b95",
                      scan_status="clean", what_it_shows="Six posts from the page",
                      uploaded_at="2026-08-19T21:38:00+05:30")],
    notes=[dict(id="nt_05", body="Child-protection routing applied. No guardian notification sent.",
                author="system", created_at="2026-08-19T21:40:00+05:30")])

# ── A4 · NCII · the protected-identity path, with its audit trail ──
complaint(
    "CCR-SIM-2026-004071", "acc_03", ["A4", "B1"], "adult", "self",
    "Someone morphed my photo and says they will post it unless I pay.",
    "2026-08-21T23:05:00+05:30", "off_03", "ofc_03", protected=True, display=None,
    modules=dict(
        web_artifact=[dict(id="wa_04", url_sim=None, kind="image", is_public=False, is_live=False,
                           first_seen_at="2026-08-21T22:40:00+05:30", received_via="Direct message",
                           what_it_asked_for=None, credentials_entered=False,
                           depicts_victim=True, evidence_attachment_id=None)],
        threat_record=[dict(id="tr_02", threat_type="expose_content", demand_amount_inr=15000,
                            deadline_at="2026-08-26T20:00:00+05:30", contacted_known_contacts=True)]),
    statuses=[st("07a", "SUBMITTED", "2026-08-21T23:05:00+05:30"),
              st("07b", "RECEIVED_BY_UNIT", "2026-08-21T23:06:00+05:30"),
              st("07c", "ASSIGNED", "2026-08-22T09:00:00+05:30", actor="officer")],
    notes=[dict(id="nt_06", body="Identity masked in all case views. Reveal requires a logged action.",
                author="system", created_at="2026-08-21T23:05:00+05:30")])

# ── E1 · gaming assets · rupee value or police treat it as trivial ──
complaint(
    "CCR-SIM-2026-004098", "acc_02", ["E1", "E2"], "minor", "parent_guardian",
    "Someone got into my son's game account and moved his skins and coins to another account. "
    "He paid real money for those over two years.",
    "2026-08-23T18:15:00+05:30", "off_02", "ofc_02", display="R. Verma",
    modules=dict(online_identity=[dict(
        id="oi_02", role="victim_compromised", platform="Skyforge Online",
        handle_sim="notpriya_real", profile_url_sim=None, display_name_sim=None,
        first_seen_at="2026-08-23T17:00:00+05:30", is_active=False,
        asset_description="2 rare skins and roughly 12,000 in-game coins",
        asset_value_inr=31000)]),
    statuses=[st("08a", "SUBMITTED", "2026-08-23T18:15:00+05:30"),
              st("08b", "RECEIVED_BY_UNIT", "2026-08-23T18:20:00+05:30"),
              st("08c", "ASSIGNED", "2026-08-24T11:00:00+05:30", actor="officer")])

# ── F2 · ransomware · quarantine preserves, never deletes ──────────
complaint(
    "CCR-SIM-2026-004135", "acc_04", ["F2"], "adult", "self",
    "Our office desktop and the backup drive are both locked. A note on screen asks for payment "
    "in crypto by Friday. The business has stopped.",
    "2026-08-24T10:40:00+05:30", "off_04", "ofc_04",
    modules=dict(
        device_event=[dict(id="de_02", device_kind="desktop", attacker_still_has_access=None)],
        threat_record=[dict(id="tr_03", threat_type="expose_content", demand_amount_inr=400000,
                            deadline_at="2026-08-28T00:00:00+05:30", contacted_known_contacts=False)]),
    statuses=[st("09a", "SUBMITTED", "2026-08-24T10:40:00+05:30"),
              st("09b", "RECEIVED_BY_UNIT", "2026-08-24T10:41:00+05:30"),
              st("09c", "ASSIGNED", "2026-08-24T12:00:00+05:30", actor="officer"),
              st("09d", "NEEDS_INFO", "2026-08-25T09:30:00+05:30", actor="officer")],
    attachments=[dict(id="att_04", filename="ransom-note.exe", mime="application/x-msdownload",
                      capture_method="file_picker", sha256="9f2c41ab7e05d3ca8814bb60f7392ad1c04e6b95",
                      scan_status="quarantined",
                      what_it_shows="The dropper itself. Preserved for the forensic lab, never deleted.",
                      uploaded_at="2026-08-24T10:38:00+05:30")],
    notes=[dict(id="nt_07", body="Containment advice shown before any question was asked.",
                author="system", created_at="2026-08-24T10:40:00+05:30")])

# ─────────────────────────────────────────────────────── audit + systemic
identity_reveal_log = [
    dict(id="irl_01", complaint_id="cmp_07", revealed_by="ofc_03",
         revealed_at="2026-08-22T09:12:00+05:30",
         reason="Needed to contact the victim to confirm the deadline in the threat.")
]
counterparty_cluster = [
    dict(id="cc_01", identifier_sim="rk.traders@ybl", identifier_kind="upi",
         complaint_ids=["cmp_01", "cmp_05"], total_amount_inr=3140000, victim_count=42,
         first_seen_at="2026-08-04T00:00:00+05:30", last_seen_at="2026-08-25T19:42:00+05:30"),
    dict(id="cc_02", identifier_sim="gm.ventures@okaxis", identifier_kind="upi",
         complaint_ids=["cmp_02"], total_amount_inr=890000, victim_count=17,
         first_seen_at="2026-08-11T00:00:00+05:30", last_seen_at="2026-08-18T09:22:00+05:30"),
    dict(id="cc_03", identifier_sim="+91 79045 11238", identifier_kind="phone",
         complaint_ids=["cmp_01"], total_amount_inr=0, victim_count=96,
         first_seen_at="2026-08-02T00:00:00+05:30", last_seen_at="2026-08-25T19:31:00+05:30"),
    dict(id="cc_04", identifier_sim="https://quantx-pro.trade", identifier_kind="url",
         complaint_ids=["cmp_02"], total_amount_inr=1210000, victim_count=23,
         first_seen_at="2026-06-28T00:00:00+05:30", last_seen_at="2026-08-18T09:22:00+05:30"),
    dict(id="cc_05", identifier_sim="0x7a3f…c19b (Ethereum)", identifier_kind="crypto_wallet",
         complaint_ids=[], total_amount_inr=760000, victim_count=8,
         first_seen_at="2026-07-19T00:00:00+05:30", last_seen_at="2026-08-24T00:00:00+05:30"),
]

# ─────────────────────────────────────────────────────── flatten + write
def flat(key, inner=None):
    out = []
    for c in C:
        cid = c["complaint"]["id"]
        rows = c[key] if inner is None else c["modules"].get(key, [])
        if rows is None:
            continue
        if isinstance(rows, dict):
            rows = [rows]
        for r in rows:
            out.append(dict(complaint_id=cid, **r))
    return out


tables = {
    "aadhaar_record_sim":    aadhaar_record_sim,
    "citizen_account":       citizen_account,
    "cyber_office":          cyber_office,
    "officer":               officer,
    "scenario":              scenario,
    "category":              category,
    "form_field":            form_field,
    "status_copy":           status_copy,
    "complaint":             [c["complaint"] for c in C],
    "routing":               flat("routing"),
    "complaint_money":       flat("money"),
    "financial_transaction": flat("transactions"),
    "communication_event":   flat("communication_event", 1),
    "online_identity":       flat("online_identity", 1),
    "web_artifact":          flat("web_artifact", 1),
    "threat_record":         flat("threat_record", 1),
    "device_event":          flat("device_event", 1),
    "attachment":            flat("attachments"),
    "complaint_note":        flat("notes"),
    "status_event":          flat("statuses"),
    "identity_reveal_log":   identity_reveal_log,
    "counterparty_cluster":  counterparty_cluster,
}

DATA.mkdir(exist_ok=True)
for name, rows in tables.items():
    (DATA / f"{name}.json").write_text(
        json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

(MOCK / "seed.js").write_text(
    "/* GENERATED by data/generate.py — do not edit by hand.\n"
    "   Every value is simulated. Aadhaar numbers begin 0000, a range no real\n"
    "   Aadhaar can occupy. Loaded by portal.html via <script>, because file://\n"
    "   cannot fetch local JSON. */\n"
    "window.DB = " + json.dumps(tables, indent=2, ensure_ascii=False) + ";\n",
    encoding="utf-8")

n = sum(len(v) for v in tables.values() if isinstance(v, list))
print(f"wrote {len(tables)} tables, {n} rows -> data/*.json")
print(f"wrote mock/seed.js ({(MOCK / 'seed.js').stat().st_size // 1024} KB)")
for name, rows in tables.items():
    print(f"  {name:24} {len(rows):3}")
