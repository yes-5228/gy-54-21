import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import GradeTable from "../components/GradeTable";
import Notice from "../components/Notice";

const initialForm = {
  studentNo: "",
  studentName: "",
  major: "",
  className: "",
  courseCode: "",
  courseName: "",
  credit: 3,
  score: 85,
  semester: "2025-2026-2",
  teacher: "",
};

export default function TeacherPage() {
  const [form, setForm] = useState(initialForm);
  const [grades, setGrades] = useState([]);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [teacherCourses, setTeacherCourses] = useState([]);

  const loadGrades = async () => {
    setGrades(await api.listGrades());
  };

  useEffect(() => {
    loadGrades().catch((error) => setNotice({ type: "error", message: error.message }));
    api.listTeachers().then(setTeachers).catch(() => {});
  }, []);

  const handleTeacherChange = useCallback(async (teacherName) => {
    setForm((current) => ({
      ...current,
      teacher: teacherName,
      courseCode: "",
      courseName: "",
      credit: 3,
    }));
    if (!teacherName) {
      setTeacherCourses([]);
      return;
    }
    try {
      const courses = await api.listTeacherCourses(teacherName);
      setTeacherCourses(courses);
    } catch {
      setTeacherCourses([]);
    }
  }, []);

  const handleCourseChange = useCallback((courseCode) => {
    const course = teacherCourses.find((c) => c.courseCode === courseCode);
    if (course) {
      setForm((current) => ({
        ...current,
        courseCode: course.courseCode,
        courseName: course.courseName,
        credit: course.credit,
      }));
    } else {
      setForm((current) => ({ ...current, courseCode: "", courseName: "", credit: 3 }));
    }
  }, [teacherCourses]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.createGrade(form);
      setNotice({ type: "success", message: "成绩已录入" });
      setForm({ ...initialForm, teacher: form.teacher, semester: form.semester });
      await loadGrades();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const changeScore = async (gradeId, score) => {
    setGrades((items) => items.map((item) => (item.id === gradeId ? { ...item, score: Number(score) } : item)));
    try {
      const updated = await api.updateGrade(gradeId, { score });
      setGrades((items) => items.map((item) => (item.id === gradeId ? updated : item)));
    } catch (error) {
      setNotice({ type: "error", message: error.message });
      await loadGrades();
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>教师成绩录入</h1>
          <p>录入课程成绩，系统自动换算等级与绩点。</p>
        </div>
      </header>

      <Notice notice={notice} />

      <div className="split-grid">
        <form className="panel form-grid" onSubmit={submit}>
          <label>
            任课教师
            <select value={form.teacher} onChange={(event) => handleTeacherChange(event.target.value)} required>
              <option value="">请选择教师</option>
              {teachers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            学期
            <input value={form.semester} onChange={(event) => updateField("semester", event.target.value)} required />
          </label>
          <label>
            课程
            <select
              value={form.courseCode}
              onChange={(event) => handleCourseChange(event.target.value)}
              required
              disabled={!form.teacher}
            >
              <option value="">{form.teacher ? "请选择课程" : "请先选择教师"}</option>
              {teacherCourses.map((c) => (
                <option key={c.courseCode} value={c.courseCode}>
                  {c.courseCode} - {c.courseName}
                </option>
              ))}
            </select>
          </label>
          <label>
            学分
            <input min="0.5" step="0.5" type="number" value={form.credit} readOnly />
          </label>
          <label>
            学号
            <input value={form.studentNo} onChange={(event) => updateField("studentNo", event.target.value)} required />
          </label>
          <label>
            姓名
            <input value={form.studentName} onChange={(event) => updateField("studentName", event.target.value)} required />
          </label>
          <label>
            专业
            <input value={form.major} onChange={(event) => updateField("major", event.target.value)} />
          </label>
          <label>
            班级
            <input value={form.className} onChange={(event) => updateField("className", event.target.value)} />
          </label>
          <label>
            成绩
            <input min="0" max="100" type="number" value={form.score} onChange={(event) => updateField("score", event.target.value)} required />
          </label>
          <label />
          <button className="primary-action" disabled={saving || !form.teacher || !form.courseCode} type="submit">
            <Save size={18} />
            {saving ? "保存中" : "保存成绩"}
          </button>
        </form>

        <div className="panel">
          <div className="panel-head">
            <h2>最近成绩</h2>
          </div>
          <GradeTable grades={grades} onScoreChange={changeScore} />
        </div>
      </div>
    </section>
  );
}
