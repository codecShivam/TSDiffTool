import * as fs from 'fs';

type Action = 'I' | 'A' | 'R';

function readEntireFile(filePath: string): string {
  console.log(`Reading file: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`File content: ${content}`);
  return content;
}

function editDistance<T>(s1: T[], s2: T[]): [Action, number, T][] {
  console.log('Calculating edit distance...');
  const m1 = s1.length;
  const m2 = s2.length;
  const distances: number[][] = [];
  const actions: Action[][] = [];

  for (let i = 0; i < m1 + 1; i++) {
    distances.push(new Array(m2 + 1).fill(0));
    actions.push(new Array(m2 + 1).fill('-'));
  }

  distances[0][0] = 0;
  actions[0][0] = 'I';

  for (let n2 = 1; n2 < m2 + 1; n2++) {
    distances[0][n2] = n2;
    actions[0][n2] = 'A';
  }

  for (let n1 = 1; n1 < m1 + 1; n1++) {
    distances[n1][0] = n1;
    actions[n1][0] = 'R';
  }

  for (let n1 = 1; n1 < m1 + 1; n1++) {
    for (let n2 = 1; n2 < m2 + 1; n2++) {
      if (s1[n1 - 1] === s2[n2 - 1]) {
        distances[n1][n2] = distances[n1 - 1][n2 - 1];
        actions[n1][n2] = 'I';
        continue;
      }

      const remove = distances[n1 - 1][n2];
      const add = distances[n1][n2 - 1];

      distances[n1][n2] = remove;
      actions[n1][n2] = 'R';

      if (distances[n1][n2] > add) {
        distances[n1][n2] = add;
        actions[n1][n2] = 'A';
      }

      distances[n1][n2] += 1;
    }
  }

  const patch: [Action, number, T][] = [];
  let n1 = m1;
  let n2 = m2;

  while (n1 > 0 || n2 > 0) {
    const action = actions[n1][n2];
    if (action === 'A') {
      n2 -= 1;
      patch.push(['A', n2, s2[n2]]);
    } else if (action === 'R') {
      n1 -= 1;
      patch.push(['R', n1, s1[n1]]);
    } else if (action === 'I') {
      n1 -= 1;
      n2 -= 1;
    } else {
      throw new Error("unreachable");
    }
  }

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
    console.log(`Running ${this.name} subcommand...`);
    throw new Error("Method not implemented.");
  }
}

class DiffSubcommand extends Subcommand {
  constructor() {
    super("diff", "<file1> <file2>", "print the difference between the files to stdout");
  }

  run(program: string, args: string[]): number {
    console.log(`Executing ${this.name} subcommand...`);
    if (args.length < 2) {
      console.log(`Usage: ${program} ${this.name} ${this.signature}`);
      console.log(`ERROR: not enough files were provided to ${this.name}`);
      return 1;
    }

    let [file_path1, file_path2, ...rest] = args;

    console.log(`File 1 path: ${file_path1}`);
    console.log(`File 2 path: ${file_path2}`);

    try {
      const lines1 = readEntireFile(file_path1).split('\n');
      const lines2 = readEntireFile(file_path2).split('\n');

      console.log(`Lines in File 1: ${lines1.length}`);
      console.log(`Lines in File 2: ${lines2.length}`);

      const patch = editDistance(lines1, lines2);

      console.log("Edit Distance Patch:");
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
    super("patch", "<file> <file.patch>", "patch the file with the given patch");
  }

  run(program: string, args: string[]): number {
    console.log(`Executing ${this.name} subcommand...`);
    if (args.length < 2) {
      console.log(`Usage: ${program} ${this.name} ${this.signature}`);
      console.log(`ERROR: not enough arguments were provided to ${this.name} a file`);
      return 1;
    }

    let [file_path, patch_path, ...rest] = args;
    const lines = readEntireFile(file_path).split('\n');
    const patch: [Action, number, string][] = [];
    let ok = true;

    for (const [row, line] of readEntireFile(patch_path).split('\n').entries()) {
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
      if (action === 'A') {
        lines.splice(row, 0, line);
      } else if (action === 'R') {
        lines.splice(row, 1);
      } else {
        throw new Error("unreachable");
      }
    }

    fs.writeFileSync(file_path, lines.join('\n'));
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
  const width = Math.max(...SUBCOMMANDS.map(subcmd => `${subcmd.name} ${subcmd.signature}`.length));
  console.log(`Usage: ${program} <SUBCOMMAND> [OPTIONS]`);
  console.log("Subcommands:");
  for (const subcmd of SUBCOMMANDS) {
    const command = `${subcmd.name} ${subcmd.signature}`.padEnd(width);
    console.log(`    ${command}    ${subcmd.description}`);
  }
}

function suggestClosestSubcommandIfExists(subcmdName: string): void {
  console.log(`Suggesting closest subcommand for: ${subcmdName}`);
  const candidates = SUBCOMMANDS.filter(subcmd => {
    // Assuming subcmdName and subcmd.name are strings
    return editDistance(Array.from(subcmdName), Array.from(subcmd.name)).length < 3;
  }).map(subcmd => subcmd.name);

  if (candidates.length > 0) {
    console.log("Maybe you meant:");
    for (const name of candidates) {
      console.log(`    ${name}`);
    }
  }
}

function findSubcommand(subcmdName: string): Subcommand | undefined {
  console.log(`Finding subcommand: ${subcmdName}`);
  return SUBCOMMANDS.find(subcmd => subcmd.name === subcmdName);
}

function main() {
  const [program, ...args] = process.argv;

  console.log('Arguments:', args);

  if (args.length === 0) {
    usage(program);
    console.log('ERROR: no subcommand is provided');
    return 1;
  }

  const [fiel,subcmdName, ...rest] = args;

  console.log('Subcommand:', subcmdName);
   
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
