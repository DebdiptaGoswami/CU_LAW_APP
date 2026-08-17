async function tryUrl(url) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY || "AIzaSy_fake_key"
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-lite",
        input: "test"
      })
    });
    console.log(url, "=>", res.status, await res.text());
}

async function test() {
    await tryUrl("https://generativelanguage.googleapis.com/v1beta2/interactions");
    await tryUrl("https://generativelanguage.googleapis.com/v1beta/interactions");
    await tryUrl("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:interactions");
    await tryUrl("https://generativelanguage.googleapis.com/v1alpha/interactions");
    await tryUrl("https://generativelanguage.googleapis.com/v1/interactions");
}
test();
