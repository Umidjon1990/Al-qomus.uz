import { storage } from "./storage";
import { batchProcessGhoniyEntries } from "./ai";

async function main() {
  const batchSize = parseInt(process.argv[2]) || 100;
  const totalBatches = parseInt(process.argv[3]) || 10;
  
  console.log(`\n🚀 G'oniy tarjima boshlandi: ${batchSize} ta so'z × ${totalBatches} batch = ${batchSize * totalBatches} ta so'z`);
  
  let totalProcessed = 0;
  let totalSaved = 0;
  let totalFailed = 0;
  let totalCost = 0;
  const startTime = Date.now();

  for (let batch = 1; batch <= totalBatches; batch++) {
    try {
      const entries = await storage.getGhoniyEntriesForProcessing(batchSize);
      
      if (entries.length === 0) {
        console.log(`\n✅ Barcha G'oniy so'zlari tarjima qilindi!`);
        break;
      }
      
      console.log(`\n--- Batch ${batch}/${totalBatches} (${entries.length} so'z) ---`);
      
      const { results, summary } = await batchProcessGhoniyEntries(
        entries.map(e => ({
          id: e.id,
          arabic: e.arabic,
          arabicDefinition: e.arabicDefinition || undefined,
          type: e.type || undefined,
        })),
        (current, total, result) => {
          if (current % 10 === 0 || current === total) {
            process.stdout.write(`\r  [${current}/${total}] ${result.success ? '✓' : '✗'} ${result.meanings.length} ma'no`);
          }
        }
      );
      
      let savedCount = 0;
      for (const result of results) {
        if (result.success && result.meanings.length > 0) {
          await storage.updateGhoniyProcessedEntry(
            result.id,
            result.uzbekSummary,
            JSON.stringify(result.meanings),
            result.wordType
          );
          savedCount++;
        }
      }
      
      totalProcessed += summary.total;
      totalSaved += savedCount;
      totalFailed += summary.failed;
      totalCost += summary.estimatedCost;
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`\n  ✅ Saved: ${savedCount}/${summary.total} | Cost: $${summary.estimatedCost.toFixed(4)} | Time: ${summary.totalTime / 1000}s | Total: ${totalSaved} saved, $${totalCost.toFixed(4)} spent, ${elapsed}s elapsed`);
      
      const remaining = await storage.getGhoniyRemainingCount();
      console.log(`  📊 Qolgan: ${remaining} ta so'z`);
      
      if (entries.length < batchSize) {
        console.log(`\n✅ Barcha G'oniy so'zlari tarjima qilindi!`);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`\n❌ Batch ${batch} xatosi:`, error?.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 YAKUNIY NATIJALAR:`);
  console.log(`   Jami qayta ishlangan: ${totalProcessed}`);
  console.log(`   Muvaffaqiyatli saqlangan: ${totalSaved}`);
  console.log(`   Muvaffaqiyatsiz: ${totalFailed}`);
  console.log(`   Umumiy xarajat: $${totalCost.toFixed(4)}`);
  console.log(`   Umumiy vaqt: ${totalTime} soniya`);
  console.log(`${'='.repeat(60)}\n`);
  
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
