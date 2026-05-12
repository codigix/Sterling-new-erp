# Technical Specification: Add Rate Field to Outward Challans

Add a "Rate" field to Outward Challan items to capture service prices at the outsourcing stage and auto-fill this rate when creating a Vendor Invoice from the Challan.

## Technical Context
- **Language**: JavaScript (Node.js/React)
- **Database**: MySQL (via Prisma and direct queries)
- **Backend**: Express.js
- **Frontend**: React (Tailwind CSS, Lucide icons)

## Implementation Approach

### 1. Database Changes
- Add `rate` column to `outward_challan_items` table.
- **Type**: `Decimal(15, 2)`
- **Default**: `0.00`

### 2. Backend Updates
- **Prisma Schema**: Update `backend/prisma/schema.prisma` to include the `rate` field in `outward_challan_items`.
- **Production Controller**: 
    - Update `createOutwardChallan` to extract `rate` from item payloads and include it in the bulk `INSERT` query for `outward_challan_items`.
    - `getOutwardChallanDetails` already uses `SELECT *`, so it will automatically include the `rate` field once the table is updated.
- **Accounting Controller**:
    - `getOutwardChallanDetails` (used for invoice creation) already uses `SELECT *`, so it will automatically include the `rate` field.

### 3. Frontend Updates
- **CreateOutwardChallanModal**:
    - Add a "Rate" column to the `itemColumns` in `DataTable`.
    - Update `handleAddItem` to include `rate: 0` in the new item object.
    - Update `handleItemChange` to handle changes to the `rate` field.
- **ViewOutwardChallanModal**:
    - Add a "Rate" column to the items table to display the captured rate.
    - Add an "Amount" column (Qty * Rate) for clarity.
- **RecordVendorInvoiceModal**:
    - Update `handleChallanChange` to use `item.rate` from the fetched challan items instead of hardcoding it to `0`.
    - The calculation logic for item amount and sub-totals already exists and will work with the auto-filled rate.

## Source Code Structure Changes
- `backend/prisma/schema.prisma`: Modify model `outward_challan_items`.
- `backend/controllers/productionController.js`: Modify `createOutwardChallan`.
- `frontend/src/components/production/CreateOutwardChallanModal.jsx`: Add Rate input field.
- `frontend/src/components/production/ViewOutwardChallanModal.jsx`: Display Rate and Amount.
- `frontend/src/pages/accounting/RecordVendorInvoiceModal.jsx`: Update auto-fill logic.

## Data Model / API / Interface Changes
### Database Schema (`outward_challan_items`)
| Column | Type | Description |
| --- | --- | --- |
| rate | Decimal(15, 2) | Agreed service price for the item |

### API Changes
- `POST /production/outward-challans`: Payload for `items` will now include `rate`.
- `GET /production/outward-challans/:id`: Response for `items` will now include `rate`.
- `GET /accounting/vendor-invoices/challans/:id`: Response for `items` will now include `rate`.

## Verification Approach
1. **Database**: Run Prisma migration or SQL script to add the `rate` column.
2. **Backend**: Verify that saving a challan with rates correctly stores them in the database.
3. **Frontend (Challan)**:
    - Open "Create Outward Challan" modal.
    - Add items and enter rates.
    - Save and verify the rates are visible in the "View Challan" modal.
4. **Frontend (Invoice)**:
    - Open "Record Vendor Invoice" modal.
    - Select "Outsourcing Challan" as the source.
    - Select the previously created challan.
    - Verify that the "Rate" and "Amount" fields are correctly auto-filled based on the challan data.
5. **Linting**: Run `npm run lint` in the frontend and check for any errors.
