import { NextRequest, NextResponse } from 'next/server';
import { buildPrompt } from '@/lib/prompt';

type Ability = {
  title: string;
  description: string;
  person: string;
  solution: string;
  confirmed_at: null;
};

// AI出力テキストをabilities配列に変換する
function parseAbilities(text: string): Ability[] {
  const parts = text.split(/\n(?=## )/);
  const abilities: Ability[] = [];

  for (const part of parts) {
    const lines = part.split('\n');
    const firstLine = lines[0].trim();
    if (!firstLine.startsWith('## ')) continue;

    const title = firstLine.replace('## ', '').trim();
    let description = '';
    let person = '';
    let solution = '';

    for (const line of lines.slice(1)) {
      if (line.startsWith('当人は？ ')) {
        person = line.replace('当人は？ ', '').trim();
      } else if (line.startsWith('対応：')) {
        solution = line.replace('対応：', '').trim();
      } else if (line.trim()) {
        description += (description ? '\n' : '') + line;
      }
    }

    abilities.push({ title, description, person, solution, confirmed_at: null });
  }

  return abilities;
}

export async function POST(req: NextRequest) {
  const { task } = await req.json();

  if (!task) {
    return NextResponse.json({ error: '課題が入力されていません' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(task) }] }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Gemini APIエラー' },
        { status: response.status }
      );
    }

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) {
      return NextResponse.json({ error: '出力が取得できませんでした' }, { status: 500 });
    }

    return NextResponse.json({ abilities: parseAbilities(result) });

  } catch {
    return NextResponse.json({ error: '通信エラーが発生しました' }, { status: 500 });
  }
}
