# Goal Description

Prevent duplicate vendors from being created when the vendor code is the same but the name is spelled differently, or vice versa, during manual entry and Excel upload.

## Proposed Changes

### cleanmax website 1 & 2

#### [MODIFY] src/views/AddExcel.jsx
- Update the import logic to find existing vendors by either endorCode or endorName.
- If a match is found, override the incoming row's endorCode and endorName with the existing ones to ensure they group together under the exact same identity.

#### [MODIFY] src/views/Vendors.jsx
- Add a 'Vendor Code' input field to the Vendor Registration form (optional).
- If left blank, it will auto-generate. If provided, or if the 'Vendor Name' matches an existing one, it will auto-link to that existing vendor identity.

## Verification Plan
- Manually add a vendor with an existing name but different code (should group under existing).
- Manually add with existing code but different name (should group under existing).
- Upload Excel with similar variations (should not create duplicate vendor identities in the dashboard).
