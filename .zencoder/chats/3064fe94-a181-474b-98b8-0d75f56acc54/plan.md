# Spec and build

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:

- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step: Technical Specification

Assess the task's difficulty, as underestimating it leads to poor outcomes.

- easy: Straightforward implementation, trivial bug fix or feature
- medium: Moderate complexity, some edge cases or caveats to consider
- hard: Complex logic, many caveats, architectural considerations, or high-risk changes

Create a technical specification for the task that is appropriate for the complexity level:

- Review the existing codebase architecture and identify reusable components.
- Define the implementation approach based on established patterns in the project.
- Identify all source code files that will be created or modified.
- Define any necessary data model, API, or interface changes.
- Describe verification steps using the project's test and lint commands.

Save the output to `d:\codigix-projects\Sterling-new-erp\.zencoder\chats\3064fe94-a181-474b-98b8-0d75f56acc54/spec.md` with:

- Technical context (language, dependencies)
- Implementation approach
- Source code structure changes
- Data model / API / interface changes
- Verification approach

If the task is complex enough, create a detailed implementation plan based on `d:\codigix-projects\Sterling-new-erp\.zencoder\chats\3064fe94-a181-474b-98b8-0d75f56acc54/spec.md`:

- Break down the work into concrete tasks (incrementable, testable milestones)
- Each task should reference relevant contracts and include verification steps
- Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function).

Save to `d:\codigix-projects\Sterling-new-erp\.zencoder\chats\3064fe94-a181-474b-98b8-0d75f56acc54/plan.md`. If the feature is trivial and doesn't warrant this breakdown, keep the Implementation step below as is.

**Stop here.** Present the specification (and plan, if created) to the user and wait for their confirmation before proceeding.

---

### [ ] Step: Implementation

Implement the task according to the technical specification:

1. [x] **Database & Schema Updates**:
    - Update `backend/prisma/schema.prisma` to add `rate` to `outward_challan_items`.
    - Apply the database change (using a script or Prisma).
2. [x] **Backend Controller Update**:
    - Update `backend/controllers/productionController.js` to handle `rate` in `createOutwardChallan`.
3. [x] **Frontend - Create Challan Modal**:
    - Update `frontend/src/components/production/CreateOutwardChallanModal.jsx` to include the `rate` input field.
4. [x] **Frontend - View Challan Modal**:
    - Update `frontend/src/components/production/ViewOutwardChallanModal.jsx` to display `rate` and `amount`.
5. [x] **Frontend - Record Invoice Modal**:
    - Update `frontend/src/pages/accounting/RecordVendorInvoiceModal.jsx` to auto-fill `rate` from the challan.
6. [x] **Verification**:
    - Test the full flow from challan creation to invoice recording.
    - Run `npm run lint` in the frontend.
