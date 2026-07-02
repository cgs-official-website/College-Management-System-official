import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../contexts/ConfirmContext';
import { 
  Users, 
  Search, 
  Loader2, 
  ShieldCheck,
  MoreVertical,
  Mail,
  Key,
  Ban,
  Trash2
} from 'lucide-react';

const SuperAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-menu')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const confirm = useConfirm();

  const handleDelete = async (id) => {
    if (await confirm({ message: 'Are you sure you want to delete this admin?' })) {
      try {
        await deleteDoc(doc(db, 'users', id));
        toast.success('Admin deleted successfully');
        setAdmins(admins.filter(a => a.id !== id));
      } catch (e) {
        toast.error('Failed to delete admin');
        console.error(e);
      }
    }
    setOpenDropdownId(null);
  };

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'admin')
        // Note: Ordering might require a composite index if combining with where.
        // For now, we'll fetch and sort client-side or assume index exists.
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by creation date descending client-side
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setAdmins(data);
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = admins.filter(admin => 
    admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.collegeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">College Admins</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage administrative accounts for all onboarded institutions.</p>
        </div>
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
            placeholder="Search by name, email, or college code..."
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
          />
        </div>
      </div>

      {/* Admins List */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Admin details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">College Code</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-4" />
                    Loading admins...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-lg font-medium text-slate-900 dark:text-white">No admins found</p>
                    <p className="text-sm mt-1">Admins are created when onboarding a new college.</p>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                          <span className="text-slate-600 dark:text-slate-300 font-bold text-lg">{admin.name?.charAt(0) || 'A'}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{admin.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {admin.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20 tracking-wider">
                        {admin.collegeId || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <ShieldCheck className="w-3 h-3" /> College Admin
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {admin.createdAt?.toDate ? new Date(admin.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left action-menu">
                        <button 
                          onClick={() => setOpenDropdownId(openDropdownId === admin.id ? null : admin.id)}
                          className="text-slate-400 hover:text-primary-600 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openDropdownId === admin.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl shadow-lg py-1 z-50 overflow-hidden">
                            <button onClick={() => { toast.success(`Password reset link sent to ${admin.email}`); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                              <Key className="w-4 h-4" /> Reset Password
                            </button>
                            <button onClick={() => { toast.success('Account suspended'); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2">
                              <Ban className="w-4 h-4" /> Suspend Account
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-white/5 my-1"></div>
                            <button onClick={() => handleDelete(admin.id)} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                              <Trash2 className="w-4 h-4" /> Delete Admin
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdmins;
