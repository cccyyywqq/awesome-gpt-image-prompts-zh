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

const requiredOutputFields = [
  "type",
  "path",
  "model",
  "source_url",
  "license",
  "attribution",
  "notes"
];
const allowedOutputFields = new Set(requiredOutputFields);

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

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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

    if (Object.prototype.hasOwnProperty.call(item, "outputs")) {
      assert(Array.isArray(item.outputs), `${label} outputs must be an array`, errors);
      assert(!Array.isArray(item.outputs) || item.outputs.length > 0, `${label} outputs must not be empty`, errors);

      if (Array.isArray(item.outputs)) {
        for (const [outputIndex, output] of item.outputs.entries()) {
          const outputLabel = `${label}.outputs[${outputIndex}]`;

          assert(output && typeof output === "object", `${outputLabel} must be an object`, errors);
          if (!output || typeof output !== "object") continue;

          for (const field of requiredOutputFields) {
            assert(Object.prototype.hasOwnProperty.call(output, field), `${outputLabel} is missing field: ${field}`, errors);
          }

          for (const field of Object.keys(output)) {
            assert(allowedOutputFields.has(field), `${outputLabel} has unknown field: ${field}`, errors);
          }

          assert(["generated", "repost"].includes(output.type), `${outputLabel} type must be generated or repost`, errors);
          assert(typeof output.path === "string", `${outputLabel} path must be a string`, errors);
          assert(typeof output.model === "string", `${outputLabel} model must be a string`, errors);
          assert(typeof output.source_url === "string", `${outputLabel} source_url must be a string`, errors);
          assert(typeof output.license === "string", `${outputLabel} license must be a string`, errors);
          assert(typeof output.attribution === "string", `${outputLabel} attribution must be a string`, errors);
          assert(typeof output.notes === "string", `${outputLabel} notes must be a string`, errors);
          assert(isNonEmptyString(output.model), `${outputLabel} model must be non-empty`, errors);
          assert(isNonEmptyString(output.license), `${outputLabel} license must be non-empty`, errors);
          assert(isNonEmptyString(output.attribution), `${outputLabel} attribution must be non-empty`, errors);
          assert(isNonEmptyString(output.notes), `${outputLabel} notes must be non-empty`, errors);

          if (typeof output.path === "string") {
            const expectedPath = `assets/cases/${item.category}/${item.id}.webp`;
            const assetRoot = path.resolve(root, "assets", "cases");
            const assetPath = path.resolve(root, output.path);
            assert(output.path === expectedPath, `${outputLabel} path must be ${expectedPath}`, errors);
            assert(!path.isAbsolute(output.path), `${outputLabel} path must be relative`, errors);
            assert(assetPath.startsWith(`${assetRoot}${path.sep}`), `${outputLabel} path must stay under assets/cases`, errors);
            assert(path.extname(assetPath) === ".webp", `${outputLabel} path must point to a .webp file`, errors);
            assert(fs.existsSync(assetPath), `${outputLabel} file does not exist: ${output.path}`, errors);
          }

          if (output.type === "generated") {
            assert(output.source_url === "", `${outputLabel} generated source_url must be empty`, errors);
          }

          if (output.type === "repost") {
            assert(isNonEmptyString(output.source_url), `${outputLabel} repost source_url must be non-empty`, errors);
            assert(isNonEmptyString(output.license), `${outputLabel} repost license must be non-empty`, errors);
            assert(isNonEmptyString(output.attribution), `${outputLabel} repost attribution must be non-empty`, errors);
          }
        }
      }
    }
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
