# Knowledge Base — My People

Sources of truth for the My People cultural companion. All AI answers are grounded in the
documents below; nothing is fabricated.

## Sources

### 1. Akan Civilization and History
- **Author:** Kwasi Ampene (Tufts University, USA)
- **Published in:** *Música e Cultura*, vol. 13, no. 3 (2024), pp. 194–256 · ISSN 1980-3303
- **File:** `akan-sources/Akan_Civilization_and_History_African_Musicologica.pdf`
- **Notes:** Cover article of the dossier *Etnomusicologia Negra: Caminhos, Contribuições,
  Pensamento e Legado*. Approaches Akan civilization from a contemporary African
  musicological perspective. Extracted verbatim from the PDF distributed by the journal.

### 2. Indigenous and Exogenous Sources (book review)
- **Reviewer:** Emmanuel Ababio Ofosu-Mensah (University of Ghana)
- **Reviewed work:** Kwasi Konadu, *The Akan People: A Documentary History*, Princeton, NJ:
  Markus Wiener Publishers, 2014.
- **Published in:** *The Journal of African History*, vol. 56, no. 3 (2015), pp. 493–494.
  DOI: `10.1017/S0021853715000481`
- **File:** `akan-sources/div-class-title-…-2014….pdf`
- **Notes:** PDF is the Cambridge Core copy downloaded by the University of Ghana (pages
  493–494). It summarises the two categories of source — indigenous (oral traditions,
  Reindorf, Fynn, Rattray) and exogenous (Iberian, Dutch, French, English, Islamic).

> Both files were provided by the project owner. This MVP makes them the entire curated
> knowledge base — a deliberate demo constraint, not an endorsement that these two
> documents are the whole of Akan culture.

## Indexing

`package.json` scripts:
- `npm run ingest` — extract text from both PDFs, chunk it, build TF-IDF
  (+ optional OpenAI embeddings when `OPENAI_API_KEY` is set), write
  `lib/rag/index.json`.
- The server loads `lib/rag/index.json` at request time. If it is missing, the first
  request triggers an automatic ingest so the demo never breaks.

## Provenance rules

1. Every AI answer returns the document title(s) used, shown under **Sources**.
2. Chunks carry their source page number where available.
3. If retrieval cannot support a claim, the answer says so plainly.