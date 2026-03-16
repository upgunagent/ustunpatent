// Test dosyası: Marka benzerlik fonksiyonu güçlendirme doğrulaması
// Tüm helper fonksiyonları brand-similarity.ts ile aynı mantıkta

const ASCII_MAP = {
    'ı': 'i', 'ğ': 'g', 'ş': 's', 'ç': 'c', 'ö': 'o', 'ü': 'u',
    'İ': 'i', 'Ğ': 'g', 'Ş': 's', 'Ç': 'c', 'Ö': 'o', 'Ü': 'u'
};
const GENERIC_TERMS = new Set([
    "a.ş", "a.s", "as", "ltd", "şti", "sti", "san", "tic", "limited", "şirket", "sirket",
    "holding", "group", "grup", "teknoloji", "tech", "otel", "hotel", "restoran",
    "inşaat", "insaat", "gıda", "gida", "enerji", "bilişim", "bilisim", "spor", "salonu",
    "gym", "otomotiv", "tekstil", "turizm", "gayrimenkul", "yatırım", "hizmetleri"
]);

function normalizeText(text) {
    if (!text) return "";
    let normalized = text.toLocaleLowerCase('tr-TR');
    normalized = normalized.replace(/[-_/.+,&]/g, ' ');
    return normalized.replace(/\s+/g, ' ').trim();
}
function getAsciiVariant(text) {
    return text.split('').map(c => ASCII_MAP[c] || c).join('');
}
function getConsonantSkeleton(text) {
    const ascii = getAsciiVariant(text);
    return ascii.replace(/[aeiouy]/g, '');
}
function tokenize(text) {
    return text.split(' ').filter(t => t.length > 0);
}
function levenshteinDistance(s1, s2) {
    const len1 = s1.length, len2 = s2.length;
    const d = [];
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;
    for (let i = 0; i <= len1; i++) d[i] = [i];
    for (let j = 0; j <= len2; j++) d[0][j] = j;
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i-1] === s2[j-1] ? 0 : 1;
            let val = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+cost);
            if (i > 1 && j > 1 && s1[i-1] === s2[j-2] && s1[i-2] === s2[j-1])
                val = Math.min(val, d[i-2][j-2]+cost);
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
            if (!matches2[j] && s1[i] === s2[j]) { matches1[i] = true; matches2[j] = true; matchingChars++; break; }
        }
    }
    if (matchingChars === 0) return 0;
    let transpositions = 0, k = 0;
    for (let i = 0; i < s1.length; i++) {
        if (matches1[i]) { while (!matches2[k]) k++; if (s1[i] !== s2[k]) transpositions++; k++; }
    }
    transpositions /= 2;
    const jaro = ((matchingChars / s1.length) + (matchingChars / s2.length) + ((matchingChars - transpositions) / matchingChars)) / 3;
    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) { if (s1[i] === s2[i]) prefix++; else break; }
    return jaro + prefix * 0.1 * (1 - jaro);
}
function ngramSimilarity(s1, s2, n = 2) {
    if (s1.length < n || s2.length < n) return s1 === s2 ? 1 : 0;
    const grams1 = [], grams2 = [];
    for (let i = 0; i <= s1.length - n; i++) grams1.push(s1.substring(i, i + n));
    for (let i = 0; i <= s2.length - n; i++) grams2.push(s2.substring(i, i + n));
    let intersection = 0;
    const usedGrams2 = new Array(grams2.length).fill(false);
    for (let i = 0; i < grams1.length; i++) {
        for (let j = 0; j < grams2.length; j++) {
            if (!usedGrams2[j] && grams1[i] === grams2[j]) { intersection++; usedGrams2[j] = true; break; }
        }
    }
    return (2.0 * intersection) / (grams1.length + grams2.length);
}
function getPhoneticKey(text) {
    return text.replace(/[ş]/g,'s').replace(/[ç]/g,'c').replace(/[ğg]/g,'k').replace(/[bp]/g,'p').replace(/[dt]/g,'t').replace(/[ıi]/g,'i').replace(/[oö]/g,'o').replace(/[uü]/g,'u');
}

function calculateBrandSimilarity(query, candidate) {
    const qNorm = normalizeText(query);
    const cNorm = normalizeText(candidate);
    if (!qNorm || !cNorm) return { score: 0, reason: "", matchedTokens: [] };
    if (qNorm === cNorm) return { score: 100, reason: "Tam Eşleşme", matchedTokens: [qNorm] };

    const qTokens = tokenize(qNorm);
    const cTokens = tokenize(cNorm);
    const meaningfulQTokens = qTokens.filter(t => t.length >= 2);
    const meaningfulCTokens = cTokens.filter(t => t.length >= 2);
    if (meaningfulQTokens.length === 0) return { score: 0, reason: "Geçersiz sorgu", matchedTokens: [] };

    let tokenScore = 0;
    const matchedTokenList = [];
    let matchType = "";
    const cTokenFlags = meaningfulCTokens.map(t => ({ text: t, isGeneric: GENERIC_TERMS.has(t) || GENERIC_TERMS.has(getAsciiVariant(t)) }));
    let qTokensMatched = 0;

    // EXACT matches
    for (const qToken of meaningfulQTokens) {
        if (cTokenFlags.findIndex(ct => ct.text === qToken) !== -1) { qTokensMatched++; matchedTokenList.push(qToken); }
    }

    // FUZZY matches if no exact
    if (qTokensMatched === 0) {
        for (const qToken of meaningfulQTokens) {
            const fuzzyMatch = cTokenFlags.find(ct => {
                const d = levenshteinDistance(qToken, ct.text);
                const maxDist = qToken.length < 6 ? 1 : (qToken.length < 7 ? 2 : 3);
                const lenRatio = Math.min(qToken.length, ct.text.length) / Math.max(qToken.length, ct.text.length);

                // SUBSTRING MATCH (min 2 chars - UPDATED)
                const isSubstring = (qToken.length >= 2 && ct.text.includes(qToken)) || (ct.text.length >= 2 && qToken.includes(ct.text));
                if (isSubstring) return true;

                // KISA SORGU PREFİX KONTROLÜ (2-4 karakter - NEW)
                if (qToken.length >= 2 && qToken.length <= 4 && ct.text.startsWith(qToken) && ct.text.length > qToken.length) return true;

                // EDIT DISTANCE
                if (d <= maxDist && ct.text.length >= 2 && lenRatio >= 0.7) return true;

                // JARO-WINKLER
                const jwTokenScore = jaroWinkler(qToken, ct.text);
                if (jwTokenScore >= 0.78 && lenRatio >= 0.7) return true;

                // PREFIX (5+ chars)
                if (qToken.length >= 5 && ct.text.length >= 5) {
                    const prefixLen = Math.min(4, Math.floor(Math.min(qToken.length, ct.text.length) * 0.6));
                    if (prefixLen >= 3 && qToken.substring(0, prefixLen) === ct.text.substring(0, prefixLen) && lenRatio >= 0.8) return true;
                }

                // SESSİZ HARF İSKELETİ EŞLEŞMESİ (NEW)
                const qConsonants = getConsonantSkeleton(qToken);
                const cConsonants = getConsonantSkeleton(ct.text);
                if (qConsonants.length >= 2 && qConsonants === cConsonants) return true;

                return false;
            });
            if (fuzzyMatch) { qTokensMatched++; matchedTokenList.push(qToken); break; }
        }
    }

    const hasAnyTokenMatch = qTokensMatched > 0;

    // Token score calculation
    if (meaningfulQTokens.length === 1 && hasAnyTokenMatch) {
        const qToken = meaningfulQTokens[0];
        const exactMatch = cTokenFlags.find(ct => ct.text === qToken);
        if (exactMatch) {
            const totalTokens = meaningfulCTokens.length;
            if (totalTokens === 1) { tokenScore = 100; matchType = "Tam token eşleşmesi"; }
            else {
                if (exactMatch.isGeneric) { tokenScore = 20; matchType = "Jenerik kelime eşleşmesi"; }
                else {
                    const genericExtras = cTokenFlags.filter(ct => ct.text !== qToken && ct.isGeneric).length;
                    const uniqueExtras = cTokenFlags.filter(ct => ct.text !== qToken && !ct.isGeneric).length;
                    const weightedK = 1 + (genericExtras * 0.25) + (uniqueExtras * 1.0);
                    tokenScore = (1 / weightedK) * 100;
                    matchType = `${totalTokens + 1} kelimeli markada 1 kelime eşleşmesi`;
                }
            }
        }
    } else if (meaningfulQTokens.length > 1 && hasAnyTokenMatch) {
        const coverageQ = (qTokensMatched / meaningfulQTokens.length) * 100;
        const coverageC = (qTokensMatched / meaningfulCTokens.length) * 100;
        tokenScore = (coverageQ * 0.7) + (coverageC * 0.3);
        if (qTokensMatched > 0) matchType = `Çoklu kelime eşleşmesi (%${Math.round(tokenScore)})`;
    }

    // Char Score
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

        const fuzzyTokenScores = [];
        for (const qt of meaningfulQTokens) {
            let bestTokenMatch = 0;
            for (const ct of meaningfulCTokens) {
                const d = levenshteinDistance(qt, ct);
                const jw = jaroWinkler(qt, ct);
                if (jw < 0.75 && d > 1) continue;
                const ng = ngramSimilarity(qt, ct, 2);
                if (d === 1) bestTokenMatch = Math.max(bestTokenMatch, 95);
                else if (d === 0) bestTokenMatch = 100;
                else {
                    const score = (0.45 * jw + 0.35 * ng + 0.20 * (1 - d / Math.max(qt.length, ct.length))) * 100;
                    bestTokenMatch = Math.max(bestTokenMatch, score);
                }
                const qtAscii = getAsciiVariant(qt);
                const ctAscii = getAsciiVariant(ct);
                if (qt !== ct && qtAscii === ctAscii) bestTokenMatch = Math.max(bestTokenMatch, 98);
            }
            fuzzyTokenScores.push(bestTokenMatch);
        }
        let avgFuzzyTokenScore = 0;
        if (fuzzyTokenScores.length > 0) avgFuzzyTokenScore = fuzzyTokenScores.reduce((a,b) => a+b, 0) / fuzzyTokenScores.length;
        if (avgFuzzyTokenScore < 50) avgFuzzyTokenScore = 0;
        charScore = Math.max(rawCharScore, avgFuzzyTokenScore);
    }

    // Phonetic Score
    let phoneticScore = 0;
    if (hasAnyTokenMatch) {
        const qPhon = getPhoneticKey(qNorm);
        const cPhon = getPhoneticKey(cNorm);
        const pLenRatio = Math.min(qPhon.length, cPhon.length) / Math.max(qPhon.length, cPhon.length);
        if (pLenRatio > 0.6) {
            if (qPhon === cPhon) phoneticScore = 90;
            else { const pd = levenshteinDistance(qPhon, cPhon); const pdNorm = 1 - (pd / Math.max(qPhon.length, cPhon.length)); if (pdNorm > 0.8) phoneticScore = pdNorm * 85; }
        }
    }

    // Morph Score (UPDATED - çoklu kelime desteği)
    let morphScore = 0;
    if (meaningfulCTokens.length >= 1) {
        for (const qToken of meaningfulQTokens) {
            if (qToken.length < 2) continue;
            for (const ct of meaningfulCTokens) {
                if (ct.startsWith(qToken) && ct.length > qToken.length) morphScore = Math.max(morphScore, 85);
                if (qToken.startsWith(ct) && qToken.length > ct.length && ct.length >= 2) morphScore = Math.max(morphScore, 80);
                // Substring/Contains eşleşmesi
                if (qToken.length >= 2 && ct.includes(qToken) && !ct.startsWith(qToken) && ct.length > qToken.length) morphScore = Math.max(morphScore, 70);
                if (ct.length >= 2 && qToken.includes(ct) && !qToken.startsWith(ct) && qToken.length > ct.length) morphScore = Math.max(morphScore, 65);
                const qCons = getConsonantSkeleton(qToken);
                const cCons = getConsonantSkeleton(ct);
                if (qCons.length >= 2 && cCons.length >= 2 && qCons === cCons) morphScore = Math.max(morphScore, 75);
            }
        }
    }

    // Combined/Split
    const qCombined = meaningfulQTokens.join('');
    const cCombined = meaningfulCTokens.join('');
    if (qCombined === cCombined) { charScore = Math.max(charScore, 95); if (!tokenScore) matchType = "Birleşik yazım eşleşmesi"; }

    let finalScore = Math.max(tokenScore, charScore, phoneticScore, morphScore);

    // NO TOKEN MATCH CAP
    if (!hasAnyTokenMatch) { finalScore = Math.min(15, finalScore); matchType = "Kısmi benzerlik (token eşleşmesi yok)"; }

    // Single token cap
    if (hasAnyTokenMatch && meaningfulQTokens.length === 1 && meaningfulCTokens.length > 1) {
        const candidateTokenCount = meaningfulCTokens.length;
        const maxAllowedScore = tokenScore > 0 ? tokenScore + 15 : (100 / candidateTokenCount) + 10;
        finalScore = Math.min(finalScore, maxAllowedScore);
    }

    // FIRST WORD MATCH (UPDATED - prefix 2+ karakter, consonant skeleton)
    if (meaningfulQTokens.length > 0 && meaningfulCTokens.length > 0) {
        const qFirst = meaningfulQTokens[0];
        const cFirst = meaningfulCTokens[0];
        const qAscii = getAsciiVariant(qFirst);
        const cAscii = getAsciiVariant(cFirst);
        if (qAscii === cAscii || (qFirst.length >= 2 && cAscii.startsWith(qAscii))) {
            finalScore = Math.max(finalScore, 65);
            if (finalScore === 65) matchType = "İlk kelime eşleşmesi";
        }
        const qFirstConsonants = getConsonantSkeleton(qFirst);
        const cFirstConsonants = getConsonantSkeleton(cFirst);
        if (qFirstConsonants.length >= 2 && qFirstConsonants === cFirstConsonants) {
            finalScore = Math.max(finalScore, 55);
            if (!matchType || finalScore === 55) matchType = "Sessiz harf iskeleti eşleşmesi";
        }
    }

    let finalReason = matchType;
    if (hasAnyTokenMatch) {
        if (charScore > tokenScore && charScore >= finalScore) {
            const asciiQ = getAsciiVariant(qNorm); const asciiC = getAsciiVariant(cNorm);
            if (qNorm !== cNorm && asciiQ === asciiC) finalReason = "Diakritik/Karakter farkı";
            else if (levenshteinDistance(qNorm, cNorm) === 1) finalReason = "Tek harf hatası";
            else finalReason = "Yazım benzerliği";
        } else if (phoneticScore > tokenScore && phoneticScore >= finalScore) finalReason = "Fonetik benzerlik";
        else if (morphScore > tokenScore && morphScore >= finalScore) finalReason = "Kelime kökü/ek benzerliği";
    }

    return { score: Math.min(100, Math.round(finalScore)), reason: finalReason || "Benzerlik", matchedTokens: matchedTokenList, details: { tokenScore, charScore, phoneticScore, morphScore } };
}

// ============================================================
// TESTLER
// ============================================================

let passed = 0, failed = 0;

function test(name, query, candidate, minScore, description) {
    const result = calculateBrandSimilarity(query, candidate);
    const ok = result.score >= minScore;
    if (ok) passed++;
    else failed++;
    const status = ok ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} | ${name}`);
    console.log(`  Sorgu: "${query}" → Aday: "${candidate}"`);
    console.log(`  Skor: ${result.score} (min beklenen: ${minScore}) | Neden: ${result.reason}`);
    if (result.details) console.log(`  Detay: token=${Math.round(result.details.tokenScore)}, char=${Math.round(result.details.charScore)}, phonetic=${Math.round(result.details.phoneticScore)}, morph=${Math.round(result.details.morphScore)}`);
    console.log(`  ${description}`);
    console.log("");
}

console.log("========================================");
console.log("MARKA BENZERLİK FONKSİYONU TEST RAPORU");
console.log("========================================\n");

// Kullanıcının belirttiği test vakaları
console.log("--- KULLANICI SENARYOLARI ---\n");

test("Senaryo 1: tag → unitag", "tag", "unitag", 50, "Substring eşleşmesi: 'tag' kelimesi 'unitag' içinde geçiyor");
test("Senaryo 2: gm → gmbutikk", "gm", "gmbutikk", 50, "Prefix eşleşmesi: 'gm' kelimesi 'gmbutikk' markasının başlangıcı");
test("Senaryo 3: gm → gme", "gm", "gme", 50, "Prefix eşleşmesi: 'gm' kelimesi 'gme' markasının başlangıcı");
test("Senaryo 4: gm → gmm", "gm", "gmm", 50, "Prefix eşleşmesi: 'gm' kelimesi 'gmm' markasının başlangıcı");
test("Senaryo 5: gm → gm messo", "gm", "gm messo", 50, "Exact token eşleşmesi: 'gm' kelimesi 'gm messo' içinde tam eşleşiyor");
test("Senaryo 6: bahar dokunuşu → bhr yayınevi", "bahar dokunuşu", "bhr yayınevi", 50, "Sessiz harf iskeleti: 'bahar'→'bhr' ve 'bhr'→'bhr' eşleşiyor");

// Regresyon testleri - mevcut fonksiyonun bozulmadığından emin ol
console.log("\n--- REGRESYON TESTLERİ ---\n");

test("Regresyon 1: ahmet → mekanika a.ş.", "ahmet", "mekanika a.ş. 2282", 0, "Eşleşmemeli veya çok düşük skor");
test("Regresyon 2: ahmet → ahmed farouki", "ahmet", "ahmed farouki 1894", 50, "Fuzzy match: 1 harf farkı (t→d)");
test("Regresyon 3: fermoda → fermano", "fermoda", "fermano", 50, "Yüksek prefix benzerliği");
test("Regresyon 4: demra → demra", "demra", "demra", 100, "Tam eşleşme");
test("Regresyon 5: exact match", "uppypro", "uppypro", 100, "Tam eşleşme");
test("Regresyon 6: karakter farkı", "şeker", "seker", 50, "ASCII varyant eşleşmesi");

// Ek edge case'ler
console.log("\n--- EK EDGE CASE'LER ---\n");

test("Edge 1: tek kelime substring", "net", "internet", 50, "'net' kelimesi 'internet' içinde geçiyor");
test("Edge 2: tek kelime prefix", "al", "almanya", 50, "'al' kelimesi 'almanya' başlangıcı");
test("Edge 3: birleşik yazım", "günaydın", "gün aydın", 50, "Birleşik/ayrık yazım");

console.log("========================================");
console.log(`TOPLAM: ${passed + failed} test | ✅ ${passed} başarılı | ❌ ${failed} başarısız`);
console.log("========================================");
