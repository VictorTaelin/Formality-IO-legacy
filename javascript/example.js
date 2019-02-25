const F = require("formality-lang");
const FIO = require(".");

// Simple program that reads a line and prints it
var defs = Object.assign(F.parse(`
  IO.GET_LINE
  : (Bin IO.GET_LINE)
  = (Bin.O Bin.E)

  IO.PUT_LINE
  : (Bin IO.PUT_LINE)
  = (Bin.I Bin.E)

  IO.example.echo
  = (IO.ask IO.GET_LINE Bin.E [line : (Bin line)] 
    (IO.ask IO.PUT_LINE line [_ : (Bin _)]
    IO.end))
`), FIO.defs);

const GET_LINE = FIO.term_to_bitstring(F.norm(F.Ref("IO.GET_LINE", true), defs, true));
const PUT_LINE = FIO.term_to_bitstring(F.norm(F.Ref("IO.PUT_LINE", true), defs, true));

// Checks if IO.example.echo is a valid IO program
FIO.check_IO(F.Ref("IO.example.echo"), defs);

// Runs it
FIO.run_IO_with(F.Ref("IO.example.echo"), defs, {
  // Always returns 1001
  [GET_LINE]: async (arg) => {
    return "1001";
  },
  // Prints to console
  [PUT_LINE]: async (arg) => {
    console.log(arg);
    return "";
  }
});
