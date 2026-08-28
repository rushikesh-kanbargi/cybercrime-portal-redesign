# Cybercrime Portal — AI Engineering Instructions

## Mission
Build a production-oriented, world-class Indian cybercrime reporting, prevention, intelligence, investigation, and response platform.

The repository is the source of truth. Work incrementally and never invent missing facts, APIs, legal powers, integrations, datasets, or government capabilities.

## Required Reading Before Work
1. `AGENTS.md`
2. `requirements/00-project-vision.md`
3. `requirements/01-principles.md`
4. `requirements/21-roadmap.md`
5. `execution/STATUS.md`
6. The requirement files relevant to the current task
7. The existing codebase affected by the task

## Execution Loop
For each task:
1. Inspect existing implementation before designing changes.
2. Select the highest-priority unblocked requirement.
3. Check dependencies and acceptance criteria.
4. Implement only that scope.
5. Run relevant tests and checks.
6. Review security, privacy, accessibility, and regression risk.
7. Update `execution/STATUS.md`.
8. Update `execution/CHANGELOG.md`.
9. Record significant decisions in `execution/DECISIONS.md`.
10. If blocked, record the blocker in `execution/BLOCKERS.md` and do not fabricate a workaround as a real integration.

## Anti-Hallucination Rules
Never invent:
- Government APIs or undocumented endpoints
- Bank, telecom, payment, or platform integrations
- Legal/regulatory requirements
- Police or agency authorities/powers
- External datasets
- Production credentials or secrets
- Real victim/suspect data
- Undocumented infrastructure capabilities

Use `UNKNOWN`, `DEPENDENCY`, or `NEEDS_VERIFICATION` when appropriate.
Mocks/adapters/interfaces may be created, but must be explicitly labeled as mocks or placeholders.

## Existing-Code-First
Prefer extending the current architecture over replacing it. Before adding a new abstraction, inspect:
- existing components
- services
- API routes
- database models
- authentication/authorization
- design system
- tests
- deployment configuration

Do not modify unrelated functionality unless required by the approved requirement.

## Security
Treat this as a security-sensitive platform. Prioritize:
- least privilege
- strong authentication and authorization
- input validation
- secure file handling
- auditability
- privacy and data minimization
- abuse prevention
- encryption
- secrets management
- secure defaults
- resilience and disaster recovery

## AI Safety
AI is assistive, not authoritative. AI must not independently:
- determine guilt
- fabricate evidence
- alter original evidence
- expose restricted information
- freeze funds
- block infrastructure
- make irreversible legal decisions

AI-generated outputs should identify supporting evidence/source and confidence where appropriate.

## Product Principle
Do not build merely a complaint form. Build toward:

Detect → Check → Protect → Report → Correlate → Investigate → Disrupt → Recover → Learn

## Completion Standard
A requirement is complete only when:
- implementation exists
- acceptance criteria are met
- relevant tests pass
- security/privacy concerns are addressed
- accessibility is considered
- no obvious regression exists
- documentation is updated
- `execution/STATUS.md` is updated

Never mark work complete merely because code was written.
