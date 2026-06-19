// 当人は？ボタン用のプロンプトを組み立てる
function buildPersonPrompt(task, abilityTitle, abilityBody) {
    return `あなたは「${abilityTitle}」という状態にない当事者です。

能力の説明：
${abilityBody}

課題の場面：${task}

この能力が働いていない状態を前提として、この場面にいるとき、何が見えているか・何がわからないか、そしてどんな行動になるかを書いてください。
常に当事者の視点から書く。支援者・教師など第三者の視点は入れない。
焦点は「能力の説明」に示された能力の欠如にあて、その状態を書く。
行動パターンは・の形式で箇条書きにする。散文にしない。各パターンは1〜2文で簡潔に書く。各パターンは異なる場面・状況を書く。似た内容を繰り返さない。
意図的な対処ではなく、その能力が欠けているために自然に出てしまう行動を書く。
常体（だ・ある調）で書く。ですます調は使わない。
マークダウン記法（###・**・* など）は使わない。
ふざけているわけでも反抗しているわけでもなく、内側では筋が通っているという事実が伝わるように書く。
250字以内。`;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { task, abilityTitle, abilityBody } = req.body;
    if (!task || !abilityTitle || !abilityBody) {
        return res.status(400).json({ error: '必要なパラメータが不足しています' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: buildPersonPrompt(task, abilityTitle, abilityBody) }] }]
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
