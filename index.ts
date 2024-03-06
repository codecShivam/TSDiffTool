import * as fs from "fs";

type Action = "I" | "A" | "R";

function readEntireFile(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf8");
  return content;
}

function editDistance<T>(s1: T[], s2: T[]): [Action, number, T][] {
  const m1 = s1.length;
  const m2 = s2.length;

  function calculateDistances(strip: number[]): number[] {
    const distances: number[] = [strip[0]];

    for (let i = 1; i < m2 + 1; i++) {
      distances[i] = Math.min(
        distances[i - 1] + 1,
        strip[i],
        strip[i - 1] + (s1[m1 - strip[i - 1]] === s2[i - 1] ? 0 : 1)
      );
    }
    return distances;
  }

  const patch: [Action, number, T][] = [];
  let strip1: number[] = new Array(m2 + 1).fill(0);
  let strip2: number[] = new Array(m2 + 1).fill(0);
  for (let i = 1; i < m1 + 1; i++) {
    strip2[0] = i;

    for (let j = 1; j < m2 + 1; j++) {
      strip2[j] =
        s1[i - 1] === s2[j - 1]
          ? strip1[j - 1]
          : Math.min(strip1[j - 1], strip1[j], strip2[j - 1]) + 1;
    }

    if (i < m1) {
      strip1 = calculateDistances(strip2);
    }
  }

  let n1 = m1;
  let n2 = m2;

  while (n1 > 0 || n2 > 0) {
    if (n1 === 0) {
      n2 -= 1;
      patch.push(["A", n2, s2[n2]]);
    } else if (n2 === 0) {
      n1 -= 1;
      patch.push(["R", n1, s1[n1]]);
    } else if (s1[n1 - 1] === s2[n2 - 1]) {
      n1 -= 1;
      n2 -= 1;
    } else if (strip2[n2] === strip1[n1 - 1] + 1) {
      n1 -= 1;
      patch.push(["R", n1, s1[n1]]);
    } else {
      n2 -= 1;
      patch.push(["A", n2, s2[n2]]);
    }
  }
  patch.sort((a, b) => a[1] - b[1]);

  patch.reverse();

  return patch;
}

const PATCH_LINE_REGEXP: RegExp = /([AR]) (\d+) (.*)/;

class Subcommand {
  name: string;
  signature: string;
  description: string;

  constructor(name: string, signature: string, description: string) {
    this.name = name;
    this.signature = signature;
    this.description = description;
  }

  run(program: string, args: string[]): number {
    throw new Error("Method not implemented.");
  }
}

class DiffSubcommand extends Subcommand {
  constructor() {
    super(
      "diff",
      "<file1> <file2>",
      "print the difference between the files"
    );
  }

  run(program: string, args: string[]): number {
    if (args.length < 2) {
      console.log(`Usage: ${program} ${this.name} ${this.signature}`);
      console.log(`ERROR: not enough files were provided to ${this.name}`);
      return 1;
    }

    let [file_path1, file_path2, ...rest] = args;

    try {
      const lines1 = readEntireFile(file_path1).split("\n");
      const lines2 = readEntireFile(file_path2).split("\n");

      const patch = editDistance(lines1, lines2);

      for (const [action, n, line] of patch) {
        console.log(`${action} ${n} ${line}`);
      }

      return 0;
    } catch (error) {
      console.error(`Error during execution: ${error}`);
      return 1;
    }
  }
}

class PatchSubcommand extends Subcommand {
  constructor() {
    super(
      "patch",
      "<file> <file.patch>",
      "patch the file with the given patch"
    );
  }

  run(program: string, args: string[]): number {
    console.log(`Executing ${this.name} subcommand...`);
    if (args.length < 2) {
      console.log(`Usage: ${program} ${this.name} ${this.signature}`);
      console.log(
        `ERROR: not enough arguments were provided to ${this.name} a file`
      );
      return 1;
    }

    let [file_path, patch_path, ...rest] = args;
    const lines = readEntireFile(file_path).split("\n");
    const patch: [Action, number, string][] = [];
    let ok = true;

    for (const [row, line] of readEntireFile(patch_path)
      .split("\n")
      .entries()) {
      if (line.length === 0) {
        continue;
      }
      const m = line.match(PATCH_LINE_REGEXP);
      if (m === null) {
        console.log(`${patch_path}:${row + 1}: Invalid patch action: ${line}`);
        ok = false;
        continue;
      }
      patch.push([m[1] as Action, parseInt(m[2]), m[3]]);
    }
    if (!ok) {
      return 1;
    }

    for (const [action, row, line] of patch.reverse()) {
      if (action === "A") {
        lines.splice(row, 0, line);
      } else if (action === "R") {
        lines.splice(row, 1);
      } else {
        throw new Error("unreachable");
      }
    }

    fs.writeFileSync(file_path, lines.join("\n"));
    return 0;
  }
}

class HelpSubcommand extends Subcommand {
  constructor() {
    super("help", "[subcommand]", "print this help message");
  }

  run(program: string, args: string[]): number {
    console.log(`Executing ${this.name} subcommand...`);
    if (args.length === 0) {
      usage(program);
      return 0;
    }

    const [subcmdName, ...rest] = args;

    const subcmd = findSubcommand(subcmdName);
    if (subcmd !== undefined) {
      console.log(`Usage: ${program} ${subcmd.name} ${subcmd.signature}`);
      console.log(`    ${subcmd.description}`);
      return 0;
    }

    usage(program);
    console.log(`ERROR: unknown subcommand ${subcmdName}`);
    suggestClosestSubcommandIfExists(subcmdName);
    return 1;
  }
}

const SUBCOMMANDS: Subcommand[] = [
  new DiffSubcommand(),
  new PatchSubcommand(),
  new HelpSubcommand(),
];

function usage(program: string): void {
  console.log(`Generating usage for ${program}...`);
  const width = Math.max(
    ...SUBCOMMANDS.map((subcmd) => `${subcmd.name} ${subcmd.signature}`.length)
  );
  console.log(`Usage: ${program} <SUBCOMMAND> [OPTIONS]`);
  console.log("Subcommands:");
  for (const subcmd of SUBCOMMANDS) {
    const command = `${subcmd.name} ${subcmd.signature}`.padEnd(width);
    console.log(`    ${command}    ${subcmd.description}`);
  }
}

function suggestClosestSubcommandIfExists(subcmdName: string): void {
  console.log(`Suggesting closest subcommand for: ${subcmdName}`);
  const candidates = SUBCOMMANDS.filter((subcmd) => {
    return (
      editDistance(Array.from(subcmdName), Array.from(subcmd.name)).length < 3
    );
  }).map((subcmd) => subcmd.name);

  if (candidates.length > 0) {
    console.log("Maybe you meant:");
    for (const name of candidates) {
      console.log(`    ${name}`);
    }
  }
}

function findSubcommand(subcmdName: string): Subcommand | undefined {
  return SUBCOMMANDS.find((subcmd) => subcmd.name === subcmdName);
}

function main() {
  const [program, ...args] = process.argv;

  if (args.length === 0) {
    usage(program);
    console.log("ERROR: no subcommand is provided");
    return 1;
  }

  const [fiel, subcmdName, ...rest] = args;

  const subcmd = findSubcommand(subcmdName);
  if (subcmd) {
    return subcmd.run(program, rest);
  }

  usage(program);
  console.log(`ERROR: unknown subcommand ${subcmdName}`);
  suggestClosestSubcommandIfExists(subcmdName);
  return 1;
}

if (require.main === module) {
  process.exit(main());
}
