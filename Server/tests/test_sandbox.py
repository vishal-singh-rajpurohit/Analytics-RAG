import pandas as pd

from app.agents.executor.sandbox import execute_sandboxed_code, validate_python_code


def test_sandbox_executes_safe_code():
    df = pd.DataFrame({
        "category": ["A", "B", "A", "B"],
        "sales": [10, 20, 30, 40]
    })
    code = """
result = df.groupby('category')['sales'].sum().to_dict()
print("Computed sum successfully")
"""
    res = execute_sandboxed_code(code, df)
    assert res["success"] is True
    assert res["error"] is None
    assert res["result"] == {"A": 40, "B": 60}
    assert "Computed sum successfully" in res["stdout"]


def test_sandbox_blocks_dangerous_imports():
    df = pd.DataFrame({"x": [1, 2]})
    dangerous_code = """
import os
os.system("echo hacked")
"""
    res = execute_sandboxed_code(dangerous_code, df)
    assert res["success"] is False
    assert "Security error" in res["error"]


def test_sandbox_blocks_eval_and_exec():
    df = pd.DataFrame({"x": [1, 2]})
    code = "eval('1 + 1')"
    res = execute_sandboxed_code(code, df)
    assert res["success"] is False
    assert "Security error" in res["error"]


def test_sandbox_captures_runtime_exceptions():
    df = pd.DataFrame({"x": [1, 2]})
    bad_runtime_code = "result = df['non_existent_column'] + 10"
    res = execute_sandboxed_code(bad_runtime_code, df)
    assert res["success"] is False
    assert "KeyError" in res["error"]


if __name__ == "__main__":
    test_sandbox_executes_safe_code()
    test_sandbox_blocks_dangerous_imports()
    test_sandbox_blocks_eval_and_exec()
    test_sandbox_captures_runtime_exceptions()
    print("ALL SANDBOX TESTS PASSED!")
