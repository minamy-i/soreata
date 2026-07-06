type AbilityLike = {
  title: string;
  description: string;
  person: string;
  solution: string;
};

// AI分解記録を1本のテキストに整形する。コピー機能・外部ツール投稿の両方で共有する
export function buildRecordText(abilities: AbilityLike[]): string {
  return abilities
    .map(({ title, description, person, solution }) =>
      `${title}\n${description}\n当人は？ ${person}\n対応：${solution}`
    )
    .join('\n\n');
}
