# Financial Credit Risk & SOA Aging Evaluation Rule

Whenever evaluating Statement of Account (SOA) credit risk, aging breakdown (Current, 1-30 days, 31-60 days, >60 days), and overdue balances for Purchase Orders or Invoices:
1. ALWAYS evaluate invoice due dates against the **SOA Statement Date** (`soa.statementDate`) or current evaluation date, NEVER relative to a historical PO date.
2. Evaluating aging relative to a historical PO creation date causes future overdue invoices in the SOA ledger to be falsely marked as "Belum Matang" (Current).
3. **Dynamic Aging Tolerance**: An invoice is strictly overdue ONLY if `daysOverdue > creditTermDays`. For example, a 30-day term allows invoices to be up to 30 days past their due date (falling into the '1 Month' aging bucket) before triggering a REJECT.
4. **Credit Limit Breach**: If a Credit Limit is provided, ANY transaction that pushes the total outstanding balance over the limit must trigger **REJECT** / **CREDIT HOLD**, regardless of whether the debt is overdue.
