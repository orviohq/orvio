# orvio

A browser keyboard rhythm game centered on music added through YouTube links, with **4, 5, 6, 7 and 8-key modes**. Built-in original tracks are also available.

[Play orvio](https://orvio-play.pages.dev/) · [Source code](https://github.com/orviohq/orvio)

## Play

Open the game in a browser with a keyboard. Add a YouTube link to your library, wait for the song and chart to be ready, then choose an available key mode and difficulty. Video availability and preparation can vary; not every YouTube link can be played.

Press the corresponding keys when notes reach the judgment line. Hold long notes until their tails reach the line. Key bindings and play options can be adjusted in settings.

## Your browser library

The game client runs in your browser. Its library, settings and saved play data use storage on this device in this browser; they are not an account-based cloud library. Clearing site data or changing browsers can make locally stored content unavailable. Browser storage limits and permissions can also affect saving. Adding YouTube-linked music requires network access.

## Run locally

```sh
npm ci
npm run dev
```

Create a production build and run the tests:

```sh
npm run build
npm test
```

## License and credits

The project declares the MIT license in `package.json`. YouTube-linked music belongs to its respective rights holders; the project license does not grant rights to that music.

### Private deployment configuration

Set `PUBLIC_YOUTUBE_API_ORIGIN` to the approved HTTPS audio service origin in the private build environment. Do not commit its value, an `.env` file, API credentials, or generated bundles to this repository. Direct browser requests necessarily show the configured origin to the browser. A missing or invalid origin fails closed before audio acquisition.
