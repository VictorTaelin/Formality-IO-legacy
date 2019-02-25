const F = require("formality-lang");

const io_defs = F.parse(`
  Typ
  : {T : (Typ T)} Type
  = [T] {self : (T self)} Type

  Bin
  : (Typ Bin)
  = [self]
    {-P : (Typ Bin)}
    {O  : {pred : (Bin pred)} (P (Bin.O pred))}
    {I  : {pred : (Bin pred)} (P (Bin.I pred))}
    {E  : (P Bin.E)}
    (P self)

  Bin.E
  : (Bin Bin.E)
  = [-P] [O] [I] [E]
    E

  Bin.O
  : {pred : (Bin pred)}
    (Bin (Bin.O pred))
  = [pred] [-P] [O] [I] [E]
    (O pred)

  Bin.I
  : {pred : (Bin pred)}
    (Bin (Bin.I pred))
  = [pred] [-P] [O] [I] [E]
    (I pred)

  IO
  : (Typ IO) 
  = [self]
    {-P : (Typ IO)}
    {ask :
      {cmd : (Bin cmd)}
      {arg : (Bin arg)}
      {cnt : {res : (Bin res)} (IO (cnt res))}
      (P (IO.ask cmd arg cnt))}
    {end : (P IO.end)}
    (P self)

  IO.ask
  : {cmd : (Bin cmd)}
    {arg : (Bin arg)}
    {cnt : {res : (Bin res)} (IO (cnt res))}
    (IO (IO.ask cmd arg cnt))
  = [cmd] [arg] [cnt] [-P] [ask] [end]
    (ask cmd arg cnt)

  IO.end
  : (IO IO.end)
  = [-P] [ask] [end] end
`);

// Converts a JavaScript string of 0s and 1s to a Formality Bin
function bitstring_to_term(bits) {
  var LamO = term => F.Lam("O", null, term);
  var LamI = term => F.Lam("I", null, term);
  var LamE = term => F.Lam("E", null, term);
  var O    = term => LamO(LamI(LamE(F.App(F.Var(2),term))));
  var I    = term => LamO(LamI(LamE(F.App(F.Var(1),term))));
  var term = LamO(LamI(LamE(F.Var(0))));
  for (var i = 0; i < bits.length; ++i) {
    term = (bits[i] === "0" ? O : I)(term);
  }
  return term;
}

// Converts a Formality Bin to a JavaScript string of 0s and 1s
function term_to_bitstring(term, bits = "") {
  var body = term[1].body[1].body[1].body;
  if (body[0] === "App") {
    var bit = body[1].func[1].index === 2 ? "0" : "1";
    return term_to_bitstring(body[1].argm, bit + bits);
  } else {
    return bits;
  }
}

function run_IO_with(term, term_defs, io) {
  var defs = Object.assign(Object.assign({}, io_defs), term_defs);
  var term = F.erase(term);
  var term = F.norm(term, defs, false);
  var body = term[1].body[1].body;
  if (body[0] === "Var") {
    return new Promise((res) => res(""));
  } else {
    var cmd = term_to_bitstring(F.norm(body[1].func[1].func[1].argm, defs, true));
    var arg = term_to_bitstring(F.norm(body[1].func[1].argm, defs, true));
    var cnt = body[1].argm;
    return io[cmd](arg).then((ret) => run_IO_with(F.App(cnt, bitstring_to_term(ret)), defs, io));
  }
}

function check_IO(term, term_defs) {
  var defs = Object.assign(Object.assign({}, io_defs), term_defs);
  F.check(term, F.App(F.Ref("IO"), term), defs);
}

module.exports = {
  bitstring_to_term,
  term_to_bitstring,
  run_IO_with,
  check_IO,
  defs: io_defs
};
