import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Loader2
} from 'lucide-react';
import CollegeLogo from './CollegeLogo';
import BRANDING from '../config/branding';
import { ALL_SEMESTER_TERMS, getTermsForYear, getMaxCompletedSemForTerm } from '../data/mockData';
import { uploadStudentPhoto } from '../services/api';

export default function StudentCompleteProfileView({ student, onCompleteProfile, onLogout }) {
  const [fullName, setFullName] = useState(
    student.name && student.name !== 'Profile Pending' ? student.name : ''
  );
  const [email, setEmail] = useState(student.email || '');
  const [phone, setPhone] = useState(student.phone || '');

  const locationOptions = [
    'Vijayawada',
    'Guntur',
    'Kanchikacherla',
    'Nandigama',
    'Jaggaiahpet',
    'Ibrahimpatnam',
    'Tiruvuru',
    'Mangalagiri',
    'Nuzvid',
    'Eluru',
    'Tenali',
    'Gudivada',
    'Machilipatnam',
    'Other'
  ];

  const initialLoc = student.location && student.location !== 'Not Provided' ? student.location.trim() : 'Vijayawada';
  const isPredefined = locationOptions.filter(l => l !== 'Other').includes(initialLoc);
  const [selectedLocation, setSelectedLocation] = useState(isPredefined ? initialLoc : 'Other');
  const [customLocation, setCustomLocation] = useState(isPredefined ? '' : initialLoc);

  const [year, setYear] = useState('3rd Year');
  const [term, setTerm] = useState('3-1');
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState(student.profilePhotoPath || student.profile_photo_path || null);
  const [photoPreview, setPhotoPreview] = useState(student.profilePhoto || student.profile_photo_url || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Backlog state: null by default until student answers Yes/No
  const [hasBacklogs, setHasBacklogs] = useState(
    typeof student.hasBacklogs === 'boolean'
      ? student.hasBacklogs
      : typeof student.has_backlogs === 'boolean'
      ? student.has_backlogs
      : null
  );
  const [backlogCount, setBacklogCount] = useState(
    student.backlogCount
      ? String(student.backlogCount)
      : student.backlog_count
      ? String(student.backlog_count)
      : ''
  );

  // Previous Education
  const [sscPercentage, setSscPercentage] = useState('');
  const [interType, setInterType] = useState('Intermediate');
  const [interPercentage, setInterPercentage] = useState('');

  // B.Tech Semester CGPAs
  const [cgpaInputs, setCgpaInputs] = useState({
    '1-1': '',
    '1-2': '',
    '2-1': '',
    '2-2': '',
    '3-1': '',
    '3-2': '',
    '4-1': '',
    '4-2': '',
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle year change: strictly reset term if invalid
  const handleYearChange = (newYear) => {
    setYear(newYear);
    const allowed = getTermsForYear(newYear);
    if (!allowed.includes(term)) {
      setTerm(allowed[0] || '');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    // Validate MIME types - accept JPEG, PNG, or convert WebP
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Invalid file format. Only JPEG and PNG images are supported.');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // Create local preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPhotoPreview(objectUrl);

      // Compress/normalize image to ensure <= 1MB JPEG/PNG
      const processImage = () => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1000;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Determine output mime: preserve PNG if original was PNG, else JPEG
            const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Canvas compression failed'));
                return;
              }
              const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, outMime === 'image/png' ? '.png' : '.jpg'), {
                type: outMime
              });
              resolve(processedFile);
            }, outMime, 0.88);
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const fileToUpload = (file.size > 1048576 || file.type === 'image/webp')
        ? await processImage()
        : file;

      if (fileToUpload.size > 1048576) {
        setError('Processed file size exceeds 1 MB limit. Please choose a smaller photo.');
        setIsUploadingPhoto(false);
        return;
      }

      const res = await uploadStudentPhoto(fileToUpload);
      if (res?.success && (res.profilePhotoPath || res.photoPath || res.signedUrl)) {
        setUploadedPhotoPath(res.profilePhotoPath || res.photoPath);
        if (res.signedUrl) {
          setPhotoPreview(res.signedUrl);
        }
      } else {
        setError(res?.error || 'Failed to upload photo to secure storage.');
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      setError(err?.message || 'Failed to upload profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Calculate completed semester eligibility based on current term
  const maxCompletedSem = getMaxCompletedSemForTerm(term);
  const eligibleTerms = ALL_SEMESTER_TERMS.filter((s) => s.semNumber <= maxCompletedSem);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // 1. Validate Personal Information
    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid official email address.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setError('Please provide a valid contact phone number.');
      return;
    }

    let finalLocation = selectedLocation;
    if (selectedLocation === 'Other') {
      const cleanCustom = customLocation.trim();
      if (!cleanCustom) {
        setError('Please enter your village, town, or city name.');
        return;
      }
      if (cleanCustom.toLowerCase() === 'other') {
        setError('Please enter your actual location name instead of "Other".');
        return;
      }
      finalLocation = cleanCustom;
    }
    if (!finalLocation || finalLocation.trim().length === 0) {
      setError('Residential Location is required.');
      return;
    }

    // 2. Validate Backlogs
    if (hasBacklogs === null || hasBacklogs === undefined) {
      setError('Please answer the question: Do you have any backlogs? (Yes / No).');
      return;
    }
    let finalBacklogCount = 0;
    if (hasBacklogs === true) {
      const countNum = parseInt(backlogCount, 10);
      if (isNaN(countNum) || countNum < 1 || String(backlogCount).includes('.')) {
        setError('Number of Backlogs must be a positive whole number (at least 1).');
        return;
      }
      finalBacklogCount = countNum;
    } else {
      finalBacklogCount = 0;
    }

    // 3. Validate Academic Year & Term
    const allowedTerms = getTermsForYear(year);
    if (!allowedTerms.includes(term)) {
      setError(`Invalid term for ${year}. Allowed terms are: ${allowedTerms.join(', ')}.`);
      return;
    }

    // 3. Validate Previous Education
    const sscNum = parseFloat(sscPercentage);
    if (isNaN(sscNum) || sscNum < 0 || sscNum > 100) {
      setError('SSC Percentage must be a valid number between 0 and 100.');
      return;
    }
    const interNum = parseFloat(interPercentage);
    if (isNaN(interNum) || interNum < 0 || interNum > 100) {
      setError('Intermediate / Diploma Percentage must be a valid number between 0 and 100.');
      return;
    }

    // 4. Validate Completed Semester CGPAs
    for (const sem of eligibleTerms) {
      const val = cgpaInputs[sem.term];
      if (val !== '' && val !== null && val !== undefined) {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 10) {
          setError(`CGPA for ${sem.title} (${sem.term}) must be a valid number between 0.00 and 10.00.`);
          return;
        }
      }
    }

    // Construct 8 semester records
    const semesterRecords = ALL_SEMESTER_TERMS.map((sem) => {
      const isEligible = sem.semNumber <= maxCompletedSem;
      if (!isEligible) {
        return {
          term: sem.term,
          semNumber: sem.semNumber,
          cgpa: null,
          status: sem.semNumber === maxCompletedSem + 1 ? 'Ongoing' : 'Upcoming'
        };
      }
      const rawCgpa = cgpaInputs[sem.term];
      const hasCgpa = rawCgpa !== '' && rawCgpa !== null && rawCgpa !== undefined;
      return {
        term: sem.term,
        semNumber: sem.semNumber,
        cgpa: hasCgpa ? parseFloat(parseFloat(rawCgpa).toFixed(2)) : null,
        status: hasCgpa ? 'Updated' : 'Pending'
      };
    });

    setIsSubmitting(true);
    const parsedYear = parseInt(String(year).replace(/\D/g, ''), 10) || 2;
    const parsedTerm = String(term).includes('-')
      ? parseInt(String(term).split('-')[1], 10)
      : (parseInt(String(term).replace(/\D/g, ''), 10) || 1);

    Promise.resolve(onCompleteProfile({
      fullName: fullName.trim(),
      name: fullName.trim(),
      email: email.trim(),
      phoneNumber: phone.trim(),
      phone: phone.trim(),
      location: finalLocation.trim(),
      hasBacklogs: hasBacklogs,
      backlogCount: finalBacklogCount,
      currentYear: parsedYear,
      year: parsedYear,
      currentTerm: parsedTerm,
      term: parsedTerm,
      profilePhoto: photoPreview,
      profilePhotoPath: uploadedPhotoPath,
      sscPercentage: sscNum,
      qualificationType: interType.toLowerCase().trim(),
      interType: interType.toLowerCase().trim(),
      intermediatePercentage: interNum,
      interPercentage: interNum,
      semesterRecords,
      onboardingStatus: 'Profile Completed',
      studentStatus: 'Active'
    })).then((result) => {
      if (!result || !result.success) {
        setIsSubmitting(false);
        setError(result?.error || 'Failed to complete profile. Please verify your inputs.');
      }
    }).catch((err) => {
      setIsSubmitting(false);
      setError(err?.message || 'Failed to complete profile.');
    });
  };

  return (
    <div className="min-h-screen bg-[#E8E0CF] text-[#1F2926] flex flex-col font-sans pb-16">
      {/* Top Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#D4CAB4] py-3.5 px-4 sm:px-8 shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CollegeLogo size="sm" />
            <div className="leading-tight">
              <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                {BRANDING.collegeName}
              </span>
              <span className="text-[11px] font-bold text-[#5E8881]">
                {BRANDING.departmentName} &bull; Student Onboarding
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-xs font-bold text-slate-600 hover:text-rose-700 underline cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Welcome Hero Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D4CAB4] shadow-md text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#5E8881] via-[#E8213A] to-[#5E8881]" />
          
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5E8881]/15 text-[#5E8881] text-xs font-bold">
              <GraduationCap className="w-4 h-4 text-[#E8213A]" />
              <span>Student Account Activated</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              Welcome! Complete Your Student Profile
            </h1>
            <p className="text-xs text-slate-600 max-w-xl">
              Your initial login account was created by the HOD. Please provide your official personal and previous educational details, along with your semester-wise B.Tech CGPAs, to complete your department registration.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Register Number</span>
            <span className="font-mono font-black text-base text-[#5E8881] block mt-0.5">
              {student.registerNumber}
            </span>
            <span className="text-[9px] text-amber-700 font-bold block mt-1">Profile Pending</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION A: PERSONAL INFORMATION */}
          <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#D4CAB4] shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-[#5E8881]/15 text-[#5E8881] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">A. Personal Information</h3>
                <p className="text-[11px] text-slate-500">Your official contact details and profile avatar.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              {/* Photo Upload & Preview */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 border-2 border-[#5E8881] shadow-sm flex items-center justify-center text-slate-400 font-bold text-lg relative group">
                  {isUploadingPhoto ? (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-slate-600">
                      <Loader2 className="w-6 h-6 animate-spin text-[#5E8881] mb-1" />
                      <span className="text-[10px] font-bold">Uploading...</span>
                    </div>
                  ) : photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-300" />
                  )}
                  {!isUploadingPhoto && (
                    <label 
                      htmlFor="onboarding-photo"
                      className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                    >
                      <Camera className="w-5 h-5 mb-1" />
                      <span>{photoPreview ? 'Change' : 'Upload'}</span>
                    </label>
                  )}
                </div>
                <input
                  id="onboarding-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
                <label 
                  htmlFor="onboarding-photo"
                  className={`text-[11px] font-bold ${isUploadingPhoto ? 'text-slate-400 cursor-not-allowed' : 'text-[#5E8881] hover:underline cursor-pointer'}`}
                >
                  {isUploadingPhoto ? 'Uploading Photo...' : photoPreview ? 'Change Photo' : 'Upload Photo'}
                </label>
                <span className="text-[9px] text-slate-400 font-medium">JPG or PNG (Max 1MB)</span>
              </div>

              {/* Personal Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full text-xs">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="onboarding-name" className="block font-bold text-slate-700 mb-1">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="onboarding-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. K. Sai Krishna"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="onboarding-email" className="block font-bold text-slate-700 mb-1">
                    Official Email Address <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="onboarding-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. saikrishna.22aiml@mictech.ac.in"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <label htmlFor="onboarding-phone" className="block font-bold text-slate-700 mb-1">
                    Contact Phone Number <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="onboarding-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Location */}
                <div className="sm:col-span-2">
                  <label htmlFor="onboarding-location" className="block font-bold text-slate-700 mb-1">
                    Residential Location <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="onboarding-location"
                      value={selectedLocation}
                      onChange={(e) => {
                        setSelectedLocation(e.target.value);
                        if (e.target.value !== 'Other') {
                          setCustomLocation('');
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                    >
                      {locationOptions.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>

                  {selectedLocation === 'Other' && (
                    <div className="mt-2.5">
                      <label htmlFor="onboarding-custom-location" className="block font-bold text-slate-700 mb-1 text-xs">
                        Enter Your Village / Town / City <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="onboarding-custom-location"
                        type="text"
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        placeholder="e.g. Bhimavaram, Mylavaram, Vatsavai..."
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION B: ACADEMIC INFORMATION */}
          <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#D4CAB4] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-[#5E8881]/15 text-[#5E8881] flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">B. Academic Information</h3>
                <p className="text-[11px] text-slate-500">Current enrolled cohort, term, and backlog status in AIML.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Academic Year */}
              <div>
                <label htmlFor="onboarding-year" className="block font-bold text-slate-700 mb-1">
                  Enrolled Academic Year <span className="text-rose-600">*</span>
                </label>
                <select
                  id="onboarding-year"
                  value={year}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                >
                  <option value="2nd Year">2nd Year (2025 Batch)</option>
                  <option value="3rd Year">3rd Year (2024 Batch)</option>
                  <option value="4th Year">4th Year (2023 Batch)</option>
                </select>
              </div>

              {/* Current Term */}
              <div>
                <label htmlFor="onboarding-term" className="block font-bold text-slate-700 mb-1">
                  Current Semester / Term <span className="text-rose-600">*</span>
                </label>
                <select
                  id="onboarding-term"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-[#5E8881] outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                >
                  {getTermsForYear(year).map((t) => (
                    <option key={t} value={t}>
                      Term {t}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Eligible terms restricted to {year}.
                </span>
              </div>

              {/* Backlog Question */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 sm:col-span-2">
                <label className="block font-bold text-slate-800 text-xs sm:text-sm">
                  Do you have any backlogs? <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                    <input
                      type="radio"
                      name="onboarding-backlogs"
                      checked={hasBacklogs === true}
                      onChange={() => {
                        setHasBacklogs(true);
                        if (!backlogCount || backlogCount === '0') setBacklogCount('1');
                      }}
                      className="w-4 h-4 text-[#5E8881] focus:ring-[#5E8881]"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                    <input
                      type="radio"
                      name="onboarding-backlogs"
                      checked={hasBacklogs === false}
                      onChange={() => {
                        setHasBacklogs(false);
                        setBacklogCount('0');
                      }}
                      className="w-4 h-4 text-[#5E8881] focus:ring-[#5E8881]"
                    />
                    <span>No</span>
                  </label>
                </div>

                {hasBacklogs === true && (
                  <div className="pt-2 max-w-xs">
                    <label htmlFor="onboarding-backlog-count" className="block font-bold text-slate-700 mb-1 text-xs">
                      Number of Backlogs <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="onboarding-backlog-count"
                      type="number"
                      min="1"
                      step="1"
                      value={backlogCount}
                      onChange={(e) => setBacklogCount(e.target.value)}
                      placeholder="Enter positive whole number (e.g. 1, 2, 3...)"
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION C: PREVIOUS EDUCATION */}
          <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#D4CAB4] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-[#5E8881]/15 text-[#5E8881] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">C. Previous Education Background</h3>
                <p className="text-[11px] text-slate-500">Official secondary &amp; intermediate percentages.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* SSC % */}
              <div>
                <label htmlFor="onboarding-ssc" className="block font-bold text-slate-700 mb-1">
                  SSC / 10th Class Percentage (%) <span className="text-rose-600">*</span>
                </label>
                <input
                  id="onboarding-ssc"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={sscPercentage}
                  onChange={(e) => setSscPercentage(e.target.value)}
                  placeholder="e.g. 92.4"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                />
              </div>

              {/* Education Type */}
              <div>
                <label htmlFor="onboarding-inter-type" className="block font-bold text-slate-700 mb-1">
                  Education Type <span className="text-rose-600">*</span>
                </label>
                <select
                  id="onboarding-inter-type"
                  value={interType}
                  onChange={(e) => setInterType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                >
                  <option value="Intermediate">Intermediate (10+2)</option>
                  <option value="Diploma">Diploma (Polytechnic)</option>
                </select>
              </div>

              {/* Inter/Diploma % */}
              <div>
                <label htmlFor="onboarding-inter-pct" className="block font-bold text-slate-700 mb-1">
                  {interType} Percentage (%) <span className="text-rose-600">*</span>
                </label>
                <input
                  id="onboarding-inter-pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={interPercentage}
                  onChange={(e) => setInterPercentage(e.target.value)}
                  placeholder="e.g. 94.2"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                />
              </div>
            </div>
          </section>

          {/* SECTION D: B.TECH ACADEMIC DETAILS (COMPLETED SEMESTERS ONLY) */}
          <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#D4CAB4] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#5E8881]/15 text-[#5E8881] flex items-center justify-center">
                  <Award className="w-4 h-4 text-[#E8213A]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">D. Semester-wise B.Tech CGPA Records</h3>
                  <p className="text-[11px] text-slate-500">
                    Enter verified CGPA for completed semesters up to Term {term}. Strictly CGPA only.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold self-start sm:self-auto">
                {eligibleTerms.length} Completed Semesters Eligible
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <strong>Semester Eligibility Policy:</strong> As a {year} ({term}) student, you are eligible to enter results for completed semesters ({eligibleTerms.map(e => e.term).join(', ')}). Ongoing and future terms do not require entry.
            </div>

            {/* Completed Semesters Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              {eligibleTerms.map((sem) => (
                <div key={sem.term} className="p-3.5 rounded-2xl bg-white border border-[#D4CAB4] shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{sem.title}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-[10px] text-slate-700">
                      Term {sem.term}
                    </span>
                  </div>
                  <div>
                    <label htmlFor={`cgpa-${sem.term}`} className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Recorded CGPA (0.00 – 10.00)
                    </label>
                    <input
                      id={`cgpa-${sem.term}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={cgpaInputs[sem.term]}
                      onChange={(e) => setCgpaInputs(prev => ({ ...prev, [sem.term]: e.target.value }))}
                      placeholder="e.g. 8.65"
                      className="w-full p-2 rounded-xl border border-slate-300 font-mono font-bold text-xs text-[#5E8881] outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION E: EXPLICIT SAVE ACTION */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSubmitting || isUploadingPhoto
                  ? 'bg-slate-400 cursor-not-allowed text-white'
                  : 'bg-[#5E8881] hover:bg-[#48706A] active:scale-[0.99] text-white cursor-pointer'
              }`}
            >
              {isSubmitting || isUploadingPhoto ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-white" />
              )}
              <span>
                {isUploadingPhoto
                  ? 'Uploading Photo...'
                  : isSubmitting
                  ? 'Saving Your Profile...'
                  : 'Save Profile & Enter Student Portal'}
              </span>
            </button>
            <p className="text-center text-[11px] text-slate-500 mt-2">
              Note: Information is saved only when you click this button. You can update your details later from your dashboard.
            </p>
          </div>

        </form>
      </main>
    </div>
  );
}
