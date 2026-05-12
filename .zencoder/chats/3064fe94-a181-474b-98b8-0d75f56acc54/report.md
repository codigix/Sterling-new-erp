# Completion Report: Vendor Invoice support for PO and Outsourcing Challan

## Feature Summary
The Vendor Invoice module has been enhanced to support two primary source types: **Purchase Orders (PO)** and **Outsourcing Challans**. This allows the accounting department to record invoices not only for material purchases but also for outsourced services/processing where an outward challan is the primary reference.

## Technical Changes

### 1. Database Schema Updates
- **`vendor_invoices` table**:
    - `purchase_order_id` is now nullable to allow for non-PO based invoices.
    - Added `outward_challan_id` (INT, NULL) as a foreign key to the `outward_challans` table.
- **`vendor_invoice_items` table**:
    - `po_item_id` is now nullable.
    - Added `challan_item_id` (INT, NULL) as a foreign key to the `outward_challan_items` table.

### 2. Backend Implementation
- **Controller (`accountingController.js`)**:
    - `createVendorInvoice`: Updated to accept and store `outward_challan_id` and item-level `challan_item_id`.
    - `getVendorInvoices` & `getVendorInvoiceById`: Modified SQL queries to left join with `outward_challans` to retrieve and display challan numbers alongside PO numbers.
    - `getEligibleOutwardChallans`: New endpoint to fetch challans that are in 'SUBMITTED' or 'RECEIVED' status and haven't been invoiced yet.
    - `getOutwardChallanDetails`: New endpoint to fetch specific challan details and its items for auto-populating the invoice form.
- **Routes (`accountingRoutes.js`)**:
    - Added `GET /vendor-invoices/eligible-challans`.
    - Added `GET /vendor-invoices/challans/:id`.

### 3. Frontend Implementation
- **Modal (`RecordVendorInvoiceModal.jsx`)**:
    - Added a **Source Type Selection** (Radio buttons) to switch between 'Purchase Order' and 'Outsourcing Challan'.
    - Implemented `handleChallanChange` to fetch challan data and auto-populate vendor info, project info, and item rows.
    - Item mapping: `dispatch_qty` (from challan) is mapped to invoice quantity. Users can manually enter rates as challans typically don't carry pricing information.
    - Updated `handleSubmit` to include the correct source ID and item-level mappings based on the selected `sourceType`.

## Verification Results
- **PO-based Invoices**: Verified that creating invoices from existing Purchase Orders still works as expected, including auto-population of rates and quantities.
- **Challan-based Invoices**: 
    - Verified that eligible challans are correctly listed when 'Outsourcing Challan' is selected.
    - Confirmed that selecting a challan correctly populates the vendor, project, and items table.
    - Verified that the invoice is saved correctly with `outward_challan_id`.
- **UI/UX**: The list view correctly displays either the PO Number or the Challan Number depending on the source of the invoice.
- **Data Integrity**: Foreign key constraints and nullable fields were verified to ensure no data corruption occurs when switching between source types.
