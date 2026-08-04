# Sales Ordering - Flowchart Untuk Team SOD

Dokumen ini ialah versi ringkas untuk presentation. Prinsip paling penting:

> Sales Ordering mengurus customer, PO, SOA, Sales Order dan laporan. Warehouse mengurus batch, DO, driver dan penghantaran. Sales Order tidak menolak stok.

## 1. Flow utama: PO hingga delivered

```mermaid
flowchart LR
    start([Customer PO / Order])

    subgraph salesTeam ["Sales Ordering"]
        receive[Terima PO]
        customer[Semak Customer Master]
        review[Analisis SKU, qty dan tarikh]
        soa{SOA / payment lulus?}
        createSo[Buat Sales Order]
        submit[Submit kepada Warehouse]
    end

    subgraph warehouseTeam ["Warehouse"]
        queue[Terima fulfilment request]
        createDo[Buat DO dan pilih batch]
        dispatch[Dispatch dengan driver dan kenderaan]
        checkin[Location Check-In]
        delivered([Delivered])
    end

    start --> receive
    receive --> customer
    customer --> review
    review --> soa
    soa -->|"Lulus"| createSo
    createSo --> submit
    submit --> queue
    queue --> createDo
    createDo --> dispatch
    dispatch --> checkin
    checkin --> delivered

    style soa fill:#FFECBD,stroke:#FFC943
    style createSo fill:#C2E5FF,stroke:#3DADFF
    style createDo fill:#C6FAF6,stroke:#5AD8CC
    style delivered fill:#CDF4D3,stroke:#66D575
```

## 2. Jika SOA atau maklumat PO bermasalah

```mermaid
flowchart TD
    issue([PO diterima])
    review[Semak PO]
    complete{Maklumat lengkap?}
    hold[Letak ON HOLD dan minta pembetulan]
    soa[Semak SOA / payment]
    approved{Lulus?}
    rejected[REJECTED dan maklumkan client]
    order[Buat Sales Order]

    issue --> review
    review --> complete
    complete -->|"Tidak"| hold
    hold -.->|"PO dibetulkan"| review
    complete -->|"Ya"| soa
    soa --> approved
    approved -->|"Tidak"| rejected
    approved -->|"Ya"| order

    style complete fill:#FFECBD,stroke:#FFC943
    style approved fill:#FFECBD,stroke:#FFC943
    style hold fill:#FFCDC2,stroke:#FF7556
    style rejected fill:#FFCDC2,stroke:#FF7556
```

## 3. Siapa buat apa?

```mermaid
flowchart LR
    sales[Sales Ordering]
    system[(System record and audit trail)]
    warehouse[Warehouse]
    delivery[Driver / Delivery]

    sales -->|"Customer, PO, SOA, SO"| system
    system -->|"Fulfilment request"| warehouse
    warehouse -->|"DO, batch, driver, vehicle"| system
    system -->|"QR trace and location"| delivery
    delivery -->|"Check-in and delivery update"| system

    style sales fill:#C2E5FF,stroke:#3DADFF
    style warehouse fill:#C6FAF6,stroke:#5AD8CC
    style delivery fill:#CDF4D3,stroke:#66D575
```

## 4. Contoh satu order

```text
Customer: AEON CO. (M) BHD
Customer ID: 3000/838
Customer PO: 80104000925726
Sales Order / Proforma: S0019476
Payment term: 60 DAYS
Delivery address: Lot 3, Jalan 6C/12, Bandar Baru Bangi

Sales masukkan 3 item dan 81 carton.
Sales Order diluluskan.
Warehouse kemudian pilih batch dan cipta DO.
DO direkodkan dengan driver, kenderaan dan destination.
Driver buat Location Check-In.
Sales boleh trace status delivery melalui DO.
```

## 5. Ayat paling mudah untuk presentation

```text
Sales Ordering jawab: "Apa customer order dan bolehkah order itu diproses?"
Warehouse jawab: "Batch mana yang dikeluarkan dan bagaimana ia dihantar?"
System jawab: "Apa sejarah order dari PO sampai delivered?"
```

## 6. Perkara yang sistem tidak ubah

- Production tetap bekerja seperti biasa.
- Sales Order tidak mengurangkan inventory.
- Warehouse masih memilih batch dan mencipta DO.
- QR batch dan Location Check-In kekal di bawah Warehouse traceability.
- DO kekal sebagai rekod rasmi untuk stock-out dan delivery.

## 7. Flow tambahan: AI Invoice Intake

```mermaid
flowchart LR
    upload[/BD atau SOD upload PDF/]
    r2[(Cloudflare R2)]
    ai[Gemini baca dokumen]
    match[Match Customer dan SKU Master]
    validate{Data lengkap dan totals betul?}
    review[SOD semak draft]
    approve{SOD approve?}
    so[Buat official Sales Order]
    fix[Betulkan data / minta dokumen baru]
    warehouse[Submit kepada Warehouse]

    upload --> r2
    r2 --> ai
    ai --> match
    match --> validate
    validate -->|"Ya"| review
    validate -->|"Tidak"| fix
    fix -.->|"Semak semula"| review
    review --> approve
    approve -->|"Ya"| so
    approve -->|"Tidak"| fix
    so --> warehouse

    style r2 fill:#DCCCFF,stroke:#874FFF
    style ai fill:#C2E5FF,stroke:#3DADFF
    style validate fill:#FFECBD,stroke:#FFC943
    style approve fill:#FFECBD,stroke:#FFC943
    style so fill:#CDF4D3,stroke:#66D575
```

### Rule AI yang wajib difahami

```text
AI membaca dan mencadangkan data.
SOD menyemak dan approve.
System create SO selepas approve.
Warehouse create DO dan pilih batch.
```

AI tidak boleh terus create DO atau mengurangkan stok.
