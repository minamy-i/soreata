// teams.nameには呼び名だけを保存し（例「太郎」）、表示のたびに「チーム」を前置する。
// 理由：当人（対象者）がowner本人の場合、チーム名とニックネームが同じ文字列になり得るため、
// 保存段階で区別を作り込まず、表示側で常に区別する（docs/NOTES.md参照）。
export function teamDisplayName(callName: string) {
  return `チーム${callName}`;
}
