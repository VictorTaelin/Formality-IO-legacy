const F = require("formality-lang");
const S = require("formality-sugars");

// Runs a IO term with a given effectful operation table
function run_IO_with(term, defs, io) {
  var term = F.erase(term);
  var term = F.norm(term, defs, false);
  var body = term[1].body[1].body;
  if (body[0] === "Var") {
    return new Promise((res) => res(""));
  } else {
    var cmd = S.term_to_string(F.norm(body[1].func[1].func[1].argm, defs, true));
    var arg = S.term_to_string(F.norm(body[1].func[1].argm, defs, true));
    var cnt = body[1].argm;
    return io[cmd](arg).then((ret) => run_IO_with(F.App(cnt, S.string_to_term(ret)), defs, io));
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
  run_IO_with,
  rename,
  importing
};
