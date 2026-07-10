import { setOpeningStock } from './src/app/actions/warehouse-reports';

async function test() {
  await setOpeningStock({
    batchNumber: 'TEST-01',
    sku: 'p800_12',
    openingQty: 100,
    month: 7,
    year: 2026,
    userId: '123'
  });
  console.log("Done");
}

test();
