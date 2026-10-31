import { useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * 方案 Markdown 对比视图：
 * - 未变化的区域按 Markdown 渲染（表格/标题/列表正常显示）
 * - 变化的行左右配对，红/绿底高亮显示原始文本
 * - 左右滚动同步
 */

interface Row {
  type: 'same' | 'mod';
  leftNo?: number;
  rightNo?: number;
  left?: string;
  right?: string;
}

function diffLines(a: string[], b: string[]): Row[] {
  const n = a.length;
  const m = b.length;
  // LCS 动态规划（行数上限保护，超长文档按 2000 行截断）
  const MAX = 2000;
  const A = a.slice(0, MAX);
  const B = b.slice(0, MAX);
  const N = A.length;
  const M = B.length;
  const dp: Uint32Array[] = Array.from({ length: N + 1 }, () => new Uint32Array(M + 1));
  for (let i = N - 1; i >= 0; i--) {
    for (let j = M - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const raw: Row[] = [];
  let i = 0;
  let j = 0;
  while (i < N && j < M) {
    if (A[i] === B[j]) {
      raw.push({ type: 'same', leftNo: i + 1, rightNo: j + 1, left: A[i], right: B[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ type: 'mod', leftNo: i + 1, left: A[i] });
      i++;
    } else {
      raw.push({ type: 'mod', rightNo: j + 1, right: B[j] });
      j++;
    }
  }
  while (i < N) {
    raw.push({ type: 'mod', leftNo: i + 1, left: A[i] });
    i++;
  }
  while (j < M) {
    raw.push({ type: 'mod', rightNo: j + 1, right: B[j] });
    j++;
  }
  // 把连续的 mod 行按 左/右 配对成一行（不足的一侧留空）
  const rows: Row[] = [];
  let k = 0;
  while (k < raw.length) {
    if (raw[k].type === 'same') {
      rows.push(raw[k]);
      k++;
      continue;
    }
    const lefts: Row[] = [];
    const rights: Row[] = [];
    while (k < raw.length && raw[k].type === 'mod') {
      if (raw[k].left !== undefined) lefts.push(raw[k]);
      else rights.push(raw[k]);
      k++;
    }
    const pairs = Math.max(lefts.length, rights.length);
    for (let p = 0; p < pairs; p++) {
      rows.push({
        type: 'mod',
        leftNo: lefts[p]?.leftNo,
        rightNo: rights[p]?.rightNo,
        left: lefts[p]?.left,
        right: rights[p]?.right,
      });
    }
  }
  return rows;
}

interface Block {
  type: 'same' | 'mod';
  rows: Row[];
}

function toBlocks(rows: Row[]): Block[] {
  const blocks: Block[] = [];
  for (const r of rows) {
    const last = blocks[blocks.length - 1];
    if (last && last.type === r.type) last.rows.push(r);
    else blocks.push({ type: r.type, rows: [r] });
  }
  return blocks;
}

export default function PlanDiff({
  oldValue,
  newValue,
  leftTitle,
  rightTitle,
}: {
  oldValue: string;
  newValue: string;
  leftTitle: string;
  rightTitle: string;
}) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const blocks = useMemo(
    () => toBlocks(diffLines((oldValue ?? '').split('\n'), (newValue ?? '').split('\n'))),
    [oldValue, newValue],
  );

  const syncScroll = (from: 'left' | 'right') => () => {
    if (syncing.current) return;
    syncing.current = true;
    const src = from === 'left' ? leftRef.current : rightRef.current;
    const dst = from === 'left' ? rightRef.current : leftRef.current;
    if (src && dst) dst.scrollTop = src.scrollTop;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  };

  const renderMarkdownChunk = (rows: Row[], side: 'left' | 'right') => {
    const text = rows.map((r) => (side === 'left' ? r.left : r.right) ?? '').join('\n');
    return (
      <div className="plan-markdown" style={{ padding: '0 10px', fontSize: 13 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    );
  };

  const renderModRow = (r: Row, side: 'left' | 'right', idx: number) => {
    const isLeft = side === 'left';
    const text = isLeft ? r.left : r.right;
    const no = isLeft ? r.leftNo : r.rightNo;
    const has = text !== undefined;
    return (
      <div
        key={`${side}-${idx}`}
        style={{
          display: 'flex',
          background: has ? (isLeft ? '#ffeef0' : '#e6ffed') : '#fafafa',
          borderBottom: '1px solid #f3f3f3',
          minHeight: 24,
        }}
      >
        <span
          style={{
            width: 36,
            minWidth: 36,
            textAlign: 'right',
            paddingRight: 8,
            color: '#999',
            fontSize: 11,
            lineHeight: '24px',
            userSelect: 'none',
          }}
        >
          {no ?? ''}
        </span>
        <span
          style={{
            flex: 1,
            padding: '2px 8px',
            fontSize: 12.5,
            fontFamily: 'SFMono-Regular, Consolas, monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            textDecoration: has && isLeft ? 'line-through' : 'none',
            color: has ? '#24292f' : '#bbb',
          }}
        >
          {has ? text : '·'}
        </span>
      </div>
    );
  };

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 4, overflow: 'hidden' }}>
      {/* 表头 */}
      <div style={{ display: 'flex', background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ flex: 1, padding: '8px 10px', fontWeight: 600, fontSize: 12, color: '#c0392b' }}>
          {leftTitle}
        </div>
        <div style={{ width: 1, background: '#e8e8e8' }} />
        <div style={{ flex: 1, padding: '8px 10px', fontWeight: 600, fontSize: 12, color: '#1a7f37' }}>
          {rightTitle}
        </div>
      </div>
      {/* 双栏内容 */}
      <div style={{ display: 'flex', height: '62vh' }}>
        <div
          ref={leftRef}
          onScroll={syncScroll('left')}
          style={{ flex: 1, overflow: 'auto', borderRight: '1px solid #e8e8e8' }}
        >
          {blocks.map((b, bi) =>
            b.type === 'same' ? (
              <div key={bi} style={{ borderBottom: '1px solid #f6f6f6' }}>
                {renderMarkdownChunk(b.rows, 'left')}
              </div>
            ) : (
              <div key={bi} style={{ background: '#fff8f8' }}>
                {b.rows.map((r, ri) => renderModRow(r, 'left', ri))}
              </div>
            ),
          )}
        </div>
        <div
          ref={rightRef}
          onScroll={syncScroll('right')}
          style={{ flex: 1, overflow: 'auto' }}
        >
          {blocks.map((b, bi) =>
            b.type === 'same' ? (
              <div key={bi} style={{ borderBottom: '1px solid #f6f6f6' }}>
                {renderMarkdownChunk(b.rows, 'right')}
              </div>
            ) : (
              <div key={bi} style={{ background: '#f8fff8' }}>
                {b.rows.map((r, ri) => renderModRow(r, 'right', ri))}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
