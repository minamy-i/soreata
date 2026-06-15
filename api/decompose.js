// プロンプトに埋め込む few-shot 例
const EXAMPLES = `【例：「太郎くんのうしろに並んで」の指示に従わせる】

## 相貌認知力（顔を見分ける能力）
「太郎くん」を特定するには、相貌認知（顔を見分ける能力）が前提になっている。指示する側はこれを無意識に前提とするが、相貌認知は全員が持つわけではない。
対応：名前カードや帽子の色など、顔以外の手がかりで太郎くんを特定できる仕組みを作る。

## 他者視点の空間変換力（相手の身体を基準に位置を把握する能力）
「うしろ」は太郎くんの身体を基準にした相対的な位置である。自分の視点を他者の身体に置き換えて空間を計算する必要がある。
対応：足跡マークや矢印など、「うしろ」の位置を視覚的に示す。

## 暗黙ルール理解力（言葉にされていない約束ごとを知る能力）
「並ぶ」という動作には、間隔・向き・順番を維持するという暗黙のルールが含まれている。
対応：「1メートル空けて、同じ向きに立つ」と具体的に言語化して伝える。

【例：「大玉送り」で相手チームの邪魔に行かないようにする】

## 暗黙ルール理解力（言葉にされていない約束ごとを知る能力）
競争を理解し、「相手を遅らせれば勝てる」という戦略的思考があった。さらに「なんでみんなは協力してくれないのか」とまで思っていた。足りなかったのは「相手チームのエリアに立ち入らない」「相手の邪魔をしない」という暗黙のルールだった。
対応：「相手チームのエリアには行かない」「相手の邪魔をしない」というルールを言葉にして事前に伝える。

【例：走り回る2歳児を部屋前方の紙芝居に注目させる】

## 前庭覚の充足力（身体を動かしたい感覚を先に満たす能力）
走り回っているのは、前庭覚（身体が動くときに得られる感覚）を求めているからである。この欲求が満たされないまま注目を指示しても効果はない。「静止させる」のではなく「欲求を満たす」ことで、自然に注意が外へ向かう。
対応：先生が抱っこして揺らすなど、前庭覚を満たしながら紙芝居に注目を促す。`;

// 課題テキストからGeminiに送るプロンプトを組み立てる
function buildPrompt(task) {
    return `あなたは、「できて当たり前」とされる行動・指示の中に隠れた要素と必要な能力を分解する専門家です。

【分解の原則】
- 人・物・動作・空間・時間・知識の6つの観点で課題を掘る（この観点はユーザには見せない）
- 隠れた要素は別要素の内側に折り畳まれている。一段で止めず再分解する
- できる人が通る経路を必須条件と混同しない。経路は一本ではない
- 対処や代替が考えられる深さまで掘る。それ以上は掘らない
- 学術語はそのまま使い、括弧で平易な説明を添える

${EXAMPLES}

【課題】
${task}

この課題を実行するために必要な能力まで分解する。
各能力の名前は「〜力」の形で表記する。
各能力に対して、本人が無理なくできる手段・代替手段と周りの支援をまとめて「対応：」として提案する。

【出力形式】厳守
以下の形式のみで出力すること。前置き・総括・まとめは一切書かない。
各能力を「## 能力名（平易な説明）」の見出しで始め、その後に分解と対応を書く。
なお、分解・対応法の文章量は一課題あたり300字以内にする。`;
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
