const { buildPrompt } = require('../prompt.js');

// AI出力テキストを abilities 配列に変換する
function parseAbilities(text) {
    const parts = text.split(/\n(?=## )/);
    const abilities = [];

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

        abilities.push({ title, description, person, solution });
    }

    return abilities;
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

        return res.status(200).json({ abilities: parseAbilities(result) });

    } catch (err) {
        return res.status(500).json({ error: '通信エラーが発生しました' });
    }
};
