import { askPerplexity } from "./lib/api.ts";
import { BACKEND_URL } from "./lib/config.ts";
console.log("BACKEND_URL", BACKEND_URL);

async function test() {
  try {
    await askPerplexity("test", null, 
      (chunk) => process.stdout.write(chunk),
      (sources) => console.log("\nSOURCES:", sources)
    );
  } catch (e) {
    console.error("\nCAUGHT ERROR:", e.message);
  }
}
test();
