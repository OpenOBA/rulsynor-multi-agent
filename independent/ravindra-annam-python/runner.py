#!/usr/bin/env python3
"""Independent, spec-only evaluator for Rulsynor delegated-authority vectors.

Implements the public expression-tree contract needed by the current AV-01..AV-14
vector set. It imports no OpenOBA SDK/reference runner and reads no answer oracle.
"""
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable

MISSING = object()


def field_value(ref: Dict[str, Any], context: Dict[str, Any]) -> Any:
    field = ref["field"]
    return context.get(field, MISSING)


def epoch_ms(value: Any) -> int:
    if value is MISSING:
        raise KeyError("epoch_ms operand references a missing field")
    if not isinstance(value, str):
        raise TypeError(f"epoch_ms requires an ISO-8601 string, got {type(value).__name__}")
    text = value[:-1] + "+00:00" if value.endswith("Z") else value
    dt = datetime.fromisoformat(text)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def resolve_operand(operand: Any, context: Dict[str, Any]) -> Any:
    if isinstance(operand, dict):
        if set(operand) == {"field"}:
            value = field_value(operand, context)
            if value is MISSING:
                raise KeyError(f"Missing field in context: {operand['field']}")
            return value
        if set(operand) == {"epoch_ms"}:
            return epoch_ms(resolve_operand(operand["epoch_ms"], context))
    return operand


def eval_expr(expr: Dict[str, Any], context: Dict[str, Any]) -> bool:
    if not isinstance(expr, dict) or len(expr) != 1:
        raise ValueError(f"Expression must contain exactly one operator: {expr!r}")

    op, args = next(iter(expr.items()))

    if op == "and":
        if not isinstance(args, list):
            raise ValueError("and requires an operand list")
        return all(eval_expr(arg, context) for arg in args)

    if op == "or":
        if not isinstance(args, list):
            raise ValueError("or requires an operand list")
        return any(eval_expr(arg, context) for arg in args)

    if op == "not_exists":
        if not isinstance(args, dict) or set(args) != {"field"}:
            raise ValueError("not_exists requires a field reference")
        return field_value(args, context) is MISSING

    if not isinstance(args, list) or len(args) != 2:
        raise ValueError(f"Operator {op!r} requires exactly two operands")

    left = resolve_operand(args[0], context)
    right = resolve_operand(args[1], context)

    operators = {
        "eq": lambda a, b: a == b,
        "ne": lambda a, b: a != b,
        "gt": lambda a, b: a > b,
        "gte": lambda a, b: a >= b,
        "lt": lambda a, b: a < b,
        "lte": lambda a, b: a <= b,
    }
    try:
        return bool(operators[op](left, right))
    except KeyError as exc:
        raise ValueError(f"Unsupported operator in current vector contract: {op}") from exc


def rule_matches(rule: Dict[str, Any], context: Dict[str, Any]) -> bool:
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
    prefix = rule_id.split("_", 1)[0]
    if not prefix.startswith("INV-"):
        raise ValueError(f"Rule id does not encode an invariant: {rule_id}")
    return prefix


def evaluate_vector(vector: Dict[str, Any], context_name: str) -> Dict[str, Any]:
    matched = rule_matches(vector["rule"], vector[context_name])
    if not matched:
        return {"matched": False, "decision": None}
    attr = vector["attribution"]
    return {
        "matched": True,
        "decision": vector["rule"]["action"]["decision"],
        "matched_invariant": invariant_from_rule_id(vector["rule"]["id"]),
        "first_invalid_boundary": attr["violation_hop"],
        "requested_action": attr["requested_action"],
        "effective_authority": attr["effective_authority"],
        "reason": attr["reason"],
    }


def vector_paths(inputs: Iterable[Path]) -> list[Path]:
    paths: list[Path] = []
    for item in inputs:
        if item.is_dir():
            paths.extend(item.glob("AV-*.json"))
        elif item.name.startswith("AV-") and item.suffix == ".json":
            paths.append(item)
        else:
            raise ValueError(f"Vector input must be a directory or AV-*.json file: {item}")
    unique = {p.resolve(): p for p in paths}
    return sorted(unique.values(), key=lambda p: int(p.stem.split("-")[1]))


def load_vectors(inputs: Iterable[Path]) -> list[Dict[str, Any]]:
    paths = vector_paths(inputs)
    if not paths:
        raise FileNotFoundError("No AV-*.json vectors found")
    vectors = [json.loads(p.read_text(encoding="utf-8")) for p in paths]
    ids = [v["id"] for v in vectors]
    if len(ids) != len(set(ids)):
        raise ValueError(f"Duplicate vector ids: {ids}")
    return vectors


def build_submission(vectors: list[Dict[str, Any]], artifact: str, run_date: str) -> Dict[str, Any]:
    results: Dict[str, Any] = {}
    for vector in vectors:
        attack = evaluate_vector(vector, "attack")
        legal = evaluate_vector(vector, "legal")
        if not attack["matched"]:
            raise AssertionError(f"{vector['id']}: attack context did not trigger the rule")
        if legal["matched"]:
            raise AssertionError(f"{vector['id']}: legal baseline unexpectedly triggered the rule")
        results[vector["id"]] = {k: v for k, v in attack.items() if k != "matched"}

    return {
        "runner": "ravindra-annam-python-independent",
        "method": "Python 3 stdlib, spec-only independent expression-tree evaluator; no OpenOBA SDK/reference runner",
        "date": run_date,
        "artifact": artifact,
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--vectors", required=True, nargs="+", type=Path,
                        help="Vector directories/files (e.g. vectors/stateless vectors/snapshot)")
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
