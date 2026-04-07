// KS/X eşdeğerliği test scripti

// normalizeKsX fonksiyonu
function normalizeKsX(text) {
    return text.replace(/ks/g, 'x');
}

// getAsciiVariant
const ASCII_MAP = {
    'ı': 'i', 'ğ': 'g', 'ş': 's', 'ç': 'c', 'ö': 'o', 'ü': 'u',
    'İ': 'i', 'Ğ': 'g', 'Ş': 's', 'Ç': 'c', 'Ö': 'o', 'Ü': 'u'
};
function getAsciiVariant(text) {
    return text.split('').map(c => ASCII_MAP[c] || c).join('');
}

// Temel test
console.log('=== normalizeKsX Test ===');
console.log('foks ->', normalizeKsX('foks'));       // fox
console.log('fox  ->', normalizeKsX('fox'));         // fox
console.log('teksas ->', normalizeKsX('teksas'));   // texas
console.log('texas ->', normalizeKsX('texas'));      // texas
console.log('');

// Eşleşme testi
const tests = [
    ['foks', 'fox'],
    ['fox', 'foks'],
    ['teksas', 'texas'],
    ['foksel', 'foxel'],
];

console.log('=== Eşleşme Testi ===');
for (const [a, b] of tests) {
    const aNorm = normalizeKsX(getAsciiVariant(a));
    const bNorm = normalizeKsX(getAsciiVariant(b));
    const match = aNorm === bNorm;
    console.log(`"${a}" vs "${b}" -> normalize: "${aNorm}" vs "${bNorm}" -> ${match ? '✓ EŞLEŞİYOR' : '✗ EŞLEŞMİYOR'}`);
}
