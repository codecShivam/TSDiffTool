# TSDiffTool: Professional TypeScript-Powered File Diff Tool

TSDiffTool is an elegant file diffing and patching tool built in TypeScript, highlighting edit distance and patch generation concepts.

## Key Features

- **Text File Differences:** Determines and calculates the minimal changes required to transform one text file into another.
- **Patch Generation:** Creates concise patch files representing the identified differences.
- **Patch Application:** Modifies files based on a provided patch.

## Algorithm Insights

The core algorithm, utilizing dynamic programming for edit distance (Levenshtein distance), boasts the following complexities:

- **Time Complexity:** O(N * M) (N and M are lengths of input files).
- **Space Complexity:** O(N * M) for storing the distance matrix.

## Usage

1. **Installation:**
   ```bash
   npm install
   ```

2. **Generate a Diff:**
   ```bash
   ts-node index.ts diff <file1> <file2> > <file.patch>
   ```
   - `<file1>` and `<file2>`: The paths to the text files you want to compare.

3. **Apply a Patch:**
   ```bash
   ts-node index.ts patch <file1> <file.patch>
   ```
   - `<file1>`: The path to the text file you want to patch.
   - `<file.patch>`: The patch file generated from the diff operation.

## Examples

Explore the `examples` directory for practical usage scenarios.

## Code Overview

### Edit Distance Algorithm

```typescript
// Sample code snippet for editDistance function
function editDistance<T>(s1: T[], s2: T[]): [Action, number, T][] {
  // Implementation details...
  return patch;
}
```

### Subcommands

```typescript
// Sample code snippet for DiffSubcommand
class DiffSubcommand extends Subcommand {
  // Implementation details...
}

// Sample code snippet for PatchSubcommand
class PatchSubcommand extends Subcommand {
  // Implementation details...
}

// Sample code snippet for HelpSubcommand
class HelpSubcommand extends Subcommand {
  // Implementation details...
}
```

## Contributing

Contributions, pull requests, and suggestions are encouraged to enhance TSDiffTool.

## License

TSDiffTool is released under the MIT License.