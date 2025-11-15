export const config = {
  api: {
    bodyParser: false,
  },
};

import { IncomingForm } from "formidable";
import fs from "fs";

export default async function handler(req, res) {
  const form = new IncomingForm({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload failed" });

    const uploadedFiles = Array.isArray(files.files)
      ? files.files
      : [files.files];

    let hipHeight = null;
    let allFrames = [];
    const seenFrames = new Set();

    let initialCount = 0;
    let duplicateCount = 0;

    // Proses setiap file
    for (const file of uploadedFiles) {
      const text = fs.readFileSync(file.filepath, "utf8");

      // Ambil hip height pertama kali
      if (hipHeight === null) {
        const match = text.match(/hipHeight\s*=\s*([0-9.]+)/);
        if (match) hipHeight = match[1];
      }

      // Ambil frames dalam {} besar
      const framesMatch = text.match(/frames\s*=\s*\{([\s\S]*?)\}/);
      if (!framesMatch) continue;

      const inside = framesMatch[1];
      const frames = inside.match(/\{[\s\S]*?\}/g);
      if (!frames) continue;

      for (let f of frames) {
        initialCount++;

        // Normalize whitespace
        const clean = f.replace(/\s+/g, " ");

        if (seenFrames.has(clean)) {
          duplicateCount++;
          continue;
        }

        seenFrames.add(clean);
        allFrames.push(f);
      }
    }

    // Build Lua output
    let output = "return {\n";
    output += `    hipHeight = ${hipHeight},\n`;
    output += "    frames = {\n";
    allFrames.forEach(f => {
      output += `        ${f},\n`;
    });
    output += "    }\n";
    output += "}\n";

    res.json({
      mergedLua: output,
      initialFrames: initialCount,
      finalFrames: allFrames.length,
      duplicatesRemoved: duplicateCount
    });
  });
}
