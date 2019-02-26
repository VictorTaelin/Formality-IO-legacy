const F = require("formality-lang");
const S = require("formality-sugars");
const I = require(".");
const rl = require("readline").createInterface({input: process.stdin, output: process.stdout});

// Simple program that asks your name and greets you
var code = S.desugar(`
  Str.concat
  : {a : (Str a)} {b : (Str b)} (Str (Str.concat a b))
  = [a] [b] (a
    -[s : (Str s)] (Str (Str.concat s b))
    [c : (Chr c)] [cs : (Str cs)] (Str.cons c (Str.concat cs b))
    b)
  
  IO.example.greet
  = (IO.ask "GET_LINE" "What is your name?" [name : (Str name)] 
    (IO.ask "PUT_LINE" (Str.concat "Hello, " name) [_ : (Str _)]
    IO.end))
`);
var defs = I.importing([[I.defs]], F.parse(code));

// Checks if IO.example.greet is a valid IO program
F.check(F.Ref("IO.example.greet"), F.App(F.Ref("IO"), F.Ref("IO.example.greet")), defs);

// Runs it
I.run_IO_with(F.Ref("IO.example.greet"), defs, {
  GET_LINE: (arg) => new Promise((res) => rl.question(arg + "\n", res)),
  PUT_LINE: (arg) => new Promise((res) => { console.log(arg); res(""); })
}).then(() => rl.close());
