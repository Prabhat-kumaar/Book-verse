const meaningCache = new Map();
const translationCache = new Map();

const getWordMeaning = async (req, res, next) => {
    try {
        const word = req.params.word ? req.params.word.trim() : '';
        if (!word) {
            return res.status(400).json({ success: false, message: 'Word is required' });
        }

        const cacheKey = word.toLowerCase();
        if (meaningCache.has(cacheKey)) {
            console.log(`[Dictionary Cache Hit] word: ${word}`);
            return res.status(200).json({
                success: true,
                data: meaningCache.get(cacheKey)
            });
        }

        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        
        if (response.status === 404) {
            return res.status(404).json({ success: false, message: 'No definition found' });
        }

        if (!response.ok) {
            return res.status(response.status).json({ success: false, message: `Dictionary API error: ${response.statusText}` });
        }

        const data = await response.json();
        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(404).json({ success: false, message: 'No definition found' });
        }

        const entry = data[0];
        
        // Extract phonetic
        let phonetic = entry.phonetic || '';
        if (!phonetic && entry.phonetics && entry.phonetics.length > 0) {
            const found = entry.phonetics.find(p => p.text);
            if (found) {
                phonetic = found.text;
            }
        }

        // Extract audio
        let audio = '';
        if (entry.phonetics && entry.phonetics.length > 0) {
            const found = entry.phonetics.find(p => p.audio);
            if (found) {
                audio = found.audio;
            }
        }

        // Parse meanings
        const meanings = [];
        if (entry.meanings) {
            entry.meanings.forEach(m => {
                const partOfSpeech = m.partOfSpeech || '';
                if (m.definitions) {
                    m.definitions.forEach(d => {
                        meanings.push({
                            partOfSpeech,
                            definition: d.definition || '',
                            example: d.example || '',
                            synonyms: d.synonyms || m.synonyms || []
                        });
                    });
                }
            });
        }

        const simplified = {
            word: entry.word || word,
            phonetic,
            audio,
            meanings
        };

        // Save to cache
        meaningCache.set(cacheKey, simplified);

        return res.status(200).json({
            success: true,
            data: simplified
        });
    } catch (error) {
        return next(error);
    }
};

const translateText = async (req, res, next) => {
    try {
        const text = req.query.text ? req.query.text.trim() : '';
        const target = req.query.target ? req.query.target.trim() : 'hi';

        if (!text) {
            return res.status(400).json({ success: false, message: 'Text to translate is required' });
        }

        const cacheKey = `${target.toLowerCase()}:${text.toLowerCase()}`;
        if (translationCache.has(cacheKey)) {
            console.log(`[Translate Cache Hit] text: "${text}", target: "${target}"`);
            return res.status(200).json({
                success: true,
                data: { translatedText: translationCache.get(cacheKey) }
            });
        }

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).json({ success: false, message: `Translation error: ${response.statusText}` });
        }

        const data = await response.json();
        let translatedText = '';
        if (data && data[0]) {
            translatedText = data[0]
                .map(x => x[0])
                .filter(Boolean)
                .join('');
        }

        if (!translatedText) {
            return res.status(500).json({ success: false, message: 'Failed to extract translation' });
        }

        // Save to cache
        translationCache.set(cacheKey, translatedText);

        return res.status(200).json({
            success: true,
            data: { translatedText }
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getWordMeaning,
    translateText
};
