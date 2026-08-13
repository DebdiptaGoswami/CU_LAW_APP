const key = process.env.GEMINI_API_KEY || "AIzaSy_fake_test_key";
async function test() {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta2/interactions?key=${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemini-3.6-flash",
        input: "Tell me a joke"
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
}
test();
