import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { collection, query, getDocs, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { createAdminUser } from '../../firebase/adminHelper';
import { useConfirm } from '../../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import { 
  Building2, 
  Plus, 
  Search, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Mail,
  User,
  Lock,
  X,
  Phone,
  Globe,
  MapPin,
  Image as ImageIcon,
  FileText,
  Award,
  Hash,
  Upload,
  Calendar,
  Building
} from 'lucide-react';

const SuperColleges = () => {
  const confirm = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subscriptionCollege, setSubscriptionCollege] = useState(null);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchColleges = async () => {
    try {
      setIsLoading(true);
      const q = query(collection(db, 'colleges'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setColleges(data);
    } catch (error) {
      console.error("Error fetching colleges:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleApproveCollege = async (collegeId, adminUid) => {
    try {
      // Update college status
      const collegeRef = doc(db, 'colleges', collegeId);
      await updateDoc(collegeRef, { status: 'active' });

      // Update admin user status
      if (adminUid) {
        const userRef = doc(db, 'users', adminUid);
        await updateDoc(userRef, { accountStatus: 'active' });
      }

      // Refresh list
      fetchColleges();
    } catch (error) {
      console.error("Error approving college:", error);
    }
  };

  const handleUpdateStatus = async (collegeId, newStatus) => {
    try {
      await updateDoc(doc(db, 'colleges', collegeId), { status: newStatus });
      fetchColleges();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDeleteCollege = async (collegeId) => {
    if (!(await confirm({ message: "Are you sure you want to permanently delete this college? This action cannot be undone." }))) return;
    
    try {
      await deleteDoc(doc(db, 'colleges', collegeId));
      fetchColleges();
    } catch (error) {
      console.error("Error deleting college:", error);
      toast.error("Failed to delete college.");
    }
  };

  const filteredColleges = colleges.filter(college => 
    college.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    college.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Colleges Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all institutions registered in the Zuna ecosystem.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all"
        >
          <Plus className="w-5 h-5" />
          Onboard New College
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by college name or code (e.g. ZUNAC1234)..."
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
          />
        </div>
      </div>

      {/* Colleges List */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">College details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-4" />
                    Loading institutions...
                  </td>
                </tr>
              ) : filteredColleges.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-lg font-medium text-slate-900 dark:text-white">No colleges found</p>
                    <p className="text-sm mt-1">Click "Onboard New College" to add one.</p>
                  </td>
                </tr>
              ) : (
                filteredColleges.map((college) => (
                  <tr key={college.id} onClick={() => setSelectedCollege(college)} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {college.logoBase64 ? (
                          <img src={college.logoBase64} alt={college.name} className="flex-shrink-0 h-10 w-10 rounded-xl object-contain border border-slate-200 dark:border-white/10 bg-white shadow-sm" />
                        ) : (
                          <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center shadow-inner">
                            <span className="text-white font-bold text-lg">{college.name?.charAt(0) || 'C'}</span>
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{college.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{college.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 tracking-wider">
                        {college.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        college.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                          : college.status === 'pending'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${college.status === 'active' ? 'bg-emerald-500' : college.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                        {college.status === 'active' ? 'Active' : college.status === 'pending' ? 'Pending' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {college.createdAt?.toDate ? new Date(college.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {college.status === 'pending' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleApproveCollege(college.id, college.adminUid); }}
                            className="text-xs px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 font-bold rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {college.status === 'active' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(college.id, 'suspended'); }}
                            className="text-xs px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-400 font-bold rounded-lg transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                        {college.status === 'suspended' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(college.id, 'active'); }}
                            className="text-xs px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 font-bold rounded-lg transition-colors"
                          >
                            Activate
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSubscriptionCollege(college); }}
                          className="text-xs px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-blue-400 font-bold rounded-lg transition-colors"
                        >
                          Manage Plan
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCollege(college.id); }}
                          className="text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-400 font-bold rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Modal */}
      {/* Subscription Modal */}
      <AnimatePresence>
        {subscriptionCollege && (
          <ManageSubscriptionModal 
            college={subscriptionCollege}
            onClose={() => setSubscriptionCollege(null)}
            onSuccess={() => {
              setSubscriptionCollege(null);
              fetchColleges();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <OnboardCollegeModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              fetchColleges();
            }}
          />
        )}
        {selectedCollege && (
          <CollegeDetailsModal 
            college={selectedCollege} 
            onClose={() => setSelectedCollege(null)} 
          />
        )}
      </AnimatePresence>

    </div>
  );
};

const OnboardCollegeModal = ({ onClose, onSuccess }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [logoBase64, setLogoBase64] = useState('');

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo file is too large. Max size is 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setLogoBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError('');
    
    try {
      const {
        adminName, adminEmail, adminPassword,
        collegeName, shortName, collegeEmail, officialPhone, category, establishedYear, affiliatedBoard, websiteUrl,
        aicteNumber, ugcRecognition, affiliationCode, gstin,
        streetAddress, city, district, state, country, pincode
      } = data;

      const collegeData = {
        name: collegeName,
        shortName: shortName || '',
        email: collegeEmail,
        phone: officialPhone || '',
        category: category || '',
        establishedYear: establishedYear || '',
        affiliatedBoard: affiliatedBoard || '',
        websiteUrl: websiteUrl || '',
        logoBase64: logoBase64 || '',
        aicteNumber: aicteNumber || '',
        ugcRecognition: ugcRecognition || '',
        affiliationCode: affiliationCode || '',
        gstin: gstin || '',
        streetAddress: streetAddress || '',
        city: city || '',
        district: district || '',
        state: state || '',
        country: country || '',
        pincode: pincode || ''
      };

      const result = await createAdminUser(
        { name: adminName, email: adminEmail, password: adminPassword },
        collegeData
      );
      
      setSuccessData(result);
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setApiError('The admin email address is already in use by another account.');
      } else if (error.code === 'auth/weak-password') {
        setApiError('The password is too weak. Please use at least 6 characters.');
      } else {
        setApiError('Failed to onboard college. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      {/* Modal Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Onboard New College</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {successData ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">College Onboarded!</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                The institution has been registered and the admin credentials have been securely generated.
              </p>
              
              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 mb-8 text-left max-w-md mx-auto">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Generated College Code:</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-extrabold text-primary-600 dark:text-primary-400 tracking-wider font-mono">
                    {successData.collegeCode}
                  </p>
                </div>
              </div>

              <button 
                onClick={onSuccess}
                className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
              >
                Return to Directory
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              
              <AnimatePresence>
                {apiError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{apiError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SECTION 1: INSTITUTION DETAILS */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-white/5">Institution Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">College Name *</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Building2 className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("collegeName", { required: "College Name is required" })} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="e.g. Oxford University" />
                    </div>
                    {errors.collegeName && <p className="mt-1.5 text-xs text-red-500">{errors.collegeName.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Short / Abbreviated Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Building className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("shortName")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="e.g. OCS" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Official Email *</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-slate-400" /></div>
                      <input type="email" {...register("collegeEmail", { required: "Official Email is required" })} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="contact@oxford.edu" />
                    </div>
                    {errors.collegeEmail && <p className="mt-1.5 text-xs text-red-500">{errors.collegeEmail.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Official Phone</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("officialPhone")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="+919876543210" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">College Type / Category</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Award className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("category")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="e.g. Engineering, Medical, Arts" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Established Year</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-slate-400" /></div>
                      <input type="number" {...register("establishedYear")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="2005" />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Affiliated University / Board</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Award className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("affiliatedBoard")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="Anna University / CBSE" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Website URL (Optional)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Globe className="h-5 w-5 text-slate-400" /></div>
                      <input type="url" {...register("websiteUrl")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="https://oxford.edu" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">College Logo (Optional)</label>
                    <div className="relative flex items-center bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl p-1 overflow-hidden">
                      <label className="cursor-pointer shrink-0 flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors">
                        <ImageIcon className="w-4 h-4" />
                        Choose file
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      <span className="ml-3 text-sm text-slate-500 truncate">{logoBase64 ? 'Logo Uploaded' : 'No file chosen'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CREDENTIALS */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-white/5">Credentials & Identifiers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">AICTE Number</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><FileText className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("aicteNumber")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="AICTE-12345" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">UGC Recognition</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><CheckCircle2 className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("ugcRecognition")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="UGC-890" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Affiliation Code</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Building2 className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("affiliationCode")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="Affiliation Code" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">GSTIN (Optional)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Hash className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("gstin")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="22AAAAA0000A1Z5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: LOCATION */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-white/5">Location & Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Street Address</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("streetAddress")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="123 Academic Block, Ring Road" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">City</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("city")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="Erode" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">District</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("district")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="Erode District" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">State</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("state")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="Tamil Nadu" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Country</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("country")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="India" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Postal Pincode</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("pincode")} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="638316" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: PRIMARY ADMIN */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-white/5">Primary Admin Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Admin Full Name *</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("adminName", { required: "Admin Name is required" })} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="Dr. John Doe" />
                    </div>
                    {errors.adminName && <p className="mt-1.5 text-xs text-red-500">{errors.adminName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Admin Email *</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-slate-400" /></div>
                      <input type="email" {...register("adminEmail", { required: "Admin Email is required" })} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="principal@oxford.edu" />
                    </div>
                    {errors.adminEmail && <p className="mt-1.5 text-xs text-red-500">{errors.adminEmail.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Temporary Password *</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-400" /></div>
                      <input type="text" {...register("adminPassword", { required: "Password is required", minLength: { value: 6, message: "Min 6 characters" }})} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm" placeholder="Enter secure initial password" />
                    </div>
                    {errors.adminPassword && <p className="mt-1.5 text-xs text-red-500">{errors.adminPassword.message}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#0A0F1C] py-4 z-10">
                <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50">
                  {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Onboarding...</> : 'Onboard College'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};


const CollegeDetailsModal = ({ college, onClose, onManageSubscription }) => {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 shrink-0">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">College Details</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Header section */}
          <div className="flex items-start gap-6">
            {college.logoBase64 ? (
              <img src={college.logoBase64} alt={college.name} className="w-32 h-32 rounded-2xl object-contain border border-slate-200 dark:border-white/10 bg-white shadow-sm" />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center shadow-inner shrink-0">
                <span className="text-white font-bold text-5xl">{college.name?.charAt(0) || 'C'}</span>
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{college.name} {college.shortName && `(${college.shortName})`}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-mono mt-1">{college.id}</p>
              
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  college.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                    : college.status === 'pending'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                }`}>
                  {college.status?.toUpperCase() || 'UNKNOWN'}
                </span>
                {college.category && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                    {college.category}
                  </span>
                )}
                {college.establishedYear && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">
                    Est. {college.establishedYear}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Credentials & Identifiers */}
            <div className="space-y-6">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/10 pb-2">Credentials</h4>
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">AICTE Number</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{college.aicteNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">UGC Recognition</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{college.ugcRecognition || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Affiliation Code</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{college.affiliationCode || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Affiliated Board/University</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{college.affiliatedBoard || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">GSTIN</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{college.gstin || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Contact & Location */}
            <div className="space-y-6">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/10 pb-2">Contact & Location</h4>
              <div className="space-y-6">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Official Email</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{college.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Official Phone</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{college.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Website</p>
                    {college.websiteUrl ? (
                      <a href={college.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 hover:underline">{college.websiteUrl}</a>
                    ) : (
                      <p className="text-sm font-medium text-slate-900 dark:text-white">N/A</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Address</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {[college.streetAddress, college.city, college.district, college.state, college.country, college.pincode].filter(Boolean).join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/10 pb-2">Subscription Details</h4>
              <div className={`border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 ${college.subscriptionPlan ? (college.subscriptionStatus === 'Expired' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20') : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${college.subscriptionPlan ? (college.subscriptionStatus === 'Expired' ? 'bg-red-100 dark:bg-red-500/20' : 'bg-emerald-100 dark:bg-emerald-500/20') : 'bg-slate-100 dark:bg-white/10'}`}>
                    <Award className={`w-6 h-6 ${college.subscriptionPlan ? (college.subscriptionStatus === 'Expired' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400') : 'text-slate-400 dark:text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {college.subscriptionPlan ? `${college.subscriptionPlan} Plan` : 'No Active Plan'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {college.subscriptionPlan 
                        ? `${college.subscriptionStatus} • Valid until ${new Date(college.subscriptionEndDate).toLocaleDateString()}` 
                        : 'Contact Zuna global to upgrade.'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onManageSubscription(college)}
                  className="px-4 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  Manage Plan
                </button>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};



const ManageSubscriptionModal = ({ college, onClose, onSuccess }) => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      plan: college.subscriptionPlan || 'Free',
      status: college.subscriptionStatus || 'Active',
      endDate: college.subscriptionEndDate ? new Date(college.subscriptionEndDate).toISOString().split('T')[0] : ''
    }
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'colleges', college.id), {
        subscriptionPlan: data.plan,
        subscriptionStatus: data.status,
        subscriptionEndDate: data.endDate
      });
      toast.success("Subscription updated successfully!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update subscription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Manage Plan</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Subscription Plan</label>
            <select {...register("plan")} className="w-full bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-500">
              <option value="Free">Free Plan</option>
              <option value="Basic">Basic Plan</option>
              <option value="Premium">Premium Plan</option>
              <option value="Enterprise">Enterprise Plan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Status</label>
            <select {...register("status")} className="w-full bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-500">
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Valid Until</label>
            <input type="date" {...register("endDate", { required: true })} className="w-full bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-500" />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Subscription'}
          </button>
        </form>
      </motion.div>
    </div>,
    document.body
  );
};

export default SuperColleges;
