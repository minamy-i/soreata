import type { Ability } from '@/lib/ability';

// アコーディオンの展開部（説明・当人は？・対応）の表示。AI提案画面・記録詳細ページで共有する
export default function AbilityBody({ ability }: { ability: Ability }) {
  return (
    <div className="accordion-body">
      <div className="ability-description">
        {ability.description.split('\n').map((line, j) => (
          <span key={j}>{line}<br /></span>
        ))}
      </div>
      <span className="person-line">当人は？ {ability.person}</span>
      <div className="ability-solution"><strong>対応：</strong>{ability.solution}</div>
    </div>
  );
}
