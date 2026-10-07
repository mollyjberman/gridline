# Gridline Daily

A signed-in, once-per-day Formula racing higher-or-lower game.

## Website

[https://f1higherorlower.infinite-flow.chatgpt.site](https://f1higherorlower.infinite-flow.chatgpt.site)

## Development

```sh
npm install
npm run db:generate
npm run dev
```

The local Sites runtime provides a test ChatGPT identity. Scores, answers, and streaks are stored in Cloudflare D1; browser storage is not authoritative.

## Checks

```sh
npm run lint
npx tsc --noEmit
npm run build
```
