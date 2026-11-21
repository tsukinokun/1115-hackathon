import countriesJson from "@/data/countries.json";
import { normalizeName } from "./ingredients";
import type { TagWeights } from "./types";

/**
 * 国・地域のマスタ（data/countries.json。ISO 3166-1 の2文字コード）。
 *
 * 投稿データには「国」の欄が無いので、国はタグとして持つ:
 *   country_<コード小文字>  … その国（例 country_pe = ペルー）。重み 3
 *   region_<地域>           … 属する地域（例 region_latin_america）。重み 2
 * 診断の「どこの国の気分？」は地域タグ（と日本）で聞くので、
 * どんなマイナーな国のレシピでも、地域を通して診断に引っかかる。
 */

export type Region =
  | "east_asia"
  | "southeast_asia"
  | "south_asia"
  | "central_asia"
  | "middle_east"
  | "europe"
  | "africa"
  | "north_america"
  | "latin_america"
  | "oceania";

export type Country = {
  code: string;
  name: string;
  en: string;
  region: Region;
  aliases?: string[];
};

export const COUNTRIES = countriesJson as Country[];

export const REGION_LABELS: Record<Region, string> = {
  east_asia: "東アジア",
  southeast_asia: "東南アジア",
  south_asia: "南アジア",
  central_asia: "中央アジア・コーカサス",
  middle_east: "中東",
  europe: "ヨーロッパ",
  africa: "アフリカ",
  north_america: "北アメリカ",
  latin_america: "中南米",
  oceania: "オセアニア",
};

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));
export const countryByCode = (code: string) => byCode.get(code.toUpperCase());

/** 国旗の絵文字（Windows では Noto Color Emoji を当てないと文字になる。.font-flag を付けて表示する） */
export const flagOf = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

/** 日本語名・別名・英語名・コードで探す。前方一致を優先 */
export function searchCountries(query: string, limit = 8): Country[] {
  const q = normalizeName(query);
  if (!q) return [];
  return COUNTRIES.map((c) => {
    const keys = [c.name, c.en, c.code, ...(c.aliases ?? [])].map(normalizeName);
    const score = keys.some((k) => k === q) ? 3 : keys.some((k) => k.startsWith(q)) ? 2 : keys.some((k) => k.includes(q)) ? 1 : 0;
    return { c, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}

export const countryTag = (code: string) => `country_${code.toLowerCase()}`;
export const regionTag = (region: Region) => `region_${region}`;

/** 選んだ国コードから診断用タグを作る */
export function countryTags(codes: string[]): TagWeights {
  const tags: TagWeights = {};
  for (const code of codes) {
    const c = countryByCode(code);
    if (!c) continue;
    tags[countryTag(c.code)] = 3;
    tags[regionTag(c.region)] = Math.max(tags[regionTag(c.region)] ?? 0, 2);
  }
  return tags;
}

/** レシピのタグから国を取り出す（表示用） */
export function countriesFromTags(tags: TagWeights): Country[] {
  return Object.keys(tags)
    .filter((k) => k.startsWith("country_"))
    .map((k) => countryByCode(k.slice("country_".length)))
    .filter((c): c is Country => !!c);
}

/** 何も打っていないときに並べる、よく使われそうな国 */
export const POPULAR_COUNTRIES = ["JP", "IT", "FR", "CN", "KR", "TH", "IN", "MX", "VN", "ES", "TR", "US"];
