import { getActiveInventory } from './src/app/actions/dailyReport';

async function main() {
  const res = await getActiveInventory("2026-07-03");
  console.log(JSON.stringify(res.data.storeroomBatches.filter((b: any) => b.category.includes('BOX')), null, 2));
}

main().catch(console.error);
