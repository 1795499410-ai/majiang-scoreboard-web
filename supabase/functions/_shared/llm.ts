// 共享 LLM 调用层 —— 统一配置、统一降级
// 所有 Edge Function 通过此模块调用大模型，避免重复代码

export const LLM_CONFIG = {
  baseUrl: Deno.env.get('LLM_BASE_URL') || 'https://api.deepseek.com/v1',
  model: Deno.env.get('LLM_MODEL') || 'deepseek-chat',
  apiKey: Deno.env.get('LLM_API_KEY') || ''
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

export function bearer(req: Request) {
  const h = req.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

/**
 * 调用 LLM，返回纯文本答案。失败返回 null。
 * @param messages OpenAI 格式的 messages
 * @param timeoutMs 超时毫秒，默认 15000
 */
export async function callLLM(
  messages: Array<{ role: string; content: string }>,
  timeoutMs = 15000
): Promise<string | null> {
  if (!LLM_CONFIG.apiKey) {
    console.warn('LLM_API_KEY not configured, skipping LLM call');
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${LLM_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        temperature: 0.4,
        max_tokens: 600,
        messages
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      console.error('LLM HTTP error:', res.status, await res.text().then(t => t.slice(0, 300)));
      return null;
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    return raw || null;
  } catch (e) {
    console.error('LLM exception:', String(e).slice(0, 300));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 从 LLM 原始输出中提取 JSON 答案 */
export function parseJsonAnswer(raw: string): { answer: string; confident: boolean } | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    if (typeof obj.answer !== 'string') return null;
    return { answer: obj.answer, confident: obj.confident !== false };
  } catch {
    return null;
  }
}
