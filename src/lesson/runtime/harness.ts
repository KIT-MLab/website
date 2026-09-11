/**
 * Pyodide の中に置く Python 側の実行係。
 *
 * ブラウザ（Web Worker）と、ビルド時の期待値生成（scripts/build-tests.mjs）が
 * 同じこのコードを使う。両者の実行の意味をそろえるため、ここ1か所にしか置かない。
 *
 * ここでやること（20-platform.md 第3章）:
 *   - 実行ごとに新しい名前空間を作る（状態を引き継がない）
 *   - print の出力を集める
 *   - input() は渡された入力欄の中身を上から1行ずつ読む
 *   - 5秒を超えたら止める（sys.settrace で行ごとに時刻を見る）
 *   - 結果を JSON にして返す
 */
export const PYTHON_HARNESS = String.raw`
import sys, io, json, time, builtins, traceback, linecache


class _KitTimeLimit(Exception):
    pass


class _KitInputEmpty(Exception):
    pass


def _kit_jsonable(v):
    if v is None or isinstance(v, bool):
        return v
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        if v != v or v == float("inf") or v == float("-inf"):
            return {"__repr__": repr(v)}
        return v
    if isinstance(v, str):
        return v
    if isinstance(v, (list, tuple)):
        return [_kit_jsonable(x) for x in v]
    if isinstance(v, dict):
        return {str(k): _kit_jsonable(x) for k, x in v.items()}
    return {"__repr__": repr(v)}


def _kit_run(code, stdin_text, call_json, limit):
    out = io.StringIO()
    lines = stdin_text.split(chr(10)) if stdin_text else []
    # 入力欄の末尾の改行1つだけを落とす。途中の空行は「空の入力」として残す
    if lines and lines[-1] == "":
        lines.pop()
    pos = [0]

    def _kit_input(prompt=""):
        if prompt:
            out.write(str(prompt))
        if pos[0] >= len(lines):
            raise _KitInputEmpty()
        value = lines[pos[0]]
        pos[0] += 1
        return value

    ns = {"__name__": "__main__", "__builtins__": builtins.__dict__, "input": _kit_input}
    result = {"stdout": "", "error": None, "value": None, "hasValue": False}
    linecache.cache["<program>"] = (len(code), None, code.splitlines(True), "<program>")
    saved_stdout = sys.stdout
    sys.stdout = out
    deadline = time.monotonic() + limit

    def _kit_trace(frame, event, arg):
        if time.monotonic() > deadline:
            raise _KitTimeLimit()
        return _kit_trace

    try:
        compiled = compile(code, "<program>", "exec")
        sys.settrace(_kit_trace)
        exec(compiled, ns)
        # 呼び出しの指定が無いときは空文字が来る。JS の null は Pyodide では None にならない
        if call_json:
            spec = json.loads(call_json)
            fn = ns.get(spec["fn"])
            if not callable(fn):
                sys.settrace(None)
                result["error"] = {"kind": "no-function", "fn": spec["fn"]}
                result["stdout"] = out.getvalue()
                sys.stdout = saved_stdout
                return json.dumps(result, ensure_ascii=False)
            result["value"] = _kit_jsonable(fn(*spec["args"]))
            result["hasValue"] = True
        sys.settrace(None)
    except _KitTimeLimit:
        sys.settrace(None)
        result["error"] = {"kind": "timeout"}
    except _KitInputEmpty:
        sys.settrace(None)
        result["error"] = {"kind": "input-empty"}
    except SyntaxError as e:
        sys.settrace(None)
        result["error"] = {
            "kind": "python",
            "type": type(e).__name__,
            "message": e.msg,
            "line": e.lineno,
            "display": type(e).__name__ + ": " + str(e.msg),
            "traceback": "".join(traceback.format_exception_only(type(e), e)),
        }
    except BaseException as e:
        sys.settrace(None)
        tb = e.__traceback__
        if tb is not None:
            tb = tb.tb_next
        line = None
        for frame in traceback.extract_tb(tb):
            if frame.filename == "<program>":
                line = frame.lineno
        result["error"] = {
            "kind": "python",
            "type": type(e).__name__,
            "message": str(e),
            "line": line,
            "display": type(e).__name__ + ": " + str(e),
            "traceback": "".join(traceback.format_exception(type(e), e, tb)),
        }
    finally:
        sys.settrace(None)
        sys.stdout = saved_stdout

    result["stdout"] = out.getvalue()
    return json.dumps(result, ensure_ascii=False)
`;
