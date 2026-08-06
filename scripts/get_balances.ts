import { getActiveInventory } from "../src/app/actions/dailyReport";

async function main() {
  console.log("Fetching active inventory...");
  const res = await getActiveInventory();
  if (!res.success) {
    console.error("Error fetching inventory:");
    return;
  }
  
  const storeroomBatches = (res as any).data?.storeroomBatches || [];
  
  // Try to determine Line 1 vs Line 2 if possible. 
  // In `getActiveInventory`, we saw `isOtherLineLabel` used to differentiate labels.
  // 8 = 800ml (Line 2 usually?), 4 = 425ml (Line 1 usually?).
  // Let's just print them out.
  
  console.log("=== STOREROOM BALANCES ===");
  const lines = {
    "Line 1": [] as any[],
    "Line 2": [] as any[],
    "Unknown": [] as any[]
  };

  for (const batch of storeroomBatches) {
    let line = "Unknown";
    
    // Guessing based on common patterns in the app (e.g. 425ml = Line 1, 800ml = Line 2)
    // We will just group by category for now.
    let cat = batch.category?.toLowerCase() || "";
    let batchNo = batch.batchNo?.toLowerCase() || "";
    if (batchNo.startsWith('4') || cat.includes('425')) {
      line = "Line 1";
    } else if (batchNo.startsWith('8') || cat.includes('800')) {
      line = "Line 2";
    } else {
      line = "Unknown";
    }
    
    lines[line as keyof typeof lines].push(batch);
  }

  console.log(JSON.stringify(lines, null, 2));
}

main().catch(console.error);
