import { tavily }  from '@tavily/core';
import "dotenv/config";
const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
async function test() {
  try {
    const webSearchResponse = await client.search("France", { searchDepth: "advanced" });
    console.log("Tavily Success:", webSearchResponse.results.length, "results");
  } catch (e) {
    console.error("Tavily Error:", e.message);
  }
}
test();
