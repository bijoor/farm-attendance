// English to Devanagari (Marathi) transliteration utility
// Uses phonetic mapping for common patterns

// Vowel marks (matras) - attached to consonants
const vowelMarks: Record<string, string> = {
  'a': '',      // inherent vowel, no mark needed
  'aa': 'ा',
  'i': 'ि',
  'ee': 'ी',
  'u': 'ु',
  'oo': 'ू',
  'e': 'े',
  'ai': 'ै',
  'o': 'ो',
  'au': 'ौ',
  'ri': 'ृ',
};

// Standalone vowels
const vowels: Record<string, string> = {
  'a': 'अ',
  'aa': 'आ',
  'i': 'इ',
  'ee': 'ई',
  'u': 'उ',
  'oo': 'ऊ',
  'e': 'ए',
  'ai': 'ऐ',
  'o': 'ओ',
  'au': 'औ',
  'ri': 'ऋ',
};

// Consonants
const consonants: Record<string, string> = {
  'k': 'क',
  'kh': 'ख',
  'g': 'ग',
  'gh': 'घ',
  'ng': 'ङ',
  'ch': 'च',
  'chh': 'छ',
  'j': 'ज',
  'jh': 'झ',
  'ny': 'ञ',
  't': 'त',
  'th': 'थ',
  'd': 'द',
  'dh': 'ध',
  'n': 'न',
  'T': 'ट',
  'Th': 'ठ',
  'D': 'ड',
  'Dh': 'ढ',
  'N': 'ण',
  'p': 'प',
  'ph': 'फ',
  'f': 'फ',
  'b': 'ब',
  'bh': 'भ',
  'm': 'म',
  'y': 'य',
  'r': 'र',
  'l': 'ल',
  'v': 'व',
  'w': 'व',
  'sh': 'श',
  'Sh': 'ष',
  's': 'स',
  'h': 'ह',
  'L': 'ळ',
  'x': 'क्ष',
  'gn': 'ज्ञ',
};

// Special characters
const specialChars: Record<string, string> = {
  '.': '।',
  '0': '०',
  '1': '१',
  '2': '२',
  '3': '३',
  '4': '४',
  '5': '५',
  '6': '६',
  '7': '७',
  '8': '८',
  '9': '९',
};

// Halant (virama) - removes inherent vowel
const HALANT = '्';

// Common word mappings for farming context
const commonWords: Record<string, string> = {
  'weeding': 'निंदणी',
  'planting': 'लागवड',
  'harvesting': 'कापणी',
  'spraying': 'फवारणी',
  'watering': 'पाणी देणे',
  'pruning': 'छाटणी',
  'fertilizing': 'खत घालणे',
  'mulching': 'आच्छादन',
  'cleaning': 'साफसफाई',
  'fencing': 'कुंपण',
  'general': 'सामान्य',
  'work': 'काम',
  'area': 'क्षेत्र',
  'block': 'ब्लॉक',
  'section': 'विभाग',
  'field': 'शेत',
  'main': 'मुख्य',
  'supervisor': 'पर्यवेक्षक',
  'worker': 'कामगार',
  'group': 'गट',
};

/**
 * Transliterate English text to Devanagari (Marathi)
 * This is a basic phonetic transliteration - results may need manual adjustment
 */
export function transliterateToMarathi(text: string): string {
  if (!text) return '';

  // Check for common words first
  const lowerText = text.toLowerCase().trim();
  if (commonWords[lowerText]) {
    return commonWords[lowerText];
  }

  let result = '';
  let i = 0;
  const chars = text.toLowerCase();
  let lastWasConsonant = false;

  while (i < chars.length) {
    const char = chars[i];
    const nextChar = chars[i + 1] || '';
    const twoChar = char + nextChar;
    const threeChar = twoChar + (chars[i + 2] || '');

    // Check for special characters
    if (specialChars[char]) {
      result += specialChars[char];
      lastWasConsonant = false;
      i++;
      continue;
    }

    // Skip spaces but keep them
    if (char === ' ') {
      result += ' ';
      lastWasConsonant = false;
      i++;
      continue;
    }

    // Check for three-letter consonant combinations
    if (threeChar === 'chh') {
      if (lastWasConsonant) {
        result += HALANT + consonants['chh'];
      } else {
        result += consonants['chh'];
      }
      lastWasConsonant = true;
      i += 3;
      continue;
    }

    // Check for two-letter consonants first
    if (consonants[twoChar]) {
      if (lastWasConsonant) {
        result += HALANT + consonants[twoChar];
      } else {
        result += consonants[twoChar];
      }
      lastWasConsonant = true;
      i += 2;
      continue;
    }

    // Check for two-letter vowels
    if (vowels[twoChar]) {
      if (lastWasConsonant) {
        result += vowelMarks[twoChar];
      } else {
        result += vowels[twoChar];
      }
      lastWasConsonant = false;
      i += 2;
      continue;
    }

    // Check for single consonant
    if (consonants[char]) {
      if (lastWasConsonant) {
        result += HALANT + consonants[char];
      } else {
        result += consonants[char];
      }
      lastWasConsonant = true;
      i++;
      continue;
    }

    // Check for single vowel
    if (vowels[char]) {
      if (lastWasConsonant) {
        result += vowelMarks[char] || '';
      } else {
        result += vowels[char];
      }
      lastWasConsonant = false;
      i++;
      continue;
    }

    // Pass through any other character
    result += char;
    lastWasConsonant = false;
    i++;
  }

  // If ending with consonant, it has inherent 'a' which is fine
  // But if we want to end without vowel, we could add halant

  return result;
}

/**
 * Generate a short Marathi code from an English word
 * Takes first 2-3 consonants and creates a short form
 */
export function generateMarathiCode(englishText: string): string {
  if (!englishText) return '';

  // First try to transliterate the whole word
  const full = transliterateToMarathi(englishText);

  // Return first 2-3 characters (Devanagari characters, not bytes)
  const chars = [...full]; // Spread to handle multi-byte characters
  return chars.slice(0, 3).join('');
}

/**
 * Transliterate numbers to Devanagari
 */
export function transliterateNumbers(text: string): string {
  return text.replace(/[0-9]/g, (digit) => specialChars[digit] || digit);
}

/**
 * Check if text contains Devanagari characters
 */
export function containsDevanagari(text: string): boolean {
  // Devanagari Unicode range: 0900-097F
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Check if text contains primarily English/Latin characters
 */
export function containsLatin(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}
