/**
 * articles.json をローカルルールで採点し、スコア40以上のみ filtered-articles.json に出力する。
 * Claude が利用できない/失敗した場合のフォールバック用途。
 */

import fs from 'fs';
import path from 'path';
import { getEnvInt, runMain } from '../utils.js';

const DOMAIN_TIERS = {
  40: new Set(['ishadeed.com', 'adrianroselli.com', 'webkit.org']),
  30: new Set([
    'smashingmagazine.com',
    'uxdesign.cc',
    'developer.chrome.com',
    'web.dev',
    'www.bram.us',
    'www.designsystemscollective.com',
  ]),
  20: new Set([
    'css-tricks.com',
    'nerdy.dev',
    'developer.mozilla.org',
    'blog.jxck.io',
    'frontender-ua.medium.com',
    'feedpress.me',
  ]),
  10: new Set(['zenn.dev', 'javascript.plainenglish.io', 'coliss.com', 'medium.com', 'qiita.com']),
};

const TOPIC_KEYWORDS = [
  { label: 'design system', score: 30, words: ['design system', 'design token', 'component library', 'semantic token'] },
  { label: 'a11y', score: 30, words: ['accessibility', 'a11y', 'wcag', 'aria', 'screen reader'] },
  {
    label: 'css features',
    score: 30,
    words: ['view transition', 'container query', 'cascade layer', ':has(', 'subgrid'],
  },
  {
    label: 'web standards',
    score: 30,
    words: ['web component', 'shadow dom', 'custom element', 'html specification', 'specification'],
  },
  { label: 'ui/ux', score: 20, words: ['interaction design', 'user experience', 'information architecture'] },
  { label: 'gen ai', score: 20, words: ['claude', 'gpt', 'llm', 'ai agent', 'prompt engineering'] },
];

const HARD_EXCLUDE = [
  // 初学者・入門
  'beginner',
  'beginners',
  'getting started',
  'complete guide',
  'tutorial for beginners',
  '初心者',
  '入門',
  'はじめて',
  // 体験談・リスト記事っぽい
  'my journey',
  'how i learned',
  '私の経験',
  'top ',
  ' tips',
  ' things every',
  ' easy steps',
  // HTML mail / backend etc
  'html email',
  'html mail',
  'newsletter',
  'devops',
  'infrastructure',
  'backend',
  // CSSプリプロセッサ
  'scss',
  'sass',
  'less',
  'stylus',
  'プリプロセッサ',
  // vibe coding（除外）
  'vibe coding',
  'バイブコーディング',
];

const DOMAIN_EXCLUDE_COMBOS = [
  { domain: 'qiita.com', words: ['tutorial', '入門', '初心者', 'メモ', '備忘録'] },
  { domain: 'medium.com', words: ['beginner', 'introduction', 'simple guide'] },
  { domain: 'zenn.dev', words: ['入門', '初心者', 'やってみた', '試してみた'] },
];

function normalizeText(value) {
  if (!value) return '';
  return String(value).toLowerCase();
}

function getDomainScore(domain) {
  if (!domain) return 0;
  for (const [scoreStr, domains] of Object.entries(DOMAIN_TIERS)) {
    if (domains.has(domain)) return Number(scoreStr);
  }
  return 0;
}

function matchesAny(text, words) {
  for (const w of words) {
    if (text.includes(w)) return true;
  }
  return false;
}

function computeScore(article) {
  const title = normalizeText(article.title);
  const desc = normalizeText(article.description);
  const domain = normalizeText(article.domain);
  const haystack = `${title}\n${desc}`;

  for (const combo of DOMAIN_EXCLUDE_COMBOS) {
    if (domain === combo.domain && matchesAny(haystack, combo.words.map((w) => w.toLowerCase()))) {
      return { score: 0, reasons: [`exclude combo: ${combo.domain}`] };
    }
  }

  if (matchesAny(haystack, HARD_EXCLUDE)) {
    return { score: 0, reasons: ['exclude keyword'] };
  }

  let score = 0;
  const reasons = [];

  const domainScore = getDomainScore(domain);
  if (domainScore > 0) {
    score += domainScore;
    reasons.push(`domain +${domainScore} (${domain})`);
  }

  for (const topic of TOPIC_KEYWORDS) {
    const topicWords = topic.words.map((w) => w.toLowerCase());
    if (matchesAny(haystack, topicWords)) {
      score += topic.score;
      reasons.push(`${topic.label} +${topic.score}`);
    }
  }

  // 軽い減点（ガイド/チュートリアル寄り）
  const tutorialPenalty = getEnvInt('FILTER_TUTORIAL_PENALTY', 15);
  if (tutorialPenalty > 0 && matchesAny(haystack, ['guide', 'tutorial', 'introduction'])) {
    score -= tutorialPenalty;
    reasons.push(`tutorial-ish -${tutorialPenalty}`);
  }

  return { score: Math.max(0, score), reasons };
}

async function main() {
  console.log('[INFO] === Local Filter Started ===');

  const inputPath = path.resolve(process.cwd(), 'articles.json');
  const outputPath = path.resolve(process.cwd(), 'filtered-articles.json');

  const minScore = getEnvInt('FILTER_MIN_SCORE', 40);
  const recommendedScore = getEnvInt('FILTER_RECOMMENDED_SCORE', 70);
  console.log(`[INFO] Filter thresholds: min=${minScore}, recommended=${recommendedScore}`);

  if (!fs.existsSync(inputPath)) {
    console.log('[WARN] articles.json not found. Writing empty filtered-articles.json');
    fs.writeFileSync(outputPath, '[]\n', 'utf-8');
    return;
  }

  const articles = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  if (!Array.isArray(articles)) {
    throw new Error('articles.json must be an array');
  }

  const filtered = [];
  const scoreBuckets = { low: 0, mid: 0, high: 0 };
  let scoredCount = 0;
  let scoreSum = 0;
  let scoreMin = Infinity;
  let scoreMax = -Infinity;

  for (const a of articles) {
    if (!a || typeof a !== 'object') continue;
    const { score, reasons } = computeScore(a);
    scoredCount++;
    scoreSum += score;
    scoreMin = Math.min(scoreMin, score);
    scoreMax = Math.max(scoreMax, score);
    if (score < minScore) scoreBuckets.low++;
    else if (score < recommendedScore) scoreBuckets.mid++;
    else scoreBuckets.high++;

    if (score < minScore) continue;

    const ai_status = score >= recommendedScore ? '推奨' : '保留';
    const ai_reason = `[${ai_status}] (heuristic) score=${score}; ${reasons.join(', ')}`.slice(0, 2000);

    filtered.push({
      ...a,
      ai_status,
      ai_score: score,
      ai_reason,
    });
  }

  fs.writeFileSync(outputPath, JSON.stringify(filtered, null, 2) + '\n', 'utf-8');
  console.log(`[INFO] Saved ${filtered.length} filtered articles to ${outputPath}`);
  if (scoredCount > 0) {
    const avg = (scoreSum / scoredCount).toFixed(1);
    console.log(
      `[INFO] Score stats: count=${scoredCount}, min=${Number.isFinite(scoreMin) ? scoreMin : 0}, max=${Number.isFinite(scoreMax) ? scoreMax : 0}, avg=${avg}`
    );
    console.log(`[INFO] Score buckets: <${minScore}=${scoreBuckets.low}, ${minScore}-${recommendedScore - 1}=${scoreBuckets.mid}, >=${recommendedScore}=${scoreBuckets.high}`);
  }
  console.log('[INFO] === Local Filter Completed ===');
}

runMain(main);
