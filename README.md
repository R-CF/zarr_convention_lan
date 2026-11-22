# Language Localization Convention for Zarr

- **UUID:** `6df0d0c6-c26e-4580-94e9-7c6adff481a4`
- **Name:** `lan`
- **Namespace:** `lan:`
- **Schema URL:** https://raw.githubusercontent.com/R-CF/zarr_convention_lan/refs/heads/main/schema.json
- **Spec URL:** https://github.com/R-CF/zarr_convention_lan/blob/main/README.md
- **Extension Maturity Classification:** Proposal
- **Owner:** @pvanlaake

## Description

This convention lets a Zarr node carry its natural-language attribute values in several languages. It encodes the language localisation package (`lan`) of the ISO 19115-1 conceptual model, specifically the classes `PT_Locale` and `PT_FreeText`.

- Locales are encoded exactly as `PT_Locale` in ISO/TR 19115-4 (`mdj` 1.0.0), the ISO/TC 211 JSON implementation of ISO 19115-1.
- `PT_FreeText` is not part of ISO/TR 19115-4. This convention gives it a JSON encoding that follows the ISO 19115-1 conceptual model and the ISO 19115-3 XML encoding.

The value in the default language stays in the ordinary attribute. Translations are added in a separate structure. A reader that is unaware of this convention therefore still sees a complete, valid set of attributes in the default language.

## Motivation

Several jurisdictions require metadata in more than one language, for example the official languages of Canada, the EU member states, or the UN. ISO 19115 has long supported this in XML through `PT_FreeText`. Zarr attributes are JSON, so this convention gives multilingual Zarr metadata the same conceptual basis. Converting to and from ISO 19115-3 XML is then a mechanical mapping.

## Convention Registration

```json
{
  "uuid": "6df0d0c6-c26e-4580-94e9-7c6adff481a4",
  "schema_url": "https://raw.githubusercontent.com/R-CF/zarr_convention_lan/refs/heads/main/schema.json",
  "spec_url": "https://github.com/R-CF/zarr_convention_lan/blob/main/README.md",
  "name": "lan",
  "description": "Multilingual attribute values based on ISO 19115-1 PT_Locale and PT_FreeText"
}
```

## Applicable To

Group and Array.

The convention applies independently to each node. **There is no inheritance:** locale identifiers are only meaningful within the `zarr.json` document that declares them, just as `PT_Locale` identifiers are scoped to a single ISO 19115-3 metadata record. A node that uses `lan:freeText` MUST declare its own locales.

## Properties

| Property | Type | Required | ISO 19115-1 | Description |
|------|:---:|:------:|:----:|-------------|
| `lan:defaultLocale` | Locale | yes | `defaultLocale` | Locale of the ordinary attribute values |
| `lan:otherLocale` | [Locale] | with `lan:freeText` | `otherLocale` | Additional locales, each with an `id` |
| `lan:freeText` | object | with `lan:otherLocale` | `PT_FreeText` | Localised values, keyed by attribute name and locale id |

### Locale object

A Locale object is an ISO/TR 19115-4 `PT_Locale`, with the constraints and the two extensions listed below:

| Field | Type | Required | Basis | Description |
|---|:---:|:------:|------|-------------|
| `language` | string | yes | ISO/TR 19115-4 | ISO 639-2/T alpha-3 code (e.g. `fra`, `zho`). Where a language has no ISO 639-2 code, use its ISO 639-3 code. |
| `country` | string | no | ISO/TR 19115-4 | ISO 3166-1 alpha-2 code (e.g. `CA`). |
| `characterEncoding` | string | yes | ISO/TR 19115-4 | MUST be `"utf8"`. |
| `id` | string | in `lan:otherLocale` only | extension; `PT_Locale/@id` in ISO 19115-3 | Identifier of the locale within the node. MUST be unique among the node's `lan:otherLocale` entries. MUST NOT appear in `lan:defaultLocale`. |
| `script` | string | no | extension | ISO 15924 alpha-4 code (e.g. `Hans`, `Latn`). |

The value of `characterEncoding` is fixed: Zarr JSON metadata is UTF-8, so the field has only one possible value. It is required anyway so that every Locale object validates against the ISO/TR 19115-4 schema.

`script` is needed when the language alone does not determine the writing system. `zho`, for example, can be written in Simplified (`Hans`) or Traditional (`Hant`) script. Writers SHOULD set `script` in such cases and MAY omit it otherwise. Text direction is a property of the script and is therefore not recorded.

### lan:freeText

`lan:freeText` is an object whose keys are names of attributes of the same node. Each value is an object mapping locale ids from `lan:otherLocale` to the localised string:

```json
"lan:freeText": {
  "<attribute name>": { "<locale id>": "<localised string>", ... },
  ...
}
```

This is the JSON encoding of `PT_FreeText`. Each `"<locale id>": "<string>"` pair corresponds to one `textGroup` with a `LocalisedCharacterString` for that locale. The default-language value is the ordinary attribute, which corresponds to the `CharacterString` of `PT_FreeText_PropertyType`.

The following rules apply. Rules 1–3 are cross-references that JSON Schema cannot express, so validators have to check them separately.

1. Every key of `lan:freeText` MUST name an attribute of the same node whose value is a string.
2. Every locale id used in `lan:freeText` MUST be declared in `lan:otherLocale`.
3. An attribute MUST NOT have more than one value for a given locale. The object encoding enforces this, because keys must be unique.
4. Coverage MAY be partial. An attribute need not be translated into every declared locale, and a locale need not cover every attribute.
5. Keys MUST NOT name `zarr_conventions` or properties of this convention (`lan:*`).

### What is localised

Only attribute **values** that are natural-language text are localised. In particular:

- **Attribute names are never localised.** An attribute name is an identifier in a vocabulary, not text. Labels for attribute names in a user interface belong to the vocabulary that defines the attribute, not to the data set.
- **Identifiers and controlled values are never localised.** This includes units, standard names, code list values and CRS identifiers, and any attribute that software parses rather than displays.
- **Only string values are covered** in this version. Array-valued attributes are out of scope.

This convention does not enumerate the attributes that may be localised. The conventions that define those attributes determine whether a value is natural-language text.

## Recommendations

### For writers

- Use the language of the most complete or the original content as `lan:defaultLocale`.
- Use short, readable locale ids (e.g. `FR`, `ZH`) and the same ids on all nodes of a hierarchy.
- Do not embed markup, bidirectional control characters or Unicode language tag characters in values. Store text in logical order.

### For readers

- To select a language, build a BCP 47 tag for each locale from its `language` (mapped to the shortest ISO 639 code), its `script` and its `country`, e.g. `zho` + `Hans` → `zh-Hans`. Then match the requested tag against these using the RFC 4647 "lookup" algorithm.
- For each attribute, return the localised value for the selected locale if present, otherwise the ordinary attribute value.
- Accept ISO 639-2/B codes (e.g. `fre`, `chi`) as equivalent to their ISO 639-2/T counterparts.

## Examples

### Bilingual group (English and Canadian French)

```json
{
  "zarr_format": 3,
  "node_type": "group",
  "attributes": {
    "zarr_conventions": [
      {
        "uuid": "6df0d0c6-c26e-4580-94e9-7c6adff481a4",
        "schema_url": "https://raw.githubusercontent.com/R-CF/zarr_convention_lan/refs/heads/main/schema.json",
        "spec_url": "https://github.com/R-CF/zarr_convention_lan/refs/heads/main/README.md",
        "name": "lan",
        "description": "Multilingual attribute values based on ISO 19115-1 PT_Locale and PT_FreeText"
      }
    ],
    "lan:defaultLocale": { "language": "eng", "country": "CA", "characterEncoding": "utf8" },
    "lan:otherLocale": [
      { "id": "FR", "language": "fra", "country": "CA", "characterEncoding": "utf8" }
    ],
    "title": "Sea surface temperature, Gulf of St. Lawrence",
    "summary": "Daily gridded SST from satellite observations.",
    "lan:freeText": {
      "title":   { "FR": "Température de surface de la mer, golfe du Saint-Laurent" },
      "summary": { "FR": "TSM quotidienne sur grille issue d'observations satellitaires." }
    }
  }
}
```

### UN official languages on an array

```json
{
  "zarr_format": 3,
  "node_type": "array",
  "attributes": {
    "zarr_conventions": [
      { "uuid": "6df0d0c6-c26e-4580-94e9-7c6adff481a4", "name": "lan" }
    ],
    "lan:defaultLocale": { "language": "eng", "characterEncoding": "utf8" },
    "lan:otherLocale": [
      { "id": "AR", "language": "ara", "characterEncoding": "utf8" },
      { "id": "ZH", "language": "zho", "script": "Hans", "characterEncoding": "utf8" },
      { "id": "FR", "language": "fra", "characterEncoding": "utf8" },
      { "id": "RU", "language": "rus", "characterEncoding": "utf8" },
      { "id": "ES", "language": "spa", "characterEncoding": "utf8" }
    ],
    "long_name": "Sea surface temperature",
    "unit": "K",
    "lan:freeText": {
      "long_name": {
        "AR": "درجة حرارة سطح البحر",
        "ZH": "海表温度",
        "FR": "Température de surface de la mer",
        "RU": "Температура поверхности моря",
        "ES": "Temperatura de la superficie del mar"
      }
    }
  }
}
```

The array metadata is abbreviated: `shape`, `data_type`, `chunk_grid` and the other required array fields are omitted. `units` is not localised.

## Mapping to ISO 19115-3 XML

Each entry in `lan:freeText` becomes one element of type `PT_FreeText_PropertyType`. `lan:defaultLocale` and `lan:otherLocale` map to `mdb:defaultLocale` and `mdb:otherLocale`, with `id` becoming `PT_Locale/@id`:

```xml
<cit:title xsi:type="lan:PT_FreeText_PropertyType">
  <gco:CharacterString>Sea surface temperature, Gulf of St. Lawrence</gco:CharacterString>
  <lan:PT_FreeText>
    <lan:textGroup>
      <lan:LocalisedCharacterString locale="#FR">Température de surface de la mer, golfe du Saint-Laurent</lan:LocalisedCharacterString>
    </lan:textGroup>
  </lan:PT_FreeText>
</cit:title>
```

`script` has no ISO 19115-3 equivalent and is dropped on export. ISO/TR 19115-4 JSON carries the locales but has no place for the localised values.

## FAQ

**Why not use BCP 47 tags directly?**
ISO 19115 identifies languages by ISO 639 codes in `PT_Locale`. Keeping these codes makes the mapping to ISO lossless. Readers derive BCP 47 tags only for matching.

**Why are translations not nested under each attribute?**
Replacing a string value with an object would break every reader that is unaware of this convention. ISO 19115-3 makes the same choice: the default `CharacterString` stays in place, and the `PT_FreeText` element is added next to it.

**Why no inheritance from a parent group?**
Locale ids are references within a single document. If ids were inherited, an array opened on its own would contain references that cannot be resolved.

**Is the `id` needed?**
ISO 19115-1 associates each `LocalisedCharacterString` with a `PT_Locale`. ISO/TR 19115-4 has no identifier to refer to a locale with. The alternative, repeating the full Locale object for every string, is redundant. `id` is the solution ISO 19115-3 uses.

## Versioning and Compatibility

This convention uses semantic versioning:

- **Patch** releases change documentation only.
- **Minor** releases add optional fields. A document valid under version x.y is valid under x.(y+1).
- **Major** releases may change or remove fields.

Readers SHOULD ignore unknown fields in Locale objects.

## References

- ISO 19115-1:2014, *Geographic information — Metadata — Part 1: Fundamentals*, clause 7.3 (language localization).
- ISO/TS 19115-3, *XML schema implementation for fundamental concepts*, namespace `lan`.
- ISO/TR 19115-4:2026, *JSON schema implementation of metadata fundamentals*; schema `https://schemas.isotc211.org/json/19115/-4/mdj/1.0.0/mdj.json`.
- ISO 639-2, ISO 639-3, ISO 3166-1, ISO 15924.
- BCP 47 (RFC 5646, RFC 4647).
- W3C, *Strings on the Web: Language and Direction Metadata*.
