From Stdlib Require Import String List.
From DjotV Require Import Ast Inline Step.
Import ListNotations.
Open Scope string_scope.

Definition parse_default (s : string) :=
  @parse_blocks djot_table djot_bconfig semantic_line_ix semantic_pos s.

Example lazy_line_escapes_footnote :
  match parse_default "[^n]: a
b
" with
  | [Node _ _ (FootnoteDef "n" _); Node _ _ (Para _)] => True
  | _ => False
  end.
Proof. vm_compute. exact I. Qed.

Example indented_line_stays_in_footnote :
  match parse_default "[^n]: a
 b
" with
  | [Node _ _ (FootnoteDef "n" _)] => True
  | _ => False
  end.
Proof. vm_compute. exact I. Qed.

Print Assumptions lazy_line_escapes_footnote.
Print Assumptions indented_line_stays_in_footnote.
