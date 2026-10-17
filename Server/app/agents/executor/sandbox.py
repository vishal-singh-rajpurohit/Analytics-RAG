import ast
import io
import sys
import traceback
import contextlib
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for server
import matplotlib.pyplot as plt
try:
    import seaborn as sns
except ImportError:
    sns = None
from typing import Dict, Any, Optional

DISALLOWED_MODULES = {
    "os", "sys", "subprocess", "shutil", "socket", "http", "urllib", "requests",
    "pty", "posix", "ctypes", "multiprocessing", "threading", "signal"
}

DISALLOWED_CALLS = {
    "eval", "exec", "__import__", "compile", "open", "input"
}


class CodeSafetyVisitor(ast.NodeVisitor):
    def __init__(self):
        self.errors = []

    def visit_Import(self, node):
        for alias in node.names:
            base_module = alias.name.split(".")[0]
            if base_module in DISALLOWED_MODULES:
                self.errors.append(f"Security error: import of '{alias.name}' is prohibited in analysis sandbox.")
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module:
            base_module = node.module.split(".")[0]
            if base_module in DISALLOWED_MODULES:
                self.errors.append(f"Security error: import from '{node.module}' is prohibited in analysis sandbox.")
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id in DISALLOWED_CALLS:
                self.errors.append(f"Security error: calling '{node.func.id}()' is prohibited.")
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr in {"system", "popen", "spawn", "fork"}:
                self.errors.append(f"Security error: calling attribute '{node.func.attr}' is prohibited.")
        self.generic_visit(node)


def validate_python_code(code: str) -> Optional[str]:
    """
    Validates Python code statically using AST before execution.
    Returns error string if unsafe or syntax error, else None.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return f"SyntaxError in generated code: {e}"

    visitor = CodeSafetyVisitor()
    visitor.visit(tree)
    if visitor.errors:
        return "; ".join(visitor.errors)
    return None


def execute_sandboxed_code(
    code: str,
    df: pd.DataFrame,
    extra_globals: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes Python data analysis code inside a sandboxed environment.
    Captures stdout, return variable `result`, and handles exceptions.
    """
    safety_error = validate_python_code(code)
    if safety_error:
        return {
            "success": False,
            "error": safety_error,
            "stdout": "",
            "result": None,
            "formatted_output": f"Validation Error: {safety_error}"
        }

    # Safe built-in functions
    safe_builtins = {
        "abs": abs, "all": all, "any": any, "bool": bool, "dict": dict,
        "enumerate": enumerate, "filter": filter, "float": float, "format": format,
        "int": int, "isinstance": isinstance, "issubclass": issubclass,
        "len": len, "list": list, "map": map, "max": max, "min": min,
        "pow": pow, "print": print, "range": range, "reversed": reversed,
        "round": round, "set": set, "slice": slice, "sorted": sorted,
        "str": str, "sum": sum, "tuple": tuple, "type": type, "zip": zip,
        "True": True, "False": False, "None": None
    }

    exec_globals: Dict[str, Any] = {
        "__builtins__": safe_builtins,
        "pd": pd,
        "np": np,
        "plt": plt,
        "sns": sns,
        "df": df.copy(),
    }

    if extra_globals:
        exec_globals.update(extra_globals)

    exec_locals: Dict[str, Any] = {}

    stdout_capture = io.StringIO()
    try:
        with contextlib.redirect_stdout(stdout_capture):
            exec(code, exec_globals, exec_locals)

        raw_result = exec_locals.get("result")
        stdout_text = stdout_capture.getvalue().strip()

        # Format result representation
        formatted_output = ""
        if raw_result is not None:
            if isinstance(raw_result, pd.DataFrame):
                try:
                    formatted_output = raw_result.to_markdown(index=True)
                except Exception:
                    formatted_output = raw_result.to_string(index=True)
            elif isinstance(raw_result, pd.Series):
                try:
                    formatted_output = raw_result.to_markdown(index=True)
                except Exception:
                    formatted_output = raw_result.to_string(index=True)
            elif isinstance(raw_result, (np.ndarray, list, dict)):
                formatted_output = str(raw_result)
            else:
                formatted_output = str(raw_result)
        elif stdout_text:
            formatted_output = stdout_text
        else:
            formatted_output = "Code executed successfully with no direct return value."

        return {
            "success": True,
            "result": raw_result,
            "stdout": stdout_text,
            "error": None,
            "formatted_output": formatted_output,
            "locals": {k: v for k, v in exec_locals.items() if not k.startswith("_")}
        }
    except Exception as e:
        error_msg = traceback.format_exc()
        return {
            "success": False,
            "result": None,
            "stdout": stdout_capture.getvalue().strip(),
            "error": error_msg,
            "formatted_output": f"Execution Error:\n{error_msg}"
        }
