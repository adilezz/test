import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!API_KEY) fail("Missing GEMINI_API_KEY in environment.");

const inputPath = process.argv[2];
if (!inputPath) fail("Usage: node scripts/gemini_extract.mjs /absolute/path/to/file.pdf");

const absPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
if (!fs.existsSync(absPath)) fail(`Input file not found: ${absPath}`);

const OUTPUT_DIR = path.resolve(__dirname, "../outputs");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Gemini-supported schema (no JSON Schema keywords like additionalProperties)
const thesisSchema = {
  type: "object",
  properties: {
    raw_title_fr: { type: "string", nullable: true },
    raw_title_en: { type: "string", nullable: true },
    raw_title_ar: { type: "string", nullable: true },
    raw_thesis_number: { type: "string", nullable: true },
    raw_university_fr: { type: "string", nullable: true },
    raw_university_en: { type: "string", nullable: true },
    raw_university_ar: { type: "string", nullable: true },
    raw_faculty_fr: { type: "string", nullable: true },
    raw_school_fr: { type: "string", nullable: true },
    raw_department_fr: { type: "string", nullable: true },
    raw_author_full_name: { type: "string", nullable: true },
    raw_author_first_name: { type: "string", nullable: true },
    raw_author_last_name: { type: "string", nullable: true },
    raw_author_birth_date: { type: "string", nullable: true },
    raw_author_birth_place: { type: "string", nullable: true },
    raw_director_full_name: { type: "string", nullable: true },
    raw_co_director_full_name: { type: "string", nullable: true },
    raw_degree: { type: "string", nullable: true },
    raw_full_name_degree: { type: "string", nullable: true },
    raw_defense_date: { type: "string", nullable: true },
    raw_academic_year: { type: "string", nullable: true },
    raw_category_name: { type: "string", nullable: true },
    raw_language: { type: "string", nullable: true },
    raw_keywords_fr: { type: "string", nullable: true },
    raw_page_count: { type: "integer", nullable: true },
    raw_jury_members: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          role_fr: { type: "string", nullable: true },
          role_normalized: {
            type: "string",
            enum: [
              "author",
              "director",
              "co_director",
              "jury_president",
              "jury_examiner",
              "jury_reporter",
              "external_examiner"
            ],
            nullable: true
          },
          title_fr: { type: "string", nullable: true }
        }
      }
    }
  }
};

const responseSchema = {
  type: "object",
  properties: {
    source_file: { type: "string" },
    theses: { type: "array", items: thesisSchema }
  }
};

const ROLE_MAP = `
Map these French labels to normalized roles:
- "Auteur", "Auteure", "Auteur(e)", "PAR": author
- "Directeur", "Directeur de thèse": director
- "Co-directeur", "Co-directeur de thèse", "Codirecteur": co_director
- "Président du jury", "Président": jury_president
- "Rapporteur": jury_reporter
- "Examinateur", "Juge", "Jury": jury_examiner
- "Membre associé", "Membre externe": external_examiner
`;

const PROMPT = `
Vous êtes un extracteur de métadonnées pour des thèses médicales marocaines (premières pages). Le fichier peut contenir plusieurs premières pages (donc plusieurs thèses). Tâches:
1) Segmenter le document en enregistrements de thèses indépendants.
2) Pour chaque thèse, extraire les champs en respectant strictement le schéma JSON fourni. Utiliser le français si le texte source est en français.
3) Normaliser les rôles du jury selon le mappage ci-dessous (role_normalized) et renseigner role_fr avec le libellé tel qu’apparu.
4) Formater les dates en ISO AAAA-MM-JJ si la date complète est identifiable; sinon laisser null et ne pas inventer.
5) Ne pas ajouter d’attributs hors schéma. Répondre uniquement en JSON.

${ROLE_MAP}

Consignes supplémentaires:
- raw_language: détecter le code langue ISO court (fr, ar, en) du texte dominant.
- raw_keywords_fr: si une section Mots-clés/MOTS-CLES est présente, capter la ligne brute.
- raw_degree: par ex. "Doctorat en Médecine".
- raw_university_fr, raw_faculty_fr, raw_school_fr: capturer tels qu’affichés (ex: "UNIVERSITE CADI AYYAD", "FACULTE DE MEDECINE ET DE PHARMACIE").
- raw_title_fr: titre scientifique principal de la thèse.
- raw_thesis_number: valeur après "Thèse N°" si présente.
- raw_defense_date: date de soutenance (après "PRÉSENTÉE ET SOUTENUE... LE"), sinon null.
- raw_author_full_name et si possible raw_author_first_name, raw_author_last_name.
`;

async function main() {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const fileManager = new GoogleAIFileManager(API_KEY);

  console.error(`Uploading file to Gemini: ${absPath}`);
  const upload = await fileManager.uploadFile(absPath, {
    mimeType: "application/pdf",
    displayName: path.basename(absPath)
  });

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema
    }
  });

  const result = await model.generateContent([
    { fileData: { fileUri: upload.file.uri, mimeType: upload.file.mimeType } },
    { text: PROMPT }
  ]);

  const text = result.response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error("Model did not return valid JSON. Raw output:\n", text);
    throw e;
  }

  // Set source_file if missing
  if (!json.source_file) json.source_file = absPath;

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(responseSchema);
  const valid = validate(json);
  if (!valid) {
    console.error("Validation errors:", validate.errors);
    fail("Gemini response does not conform to schema.");
  }

  const outFile = path.join(OUTPUT_DIR, path.basename(absPath).replace(/\.pdf$/i, "-gemini.json"));
  fs.writeFileSync(outFile, JSON.stringify(json, null, 2), "utf8");
  console.log(JSON.stringify({ success: true, output: outFile, thesisCount: json.theses.length }, null, 2));
}

main().catch((err) => {
  console.error("Error:", err?.response?.data || err?.message || err);
  process.exit(1);
});

