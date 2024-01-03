import * as fs from "fs";

function readEntireFile(filePath: string): string {
  console.log(`Reading file: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf8");
  console.log(`File content: ${content}`);
  return content;
}

class Subcommand {
  name: string;
  signature: string;
  description: string;

  constructor(name: string, signature: string, description: string) {
    this.name = name;
    this.signature = signature;
    this.description = description;
  }
}
