import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSnapshot } from '../lib/db';
import { ruleAnswer, SUGGESTIONS } from '../lib/rules';
import { MiniScene, GoldTitle, Panda } from '../components/decor';

export default function Ai() {
  const [msgs, setMsgs] = useState([
    { role: 'ai', text: '问我战绩相关的问题，比如「今天谁赢最多」。', source: 'sys' }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const ask = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);

    try {
      // 优先走 Edge Function（含 LLM + 数值校验），失败则本地规则兜底
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: { question: q }
      });
      if (!error && data?.answer) {
        setMsgs((m) => [...m, { role: 'ai', text: data.answer, source: data.source }]);
      } else {
        const snap = await getSnapshot();
        const r = ruleAnswer(q, snap);
        setMsgs((m) => [...m, { role: 'ai', text: r.text, source: 'rule-local' }]);
      }
    } catch {
      try {
        const snap = await getSnapshot();
        const r = ruleAnswer(q, snap);
        setMsgs((m) => [...m, { role: 'ai', text: r.text, source: 'rule-local' }]);
      } catch {
        setMsgs((m) => [...m, { role: 'ai', text: '查询失败，请稍后再试。', source: 'error' }]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-rich page-sub-rich ai-page">
      <MiniScene variant="ai" />
      <GoldTitle size="sm" sub="用大白话问，数据自己会说话">
        牌桌智囊
      </GoldTitle>

      <div className="chat-area">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble-wrap ${m.role}`}>
            {m.role === 'ai' && (
              <span className="bubble-face"><Panda size={34} /></span>
            )}
            <div className={`bubble ${m.role}`}>
              {m.text}
              {m.source === 'rule' || m.source === 'rule-local' ? (
                <span className="bubble-tag">规则引擎</span>
              ) : null}
            </div>
          </div>
        ))}
        {busy && (
          <div className="bubble-wrap ai">
            <span className="bubble-face"><Panda size={34} /></span>
            <div className="bubble ai bubble-typing">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="fixed-bottom">
        {/* 快捷指令常驻输入框上方，点击后不消失，方便反复复用 */}
        <div className="chips chips-bar">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="chip"
              type="button"
              disabled={busy}
              onClick={() => ask(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="chat-input-row">
          <input
            className="input"
            placeholder="问点什么…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
          />
          <button className="send-btn" onClick={() => ask()} disabled={busy || !input.trim()} aria-label="发送">
            <Send size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
