import importlib.util
import pathlib
import sys
import types


ROOT = pathlib.Path(__file__).resolve().parents[1]


class FakeDynArray(list):
    @classmethod
    def __class_getitem__(cls, _item):
        return cls


def identity_decorator(*_args, **_kwargs):
    return lambda function: function


fake_genlayer = types.ModuleType("genlayer")
fake_genlayer.gl = types.SimpleNamespace(
    Contract=type("FakeContract", (), {}),
    public=types.SimpleNamespace(write=identity_decorator, view=identity_decorator),
)
fake_genlayer.DynArray = FakeDynArray
sys.modules["genlayer"] = fake_genlayer

spec = importlib.util.spec_from_file_location("course_path_contract", ROOT / "contracts" / "course_path_planner.py")
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)


def course(code, groups=()):
    return {
        "course_code": code,
        "title": f"Course {code}",
        "prerequisite_status": "CLEAR",
        "prerequisite_groups": [list(group) for group in groups],
        "evidence": ["Prerequisites: CS101."],
        "source_url": f"https://catalog.example.edu/{code.lower()}",
    }


def test_completed_prerequisite_satisfies_group_and_order_is_topological():
    result = contract._build_plan(
        [course("CS314", [["CS312"]]), course("CS312", [["M408C", "M408K"]])],
        ["M408K"],
    )
    assert result["status"] == "READY"
    assert result["course_order"] == ["CS312", "CS314"]


def test_missing_group_is_explicit():
    result = contract._build_plan([course("CS314", [["CS312"]])], [])
    assert result["status"] == "INCOMPLETE"
    assert result["missing_prerequisites"] == [{"course_code": "CS314", "group": 1, "options": ["CS312"]}]


def test_cycle_is_not_presented_as_a_valid_sequence():
    result = contract._build_plan([course("CS101", [["CS201"]]), course("CS201", [["CS101"]])], [])
    assert result["status"] == "INCOMPLETE"
    assert result["cycle_courses"] == ["CS101", "CS201"]


def test_unclear_catalog_section_never_becomes_a_ready_plan():
    item = course("CS101")
    item["prerequisite_status"] = "UNCLEAR"
    result = contract._build_plan([item], [])
    assert result["status"] == "INCOMPLETE"
    assert result["unclear_courses"] == ["CS101"]


def test_rejects_non_https_and_duplicate_courses():
    for raw in (
        '[{"code":"CS101","url":"http://catalog.example.edu/CS101"}]',
        '[{"code":"CS101","url":"https://catalog.example.edu/1"},{"code":"CS101","url":"https://catalog.example.edu/2"}]',
    ):
        try:
            contract._parse_courses(raw)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid course input passed validation")


def test_catalog_output_must_match_requested_course_and_url():
    requested = [{"code": "CS101", "url": "https://catalog.example.edu/CS101"}]
    wrong = course("CS101")
    wrong["source_url"] = "https://other.example.edu/CS101"
    try:
        contract._validate_catalog([wrong], requested)
    except ValueError:
        pass
    else:
        raise AssertionError("Mismatched source URL passed validation")
