# owner-withdrawal

## Purpose

Owner withdrawal records product leaving the store for the owner's personal use (gift, personal consumption, off-the-books sale). The capability decrements product stock, persists an auditable movement row distinguishable from generic manual adjustments, requires no cash session interaction, and is gated to admin users. The baseline below describes the capability as designed before this delta. The first delta is in `openspec/changes/owner-withdrawal/spec.md`.

## Requirements

### Requirement: Capability exists

The system SHALL provide an owner-withdrawal capability. A capability spec exists in `openspec/specs/owner-withdrawal/spec.md` and tracks future deltas via ADDED, MODIFIED, and REMOVED sections under change folders.

#### Scenario: First delta lands

- **WHEN** the `owner-withdrawal` change is archived
- **THEN** the change's ADDED Requirements become part of the capability spec
- **AND** no MODIFIED or REMOVED sections exist for this greenfield delta
