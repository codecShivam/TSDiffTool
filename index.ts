import * as fs from "fs";

type Action = "I" | "A" | "R";

function readEntireFile(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf8");
  return content;
}

function editDistance(s1: string, s2: string): [Action, number, string][] {
  const N = s1.length;
  const M = s2.length;

  // Linear space vectors
  let V: number[] = new Array(2 * Math.max(N, M) + 1).fill(0);

  // Matrix to store the actions
  let actions: [Action, number, string][] = [];

  for (let d = 0; d <= N + M; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x = 0;
      if (k === -d || (k !== d && V[k - 1 + N] < V[k + 1 + N])) {
        x = V[k + 1 + N];
      } else {
        x = V[k - 1 + N] + 1;
      }

      let y = x - k;

      while (x < N && y < M && s1[x] === s2[y]) {
        x++;
        y++;
      }

      V[k + N] = x;

      if (x >= N && y >= M) {
        // Reached the end of both sequences
        return actions;
      }
    }

    for (let k = -d; k <= d; k += 2) {
      let x = V[k + N];
      let y = x - k;

      while (x < N && y < M && s1[x] === s2[y]) {
        x++;
        y++;
      }

      V[k + N] = x;

      if (k % 2 === 0 && x < N) {
        // Action: Remove
        actions.push(["R", x, s1[x]]);
      } else if (k % 2 !== 0 && y < M) {
        // Action: Add
        actions.push(["A", y, s2[y]]);
      }
    }
  }

  // If we reach here, it means we couldn't find the end of both sequences
  return actions;
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
    // console.log(`Running ${this.name} subcommand...`);
    throw new Error("Method not implemented.");
  }
}

class DiffSubcommand extends Subcommand {
  constructor() {
    super(
      "diff",
      "<file1> <file2>",
      "print the difference between the files to stdout"
    );
  }

  run(program: string, args: string[]): number {
    // console.log(`Executing ${this.name} subcommand...`);
    if (args.length < 2) {
      console.log(`Usage: ${program} ${this.name} ${this.signature}`);
      console.log(`ERROR: not enough files were provided to ${this.name}`);
      return 1;
    }

    let [file_path1, file_path2, ...rest] = args;

    // console.log(`File 1 path: ${file_path1}`);
    // console.log(`File 2 path: ${file_path2}`);

    try {
      const lines1 = readEntireFile(file_path1).split("\n").join(""); // Join the lines into a single string
      const lines2 = readEntireFile(file_path2).split("\n").join(""); // Join the lines into a single string
      
      const patch = editDistance(lines1, lines2);
      

      // console.log("Edit Distance Patch:");
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
    const subcmdNameString = subcmd.name; // Assume subcmd.name is already a string
    return (
      editDistance(subcmdNameString, subcmdName as string).length < 3
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
  console.log(`Finding subcommand: ${subcmdName}`);
  return SUBCOMMANDS.find((subcmd) => subcmd.name === subcmdName);
}

function main() {
  const [program, ...args] = process.argv;

  console.log("Arguments:", args);

  if (args.length === 0) {
    usage(program);
    console.log("ERROR: no subcommand is provided");
    return 1;
  }

  const [fiel, subcmdName, ...rest] = args;

  console.log("Subcommand:", subcmdName);

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
  console.log("Executing main...");
  process.exit(main());
}
