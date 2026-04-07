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

function getConsonantSkeleton(text: string): string {
    const ascii = getAsciiVariant(text);
    return ascii.replace(/[aeiouy]/g, '');
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

/**
 * En uzun ortak ardışık alt dizeyi bulur (Longest Common Substring).
 * "krow" vs "crowntech" → "row" (3 harf)
 */
function longestCommonSubstring(s1: string, s2: string): number {
    if (s1.length === 0 || s2.length === 0) return 0;
    let maxLen = 0;
    // DP tablosu yerine alan-verimli yaklaşım
    for (let i = 0; i < s1.length; i++) {
        for (let j = 0; j < s2.length; j++) {
            if (s1[i] === s2[j]) {
                let len = 1;
                while (i + len < s1.length && j + len < s2.length && s1[i + len] === s2[j + len]) {
                    len++;
                }
                if (len > maxLen) maxLen = len;
            }
        }
    }
    return maxLen;
}

function getPhoneticKey(text: string): string {
    return text
        .replace(/[ş]/g, 's')
        .replace(/[çc]/g, 'k')  // c ve ç → k (cr/kr eşdeğerliği)
        .replace(/[ğg]/g, 'k')
        .replace(/[bp]/g, 'p')
        .replace(/[dt]/g, 't')
        .replace(/[ıi]/g, 'i')
        .replace(/[oö]/g, 'o')
        .replace(/[uü]/g, 'u')
        .replace(/ks/g, 'x');   // ks = x eşdeğerliği
}

/**
 * KS/X eşdeğerliği: "ks" harflerini "x" ile normalize eder.
 * Örn: "foks" → "fox", "teksas" → "texas"
 */
function normalizeKsX(text: string): string {
    return text.replace(/ks/g, 'x');
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
    const matchedTokenList: string[] = [];
    let matchType = "";

    // Identify generic tokens in candidate
    const cTokenFlags = meaningfulCTokens.map(t => ({
        text: t,
        isGeneric: GENERIC_TERMS.has(t) || GENERIC_TERMS.has(getAsciiVariant(t))
    }));

    let qTokensMatched = 0;

    // Calculate EXACT matches (ASCII-normalized: ı=i, ş=s, ç=c, ö=o, ü=u, ğ=g)
    for (const qToken of meaningfulQTokens) {
        const qTokenAscii = getAsciiVariant(qToken);
        const qTokenKsX = normalizeKsX(qTokenAscii);
        const exactMatchIndex = cTokenFlags.findIndex(ct => {
            const ctAscii = getAsciiVariant(ct.text);
            return ct.text === qToken || ctAscii === qTokenAscii || normalizeKsX(ctAscii) === qTokenKsX;
        });
        if (exactMatchIndex !== -1) {
            qTokensMatched++;
            matchedTokenList.push(qToken);
        }
    }

    // Check for FUZZY matches if no exact match
    if (qTokensMatched === 0) {
        for (const qToken of meaningfulQTokens) {
            const fuzzyMatch = cTokenFlags.find(ct => {
                // ASCII varyantları (ı=i, ş=s, ç=c, ö=o, ü=u, ğ=g)
                const qTokenAscii = getAsciiVariant(qToken);
                const ctAscii = getAsciiVariant(ct.text);

                const d = levenshteinDistance(qToken, ct.text);
                const dAscii = levenshteinDistance(qTokenAscii, ctAscii);
                const minDist = Math.min(d, dAscii);
                // Dynamic threshold based on length
                // <= 3 harf: max 1, <= 5 harf: max 2, <= 7 harf: max 3, 8+ harf: max 4
                const maxDist = qToken.length <= 3 ? 1 : (qToken.length <= 5 ? 2 : (qToken.length <= 7 ? 3 : 4));

                // Length ratio check: avoid matching very different length words
                const lenRatio = Math.min(qToken.length, ct.text.length) / Math.max(qToken.length, ct.text.length);

                // SUBSTRING MATCH: Check if one contains the other (min 2 chars)
                // Hem orijinal hem ASCII varyantlarıyla kontrol et
                const isSubstring = (qToken.length >= 2 && ct.text.includes(qToken)) || (ct.text.length >= 2 && qToken.includes(ct.text))
                    || (qTokenAscii.length >= 2 && ctAscii.includes(qTokenAscii)) || (ctAscii.length >= 2 && qTokenAscii.includes(ctAscii));
                if (isSubstring) return true;

                // KISA SORGU PREFİX KONTROLÜ (2-4 karakter) - ASCII varyantlarıyla da kontrol
                if (qToken.length >= 2 && qToken.length <= 4) {
                    if ((ct.text.startsWith(qToken) || ctAscii.startsWith(qTokenAscii)) && ct.text.length > qToken.length) {
                        return true;
                    }
                }

                // EDIT DISTANCE MATCH (ASCII varyantı ile daha düşük mesafe kullan)
                if (minDist <= maxDist && ct.text.length >= 2 && lenRatio >= 0.7) return true;

                // JARO-WINKLER MATCH (hem orijinal hem ASCII ile kontrol)
                const jwTokenScore = Math.max(jaroWinkler(qToken, ct.text), jaroWinkler(qTokenAscii, ctAscii));
                if (jwTokenScore >= 0.78 && lenRatio >= 0.5) return true;

                // PREFIX MATCH: Same first 4+ chars and similar length (ASCII ile de)
                if (qToken.length >= 5 && ct.text.length >= 5) {
                    const prefixLen = Math.min(4, Math.floor(Math.min(qToken.length, ct.text.length) * 0.6));
                    if (prefixLen >= 3 && lenRatio >= 0.5) {
                        if (qToken.substring(0, prefixLen) === ct.text.substring(0, prefixLen)
                            || qTokenAscii.substring(0, prefixLen) === ctAscii.substring(0, prefixLen)) {
                            return true;
                        }
                    }
                }

                // SESSİZ HARF İSKELETİ EŞLEŞMESİ (min 3 sessiz harf, 2 çok genel)
                const qConsonants = getConsonantSkeleton(qToken);
                const cConsonants = getConsonantSkeleton(ct.text);
                if (qConsonants.length >= 3 && qConsonants === cConsonants) {
                    return true;
                }

                // FONETİK SUBSTRING/PREFIX EŞLEŞMESİ
                // Örn: "krow" → fonetik "krow", "crowntech" → fonetik "krowntek" → prefix eşleşir
                const qPhonetic = getPhoneticKey(qTokenAscii);
                const cPhonetic = getPhoneticKey(ctAscii);
                if (qPhonetic.length >= 3 && (cPhonetic.includes(qPhonetic) || qPhonetic.includes(cPhonetic))) {
                    return true;
                }

                // ORTAK PREFİX EŞLEŞMESİ
                // İlk 4+ karakter aynıysa (veya kısa kelimenin %75'i) uzunluk farkı önemli değil
                // Örn: "leony" vs "leonpack" → ilk 4 karakter "leon" aynı → eşleşmeli
                let commonPrefixLen = 0;
                const minLen = Math.min(qTokenAscii.length, ctAscii.length);
                for (let i = 0; i < minLen; i++) {
                    if (qTokenAscii[i] === ctAscii[i]) commonPrefixLen++;
                    else break;
                }
                const shortLen = Math.min(qToken.length, ct.text.length);
                if (commonPrefixLen >= 4 || (commonPrefixLen >= 3 && commonPrefixLen >= shortLen * 0.75)) {
                    return true;
                }

                // ARDIŞIK 3+ HARF EŞLEŞMESİ (Longest Common Substring)
                // Örn: "krow" vs "crowntech" → "row" (3 harf ardışık) → eşleşmeli
                // Hem orijinal hem ASCII varyantlarıyla kontrol
                const lcsOriginal = longestCommonSubstring(qToken, ct.text);
                const lcsAscii = longestCommonSubstring(qTokenAscii, ctAscii);
                const lcsPhonetic = longestCommonSubstring(qPhonetic, cPhonetic);
                const bestLcs = Math.max(lcsOriginal, lcsAscii, lcsPhonetic);
                // En az 3 ardışık harf eşleşmeli VE bu sorgu uzunluğunun en az %60'ı olmalı
                if (bestLcs >= 3 && bestLcs >= qToken.length * 0.6) {
                    return true;
                }

                // CR/KR PREFİX EŞDEĞERLİĞİ
                // Başlangıçta "cr" ve "kr" aynı okunduğu için eşdeğer say
                const qNormCrKr = qTokenAscii.replace(/^kr/, 'cr').replace(/^cr/, 'cr');
                const cNormCrKr = ctAscii.replace(/^kr/, 'cr').replace(/^cr/, 'cr');
                if (qNormCrKr !== qTokenAscii || cNormCrKr !== ctAscii) {
                    // cr/kr normalizasyonu yapıldı, şimdi substring kontrolü yap
                    if (cNormCrKr.includes(qNormCrKr) || qNormCrKr.includes(cNormCrKr)) {
                        return true;
                    }
                    if (cNormCrKr.startsWith(qNormCrKr) || qNormCrKr.startsWith(cNormCrKr)) {
                        return true;
                    }
                }

                // KS/X EŞDEĞERLİĞİ
                // "ks" ve "x" aynı okunduğu için eşdeğer say
                // Örn: "foks" vs "fox" → normalize("foks") = "fox" → eşleşmeli
                const qNormKsX = normalizeKsX(qTokenAscii);
                const cNormKsX = normalizeKsX(ctAscii);
                if (qNormKsX !== qTokenAscii || cNormKsX !== ctAscii) {
                    if (qNormKsX === cNormKsX) return true;
                    if (cNormKsX.includes(qNormKsX) || qNormKsX.includes(cNormKsX)) {
                        return true;
                    }
                }

                return false;
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
        const qTokenAsciiSingle = getAsciiVariant(qToken);
        const qTokenKsXSingle = normalizeKsX(qTokenAsciiSingle);
        const exactMatch = cTokenFlags.find(ct => {
            const ctAscii = getAsciiVariant(ct.text);
            return ct.text === qToken || ctAscii === qTokenAsciiSingle || normalizeKsX(ctAscii) === qTokenKsXSingle;
        });

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
        const fuzzyTokenScores: number[] = [];

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
                // KS/X eşdeğerliği
                const qtKsX = normalizeKsX(qtAscii);
                const ctKsXVal = normalizeKsX(ctAscii);
                if (qt !== ct && qtKsX === ctKsXVal) {
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
    if (meaningfulCTokens.length >= 1) {
        for (const qToken of meaningfulQTokens) {
            if (qToken.length < 2) continue;
            for (const ct of meaningfulCTokens) {
                // ASCII varyantları (ı=i, ş=s, ç=c, ö=o, ü=u, ğ=g)
                const qAscii = getAsciiVariant(qToken);
                const cAscii = getAsciiVariant(ct);

                // Prefix eşleşmesi: sorgu adayın başlangıcıysa (ASCII ile de)
                if ((ct.startsWith(qToken) || cAscii.startsWith(qAscii)) && ct.length > qToken.length) {
                    morphScore = Math.max(morphScore, 85);
                }
                // Ters prefix: aday sorgunun başlangıcıysa (ASCII ile de)
                if ((qToken.startsWith(ct) || qAscii.startsWith(cAscii)) && qToken.length > ct.length && ct.length >= 2) {
                    morphScore = Math.max(morphScore, 80);
                }
                // Substring/Contains eşleşmesi (ASCII ile de)
                if (qToken.length >= 2 && ct.length > qToken.length) {
                    const isContained = ct.includes(qToken) || cAscii.includes(qAscii);
                    const isPrefix = ct.startsWith(qToken) || cAscii.startsWith(qAscii);
                    if (isContained && !isPrefix) {
                        morphScore = Math.max(morphScore, 70);
                    }
                }
                // Ters substring (ASCII ile de)
                if (ct.length >= 2 && qToken.length > ct.length) {
                    const isContained = qToken.includes(ct) || qAscii.includes(cAscii);
                    const isPrefix = qToken.startsWith(ct) || qAscii.startsWith(cAscii);
                    if (isContained && !isPrefix) {
                        morphScore = Math.max(morphScore, 65);
                    }
                }
                // Sessiz harf iskeleti prefix eşleşmesi (min 3 sessiz harf, 2 çok genel)
                const qConsonants = getConsonantSkeleton(qToken);
                const cConsonants = getConsonantSkeleton(ct);
                if (qConsonants.length >= 3 && cConsonants.length >= 3 && qConsonants === cConsonants) {
                    morphScore = Math.max(morphScore, 75);
                }
                // Fonetik prefix/substring eşleşmesi
                const qPhonetic = getPhoneticKey(qAscii);
                const cPhonetic = getPhoneticKey(cAscii);
                if (qPhonetic.length >= 3 && cPhonetic.startsWith(qPhonetic) && ct.length > qToken.length) {
                    morphScore = Math.max(morphScore, 80);
                }
                if (qPhonetic.length >= 3 && cPhonetic.includes(qPhonetic) && !cPhonetic.startsWith(qPhonetic) && ct.length > qToken.length) {
                    morphScore = Math.max(morphScore, 65);
                }

                // ORTAK PREFIX MORPH SKORU
                // İlk 4+ karakter aynıysa tam prefix olmasa bile yüksek skor ver
                // Örn: "leony" vs "leonpack" → 4 karakter "leon" ortak → morphScore = 76
                let cpLen = 0;
                const cpMinLen = Math.min(qAscii.length, cAscii.length);
                for (let ci = 0; ci < cpMinLen; ci++) {
                    if (qAscii[ci] === cAscii[ci]) cpLen++;
                    else break;
                }
                const cpShortLen = Math.min(qToken.length, ct.length);
                if (cpLen >= 4 || (cpLen >= 3 && cpLen >= cpShortLen * 0.75)) {
                    const prefixRatio = cpLen / cpShortLen;
                    const cpScore = Math.round(60 + prefixRatio * 20); // 60-80 arası
                    morphScore = Math.max(morphScore, cpScore);
                }

                // ARDIŞIK 3+ HARF EŞLEŞMESİ - MORPH SKORU
                // Örn: "krow" vs "crowntech" → "row" (3 harf ardışık)
                const lcsM = Math.max(
                    longestCommonSubstring(qToken, ct),
                    longestCommonSubstring(qAscii, cAscii),
                    longestCommonSubstring(qPhonetic, cPhonetic)
                );
                if (lcsM >= 3 && lcsM >= qToken.length * 0.6) {
                    // Skor: ardışık eşleşen harf oranına göre 55-75 arası
                    const lcsRatio = lcsM / qToken.length;
                    const lcsScore = Math.round(55 + lcsRatio * 20);
                    morphScore = Math.max(morphScore, lcsScore);
                }

                // CR/KR PREFİX EŞDEĞERLİĞİ - MORPH SKORU
                const qCrKr = qAscii.replace(/^kr/, 'cr');
                const cCrKr = cAscii.replace(/^kr/, 'cr');
                if (qCrKr !== qAscii || cCrKr !== cAscii) {
                    if (cCrKr.includes(qCrKr) || qCrKr.includes(cCrKr)) {
                        morphScore = Math.max(morphScore, 70);
                    }
                    if (cCrKr.startsWith(qCrKr)) {
                        morphScore = Math.max(morphScore, 80);
                    }
                }

                // KS/X EŞDEĞERLİĞİ - MORPH SKORU
                const qKsX = normalizeKsX(qAscii);
                const cKsX = normalizeKsX(cAscii);
                if (qKsX !== qAscii || cKsX !== cAscii) {
                    if (qKsX === cKsX) {
                        morphScore = Math.max(morphScore, 95);
                    } else if (cKsX.includes(qKsX) || qKsX.includes(cKsX)) {
                        morphScore = Math.max(morphScore, 70);
                    }
                    if (cKsX.startsWith(qKsX)) {
                        morphScore = Math.max(morphScore, 80);
                    }
                }
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

    // STRONG SINGLE-TOKEN OVERLAP FLOOR
    // Arama kelimesi, marka adındaki herhangi bir kelimenin %50'sinden fazlası ile eşleşiyorsa
    // CRITICAL CAP'e rağmen minimum skor garantisi. Örn: "ersan" → "dersan" (5/6 = %83 örtüşme)
    if (meaningfulQTokens.length === 1 && hasAnyTokenMatch && meaningfulQTokens[0].length >= 3) {
        const qToken = meaningfulQTokens[0];
        const qTokenAscii = getAsciiVariant(qToken);

        let bestOverlapRatio = 0;
        for (const ct of meaningfulCTokens) {
            const ctAscii = getAsciiVariant(ct);

            // Edit distance tabanlı örtüşme (max 2 edit distance)
            const d = Math.min(
                levenshteinDistance(qToken, ct),
                levenshteinDistance(qTokenAscii, ctAscii)
            );
            const maxLen = Math.max(qToken.length, ct.length);
            if (d <= 2) {
                bestOverlapRatio = Math.max(bestOverlapRatio, 1 - (d / maxLen));
            }

            // Substring örtüşme: sorgu adayın içinde veya tersi
            if (ct.includes(qToken) || ctAscii.includes(qTokenAscii)) {
                bestOverlapRatio = Math.max(bestOverlapRatio, qToken.length / ct.length);
            }
            if (qToken.includes(ct) || qTokenAscii.includes(ctAscii)) {
                bestOverlapRatio = Math.max(bestOverlapRatio, ct.length / qToken.length);
            }

            // LCS örtüşme (fonetik dahil)
            const lcs = Math.max(
                longestCommonSubstring(qTokenAscii, ctAscii),
                longestCommonSubstring(getPhoneticKey(qTokenAscii), getPhoneticKey(ctAscii))
            );
            if (lcs >= 3) {
                bestOverlapRatio = Math.max(bestOverlapRatio, lcs / maxLen);
            }
        }

        // >%50 örtüşme varsa, minimum skor tabanı uygula
        if (bestOverlapRatio > 0.5) {
            const overlapFloor = Math.min(70, Math.round(bestOverlapRatio * 70));
            if (overlapFloor > finalScore) {
                finalScore = overlapFloor;
                matchType = "Güçlü kelime örtüşmesi";
            }
        }
    }

    // FIRST WORD MATCH RULE
    // If query matches the first word of the candidate, ensure high score regardless of length
    if (meaningfulQTokens.length > 0 && meaningfulCTokens.length > 0) {
        const qFirst = meaningfulQTokens[0];
        const cFirst = meaningfulCTokens[0];
        const qAscii = getAsciiVariant(qFirst);
        const cAscii = getAsciiVariant(cFirst);

        // Exact match or Prefix match (if query is long enough) on FIRST token
        if (qAscii === cAscii || (qFirst.length >= 2 && cAscii.startsWith(qAscii))) {
            finalScore = Math.max(finalScore, 65);
            if (finalScore === 65) matchType = "İlk kelime eşleşmesi";
        }

        // İlk kelime sessiz harf iskeleti eşleşmesi (min 3 sessiz harf)
        const qFirstConsonants = getConsonantSkeleton(qFirst);
        const cFirstConsonants = getConsonantSkeleton(cFirst);
        if (qFirstConsonants.length >= 3 && qFirstConsonants === cFirstConsonants) {
            finalScore = Math.max(finalScore, 55);
            if (!matchType || finalScore === 55) matchType = "Sessiz harf iskeleti eşleşmesi";
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
