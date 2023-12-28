import * as fs from 'fs';

const words = fs.readFileSync('./file1.txt', 'utf-8');
console.log(words);