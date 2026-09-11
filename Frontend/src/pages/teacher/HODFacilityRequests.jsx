import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Building, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  Send
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useInfrastructure } from '../../hooks/useInfrastructure';
import { useDepartments } from '../../hooks/useDepartments';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';

export default function HODFacilityRequests() {
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  
  const { 
    facilities, 
    requests, 
    isLoading, 
    isRequestsLoading, 
    createRequest, 
    isSubmittingRequest 
  } = useInfrastructure(collegeId);

  const { departments } = useDepartments();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      facilityId: '',
      departmentId: '',
      eventName: '',
      purpose: '',
      eventDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '12:00',
      expectedAttendees: 50,
      specialRequirements: ''
    }
  });

  const selectedFacilityId = watch('facilityId');
  const selectedFacility = facilities.find(f => f.id === selectedFacilityId);

  const filteredRequests = requests.filter(req => {
    const facilityName = (req.facility?.name || '').toLowerCase();
    const eventName = (req.eventName || '').toLowerCase();
    const q = searchTerm.toLowerCase();

    const matchesSearch = facilityName.includes(q) || eventName.includes(q);
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenModal = () => {
    reset({
      facilityId: facilities[0]?.id || '',
      departmentId: '',
      eventName: '',
      purpose: '',
      eventDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '12:00',
      expectedAttendees: 50,
      specialRequirements: ''
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      await createRequest(data);
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  // Only facilities created by the college admin are listed in the dropdown
  const facilityOptions = facilities.map(fac => ({
    value: fac.id,
    label: `${fac.name} (${fac.type} - Capacity: ${fac.capacity} seats, ${fac.location || 'Campus'})`
  }));

  const departmentOptions = departments.map(d => ({
    value: d.id,
    label: `${d.name} (${d.code})`
  }));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#043324] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-primary-500/10">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-primary-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 backdrop-blur-md border border-primary-500/20 text-xs font-semibold text-primary-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            Department Resource & Venue Reservation
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Facility & Infrastructure Requests</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Request institutional auditoriums, seminar halls, and smart labs for departmental symposiums, guest lectures, and academic events.
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          <button 
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Request Facility
          </button>
        </div>
      </div>

      {/* Available Admin Facilities Quick Strip */}
      <div className="bg-white dark:bg-[#0A0F1C] p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Admin Registered Facilities ({facilities.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Dynamically created by Institutional Administration</span>
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto py-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 w-48 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse shrink-0" />
            ))}
          </div>
        ) : facilities.length === 0 ? (
          <p className="text-xs text-slate-500">No facilities registered by college administration yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {facilities.map((fac) => (
              <div 
                key={fac.id} 
                className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-2xl flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{fac.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{fac.type} • {fac.capacity} seats</p>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-md border border-emerald-200/40">
                  {fac.status || 'active'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative min-w-[160px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Status ({requests.length})</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="relative flex-1 sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input 
            type="text"
            placeholder="Search event name, facility..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Requests History List */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Department Request History & Status</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Event Details</th>
                <th className="py-3.5 px-4">Requested Facility</th>
                <th className="py-3.5 px-4">Date & Time Slot</th>
                <th className="py-3.5 px-4">Attendees</th>
                <th className="py-3.5 px-4">Status & Admin Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isRequestsLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">Loading requests...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No facility requests submitted yet. Click "Request Facility" above to create one.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => {
                  const dateStr = req.eventDate ? new Date(req.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">{req.eventName}</div>
                        {req.purpose && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{req.purpose}</p>}
                        {req.specialRequirements && (
                          <div className="text-[11px] text-primary-600 dark:text-primary-400 font-medium mt-1">
                            Equipment: {req.specialRequirements}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-500/20">
                          <Building className="w-3 h-3" />
                          {req.facility?.name || 'Facility'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-primary-500" />
                          <span>{dateStr}</span>
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
                        <div className="space-y-1">
                          {req.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Approved by Admin
                            </span>
                          ) : req.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 animate-pulse">
                              <Clock className="w-3 h-3" /> Awaiting Admin Approval
                            </span>
                          )}

                          {req.adminRemarks && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                              "{req.adminRemarks}"
                            </p>
                          )}
                        </div>
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
            currentPage={currentPage}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            className="mt-4"
          />
        )}
      </div>

      {/* Request Facility Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Raise Facility & Infrastructure Request"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="p-3.5 bg-primary-50/60 dark:bg-primary-500/5 border border-primary-200/60 dark:border-primary-500/20 rounded-2xl text-xs text-primary-800 dark:text-primary-300">
            <strong>Institutional Policy:</strong> This request will be instantly dispatched to the College Administration. You will receive an in-app alert notification as soon as the Admin approves or provides feedback.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Select Facility / Venue *"
              {...register('facilityId', { required: 'Please select a facility' })}
              error={errors.facilityId?.message}
              options={[
                { value: '', label: 'Select admin-created facility...' },
                ...facilityOptions
              ]}
            />

            <Select
              label="Department *"
              {...register('departmentId')}
              options={[
                { value: '', label: 'Auto-detect my department...' },
                ...departmentOptions
              ]}
            />
          </div>

          {selectedFacility && (
            <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Location: <strong className="text-slate-900 dark:text-white">{selectedFacility.location || 'Campus'}</strong></span>
              <span>Max Capacity: <strong className="text-slate-900 dark:text-white">{selectedFacility.capacity} seats</strong></span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Event Name / Title *"
              placeholder="e.g. Annual National AI & Data Science Symposium"
              {...register('eventName', { required: 'Event name is required' })}
              error={errors.eventName?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Event Date *"
              type="date"
              {...register('eventDate', { required: 'Date is required' })}
              error={errors.eventDate?.message}
            />
            <Input
              label="Start Time *"
              type="time"
              {...register('startTime', { required: 'Start time is required' })}
            />
            <Input
              label="End Time *"
              type="time"
              {...register('endTime', { required: 'End time is required' })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Expected Attendees Count"
              type="number"
              placeholder="e.g. 120"
              {...register('expectedAttendees')}
            />

            <Input
              label="Special Equipment Requirements"
              placeholder="e.g. 2 Wireless Mics, Stage Projector, AC"
              {...register('specialRequirements')}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Event Purpose / Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe the objective of this session, chief guests, or target student batches..."
              {...register('purpose')}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmittingRequest} className="bg-primary-600 hover:bg-primary-700 text-white">
              <Send className="w-4 h-4 mr-2" />
              Submit Request to Admin
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
