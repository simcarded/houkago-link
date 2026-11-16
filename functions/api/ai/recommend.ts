import type { Env } from '../../_lib/types';
import { assertSameOrigin, jsonResponse } from '../../_lib/auth';

const DAILY_REQUEST_CAP = 250; // 10,000 Neurons/day無料枠を確実に守る上限
const MODEL_ID = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';

interface ParsedCriteria {
  maxFee: number | null;
  wifi: boolean;
  outlets: boolean;
  quiet: boolean;
  groupOk: boolean;
  openEvening: boolean;
  regionHint: string;
}

function parseRuleBased(prompt: string): ParsedCriteria {
  const p = prompt.toLowerCase();
  return {
    maxFee: p.includes('無料') || p.includes('0円') || p.includes('ただ') ? 0 : p.includes('100円') ? 100 : null,
    wifi: p.includes('wi-fi') || p.includes('wifi') || p.includes('ネット'),
    outlets: p.includes('コンセント') || p.includes('電源') || p.includes('充電'),
    quiet: p.includes('静か') || p.includes('集中'),
    groupOk: p.includes('友達') || p.includes('グループ') || p.includes('人') || p.includes('相談'),
    openEvening: p.includes('夕方') || p.includes('夜') || p.includes('遅く') || p.includes('20時'),
    regionHint:
      ['名古屋', '栄', '名駅', '天白', '一宮', '春日井', '岡崎', '豊橋', '半田', '三河', '知多', '尾張'].find((k) =>
        p.includes(k),
      ) || '',
  };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!assertSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);

  const body = (await request.json()) as { query?: string };
  const query = String(body.query || '').trim().slice(0, 150);
  if (!query) return jsonResponse({ error: '検索文を入力してください' }, 400);

  const today = new Date().toISOString().slice(0, 10);
  // Disabled until a verified, account-wide usage limit is configured.
  // A request counter cannot guarantee the Workers AI free-tier neuron limit.
  let canUseAi = false;

  if (canUseAi && env.DB) {
    try {
      const row = await env.DB.prepare('SELECT request_count FROM ai_usage_daily WHERE usage_date = ?')
        .bind(today)
        .first<{ request_count: number }>();
      if ((row?.request_count || 0) >= DAILY_REQUEST_CAP) {
        canUseAi = false;
      }
    } catch {
      canUseAi = false;
    }
  }

  let criteria = parseRuleBased(query);
  let mode: 'workers-ai' | 'rule-fallback' = 'rule-fallback';
  let summary = '入力された条件キーワードから学習スペースを抽出しました。';

  if (canUseAi && env.AI) {
    try {
      const aiRes = (await env.AI.run(MODEL_ID, {
        max_tokens: 160,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'JSONのみを返してください。スキーマ: {"maxFee":number|null,"wifi":boolean,"outlets":boolean,"quiet":boolean,"groupOk":boolean,"openEvening":boolean,"regionHint":string,"reason":string}。施設名を創作しないでください。',
          },
          { role: 'user', content: query },
        ],
      })) as { response?: string };

      const text = aiRes?.response || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<ParsedCriteria & { reason?: string }>;
        criteria = {
          maxFee: typeof parsed.maxFee === 'number' ? parsed.maxFee : criteria.maxFee,
          wifi: Boolean(parsed.wifi ?? criteria.wifi),
          outlets: Boolean(parsed.outlets ?? criteria.outlets),
          quiet: Boolean(parsed.quiet ?? criteria.quiet),
          groupOk: Boolean(parsed.groupOk ?? criteria.groupOk),
          openEvening: Boolean(parsed.openEvening ?? criteria.openEvening),
          regionHint: typeof parsed.regionHint === 'string' ? parsed.regionHint.slice(0, 20) : criteria.regionHint,
        };
        if (typeof parsed.reason === 'string' && parsed.reason.trim()) {
          summary = parsed.reason.trim().slice(0, 120);
        }
        mode = 'workers-ai';
      }

      if (env.DB) {
        await env.DB.prepare(
          `INSERT INTO ai_usage_daily (usage_date, request_count, estimated_neurons) VALUES (?, 1, 15)
           ON CONFLICT(usage_date) DO UPDATE SET request_count = request_count + 1, estimated_neurons = estimated_neurons + 15`,
        )
          .bind(today)
          .run();
      }
    } catch {
      mode = 'rule-fallback';
    }
  }

  return jsonResponse({ mode, model: mode === 'workers-ai' ? MODEL_ID : null, criteria, summary });
};
