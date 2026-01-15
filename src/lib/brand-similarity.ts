export interface SimilarityResult {
    score: number;
    reason: string;
    matchedTokens: string[];
    details?: {
        tokenScore: number;
        charScore: number;
        phoneticScore: number;
        morphScore: number;
    };
}

// 2.3 Stopwords / Generic suffixes
const GENERIC_TERM_WEIGHT = 0.2; // Matching a generic term gives very little score
const GENERIC_TERMS = new Set([
    "a.ş", "a.s", "as", "ltd", "şti", "sti", "san", "tic", "limited", "şirket", "sirket",
    "holding", "group", "grup", "teknoloji", "tech", "otel", "hotel", "restoran",
    "inşaat", "insaat", "gıda", "gida", "enerji", "bilişim", "bilisim", "spor", "salonu",
    "gym", "otomotiv", "tekstil", "turizm", "gayrimenkul", "yatırım", "hizmetleri"
]);

// 2.2 Turkish/ASCII variants map
const ASCII_MAP: Record<string, string> = {
    'ı': 'i', 'ğ': 'g', 'ş': 's', 'ç': 'c', 'ö': 'o', 'ü': 'u',
    'İ': 'i', 'Ğ': 'g', 'Ş': 's', 'Ç': 'c', 'Ö': 'o', 'Ü': 'u'
};

// --- Helper Functions ---

function normalizeText(text: string): string {
    if (!text) return "";
    let normalized = text.toLocaleLowerCase('tr-TR');
    normalized = normalized.replace(/[-_/.+,&]/g, ' ');
    return normalized.replace(/\s+/g, ' ').trim();
}

function getAsciiVariant(text: string): string {
    return text.split('').map(c => ASCII_MAP[c] || c).join('');
}

function tokenize(text: string): string[] {
    return text.split(' ').filter(t => t.length > 0);
}

// --- Distance Algorithms ---

function levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const d: number[][] = [];

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    for (let i = 0; i <= len1; i++) d[i] = [i];
    for (let j = 0; j <= len2; j++) d[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            let val = Math.min(
                d[i - 1][j] + 1,
                d[i][j - 1] + 1,
                d[i - 1][j - 1] + cost
            );

            if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
                val = Math.min(val, d[i - 2][j - 2] + cost);
            }
            d[i][j] = val;
        }
    }
    return d[len1][len2];
}

function jaroWinkler(s1: string, s2: string): number {
    if (s1.length === 0 || s2.length === 0) return 0;
    if (s1 === s2) return 1;

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const matches1 = new Array(s1.length).fill(false);
    const matches2 = new Array(s2.length).fill(false);
    let matchingChars = 0;

    for (let i = 0; i < s1.length; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(i + matchWindow + 1, s2.length);
        for (let j = start; j < end; j++) {
            if (!matches2[j] && s1[i] === s2[j]) {
                matches1[i] = true;
                matches2[j] = true;
                matchingChars++;
                break;
            }
        }
    }

    if (matchingChars === 0) return 0;

    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
        if (matches1[i]) {
            while (!matches2[k]) k++;
            if (s1[i] !== s2[k]) transpositions++;
            k++;
        }
    }
    transpositions /= 2;

    const jaro = ((matchingChars / s1.length) + (matchingChars / s2.length) + ((matchingChars - transpositions) / matchingChars)) / 3;

    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
        if (s1[i] === s2[i]) prefix++;
        else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
}

function ngramSimilarity(s1: string, s2: string, n: number = 2): number {
    if (s1.length < n || s2.length < n) {
        return s1 === s2 ? 1 : 0;
    }

    const grams1: string[] = [];
    for (let i = 0; i <= s1.length - n; i++) grams1.push(s1.substring(i, i + n));

    const grams2: string[] = [];
    for (let i = 0; i <= s2.length - n; i++) grams2.push(s2.substring(i, i + n));

    let intersection = 0;
    const usedGrams2 = new Array(grams2.length).fill(false);

    for (let i = 0; i < grams1.length; i++) {
        for (let j = 0; j < grams2.length; j++) {
            if (!usedGrams2[j] && grams1[i] === grams2[j]) {
                intersection++;
                usedGrams2[j] = true;
                break;
            }
        }
    }

    return (2.0 * intersection) / (grams1.length + grams2.length);
}

function getPhoneticKey(text: string): string {
    return text
        .replace(/[ş]/g, 's')
        .replace(/[ç]/g, 'c')
        .replace(/[ğg]/g, 'k')
        .replace(/[bp]/g, 'p')
        .replace(/[dt]/g, 't')
        .replace(/[ıi]/g, 'i')
        .replace(/[oö]/g, 'o')
        .replace(/[uü]/g, 'u');
}


// --- Main Evaluation Function ---

export function calculateBrandSimilarity(query: string, candidate: string): SimilarityResult {
    // Preprocessing
    const qNorm = normalizeText(query);
    const cNorm = normalizeText(candidate);

    if (!qNorm || !cNorm) return { score: 0, reason: "", matchedTokens: [] };

    // Identical exact match
    if (qNorm === cNorm) return { score: 100, reason: "Tam Eşleşme", matchedTokens: [qNorm], details: { tokenScore: 100, charScore: 100, phoneticScore: 100, morphScore: 100 } };

    // Tokenization
    const qTokens = tokenize(qNorm);
    const cTokens = tokenize(cNorm);

    // FILTER: Ignore single-character tokens
    const meaningfulQTokens = qTokens.filter(t => t.length >= 2);
    const meaningfulCTokens = cTokens.filter(t => t.length >= 2);

    // Early exit if no meaningful tokens
    if (meaningfulQTokens.length === 0) {
        return { score: 0, reason: "Geçersiz sorgu", matchedTokens: [] };
    }

    // --- A) Token Score ---
    let tokenScore = 0;
    let matchedTokenList: string[] = [];
    let matchType = "";

    // Identify generic tokens in candidate
    const cTokenFlags = meaningfulCTokens.map(t => ({
        text: t,
        isGeneric: GENERIC_TERMS.has(t) || GENERIC_TERMS.has(getAsciiVariant(t))
    }));

    let qTokensMatched = 0;

    // Calculate EXACT matches
    for (const qToken of meaningfulQTokens) {
        const exactMatchIndex = cTokenFlags.findIndex(ct => ct.text === qToken);
        if (exactMatchIndex !== -1) {
            qTokensMatched++;
            matchedTokenList.push(qToken);
        }
    }

    // Check for FUZZY matches (edit distance <= 2) if no exact match
    if (qTokensMatched === 0) {
        for (const qToken of meaningfulQTokens) {
            const fuzzyMatch = cTokenFlags.find(ct => {
                const d = levenshteinDistance(qToken, ct.text);
                // Dynamic threshold based on length
                // Words < 6 chars: strictly 1 max edit distance (e.g. panco vs bianco -> dist 2 -> fail)
                // Words >= 6 chars: max 2 edit distance (e.g. netrit vs netritma -> dist 2 -> pass)
                const maxDist = qToken.length < 6 ? 1 : 2;

                // Length ratio check: avoid matching very different length words
                const lenRatio = Math.min(qToken.length, ct.text.length) / Math.max(qToken.length, ct.text.length);

                // SUBSTRING MATCH: Check if one contains the other (min 4 chars)
                const isSubstring = (qToken.length >= 4 && ct.text.includes(qToken)) || (ct.text.length >= 4 && qToken.includes(ct.text));
                if (isSubstring) return true;

                return d <= maxDist && ct.text.length >= 2 && lenRatio >= 0.7;
            });

            if (fuzzyMatch) {
                qTokensMatched++;
                matchedTokenList.push(qToken);
                break; // Only count first fuzzy match
            }
        }
    }

    // KEY CHECK: Do we have ANY token match?
    const hasAnyTokenMatch = qTokensMatched > 0;

    // Special % Rule for Single Query Token
    if (meaningfulQTokens.length === 1 && hasAnyTokenMatch) {
        const qToken = meaningfulQTokens[0];
        const exactMatch = cTokenFlags.find(ct => ct.text === qToken);

        if (exactMatch) {
            const totalTokens = meaningfulCTokens.length;

            if (totalTokens === 1) {
                tokenScore = 100;
                matchType = "Tam token eşleşmesi";
            } else {
                if (exactMatch.isGeneric) {
                    tokenScore = 20;
                    matchType = "Jenerik kelime eşleşmesi";
                } else {
                    const genericExtras = cTokenFlags.filter(ct => ct.text !== qToken && ct.isGeneric).length;
                    const uniqueExtras = cTokenFlags.filter(ct => ct.text !== qToken && !ct.isGeneric).length;

                    const weightedK = 1 + (genericExtras * 0.25) + (uniqueExtras * 1.0);

                    tokenScore = (1 / weightedK) * 100;
                    matchType = `${totalTokens + 1} kelimeli markada 1 kelime eşleşmesi`;
                }
            }
        }
    } else if (meaningfulQTokens.length > 1 && hasAnyTokenMatch) {
        // Multi-word query
        const coverageQ = (qTokensMatched / meaningfulQTokens.length) * 100;
        const coverageC = (qTokensMatched / meaningfulCTokens.length) * 100;

        tokenScore = (coverageQ * 0.7) + (coverageC * 0.3);
        if (qTokensMatched > 0) matchType = `Çoklu kelime eşleşmesi (%${Math.round(tokenScore)})`;
    }

    // --- B) Char Score (Fuzzy) - ONLY if token match exists ---
    let charScore = 0;

    if (hasAnyTokenMatch) {
        const jwTotal = jaroWinkler(qNorm, cNorm);
        const ed = levenshteinDistance(qNorm, cNorm);
        const edNorm = 1 - (ed / Math.max(qNorm.length, cNorm.length));
        const ngram = ngramSimilarity(qNorm, cNorm, 2);

        const lenRatio = Math.min(qNorm.length, cNorm.length) / Math.max(qNorm.length, cNorm.length);
        const lengthPenalty = lenRatio < 0.5 ? 0.5 : 1;

        let rawCharScore = (0.45 * jwTotal + 0.35 * ngram + 0.20 * edNorm) * 100 * lengthPenalty;

        if (jwTotal < 0.6) rawCharScore = 0;

        // Token-wise fuzzy
        let fuzzyTokenScores: number[] = [];

        for (const qt of meaningfulQTokens) {
            let bestTokenMatch = 0;
            for (const ct of meaningfulCTokens) {
                const d = levenshteinDistance(qt, ct);
                const jw = jaroWinkler(qt, ct);

                if (jw < 0.75 && d > 1) continue;

                const ng = ngramSimilarity(qt, ct, 2);

                if (d === 1) {
                    bestTokenMatch = Math.max(bestTokenMatch, 95);
                } else if (d === 0) {
                    bestTokenMatch = 100;
                } else {
                    const score = (0.45 * jw + 0.35 * ng + 0.20 * (1 - d / Math.max(qt.length, ct.length))) * 100;
                    bestTokenMatch = Math.max(bestTokenMatch, score);
                }

                const qtAscii = getAsciiVariant(qt);
                const ctAscii = getAsciiVariant(ct);
                if (qt !== ct && qtAscii === ctAscii) {
                    bestTokenMatch = Math.max(bestTokenMatch, 98);
                }
            }
            fuzzyTokenScores.push(bestTokenMatch);
        }

        let avgFuzzyTokenScore = 0;
        if (fuzzyTokenScores.length > 0) {
            avgFuzzyTokenScore = fuzzyTokenScores.reduce((a, b) => a + b, 0) / fuzzyTokenScores.length;
        }

        if (avgFuzzyTokenScore < 50) avgFuzzyTokenScore = 0;

        charScore = Math.max(rawCharScore, avgFuzzyTokenScore);
    }


    // --- C) Phonetic Score - ONLY if token match exists ---
    let phoneticScore = 0;

    if (hasAnyTokenMatch) {
        const qPhon = getPhoneticKey(qNorm);
        const cPhon = getPhoneticKey(cNorm);

        const pLenRatio = Math.min(qPhon.length, cPhon.length) / Math.max(qPhon.length, cPhon.length);

        if (pLenRatio > 0.6) {
            if (qPhon === cPhon) phoneticScore = 90;
            else {
                const pd = levenshteinDistance(qPhon, cPhon);
                const pdNorm = 1 - (pd / Math.max(qPhon.length, cPhon.length));
                if (pdNorm > 0.8) phoneticScore = pdNorm * 85;
            }
        }
    }

    // --- D) Morphological Score (Stemming) ---
    let morphScore = 0;
    if (meaningfulQTokens.length === 1 && meaningfulCTokens.length >= 1) {
        const qToken = meaningfulQTokens[0];
        for (const ct of meaningfulCTokens) {
            if (qToken.length < 3) continue;

            if (ct.startsWith(qToken) && ct.length > qToken.length) {
                morphScore = 85;
            }
            if (qToken.startsWith(ct) && qToken.length > ct.length) {
                morphScore = 80;
            }
        }
    }

    // --- E) Combined/Split variations ---
    const qCombined = meaningfulQTokens.join('');
    const cCombined = meaningfulCTokens.join('');
    if (qCombined === cCombined) {
        charScore = Math.max(charScore, 95);
        if (!tokenScore) matchType = "Birleşik yazım eşleşmesi";
    }

    // 4. Final Score Logic
    let finalScore = Math.max(tokenScore, charScore, phoneticScore, morphScore);

    // NO TOKEN MATCH CAP - Maximum 15%
    if (!hasAnyTokenMatch) {
        finalScore = Math.min(15, finalScore);
        matchType = "Kısmi benzerlik (token eşleşmesi yok)";
    }

    // CRITICAL CAP: Single token query vs Multi token candidate
    // Örnek: "demra" (1 token) vs "boratay derma sciences" (3 tokens)
    // Sadece 1 kelime benzer → maksimum skor = 100/token_count 
    if (hasAnyTokenMatch && meaningfulQTokens.length === 1 && meaningfulCTokens.length > 1) {
        const candidateTokenCount = meaningfulCTokens.length;

        // Maksimum skor = 100 / token_count (3 kelimeden 1 eşleşme = max %33)
        // tokenScore varsa (exact match) onu kullan, yoksa token_count'a göre hesapla
        const maxAllowedScore = tokenScore > 0
            ? tokenScore + 15 // Exact match varsa küçük bonus
            : (100 / candidateTokenCount) + 10; // Fuzzy match ise sıkı kural

        finalScore = Math.min(finalScore, maxAllowedScore);
    }

    // FIRST WORD MATCH RULE
    // If query matches the first word of the candidate, ensure high score regardless of length
    if (meaningfulQTokens.length > 0 && meaningfulCTokens.length > 0) {
        const qFirst = meaningfulQTokens[0];
        const cFirst = meaningfulCTokens[0];
        const qAscii = getAsciiVariant(qFirst);
        const cAscii = getAsciiVariant(cFirst);

        // Exact match or Prefix match (if query is long enough) on FIRST token
        if (qAscii === cAscii || (qFirst.length >= 3 && cAscii.startsWith(qAscii))) {
            finalScore = Math.max(finalScore, 65);
            if (finalScore === 65) matchType = "İlk kelime eşleşmesi";
        }
    }

    // Determine reason
    let finalReason = matchType;
    if (hasAnyTokenMatch) {
        if (charScore > tokenScore && charScore >= finalScore) {
            const asciiQ = getAsciiVariant(qNorm);
            const asciiC = getAsciiVariant(cNorm);
            if (qNorm !== cNorm && asciiQ === asciiC) {
                finalReason = "Diakritik/Karakter farkı";
            } else if (levenshteinDistance(qNorm, cNorm) === 1) {
                finalReason = "Tek harf hatası";
            } else {
                finalReason = "Yazım benzerliği";
            }
        } else if (phoneticScore > tokenScore && phoneticScore >= finalScore) {
            finalReason = "Fonetik benzerlik";
        } else if (morphScore > tokenScore && morphScore >= finalScore) {
            finalReason = "Kelime kökü/ek benzerliği";
        }
    }

    return {
        score: Math.min(100, Math.round(finalScore)),
        reason: finalReason || "Benzerlik",
        matchedTokens: matchedTokenList,
        details: {
            tokenScore,
            charScore,
            phoneticScore,
            morphScore
        }
    };
}
