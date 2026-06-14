// プロンプトに埋め込む few-shot 例
const EXAMPLES = `【例1】
課題：走り回る2歳児を黒板へ注目させる
分解：
走り回っているのは、身体が動くことを求めているからであり、前庭覚（身体を動かしたい感覚）を満たすことにより、注意が身体から黒板に向かう。
→先生が抱っこして揺らすことで前庭覚を満たし、黒板に注目できた。

【例2】
課題：「太郎くんのうしろに並んで」の指示に従わせる
分解：
「太郎くん」という要素の中に、相貌認知（顔を見分ける能力）が折り畳まれていて、指示する側は無意識に「太郎くんの顔を見分けられる」ことを前提としていたが、相貌認知は全員が持っているわけではない。
→相貌認知が困難な場合、「太郎くん」の特定そのものを支援した。

【例3】
課題：「大玉送り」で相手チームの邪魔に行かないようにする
分解：
競争を理解し、チームのために勝とうとしており、「相手を遅らせれば勝てる」という戦略的思考があった。さらには「なんでみんなは協力してくれないのか」とまで思っていた。足りなかったのは暗黙のルールだった。
→「相手チームのエリアには行かない」「相手チームの邪魔をしない」という暗黙ルールを伝えた。`;

// 課題テキストからGeminiに送るプロンプトを組み立てる
function buildPrompt(task) {
    return `あなたは、「できて当たり前」とされる行動・指示の中に隠れた要素と必要な能力を分解する専門家です。

【分解の原則】
- 文中の全要素（人・物・位置・動作）を多方面から掘る。掘る範囲を先に限定しない。
- 隠れた要素は別要素の内側に折り畳まれている。一段で止めず再分解する。
- できる人が通る経路を必須条件と混同しない。経路は一本ではない。
- 対処や代替が考えられる深さまで掘る。それ以上は掘らない。
- 学術語はそのまま使い、括弧で平易な説明を添える。

${EXAMPLES}

【課題】
${task}

この課題を実行するために必要な能力を、関わる全要素（人・物・位置・動作）ごとに分解してください。
隠れた要素は再分解してください。
各要素への対応方法も提案してください。

【出力形式】厳守
以下の形式のみで出力すること。前置き・総括・まとめは一切書かない。

## 「人」の要素
（分解と対応方法）

## 「物」の要素
（分解と対応方法）

ルール：各要素は必ず「## 「○○」の要素」で始める。「## 」の後は「「要素名」の要素」の形のみ。`;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { task } = req.body;
    if (!task) {
        return res.status(400).json({ error: '課題が入力されていません' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: buildPrompt(task) }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Gemini APIエラー' });
        }

        const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!result) {
            return res.status(500).json({ error: '出力が取得できませんでした' });
        }

        return res.status(200).json({ result });

    } catch (err) {
        return res.status(500).json({ error: '通信エラーが発生しました' });
    }
};
