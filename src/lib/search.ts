import type { Person } from './types';

const CHAR_MAP: Record<string, string> = {
  ë: 'e',
  é: 'e',
  è: 'e',
  ê: 'e',
  ç: 'c',
  č: 'c',
  ć: 'c',
  š: 's',
  ž: 'z',
  đ: 'd',
  á: 'a',
  à: 'a',
  â: 'a',
  ä: 'a',
  í: 'i',
  ì: 'i',
  î: 'i',
  ó: 'o',
  ò: 'o',
  ô: 'o',
  ö: 'o',
  ú: 'u',
  ù: 'u',
  û: 'u',
  ü: 'u',
};

/** Lowercases and strips accents so "Çelaj" matches "celaj" and "Dritë" matches "drite". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\u0000-~]/g, (ch) => CHAR_MAP[ch] ?? ch);
}

/**
 * Every word typed must be the start of the first name, father's name or surname.
 * Results are ranked so first-name / surname matches come before father's-name matches.
 */
export function searchPeople(people: Person[], query: string, limit = 50): Person[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const scored: { person: Person; score: number }[] = [];
  for (const person of people) {
    const first = normalize(person.firstName);
    const last = normalize(person.lastName);
    const father = normalize(person.fatherName);
    const fields = [first, last, father];

    let score = 0;
    let matchedAll = true;
    for (const token of tokens) {
      if (first.startsWith(token) || last.startsWith(token)) score += 3;
      else if (father.startsWith(token)) score += 1;
      else if (fields.some((f) => f.includes(token))) score += 0.5;
      else {
        matchedAll = false;
        break;
      }
    }
    if (matchedAll) scored.push({ person, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || comparePeople(a.person, b.person))
    .slice(0, limit)
    .map((s) => s.person);
}

export function comparePeople(a: Person, b: Person): number {
  return (
    a.firstName.localeCompare(b.firstName) ||
    a.lastName.localeCompare(b.lastName) ||
    a.fatherName.localeCompare(b.fatherName)
  );
}
