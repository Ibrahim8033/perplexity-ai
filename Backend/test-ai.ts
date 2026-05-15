import { streamText } from 'ai';

async function test() {
  try {
    const result = streamText({
      model: "openai/gpt-5.4",
      prompt: "Hello",
    });
    for await (const chunk of result.textStream) {
      console.log(chunk);
    }
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}
test();
