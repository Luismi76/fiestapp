/**
 * Validador de NIF / NIE / CIF españoles.
 * Verifica formato y dígito de control.
 * Acepta:
 *   - DNI:  8 dígitos + letra de control       (ej. 12345678Z)
 *   - NIE:  X/Y/Z + 7 dígitos + letra          (ej. X1234567L)
 *   - CIF:  letra + 7 dígitos + dígito/letra   (ej. B12345674)
 */
const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

const NIE_PREFIX_MAP: Record<string, string> = {
  X: '0',
  Y: '1',
  Z: '2',
};

const CIF_ORG_LETTERS = 'ABCDEFGHJNPQRSUVW';
const CIF_CONTROL_LETTERS = 'JABCDEFGHI';

function normalize(input: string): string {
  return input.replace(/[\s.\-]/g, '').toUpperCase();
}

function isValidDni(value: string): boolean {
  if (!/^[0-9]{8}[A-Z]$/.test(value)) return false;
  const num = parseInt(value.slice(0, 8), 10);
  const expected = DNI_LETTERS[num % 23];
  return value[8] === expected;
}

function isValidNie(value: string): boolean {
  if (!/^[XYZ][0-9]{7}[A-Z]$/.test(value)) return false;
  const prefix = NIE_PREFIX_MAP[value[0]];
  const num = parseInt(prefix + value.slice(1, 8), 10);
  const expected = DNI_LETTERS[num % 23];
  return value[8] === expected;
}

function isValidCif(value: string): boolean {
  if (!/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(value)) return false;
  if (!CIF_ORG_LETTERS.includes(value[0])) return false;

  const digits = value.slice(1, 8);
  let evenSum = 0;
  let oddSum = 0;

  for (let i = 0; i < digits.length; i++) {
    const d = parseInt(digits[i], 10);
    if (i % 2 === 0) {
      // posición impar en el CIF (1-based) = índice par (0-based)
      const doubled = d * 2;
      oddSum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      evenSum += d;
    }
  }

  const total = evenSum + oddSum;
  const controlDigit = (10 - (total % 10)) % 10;

  const expectedLetter = CIF_CONTROL_LETTERS[controlDigit];
  const expectedDigit = controlDigit.toString();

  // Algunos tipos de organización usan letra, otros dígito
  const lettersOnly = 'PQSNWR';
  const digitsOnly = 'ABEH';
  const last = value[8];

  if (lettersOnly.includes(value[0])) {
    return last === expectedLetter;
  }
  if (digitsOnly.includes(value[0])) {
    return last === expectedDigit;
  }
  return last === expectedLetter || last === expectedDigit;
}

export function isValidSpanishTaxId(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  const normalized = normalize(value);
  return (
    isValidDni(normalized) ||
    isValidNie(normalized) ||
    isValidCif(normalized)
  );
}

export function normalizeSpanishTaxId(value: string): string {
  return normalize(value);
}
