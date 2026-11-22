import Ajv2020 from "ajv/dist/2020.js";
import fs from "fs";

// Read command line arguments
const schemaPath = process.argv[2];
const dataPath = process.argv[3];
const mdjPath = process.argv[4]; // optional local copy of ISO/TR 19115-4 mdj.json

if (!schemaPath || !dataPath) {
  console.error("Usage: node validate.js <schema.json> <data.json> [mdj.json]");
  process.exit(1);
}

// Read files
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// ISO/TR 19115-4 schema providing PT_Locale: local copy if given, else fetched
const MDJ_ID = "https://schemas.isotc211.org/json/19115/-4/mdj/1.0.0/mdj.json";
let mdj;
if (mdjPath) {
  mdj = JSON.parse(fs.readFileSync(mdjPath, "utf8"));
} else {
  const res = await fetch(MDJ_ID);
  if (!res.ok) {
    console.error(`Cannot fetch ${MDJ_ID}: HTTP ${res.status}`);
    process.exit(1);
  }
  mdj = await res.json();
}

// Validate against the schema
const ajv = new Ajv2020({ allErrors: true });
ajv.addKeyword("$anchor"); // Ajv resolves $anchor but does not register it as a keyword in strict mode
ajv.addSchema(mdj);
const validate = ajv.compile(schema);
let errors = validate(data) ? [] : validate.errors;

// Cross-reference rules that JSON Schema cannot express (only once the schema check passed)
if (errors.length === 0) {
  const attrs = data.attributes;
  const ids = (attrs["lan:otherLocale"] ?? []).map((loc) => loc.id);
  const declared = new Set(ids);
  if (declared.size !== ids.length)
    errors.push({ instancePath: "/attributes/lan:otherLocale", message: "locale ids must be unique" });
  for (const [name, texts] of Object.entries(attrs["lan:freeText"] ?? {})) {
    const path = `/attributes/lan:freeText/${name}`;
    if (typeof attrs[name] !== "string")
      errors.push({ instancePath: path, message: `must name a string attribute of this node` });
    for (const id of Object.keys(texts))
      if (!declared.has(id))
        errors.push({ instancePath: `${path}/${id}`, message: "locale id must be declared in lan:otherLocale" });
  }
}

if (errors.length === 0) {
  console.log("✅ Validation successful!");
  process.exit(0);
} else {
  console.log("❌ Validation failed!");
  console.log(JSON.stringify(errors, null, 2));
  process.exit(1);
}
