# Image ships Chromium's system libs; Chrome itself is fetched to match our puppeteer version.
FROM ghcr.io/puppeteer/puppeteer:latest
WORKDIR /app
COPY --chown=pptruser package*.json ./
RUN npm ci && npx puppeteer browsers install chrome
COPY --chown=pptruser . .
RUN npm run build && npm prune --omit=dev
CMD ["node", "dist/index.js"]
