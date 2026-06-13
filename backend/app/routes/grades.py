from flask import Blueprint, jsonify, request

from ..models import Grade, TeacherCourse
from ..services.grade_service import create_grade, list_grades, update_grade
from ..utils.validation import require_fields, validate_score

grades_bp = Blueprint("grades", __name__)


@grades_bp.get("")
def index():
    return jsonify([grade.to_dict() for grade in list_grades()])


@grades_bp.get("/teachers")
def list_teachers():
    rows = TeacherCourse.query.with_entities(TeacherCourse.teacher_name).distinct().all()
    return jsonify([r[0] for r in rows])


@grades_bp.get("/teacher-courses")
def list_teacher_courses():
    teacher = request.args.get("teacher", "")
    if not teacher:
        return jsonify([])
    courses = TeacherCourse.query.filter_by(teacher_name=teacher).all()
    return jsonify([c.to_dict() for c in courses])


@grades_bp.post("")
def create():
    payload = request.get_json() or {}
    missing = require_fields(
        payload,
        ["studentNo", "studentName", "courseCode", "courseName", "credit", "score", "semester", "teacher"],
    )
    if missing:
        return jsonify({"message": f"缺少字段: {', '.join(missing)}"}), 400

    error = validate_score(payload["score"])
    if error:
        return jsonify({"message": error}), 400

    authorized = TeacherCourse.query.filter_by(
        teacher_name=payload["teacher"], course_code=payload["courseCode"]
    ).first()
    if not authorized:
        return jsonify({"message": f"教师「{payload['teacher']}」无权录入课程「{payload['courseCode']}」的成绩"}), 403

    grade = create_grade(payload)
    return jsonify(grade.to_dict()), 201


@grades_bp.put("/<int:grade_id>")
def update(grade_id):
    grade = Grade.query.get_or_404(grade_id)
    payload = request.get_json() or {}
    if "score" in payload:
        error = validate_score(payload["score"])
        if error:
            return jsonify({"message": error}), 400

    teacher = payload.get("teacher", grade.teacher)
    course_code = payload.get("courseCode", grade.course_code)
    authorized = TeacherCourse.query.filter_by(
        teacher_name=teacher, course_code=course_code
    ).first()
    if not authorized:
        return jsonify({"message": f"教师「{teacher}」无权修改课程「{course_code}」的成绩"}), 403

    return jsonify(update_grade(grade, payload).to_dict())
