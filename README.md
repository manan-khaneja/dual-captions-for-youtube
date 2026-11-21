# Dual Captions for YouTube

A tiny browser extension that shows a second caption line on YouTube: the original captions stay where they are, and a small box shows the same line translated into your language.

It ships set up for **French to English**, and you can point it at any other language pair by editing two lines.

## The problem

If you are learning a language, at some point the textbook stops being enough. You have to spend hours inside the language: films, podcasts, lectures, cooking videos, people arguing about football. That is how your ear gets used to real speed and real phrasing.

YouTube is the obvious place to do this, and its captions help a lot. But YouTube only shows **one caption track at a time**. So you are stuck choosing:

- **Captions in the language you are learning.** Good for your ear and your reading, but every time you hit a word you don't know, you pause, open a translator, lose the thread, and come back.
- **Captions auto-translated into your own language.** Now you understand everything, but you have stopped reading the language you came to learn.

What you actually want is both at once: the original line, and its meaning right next to it, so a quick glance fills the gap and you keep watching.

## The idea, from first principles

There are complicated ways to get two caption tracks. You can fetch YouTube's caption files directly (YouTube now guards those behind tokens, and it breaks often). You can listen to the audio and transcribe it yourself (slow, and less accurate than the captions that already exist).

This extension does neither. It starts from one observation:

> The caption you need translated is already on your screen, as plain text.

So the whole thing is three steps:

1. A few times a second, read the caption text YouTube is currently showing.
2. If the text changed, translate it.
3. Show the translation in a small box on top of the video.

That is all. There are no accounts, no servers of ours, no settings pages, and about 200 lines of code you can read in ten minutes.

## What it does

- **Two lines at once.** YouTube shows the original captions as usual. The box shows the translation of whatever line is on screen.
- **Draggable box.** Click and drag the box anywhere on the video so it never covers what you are watching.
- **Remembers where you put it.** The position is saved and restored on the next video.
- **Works in fullscreen.** The box lives inside the player, so it comes along when you go fullscreen, and the text gets larger.
- **Keeps up with the video.** It checks the caption four times a second and only translates when the text actually changes. Lines it has already seen are answered from memory, so rewinding is instant.
- **Stays out of the way.** When there are no captions on screen, the box shrinks to a small grey hint.

## Install

This is not on the Chrome Web Store. You load it yourself, which takes about a minute.

1. Download this repository: green **Code** button, then **Download ZIP**, and unzip it. (Or `git clone` it.)
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder (the one containing `manifest.json`).

It should also work in other Chromium browsers such as Edge, Brave, and Arc, though it has only been used in Chrome.

## Use

1. Open a YouTube video in the language you are learning.
2. Turn on captions **in that language** (the CC button, or press `C`).
3. The box appears at the top of the video with the translation. Drag it wherever you like.

If the box says "Waiting for captions" while captions are visible, refresh the page once.

Videos with human-written captions work best, because each line arrives whole. With auto-generated captions, YouTube reveals the line word by word, so the translation rewrites itself as the sentence grows.

## Use it for your own languages

The default is French to English. To change it, open `content.js` and edit the first two settings at the top:

```js
const SOURCE_LANG = "fr"; // language of the captions you turn on
const TARGET_LANG = "en"; // language shown in the box
```

Use the standard two-letter language codes. Some examples:

| You are watching | You want to read | `SOURCE_LANG` | `TARGET_LANG` |
|---|---|---|---|
| Spanish | English | `"es"` | `"en"` |
| Japanese | English | `"ja"` | `"en"` |
| German | Hindi | `"de"` | `"hi"` |
| English | Portuguese | `"en"` | `"pt"` |
| Korean | French | `"ko"` | `"fr"` |

After saving, go back to `chrome://extensions`, click the reload icon on the extension, and refresh your YouTube tab.

A third setting, `POLL_MS`, controls how often the caption is checked (250 milliseconds by default).

## How the translation works

By default the extension sends each caption line to Google Translate's public web endpoint (`translate.googleapis.com`), the same one many small tools use. It needs no API key and costs nothing. Any language pair Google Translate supports should work.

Two things worth knowing about it:

- **It is unofficial.** Google does not document or guarantee this endpoint. It can rate-limit heavy use or change without notice. If a request fails, the box holds the last line and tries again a few seconds later.
- **Caption text leaves your browser.** The line on screen is sent to Google to be translated. Nothing else is sent, and nothing is sent to the author of this extension.

There is also an optional on-device route. Recent versions of Chrome include a built-in translator that runs entirely on your computer. Click the box once and the extension asks Chrome to download the language model for your pair; if Chrome allows it, translations are then done locally, with no network requests and no rate limits. If it is not available, the extension simply carries on with the web endpoint.

If you would rather use a different translation service (DeepL, LibreTranslate, your own model), the only place to change is the small `fetch` call in `background.js`.

## Files

| File | What it is |
|---|---|
| `manifest.json` | Tells Chrome what the extension is and which pages it runs on (only `youtube.com`). |
| `content.js` | The whole idea: read the caption, translate it, show the box, handle dragging. |
| `content.css` | How the box looks. |
| `background.js` | Makes the translation request. |

## Known limits

- **YouTube only**, on `www.youtube.com` in a desktop browser.
- **Captions must exist** in the language you are learning. No captions, nothing to translate.
- **It reads YouTube's page structure.** If YouTube renames its caption elements, the box will stop finding text until the selectors in `content.js` are updated.
- **Machine translation** is a help for understanding, not a perfect rendering. Idioms and jokes will sometimes come out odd.

## Make it yours

This is free for anyone to use, copy, change, and share, under the [MIT License](LICENSE). Fork it, restyle the box, add a language picker, wire in a dictionary. If you build something better on top of it, that is the point.
