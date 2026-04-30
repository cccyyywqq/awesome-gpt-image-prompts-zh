import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data", "prompts.zh-CN.json");
const schemaPath = path.join(root, "schema", "prompt.schema.json");

const allowedCategories = new Set([
  "poster-illustration",
  "ecommerce-product",
  "portrait-photography",
  "character-ip",
  "social-ui",
  "architecture-scene"
]);

const requiredPromptFields = [
  "id",
  "title",
  "category",
  "use_case",
  "aspect_ratio",
  "prompt",
  "negative_prompt",
  "tags",
  "variables",
  "source"
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${path.relative(root, filePath)} is not valid JSON: ${error.message}`);
  }
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function hasChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function validate() {
  const errors = [];
  const data = readJson(dataPath);
  readJson(schemaPath);

  assert(data.name === "awesome-gpt-image-prompts-zh", "data.name must be awesome-gpt-image-prompts-zh", errors);
  assert(data.language === "zh-CN", "data.language must be zh-CN", errors);
  assert(Array.isArray(data.prompts), "data.prompts must be an array", errors);

  const ids = new Set();
  const titles = new Set();
  const categoryCounts = new Map();

  for (const [index, item] of data.prompts.entries()) {
    const label = item?.id || `prompts[${index}]`;

    for (const field of requiredPromptFields) {
      assert(Object.prototype.hasOwnProperty.call(item, field), `${label} is missing field: ${field}`, errors);
    }

    if (!item || typeof item !== "object") continue;

    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{3}$/.test(item.id), `${label} has invalid id format`, errors);
    assert(!ids.has(item.id), `${label} duplicates id ${item.id}`, errors);
    ids.add(item.id);

    assert(typeof item.title === "string" && item.title.length > 0, `${label} title must be a non-empty string`, errors);
    assert(!titles.has(item.title), `${label} duplicates title ${item.title}`, errors);
    titles.add(item.title);

    assert(allowedCategories.has(item.category), `${label} has unknown category ${item.category}`, errors);
    categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + 1);

    assert(/^[0-9]+:[0-9]+$/.test(item.aspect_ratio), `${label} has invalid aspect_ratio`, errors);
    assert(typeof item.prompt === "string" && item.prompt.length >= 30, `${label} prompt is too short`, errors);
    assert(hasChinese(item.prompt), `${label} prompt should contain Chinese text`, errors);
    assert(typeof item.negative_prompt === "string", `${label} negative_prompt must be a string`, errors);
    assert(Array.isArray(item.tags) && item.tags.length >= 2, `${label} should have at least 2 tags`, errors);
    assert(Array.isArray(item.variables), `${label} variables must be an array`, errors);
    assert(["original", "community"].includes(item.source), `${label} source must be original or community`, errors);
  }

  for (const category of allowedCategories) {
    assert(categoryCounts.has(category), `category ${category} has no data prompts`, errors);
    const caseFile = path.join(root, "cases", `${category}.md`);
    assert(fs.existsSync(caseFile), `missing case file for category ${category}`, errors);
  }

  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Validation passed: ${data.prompts.length} prompts across ${allowedCategories.size} categories.`);
}

validate();
