import fs from "node:fs";
import path from "node:path";

const dataPath = path.join(process.cwd(), "data", "prompts.zh-CN.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const counts = new Map();
for (const prompt of data.prompts) {
  counts.set(prompt.category, (counts.get(prompt.category) || 0) + 1);
}

console.log(`Name: ${data.name}`);
console.log(`Language: ${data.language}`);
console.log(`Version: ${data.version}`);
console.log(`Total prompts: ${data.prompts.length}`);
console.log("");
console.log("| Category | Count |");
console.log("| --- | ---: |");
for (const [category, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`| ${category} | ${count} |`);
}
