// Mock helper functions (updated with new logic)
const GENERIC_TERMS = new Set([
    "a.ş", "a.s", "as", "ltd", "şti", "sti", "san", "tic", "limited", "şirket", "sirket",
    "holding", "group", "grup", "teknoloji", "tech", "otel", "hotel", "restoran",
    "inşaat", "insaat", "gıda", "gida", "enerji", "bilişim", "bilisim", "spor", "salonu",
    "gym", "otomotiv", "tekstil", "turizm", "gayrimenkul", "yatırım", "hizmetleri"
]);
const ASCII_MAP = {
    'ı': 'i', 'ğ': 'g', 'ş': 's', 'ç': 'c', 'ö': 'o', 'ü': 'u',
    'İ': 'i', 'Ğ': 'g', 'Ş': 's', 'Ç': 'c', 'Ö': 'o', 'Ü': 'u'
};

function normalizeText(text) {
    if (!text) return "";
    let normalized = text.toLocaleLowerCase('tr-TR');
    normalized = normalized.replace(/[-_/.+,&]/g, ' ');
    return normalized.replace(/\s+/g, ' ').trim();
}
function getAsciiVariant(text) {
    return text.split('').map(c => ASCII_MAP[c] || c).join('');
}
function tokenize(text) {
    return text.split(' ').filter(t => t.length > 0);
}
function levenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const d = [];
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;
    for (let i = 0; i <= len1; i++) d[i] = [i];
    for (let j = 0; j <= len2; j++) d[0][j] = j;
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            let val = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
            if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
                val = Math.min(val, d[i - 2][j - 2] + cost);
            }
            d[i][j] = val;
        }
    }
    return d[len1][len2];
}
function jaroWinkler(s1, s2) {
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
function ngramSimilarity(s1, s2, n = 2) {
    if (s1.length < n || s2.length < n) return s1 === s2 ? 1 : 0;
    const grams1 = [];
    for (let i = 0; i <= s1.length - n; i++) grams1.push(s1.substring(i, i + n));
    const grams2 = [];
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

// NEW LOGIC IMPLEMENTATION
function calculateBrandSimilarity(query, candidate) {
    const qNorm = normalizeText(query);
    const cNorm = normalizeText(candidate);
    if (!qNorm || !cNorm) return { score: 0 };
    if (qNorm === cNorm) return { score: 100 };

    const qTokens = tokenize(qNorm);
    const cTokens = tokenize(cNorm);

    // FILTER: Ignore single-character tokens
    const meaningfulQTokens = qTokens.filter(t => t.length >= 2);
    const meaningfulCTokens = cTokens.filter(t => t.length >= 2);

    if (meaningfulQTokens.length === 0) {
        return { score: 0, reason: "Geçersiz sorgu" };
    }

    // Token Score + Match Detection
    let tokenScore = 0;
    const cTokenFlags = meaningfulCTokens.map(t => ({ text: t, isGeneric: GENERIC_TERMS.has(t) || GENERIC_TERMS.has(getAsciiVariant(t)) }));

    let qTokensMatched = 0;
    // Check EXACT matches
    for (const qToken of meaningfulQTokens) {
        const exactMatchIndex = cTokenFlags.findIndex(ct => ct.text === qToken);
        if (exactMatchIndex !== -1) {
            qTokensMatched++;
        }
    }

    // Check FUZZY matches (edit distance = 1) if no exact match
    if (qTokensMatched === 0) {
        for (const qToken of meaningfulQTokens) {
            const fuzzyMatch = cTokenFlags.find(ct => {
                const d = levenshteinDistance(qToken, ct.text);
                return d === 1 && ct.text.length >= 2;
            });

            if (fuzzyMatch) {
                qTokensMatched++;
                break;
            }
        }
    }

    // KEY: Do we have ANY token match?
    const hasAnyTokenMatch = qTokensMatched > 0;

    console.log("=== TOKEN MATCH CHECK ===");
    console.log("Query tokens (meaningful):", meaningfulQTokens);
    console.log("Candidate tokens (meaningful):", meaningfulCTokens.map(t => t));
    console.log("Matches found:", qTokensMatched);
    console.log("hasAnyTokenMatch:", hasAnyTokenMatch);

    if (meaningfulQTokens.length === 1 && hasAnyTokenMatch) {
        const qToken = meaningfulQTokens[0];
        const exactMatch = cTokenFlags.find(ct => ct.text === qToken);
        if (exactMatch) {
            const totalTokens = meaningfulCTokens.length;
            if (totalTokens === 1) {
                tokenScore = 100;
            } else {
                if (exactMatch.isGeneric) {
                    tokenScore = 20;
                } else {
                    const genericExtras = cTokenFlags.filter(ct => ct.text !== qToken && ct.isGeneric).length;
                    const uniqueExtras = cTokenFlags.filter(ct => ct.text !== qToken && !ct.isGeneric).length;
                    const weightedK = 1 + (genericExtras * 0.25) + (uniqueExtras * 1.0);
                    tokenScore = (1 / weightedK) * 100;
                }
            }
        }
    } else if (meaningfulQTokens.length > 1 && hasAnyTokenMatch) {
        const coverageQ = (qTokensMatched / meaningfulQTokens.length) * 100;
        const coverageC = (qTokensMatched / meaningfulCTokens.length) * 100;
        tokenScore = (coverageQ * 0.7) + (coverageC * 0.3);
    }

    // Char Score - ONLY if token match exists
    let charScore = 0;
    if (hasAnyTokenMatch) {
        const jwTotal = jaroWinkler(qNorm, cNorm);
        charScore = jwTotal * 100; // Simplified for test
    }

    // Phonetic Score - ONLY if token match exists
    let phoneticScore = 0;
    if (hasAnyTokenMatch) {
        // Simplified
        phoneticScore = 0;
    }

    let morphScore = 0;

    let finalScore = Math.max(tokenScore, charScore, phoneticScore, morphScore);

    // NO TOKEN MATCH CAP
    if (!hasAnyTokenMatch) {
        console.log(">>> NO TOKEN MATCH - Capping at 15%");
        finalScore = Math.min(15, finalScore);
    }

    // Single token cap
    if (hasAnyTokenMatch && meaningfulQTokens.length === 1 && meaningfulCTokens.length > 1 && tokenScore > 0) {
        finalScore = Math.min(finalScore, tokenScore + 20);
    }

    return {
        finalScore: Math.min(100, Math.round(finalScore)),
        hasTokenMatch: hasAnyTokenMatch,
        details: { tokenScore, charScore, phoneticScore, morphScore }
    };
}

// RUN TESTS
console.log("=== TEST 1: Ahmet vs Mekanika ===");
const test1 = calculateBrandSimilarity("ahmet", "mekanika a.ş. 2282");
console.log("Result:", test1);
console.log("Expected: score should be 0-15 (NO token match)\n");

console.log("=== TEST 2: Ahmet vs Ahmed Farouki ===");
const test2 = calculateBrandSimilarity("ahmet", "ahmed farouki 1894 qualite superieure");
console.log("Result:", test2);
console.log("Expected: score should be ~90-95 (fuzzy token match: ahmet->ahmed, edit distance=1)\n");

console.log("=== TEST 3: Ahmet vs A Altın Yıldız ===");
const test3 = calculateBrandSimilarity("ahmet", "a altın yıldız kuyumculuk");
console.log("Result:", test3);
console.log("Expected: score should be 0-15 (NO token match, 'a' is filtered out)\n");
