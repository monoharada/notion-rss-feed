# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Run the RSS feed fetcher
npm start

# Required environment variables
export NOTION_TOKEN=<your-notion-integration-token>
export FEEDER_DB_ID=<feeder-database-id>
export READER_DB_ID=<reader-database-id>
```

## Architecture

This is a Node.js application that fetches RSS feeds and stores articles in Notion databases. It runs on GitHub Actions (weekly schedule or manual trigger).

### Module Structure

- `index.js` - Entry point, imports and calls `main()` from main.js
- `main.js` - Main orchestration: validates env vars, fetches enabled feeds from Feeder DB, processes each feed
- `notionClient.js` - Factory for Notion API client
- `rssParser.js` - Factory for rss-parser instance
- `rssToNotion.js` - Core business logic:
  - `getFeeds()` - Queries Feeder DB for enabled feeds (Enable=true)
  - `fetchAndStoreFeedArticles()` - Parses RSS, filters by date/keywords, checks duplicates, stores to Reader DB
  - `isDuplicatedInReader()` - Checks if article URL already exists

### Data Flow

1. Query Feeder DB for feeds where `Enable=true`
2. For each feed, parse RSS and filter articles:
   - Must be within 1 week
   - Must match keywords (if specified)
   - Must not already exist in Reader DB (duplicate check by Link)
3. Create pages in Reader DB with Title, Link, PublishedAt, Description, OGP images

### Notion Database Schema

**Feeder DB** (input):
- `Enable` (Checkbox) - Whether to process this feed
- `URL` (URL) - RSS feed URL
- `keyword` (Multi-select) - Optional keywords for filtering

**Reader DB** (output):
- `Title` (Title)
- `Link` (URL)
- `PublishedAt` (Date)
- `Description` (Rich text)
- `OGP` (Files & media) - Images from enclosure or description
