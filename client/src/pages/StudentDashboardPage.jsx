import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Camera,
  Edit3,
  Award,
  BookOpen,
  LogOut,
  AlertCircle,
  X,
  ArrowRight,
  Save,
  Upload
} from 'lucide-react';
import BRANDING from '../config/branding';
import CollegeLogo from '../components/CollegeLogo';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const {
    currentStudent,
    logout,
    updateStudentProfile,
    updateSemesterCgpa,
    updateRequests
  } = useAuth();

  // Local state for profile photo preview
  const [photoPreview, setPhotoPreview] = useState(currentStudent.profilePhoto);

  // Edit Profile Modal
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editPhone, setEditPhone] = useState(currentStudent.phone || '');
  const [editLocation, setEditLocation] = useState(currentStudent.location || '');
  const [editEmail, setEditEmail] = useState(currentStudent.email || '');

  // Update Academic Details Modal
  const [isUpdateSemOpen, setIsUpdateSemOpen] = useState(false);
  const [selectedSemNumber, setSelectedSemNumber] = useState(4);
  const [inputCgpa, setInputCgpa] = useState('');
  const [successToast, setSuccessToast] = useState(null);

  // Determine eligible semesters based on exact prompt rule:
  // - 3-1 students: update semester 1 to semester 4.
  // - 3-2 students: update semester 1 to semester 5.
  // - 4-1 students: update semester 1 to semester 6.
  // - 4-2 students: update semester 1 to semester 7.
  const maxEligibleSem = (() => {
    const term = currentStudent.term || '3-1';
    if (term === '3-1') return 4;
    if (term === '3-2') return 5;
    if (term === '4-1') return 6;
    if (term === '4-2') return 7;
    if (term === '2-1') return 2;
    if (term === '2-2') return 3;
    if (term === '1-2') return 1;
    return 0;
  })();

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        updateStudentProfile({ profilePhoto: reader.result });
        setSuccessToast('Profile photo updated successfully!');
        setTimeout(() => setSuccessToast(null), 3500);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateStudentProfile({
      phone: editPhone.trim(),
      location: editLocation.trim(),
      email: editEmail.trim(),
    });
    setIsEditProfileOpen(false);
    setSuccessToast('Profile details updated successfully!');
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleSaveSemCgpa = (e) => {
    e.preventDefault();
    const val = parseFloat(inputCgpa);
    if (isNaN(val) || val < 0 || val > 10) {
      alert('Please enter a valid CGPA between 0.0 and 10.0');
      return;
    }

    updateSemesterCgpa(selectedSemNumber, val);
    setIsUpdateSemOpen(false);
    setInputCgpa('');
    setSuccessToast(`Semester ${selectedSemNumber} CGPA (${val.toFixed(2)}) updated successfully!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleLogout = () => {
    logout();
    navigate('/student/login');
  };

  // Check whether HOD update request (5th Sem) is submitted
  const isReq5Submitted = (currentStudent.submittedUpdateRequests || []).includes('req_5th_sem');

  return (
    <div className="min-h-screen bg-[#E8E0CF] text-[#1F2926] flex flex-col font-sans">
      {/* Top Student Portal Header */}
      <header className="bg-[#5E8881] text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Institutional Branding Lockup */}
          <div className="flex items-center gap-3">
            <CollegeLogo size="sm" badge />
            <div className="leading-tight">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white">
                {BRANDING.collegeName}
              </h1>
              <p className="text-[11px] font-semibold text-[#F5F1E8]">
                {BRANDING.departmentName} &bull; Student Portal
              </p>
            </div>
          </div>

          {/* Student Identity & Logout */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="text-xs font-bold text-white">{currentStudent.name}</span>
              <span className="text-[10px] text-white/80 font-mono">{currentStudent.registerNumber}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white border border-white/20 transition-all cursor-pointer"
              title="Sign out of Student Portal"
            >
              <LogOut className="w-3.5 h-3.5 text-[#E8213A]" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* Toast Feedback */}
        {successToast && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. Student Profile Section */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D4CAB4] shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 w-full md:w-auto">
              {/* Profile Photo with Interactive File Picker */}
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 border-2 border-[#7FA8A1] shadow-md flex items-center justify-center text-slate-400">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt={currentStudent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-[#5E8881]" />
                  )}
                </div>

                {/* Upload Action Overlay */}
                <label
                  htmlFor="photo-upload"
                  className="absolute bottom-1 right-1 p-2 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] text-white shadow-lg cursor-pointer transition-transform active:scale-95"
                  title="Upload / Change Profile Photo"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Student Details */}
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {currentStudent.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#7FA8A1]/20 text-[#3D6660] text-xs font-mono font-bold">
                    {currentStudent.registerNumber}
                  </span>
                </div>

                <p className="text-xs font-semibold text-[#5E8881]">
                  B.Tech &bull; {BRANDING.departmentName} ({BRANDING.departmentAbbr})
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-y-1 gap-x-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentStudent.year} Year ({currentStudent.term})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentStudent.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentStudent.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentStudent.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Profile Action */}
            <div className="flex-shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  setEditPhone(currentStudent.phone || '');
                  setEditLocation(currentStudent.location || '');
                  setEditEmail(currentStudent.email || '');
                  setIsEditProfileOpen(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#5E8881]" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>

          {/* 2. Academic Details Summary Grid */}
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Academic Performance Overview
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-[#E8E0CF]/40 border border-[#D4CAB4]">
                <span className="text-[11px] font-bold text-slate-500 block">
                  SSC Percentage
                </span>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                  {currentStudent.sscPercentage}%
                </div>
                <span className="text-[10px] text-slate-500">Secondary Education</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#E8E0CF]/40 border border-[#D4CAB4]">
                <span className="text-[11px] font-bold text-slate-500 block">
                  Inter / Diploma %
                </span>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                  {currentStudent.interPercentage}%
                </div>
                <span className="text-[10px] text-slate-500">Board / State Council</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#7FA8A1] shadow-sm">
                <span className="text-[11px] font-bold text-[#5E8881] block">
                  Latest Semester CGPA
                </span>
                <div className="text-xl sm:text-2xl font-extrabold text-[#5E8881] mt-0.5">
                  {currentStudent.latestSemesterCgpa.toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-500">
                  {currentStudent.latestCompletedSem}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#E8E0CF]/40 border border-[#D4CAB4]">
                <span className="text-[11px] font-bold text-slate-500 block">
                  Academic Progress
                </span>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                  {maxEligibleSem} / 8 Sem
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-[#5E8881] rounded-full"
                    style={{ width: `${(maxEligibleSem / 8) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Active HOD Update Requests Banner */}
        <section aria-labelledby="update-req-heading">
          <h2 id="update-req-heading" className="sr-only">Active Department Requests</h2>
          <div className={`p-5 rounded-3xl border shadow-sm transition-all ${
            isReq5Submitted
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-white border-[#E8213A]/50 text-slate-900'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isReq5Submitted ? 'bg-emerald-600 text-white' : 'bg-[#E8213A] text-white shadow-md shadow-[#E8213A]/20'
                }`}>
                  {isReq5Submitted ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">
                      Official HOD Request: 5th Semester CGPA Update
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isReq5Submitted
                        ? 'bg-emerald-200 text-emerald-800'
                        : 'bg-[#E8213A]/15 text-[#E8213A]'
                    }`}>
                      {isReq5Submitted ? 'Submitted' : 'Pending Response'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {isReq5Submitted
                      ? 'You have successfully submitted your 5th semester academic update. Record confirmed by department.'
                      : 'Students eligible to update 5th semester CGPA must submit their official grade before the deadline.'}
                  </p>
                </div>
              </div>

              {!isReq5Submitted && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSemNumber(5);
                    setIsUpdateSemOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E8213A] hover:bg-[#C7152D] text-white font-bold text-xs shadow-md transition-all flex-shrink-0"
                >
                  <span>Submit 5th Sem CGPA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 3. Semester CGPA Update Section */}
        <section className="bg-white rounded-3xl border border-[#D4CAB4] shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#5E8881]" />
                <h3 className="font-bold text-sm text-slate-900">
                  Semester Academic Records (Semester 1 to Semester 8)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Eligible update rule: Students can update completed semesters (Sem 1 to Sem {maxEligibleSem}). Current ongoing semester marks are not applicable.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedSemNumber(maxEligibleSem || 1);
                setIsUpdateSemOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] text-white text-xs font-bold shadow-sm transition-all self-start sm:self-auto cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Update Academic Details</span>
            </button>
          </div>

          {/* Semesters Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-700 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold">Semester</th>
                  <th className="py-3 px-3 font-bold">Academic Term</th>
                  <th className="py-3 px-3 font-bold">Status</th>
                  <th className="py-3 px-3 font-bold text-center">Semester CGPA</th>
                  <th className="py-3 px-3 font-bold">Update Eligibility</th>
                  <th className="py-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {currentStudent.semesters.map((sem) => {
                  const isEligibleToUpdate = sem.semNumber <= maxEligibleSem;
                  const isOngoing = sem.status === 'Ongoing';

                  return (
                    <tr key={sem.semNumber} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {sem.title}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {sem.semNumber <= 2 ? '1st Year' : sem.semNumber <= 4 ? '2nd Year' : sem.semNumber <= 6 ? '3rd Year' : '4th Year'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sem.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOngoing
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sem.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {sem.cgpa !== null ? (
                          <span className="text-emerald-700 text-sm">{sem.cgpa.toFixed(2)}</span>
                        ) : isOngoing ? (
                          <span className="text-slate-400 font-normal">Ongoing (In Progress)</span>
                        ) : (
                          <span className="text-slate-400 font-normal">&mdash;</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isEligibleToUpdate ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Eligible to update</span>
                          </span>
                        ) : isOngoing ? (
                          <span className="text-slate-500 font-medium text-[11px]">
                            Current Semester (Ongoing)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            Locked (Upcoming)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEligibleToUpdate ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSemNumber(sem.semNumber);
                              setInputCgpa(sem.cgpa ? sem.cgpa.toString() : '');
                              setIsUpdateSemOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#5E8881]/15 hover:bg-[#5E8881]/25 text-[#5E8881] font-bold text-xs transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{sem.cgpa ? 'Edit CGPA' : 'Enter CGPA'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Modal: Edit Student Profile */}
        {isEditProfileOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Personal Profile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update student contact and communication details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="edit-name">
                    Student Full Name (Read-only)
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    disabled
                    value={currentStudent.name}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="edit-reg">
                    Register Number (Read-only)
                  </label>
                  <input
                    id="edit-reg"
                    type="text"
                    disabled
                    value={currentStudent.registerNumber}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="edit-loc">
                    Current Location / Town
                  </label>
                  <input
                    id="edit-loc"
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Vijayawada"
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#5E8881]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="edit-ph">
                    Contact Phone Number
                  </label>
                  <input
                    id="edit-ph"
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#5E8881]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="edit-em">
                    Student Official Email
                  </label>
                  <input
                    id="edit-em"
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. student@mictech.ac.in"
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#5E8881]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] text-white font-bold shadow-md cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Update Semester CGPA */}
        {isUpdateSemOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Update Semester CGPA
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter official grade score as per college examination marks sheet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpdateSemOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSemCgpa} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="select-sem">
                    Select Completed Semester
                  </label>
                  <select
                    id="select-sem"
                    value={selectedSemNumber}
                    onChange={(e) => {
                      const num = parseInt(e.target.value, 10);
                      setSelectedSemNumber(num);
                      const existing = currentStudent.semesters.find((s) => s.semNumber === num);
                      setInputCgpa(existing?.cgpa ? existing.cgpa.toString() : '');
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white outline-none focus:ring-1 focus:ring-[#5E8881]"
                  >
                    {Array.from({ length: maxEligibleSem }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        Semester {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="cgpa-input">
                    Cumulative Grade Point Average (CGPA / 10.0)
                  </label>
                  <input
                    id="cgpa-input"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    value={inputCgpa}
                    onChange={(e) => setInputCgpa(e.target.value)}
                    placeholder="e.g. 8.75"
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#5E8881] text-sm font-bold"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter grade on a scale of 0.00 to 10.00.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsUpdateSemOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] text-white font-bold shadow-md cursor-pointer"
                  >
                    Confirm &amp; Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#D4CAB4] py-4 text-center text-xs text-slate-600">
        <p>
          &copy; {new Date().getFullYear()} {BRANDING.collegeName} &bull; {BRANDING.departmentName} &bull; Student Academic Portal
        </p>
      </footer>
    </div>
  );
}
