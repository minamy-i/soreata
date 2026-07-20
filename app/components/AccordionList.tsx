'use client';

import type { ReactNode } from 'react';
import { useAccordion } from '@/lib/use-accordion';
import AbilityBody from './AbilityBody';
import type { Ability } from '@/lib/ability';

// アビリティ一覧のアコーディオン表示。開閉状態は内部で保持する。
// 呼び出し側でabilitiesの配列自体が入れ替わってこのコンポーネントが再マウントされれば、
// 開閉状態も自然にリセットされる（AI提案画面：新しい提案取得時など）
export default function AccordionList({
  abilities,
  renderExtra,
}: {
  abilities: Ability[];
  renderExtra?: (ability: Ability, index: number) => ReactNode;
}) {
  const { openItems, toggle } = useAccordion();

  return (
    <ul className="ability-list">
      {abilities.map((ability, i) => (
        <li key={i} className="accordion-item">
          <button className="accordion-header" onClick={() => toggle(i)}>
            <span className="accordion-square">◻︎</span>
            <span className="accordion-title">{ability.title}</span>
            {renderExtra?.(ability, i)}
            <span className={`accordion-icon${openItems.has(i) ? ' open' : ''}`}>▼</span>
          </button>
          {openItems.has(i) && <AbilityBody ability={ability} />}
        </li>
      ))}
    </ul>
  );
}
