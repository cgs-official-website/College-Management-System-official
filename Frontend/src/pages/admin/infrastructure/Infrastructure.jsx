import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Building, 
  Users, 
  MapPin, 
  CheckCircle, 
  Wrench, 
  Edit, 
  Trash2, 
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertCircle,
  GraduationCap,
  Layers
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useInfrastructure } from '../../../hooks/useInfrastructure';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Pagination } from '../../../components/ui/Pagination';
import { FacilityFormModal } from './FacilityFormModal';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { Modal } from '../../../components/ui/Modal';

export default function Infrastructure() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  
  const { 
    facilities, 
    requests,
    isLoading, 
    isRequestsLoading,
    addFacility, 
    updateFacility, 
    deleteFacility, 
    reviewRequest,
    isAdding, 
    isUpdating,
    isReviewing 
  } = useInfrastructure(collegeId);
  
  const [activeTab, setActiveTab] = useState('facilities'); // 'facilities' | 'requests'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);

  // Review Modal State
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [reviewAction, setReviewAction] = useState('approved');

  // Pagination states
  const [facilityPage, setFacilityPage] = useState(1);
  const [facilityPageSize, setFacilityPageSize] = useState(10);

  const [requestPage, setRequestPage] = useState(1);
  const [requestPageSize, setRequestPageSize] = useState(10);

  // Filtered Facilities
  const filteredFacilities = facilities.filter(fac => 
    (fac.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (fac.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (fac.building || fac.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedFacilities = filteredFacilities.slice(
    (facilityPage - 1) * facilityPageSize, 
    facilityPage * facilityPageSize
  );

  // Filtered Requests
  const filteredRequests = requests.filter(req => {
    const facilityName = (req.facility?.name || '').toLowerCase();
    const eventName = (req.eventName || '').toLowerCase();
    const deptName = (req.department?.name || '').toLowerCase();
    const requesterName = (req.requester?.name || req.requester?.email || '').toLowerCase();
    const q = searchTerm.toLowerCase();

    const matchesSearch = facilityName.includes(q) || eventName.includes(q) || deptName.includes(q) || requesterName.includes(q);
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const paginatedRequests = filteredRequests.slice(
    (requestPage - 1) * requestPageSize,
    requestPage * requestPageSize
  );

  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  const handleOpenAdd = () => {
    setEditingFacility(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (facility) => {
    setEditingFacility(facility);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to remove this facility from the registry?" })) {
      await deleteFacility(id);
    }
  };

  const handleSubmitFacility = async (data) => {
    try {
      if (editingFacility) {
        await updateFacility({ id: editingFacility.id, data });
      } else {
        await addFacility(data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenReview = (request, action = 'approved') => {
    setReviewingRequest(request);
    setReviewAction(action);
    setAdminRemarks('');
  };

  const handleConfirmReview = async () => {
    if (!reviewingRequest) return;
    try {
      await reviewRequest({
        id: reviewingRequest.id,
        status: reviewAction,
        adminRemarks: adminRemarks.trim()
      });
      setReviewingRequest(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#043324] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-primary-500/10">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-primary-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 backdrop-blur-md border border-primary-500/20 text-xs font-semibold text-primary-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            Campus Asset & Facility Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Infrastructure & Facilities</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Manage auditoriums, seminar halls, laboratories, and review departmental reservation requests.
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Facility
          </button>
        </div>
      </div>

      {/* Tabs & Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-[#0A0F1C] p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-max">
            <button 
              onClick={() => setActiveTab('facilities')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'facilities' 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Facilities Registry ({facilities.length})
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`relative px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'requests' 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>HOD Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {activeTab === 'requests' && (
            <div className="relative min-w-[160px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Status</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input 
              type="text"
              placeholder={activeTab === 'facilities' ? "Search facility name, type..." : "Search event, HOD, venue..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* 1. Facilities Registry Grid */}
      {activeTab === 'facilities' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-48 bg-slate-100 dark:bg-white/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredFacilities.length === 0 ? (
            <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-12 sm:p-16 text-center max-w-xl mx-auto shadow-sm">
              <div className="w-16 h-16 bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600 dark:text-primary-400">
                <Building className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No facilities registered</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Register auditoriums, seminar halls, or computing labs to allow HODs to request bookings.
              </p>
              <button 
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-primary-600/25"
              >
                <Plus className="w-4 h-4" />
                Add Facility
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginatedFacilities.map((fac) => (
                  <div 
                    key={fac.id} 
                    className="group relative bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-primary-500/40 dark:hover:border-primary-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity" />

                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200/60 dark:border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shadow-sm">
                            <Building className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{fac.name}</h3>
                            <span className="inline-block mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded border border-primary-200/40 dark:border-primary-500/20">
                              {fac.type}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenEdit(fac)} 
                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-primary-50 dark:hover:bg-primary-500/20 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 border border-slate-200/60 dark:border-white/5 transition-colors" 
                            title="Edit Facility"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(fac.id)} 
                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200/60 dark:border-white/5 transition-colors" 
                            title="Delete Facility"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          <MapPin className="w-4 h-4 text-rose-500" />
                          <span>{fac.building || fac.location || 'Main Campus'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          <Users className="w-4 h-4 text-amber-500" />
                          <span>Capacity: <strong className="text-slate-900 dark:text-white font-bold">{fac.capacity || 0} seats</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                      {fac.status === 'operational' || fac.status === 'active' ? (
                        <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" /> Available / Operational
                        </div>
                      ) : fac.status === 'maintenance' ? (
                        <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-500/20">
                          <Wrench className="w-3.5 h-3.5" /> Maintenance
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-200/60 dark:border-rose-500/20">
                          <Building className="w-3.5 h-3.5" /> Closed
                        </div>
                      )}

                      {fac.features && (
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {fac.features}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                totalItems={filteredFacilities.length}
                currentPage={facilityPage}
                pageSize={facilityPageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={setFacilityPage}
                onPageSizeChange={setFacilityPageSize}
                className="border border-slate-200/80 dark:border-white/10 rounded-2xl"
              />
            </div>
          )}
        </>
      )}

      {/* 2. Facility Requests & Approvals */}
      {activeTab === 'requests' && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Department Facility Requests</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review permission requests submitted by department HODs for institutional resources.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Event & Purpose</th>
                  <th className="py-3.5 px-4">Requested Facility</th>
                  <th className="py-3.5 px-4">Department & Requester</th>
                  <th className="py-3.5 px-4">Date & Slot</th>
                  <th className="py-3.5 px-4">Attendees</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                {isRequestsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">Loading requests...</td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">No facility requests found for selected criteria.</td>
                  </tr>
                ) : (
                  paginatedRequests.map((req) => {
                    const eventDateStr = req.eventDate ? new Date(req.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
                    
                    return (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-extrabold text-slate-900 dark:text-white">{req.eventName}</div>
                          {req.purpose && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{req.purpose}</p>}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-500/20">
                            <Building className="w-3 h-3" />
                            {req.facility?.name || 'Facility'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {req.department?.name || 'Department'}
                          </div>
                          <div className="text-[11px] text-slate-500">{req.requester?.name || req.requester?.email || 'HOD'}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-primary-500" />
                            <span>{eventDateStr}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{req.startTime} - {req.endTime}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-xs text-slate-700 dark:text-slate-300">
                          {req.expectedAttendees || 0} attendees
                        </td>
                        <td className="py-4 px-4">
                          {req.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          ) : req.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 animate-pulse">
                              <Clock className="w-3 h-3" /> Pending Review
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenReview(req, 'approved')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenReview(req, 'rejected')}
                                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg border border-rose-200/60 dark:border-rose-500/20 transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">
                              {req.adminRemarks ? `Remarks: ${req.adminRemarks}` : 'Reviewed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredRequests.length > 0 && (
            <Pagination
              totalItems={filteredRequests.length}
              currentPage={requestPage}
              pageSize={requestPageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={setRequestPage}
              onPageSizeChange={setRequestPageSize}
              className="mt-4"
            />
          )}
        </div>
      )}

      {/* Facility Form Modal */}
      <FacilityFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmitFacility}
        initialData={editingFacility}
        isLoading={isAdding || isUpdating}
      />

      {/* Admin Review Action Modal */}
      {reviewingRequest && (
        <Modal
          isOpen={Boolean(reviewingRequest)}
          onClose={() => setReviewingRequest(null)}
          title={`${reviewAction === 'approved' ? 'Approve' : 'Reject'} Facility Request`}
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400">Facility:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{reviewingRequest.facility?.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400">Event:</span>
                <span className="font-bold text-slate-900 dark:text-white">{reviewingRequest.eventName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400">Requested by:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{reviewingRequest.requester?.name || reviewingRequest.requester?.email} ({reviewingRequest.department?.name})</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Admin Remarks / Note (Optional)
              </label>
              <textarea
                rows={3}
                placeholder={reviewAction === 'approved' ? "e.g. Approved with AV system support" : "e.g. Hall reserved for annual inspection"}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <Button variant="secondary" onClick={() => setReviewingRequest(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReview}
                isLoading={isReviewing}
                className={reviewAction === 'approved' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
              >
                Confirm {reviewAction === 'approved' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
