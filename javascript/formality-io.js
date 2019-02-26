const F = require("formality-lang");
const S = require("formality-sugars");

const defs = F.parse(`
  Typ
  : {T : (Typ T)} Type
  = [T] {self : (T self)} Type

  Chr
  : (Typ Chr)
  = [self]
    {-Prop : (Typ Chr)}
    {O     : {pred : (Chr pred)} (Prop (Chr.O pred))}
    {I     : {pred : (Chr pred)} (Prop (Chr.I pred))}
    {E     : (Prop Chr.E)}
    (Prop self)

  Chr.E
  : (Chr Chr.E)
  = [-Prop] [O] [I] [E]
    E

  Chr.O
  : {pred : (Chr pred)}
    (Chr (Chr.O pred))
  = [pred] [-Prop] [O] [I] [E]
    (O pred)

  Chr.I
  : {pred : (Chr pred)}
    (Chr (Chr.I pred))
  = [pred] [-Prop] [O] [I] [E]
    (I pred)

  Str
  : (Typ Str)
  = [self]
    {-Prop : (Typ Str)}
    {cons  : {head : (Chr head)} {tail : (Str tail)} (Prop (Str.cons head tail))}
    {nil   : (Prop Str.nil)}
    (Prop self)

  Str.cons
  : {head : (Chr head)}
    {tail : (Str tail)}
    (Str (Str.cons head tail))
  = [head] [tail] [-Prop] [cons] [nil]
    (cons head tail)

  Str.nil
  : (Str Str.nil)
  = [-Prop] [cons] [nil]
    nil

  IO
  : (Typ IO) 
  = [self]
    {-Prop : (Typ IO)}
    {ask :
      {cmd : (Str cmd)}
      {arg : (Str arg)}
      {cnt : {res : (Str res)} (IO (cnt res))}
      (Prop (IO.ask cmd arg cnt))}
    {end : (Prop IO.end)}
    (Prop self)

  IO.ask
  : {cmd : (Str cmd)}
    {arg : (Str arg)}
    {cnt : {res : (Str res)} (IO (cnt res))}
    (IO (IO.ask cmd arg cnt))
  = [cmd] [arg] [cnt] [-Prop] [ask] [end]
    (ask cmd arg cnt)

  IO.end
  : (IO IO.end)
  = [-Prop] [ask] [end] end
`);

// Runs a IO term with a given effectful operation table
function run_IO_with(term, term_defs, io) {
  var defz = Object.assign(Object.assign({}, defs), term_defs);
  var term = F.erase(term);
  var term = F.norm(term, defz, false);
  var body = term[1].body[1].body;
  if (body[0] === "Var") {
    return new Promise((res) => res(""));
  } else {
    var cmd = S.term_to_string(F.norm(body[1].func[1].func[1].argm, defz, true));
    var arg = S.term_to_string(F.norm(body[1].func[1].argm, defz, true));
    var cnt = body[1].argm;
    return io[cmd](arg).then((ret) => run_IO_with(F.App(cnt, S.string_to_term(ret)), term_defs, io));
  }
}

// Renames all terms in a defs
function rename(defs, rename = (name => name)) {
  function rn(term) {
    if (!term) {
      return null;
    } else {
      switch (term[0]) {
        case "Var": return F.Var(term[1].index);
        case "Typ": return F.Typ();
        case "All": return F.All(term[1].name, rn(term[1].bind), rn(term[1].body), term[1].eras);
        case "Lam": return F.Lam(term[1].name, rn(term[1].bind), rn(term[1].body), term[1].eras);
        case "App": return F.App(rn(term[1].func), rn(term[1].argm), term[1].eras);
        case "Ref": return F.Ref(rename(term[1].name), term[1].eras);
      }
    }
  }
  var new_defs = {};
  for (var name in defs) {
    new_defs[rename(name)] = {
      term: rn(defs[name].term),
      type: rn(defs[name].type),
      done: false
    };
  }
  return new_defs;
}

// Imports an array of [defs, rename] tuples into a defs
function importing(imports, defs) {
  var new_defs = {};
  for (var [imp_defs, imp_rename] of imports) {
    new_defs = Object.assign(new_defs, rename(imp_defs, imp_rename));
  }
  return Object.assign(new_defs, defs);
}

module.exports = {
  defs,
  run_IO_with,
  rename,
  importing
};
