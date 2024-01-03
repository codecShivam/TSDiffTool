import * as fs from "fs";

type Action = "I" | "A" | "R";

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
  run(program: string, args: string[]): number {
    console.log(`Running ${this.name} subcommand...`);
    throw new Error("Method not implemented.");
  }
}

function editDistance<T>(s1: T[], s2: T[]): [Action, number, T][] {
  console.log("Calculating edit distance...");
  const m1 = s1.length;
  const m2 = s2.length;
  const distances: number[][] = [];
  const actions: Action[][] = [];

  for (let i = 0; i < m1 + 1; i++) {
    distances.push(new Array(m2 + 1).fill(0));
    actions.push(new Array(m2 + 1).fill("-"));
  }

  distances[0][0] = 0;
  actions[0][0] = "I";

  for (let n2 = 1; n2 < m2 + 1; n2++) {
    distances[0][n2] = n2;
    actions[0][n2] = "A";
  }

  for (let n1 = 1; n1 < m1 + 1; n1++) {
    distances[n1][0] = n1;
    actions[n1][0] = "R";
  }

  for (let n1 = 1; n1 < m1 + 1; n1++) {
    for (let n2 = 1; n2 < m2 + 1; n2++) {
      if (s1[n1 - 1] === s2[n2 - 1]) {
        distances[n1][n2] = distances[n1 - 1][n2 - 1];
        actions[n1][n2] = "I";
        continue;
      }

      const remove = distances[n1 - 1][n2];
      const add = distances[n1][n2 - 1];

      distances[n1][n2] = remove;
      actions[n1][n2] = "R";

      if (distances[n1][n2] > add) {
        distances[n1][n2] = add;
        actions[n1][n2] = "A";
      }

      distances[n1][n2] += 1;
    }
  }

  const patch: [Action, number, T][] = [];
  let n1 = m1;
  let n2 = m2;

  while (n1 > 0 || n2 > 0) {
    const action = actions[n1][n2];
    if (action === "A") {
      n2 -= 1;
      patch.push(["A", n2, s2[n2]]);
    } else if (action === "R") {
      n1 -= 1;
      patch.push(["R", n1, s1[n1]]);
    } else if (action === "I") {
      n1 -= 1;
      n2 -= 1;
    } else {
      throw new Error("unreachable");
    }
  }

  patch.reverse();
  return patch;
}

function main() {
  const [program, ...args] = process.argv;

  console.log("Arguments:", args);

  if (args.length === 0) {
    usage(program);
    console.log("ERROR: no subcommand is provided");
    return 1;
  }

  const [file, subcmdName, ...rest] = args;
  console.log("File:", file);

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
    console.log('Executing main...');
    process.exit(main());
  }