import csv from "csv-parser";
import fs from "fs";
import path from "path";

const result: Record<string, number> = {};

fs.createReadStream("mapSolarSystems.csv")
  .pipe(csv())
  .on("data", row => {
    if (row.solarSystemName && row.security) {
      result[row.solarSystemName.trim()] = parseFloat(row.security);
    }
  })
  .on("end", () => {
    const outputPath = path.join("src", "data", "system_security.json");

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`✅ Generated ${outputPath} with ${Object.keys(result).length} systems.`);
  });
