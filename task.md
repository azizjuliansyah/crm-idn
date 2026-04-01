# CRM Infrastructure Migration: Phase 7 (Deep Clean)

Goal: Remove all 134 occurrences of legacy `DashboardContext` and centralize state/notifications in `useAppStore`.

## Progress Tracking

- [x] **Phase 1: Foundation**
  - [x] Integrate `toast` state into `useAppStore`
  - [x] Create `GlobalToast` component
  - [x] Add `GlobalToast` to root `layout.tsx`

- [x] **Batch 4: Sales Core (Leads & Quotations)**
  - [x] Refactor `LeadsView.tsx` and `ConvertLeadModal.tsx`
  - [x] Refactor `QuotationsView.tsx` and `QuotationFormView.tsx`
  - [x] Replace `setToast` with `showToast`

- [x] **Batch 5: Operations Core (Invoices, Proformas, Tasks)**
  - [x] Refactor Invoices module (Page, View, FormView)
  - [x] Refactor Proformas module (Page, View, FormView)
  - [x] Refactor Project Tasks components
  - [x] Standardize notification flow in Operations

- [/] **Batch 6: Support & Knowledge**
  - [ ] Refactor Complaints module
  - [ ] Refactor Support module
  - [ ] Refactor SOPs module
  - [ ] Refactor Knowledge Base module

- [ ] **Batch 7: AI & Miscellaneous**
  - [ ] Refactor AI components
  - [ ] Refactor Log Activity
  - [ ] Final Layout / Header / Sidebar store unification

- [ ] **Batch 8: Settings & Profile**
  - [ ] Refactor Settings pages (Profile, Company, Team, etc.)

- [ ] **Final Cleanup**
  - [ ] Global search for `useDashboard` (Ensure 0 occurrences)
  - [ ] Delete `src/app/dashboard/DashboardContext.tsx`
  - [ ] Remove `DashboardProvider` wrap from all layouts
