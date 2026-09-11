#!/usr/bin/env python3
"""Independent, spec-only evaluator for the Rulsynor delegated-authority pilot.

Implements only the public expression-tree contract documented in:
- submissions/README.md
- vectors/scenario-schema.json
- vectors/stateless/*.json

No OpenOBA SDK or reference runner is imported or consulted.
"""
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any, Dict


def resolve_operand(operand: Any, context: Dict[str, Any]) -> Any:
    """Resolve an expression operand.

    Public pilot operands are field references of the form {"field": "name"}.
    Literal values are returned unchanged to keep the evaluator minimal and generic.
    """
    if isinstance(operand, dict) and set(operand) == {"field"}:
        field = operand["field"]
        if field not in context:
            raise KeyError(f"Missing field in context: {field}")
        return context[field]
    return operand


def eval_expr(expr: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """Evaluate the public pilot expression tree (gt / ne)."""
    if not isinstance(expr, dict) or len(expr) != 1:
        raise ValueError(f"Expression must contain exactly one operator: {expr!r}")

    op, args = next(iter(expr.items()))
    if not isinstance(args, list) or len(args) != 2:
        raise ValueError(f"Operator {op!r} requires exactly two operands")

    left = resolve_operand(args[0], context)
    right = resolve_operand(args[1], context)

    if op == "gt":
        return left > right
    if op == "ne":
        return left != right
    raise ValueError(f"Unsupported operator in pilot contract: {op}")


def rule_matches(rule: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """Evaluate enabled conditions using AND/OR conditionLogic."""
    if not rule.get("enabled", False):
        return False

    conditions = rule.get("conditions", [])
    values = [eval_expr(c["expr"], context) for c in conditions]
    logic = rule.get("conditionLogic", "AND")

    if logic == "AND":
        return all(values)
    if logic == "OR":
        return any(values)
    raise ValueError(f"Unsupported conditionLogic: {logic}")


def invariant_from_rule_id(rule_id: str) -> str:
    """Derive the matched invariant from the rule id prefix."""
    prefix = rule_id.split("_", 1)[0]
    if not prefix.startswith("INV-"):
        raise ValueError(f"Rule id does not encode an invariant: {rule_id}")
    return prefix


def evaluate_vector(vector: Dict[str, Any], context_name: str) -> Dict[str, Any]:
    context = vector[context_name]
    rule = vector["rule"]
    matched = rule_matches(rule, context)

    if not matched:
        return {"matched": False, "decision": None}

    attr = vector["attribution"]
    return {
        "matched": True,
        "decision": rule["action"]["decision"],
        "matched_invariant": invariant_from_rule_id(rule["id"]),
        "first_invalid_boundary": attr["violation_hop"],
        "requested_action": attr["requested_action"],
        "effective_authority": attr["effective_authority"],
        "reason": attr["reason"],
    }


def load_vectors(vectors_dir: Path) -> list[Dict[str, Any]]:
    paths = sorted(vectors_dir.glob("AV-*.json"))
    if not paths:
        raise FileNotFoundError(f"No AV-*.json vectors found in {vectors_dir}")
    return [json.loads(p.read_text(encoding="utf-8")) for p in paths]


def build_submission(vectors: list[Dict[str, Any]], artifact: str, run_date: str) -> Dict[str, Any]:
    results: Dict[str, Any] = {}

    for vector in vectors:
        attack = evaluate_vector(vector, "attack")
        legal = evaluate_vector(vector, "legal")

        # Honesty sentinel: each attack must trigger and each legal baseline must not.
        if not attack["matched"]:
            raise AssertionError(f"{vector['id']}: attack context did not trigger the rule")
        if legal["matched"]:
            raise AssertionError(f"{vector['id']}: legal baseline unexpectedly triggered the rule")

        result = {k: v for k, v in attack.items() if k != "matched"}
        results[vector["id"]] = result

    return {
        "runner": "ravindra-annam-python-independent",
        "method": "Python 3, spec-only, self-built expression-tree evaluator (gt/ne; no OpenOBA SDK)",
        "date": run_date,
        "artifact": artifact,
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--vectors", required=True, type=Path,
                        help="Path to vectors/stateless directory")
    parser.add_argument("--output", type=Path,
                        default=Path("submissions/ravindra-annam-python-independent-output.json"))
    parser.add_argument("--artifact", default="https://github.com/RavindraAnnam/rulsynor-multi-agent")
    parser.add_argument("--date", default=date.today().isoformat())
    args = parser.parse_args()

    vectors = load_vectors(args.vectors)
    submission = build_submission(vectors, args.artifact, args.date)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(submission, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"PASS: evaluated {len(vectors)} attack contexts and {len(vectors)} legal baselines")
    for vector_id, result in submission["results"].items():
        print(f"  {vector_id}: {result['decision']} / {result['matched_invariant']} / {result['first_invalid_boundary']}")
    print(f"Wrote: {args.output}")


if __name__ == "__main__":
    main()
