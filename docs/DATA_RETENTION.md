# Data retention and deletion

Production operators must set `HODGEFORM_DATA_RETENTION_DAYS` and align it with customer contracts, legal requirements, backup retention, and log retention.

- Authentication identity can be deleted through Better Auth's verified user-deletion flow.
- A user who is the last owner of a workspace must transfer ownership before deleting the account.
- API tokens belonging to a deleted user are revoked.
- Workspace/business records are not silently deleted with a user because release receipts and audit evidence can be shared organizational records. Workspace deletion/export requires an explicit customer/operator procedure.
- Signed release receipts and audit evidence may require retention longer than transient application logs. Contracts should define this explicitly.
- Backups must age out according to the published retention schedule; deletion from the live database does not imply instant removal from immutable backups.

For broad public availability, publish the actual operator retention schedule and complete legal/DPA review for the jurisdictions served.
