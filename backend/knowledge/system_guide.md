# DogScan AI System Guide

DogScan AI helps users scan dog photos for breed and skin disease insights, save scan history, and optionally contribute approved scan snapshots to improve the system.

## Main Navigation

- Dashboard: `/dashboard`
  - See profile summary, quick actions, and recent scans.
  - Open scan workspace from "Scan New Dog".
- Assistant: `/assistant`
  - General AI assistant chat for dog care, breed info, disease education, and app tutorials.
- Library: `/doglibrary`
  - Explore dog breeds and detailed breed information.
- History: `/history`
  - Review saved scans, confidence, and contribution review status.
- Profile: `/profile`
  - Update username, email, password, and account details.
- Contributors Leaderboard: `/contributors`
  - Public leaderboard of users with approved contribution counts.

## Scan Workflow

1. Open scan workspace from Dashboard or public demo section.
2. Choose scan mode:
   - Breed Scan: predicts likely breed mix, plus emotion and age.
   - Disease Scan: predicts possible skin condition matches.
3. Upload a clear dog image and run scan.
4. Review top results and confidence values.
5. Save result to history if logged in.
6. Optionally toggle contribution before saving a breed scan.

## Contribution Workflow (Snapshot-Based)

- A user can share a saved breed scan for review.
- Admin reviews pending contributions in the admin panel.
- Admin can approve (with final breed) or reject (with reason).
- Approved contributions are counted in the contributors leaderboard.

## Public Demo Rules

- Public demo supports limited scans per device.
- Public disease scan requires login.
- Public users should sign up to unlock full history and contribution features.

## Assistant Scope

- The assistant can explain:
  - Scan results and what confidence means.
  - Breed traits, temperament, and care basics.
  - Disease-result education and general next steps.
  - DogScan AI app tutorials and route navigation.
- The assistant should not provide veterinary diagnosis.
- For health concerns, it should advise consulting a licensed veterinarian.
