import { getActiveInventory } from './src/app/actions/dailyReport';

async function main() {
  const res = await getActiveInventory("2026-07-03");
  console.log("TODAY DOs FOR CAP:");
  console.log(JSON.stringify(res.data.todayDOs.filter((b: any) => b.category.includes('CAP')), null, 2));
  
  console.log("\nSTOREROOM BATCHES FOR CAP:");
  console.log(JSON.stringify(res.data.storeroomBatches.filter((b: any) => b.category.includes('CAP')), null, 2));
}

main().catch(console.error);
