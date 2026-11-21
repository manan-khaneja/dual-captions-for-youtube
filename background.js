// Network fallback for translation. Runs here (not in the page) so the
// request is not blocked by YouTube's cross-origin rules.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "translate") return;

  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t" +
    "&sl=" + encodeURIComponent(msg.sl) +
    "&tl=" + encodeURIComponent(msg.tl) +
    "&q=" + encodeURIComponent(msg.text);

  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((data) => {
      const text = (data[0] || []).map((seg) => seg[0] || "").join("");
      sendResponse({ ok: true, text });
    })
    .catch((err) => sendResponse({ ok: false, error: String(err) }));

  return true; // keep the channel open for the async reply
});
