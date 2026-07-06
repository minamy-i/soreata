// AI分解の結果1件の型。困りごとを分解した「能力」1つ分のデータ形。
// AI分解直後（confirmed_at: null）・保存後（string | null）どちらの状態も同じ型で表す。
export type Ability = {
  title: string;
  description: string;
  person: string;
  solution: string;
  confirmed_at: string | null;
};
