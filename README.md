# Sangam: The API for Ayurvedic Interoperability

> **Connecting Ayurveda with the language of Modern Healthcare**

Sangam is a full-stack platform and microservice mapping **AYUSH NAMASTE Portal** terminology to **WHO ICD-11 Traditional Medicine Module 2 (TM2)** codes, generating ABDM-compliant **HL7 FHIR R4 Condition Resources** for Electronic Health Record (EHR) systems.

---

## 🚀 Key Features

- 🔍 **Multilingual Fuzzy Autocomplete**: Real-time debounced search matching across English terminology, Devanagari script, phonetic Hinglish transliteration, AYUSH NAMASTE codes, and WHO ICD-11 TM2 codes via PostgreSQL `pg_trgm` GIN indexing.
- 🌐 **Dual Coding & Interoperability**: Automatic cross-referencing between AYUSH diagnostic concepts (`AAA-1`, etc.) and WHO classification codes (`SR11`, `SQ00`, `SN49`, etc.).
- 📋 **Interactive FHIR R4 Generator**:
  - Two-pane workspace with live concept inspector.
  - Configurable clinical status (`active`, `recurrence`, `relapse`, `inactive`, `remission`, `resolved`).
  - Patient / ABHA ID integration (e.g. `ABHA-12-3456-7890`).
  - Generates ABDM & HL7 FHIR R4 `Condition` resources with dual-coded terminology (`http://namaste.ayush.gov.in/codes` and `http://id.who.int/icd/release/11/mms`).
- 🎨 **Modern Split Workspace UI**:
  - Pill search bar with badge-highlighted autocomplete dropdown.
  - Interactive FHIR condition configuration card.
  - Syntax-highlighted JSON viewer with single-click copy and animated toast notifications.
- ⚡ **Standardized REST API**: High-performance `GET /api/search?q=:query` endpoint returning structured payloads for EHR systems.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, TypeScript, React 18)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL with `pg_trgm` extension, GIN indexes & RPC functions)
- **Icons & Styling**: [Lucide React](https://lucide.dev/), Custom Vanilla CSS Design System with Google Fonts (*Plus Jakarta Sans*, *Fira Code*)
- **Standards Compliance**: HL7 FHIR R4 (`Condition` Resource), Ayushman Bharat Digital Mission (ABDM), WHO ICD-11 TM2

---

## 🖥️ UI Workflow

1. **Search & Select**:
   - Type any English term (e.g., `Vata`), Devanagari (`वात`), Hinglish (`Vatasanchayah`), or code (`SR11` / `AAA-1`) into the search pill.
   - Select the desired clinical concept from the dropdown.
2. **Configure FHIR Condition**:
   - Review selected concept metadata (NAMASTE code, TM2 code, Devanagari, Hinglish).
   - Select **Clinical Status** and enter **Patient / ABHA ID**.
   - Click **Generate FHIR**.
3. **Export & Integrate**:
   - Inspect the generated HL7 FHIR R4 JSON in the right pane.
   - Click **Copy JSON** to paste directly into your EHR pipeline or ABDM integration testbed.

---

## 📦 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/iamprashant-shukla/ayush-tm2-ehr-api.git
cd ayush-tm2-ehr-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Reference

### Search Terminology: `GET /api/search`

Returns matching AYUSH NAMASTE and WHO ICD-11 TM2 concepts.

#### Request Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `q` | `string` | **Yes** | Search term (English, Devanagari, Hinglish, TM2 code, or Ayurveda code) |

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/search?q=Vata"
```

#### Example Response
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "Sr No.": 1,
      "TM2 Code": "SR11",
      "Ayurveda Code": "AAA-1",
      "Name English": "Accumulation of Vata pattern (TM2)",
      "Namc Term Devanagari": "वातसञ्चयः",
      "Hinglish": "Vatasanchayah"
    }
  ]
}
```

---

## 📋 Generated FHIR R4 Condition Example

```json
{
  "resourceType": "Condition",
  "id": "e4f0c829-1582-491b-871d-f8ec009d134b",
  "clinicalStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
        "code": "active"
      }
    ]
  },
  "code": {
    "coding": [
      {
        "system": "http://namaste.ayush.gov.in/codes",
        "code": "AAA-1",
        "display": "Accumulation of Vata pattern (TM2)"
      },
      {
        "system": "http://id.who.int/icd/release/11/mms",
        "code": "SR11",
        "display": "Accumulation of Vata pattern (TM2)"
      }
    ],
    "text": "Accumulation of Vata pattern (TM2)"
  },
  "subject": {
    "reference": "Patient/ABHA-12-3456-7890"
  },
  "recordedDate": "2026-08-20T17:58:00.000Z"
}
```

---

## 🔒 Security

Environment credentials (`.env`, `.env.local`) are excluded from version control.

## 📄 License

MIT

