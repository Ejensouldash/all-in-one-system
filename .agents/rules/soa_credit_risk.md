# Financial Credit Risk & SOA Aging Evaluation Rule

Whenever evaluating Statement of Account (SOA) credit risk, aging breakdown (Current, 1-30 days, 31-60 days, >60 days), and overdue balances for Purchase Orders or Invoices:
1. ALWAYS evaluate invoice due dates against the **SOA Statement Date** (`soa.statementDate`) or current evaluation date, NEVER relative to a historical PO date.
2. Evaluating aging relative to a historical PO creation date causes future overdue invoices in the SOA ledger to be falsely marked as "Belum Matang" (Current).
3. If the total overdue balance as of the SOA statement date is > RM 0, the system decision must trigger **REJECT** / **CREDIT HOLD** to enforce strict credit control.
