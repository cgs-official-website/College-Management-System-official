import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '../api/client';
import { toast } from '../utils/toast';
import { syncChannel } from '../utils/syncChannel';

/**
 * Web: hooks/useStudentPortal.js  (react-query)  ->  mobile port without react-query.
 *
 * Every read hook returns the already-unwrapped payload:
 *   { data, isLoading, isRefreshing, error, refetch }
 * where `data` = response.data  (web pages read `res.data.data`, here it is just `data`).
 *
 * - module-level cache  -> screen opens instantly with last data, then refreshes silently
 * - `pollMs`            -> same as web refetchInterval (paused while the app is in background)
 * - syncChannel topic   -> `syncChannel.publish('student')` or `publish('student:fees')` refetches
 */

const cache = new Map<string, any>();

/** Call on logout so the next student never sees the previous student's data. */
export const clearStudentPortalCache = () => cache.clear();

const errMsg = (err: any, fallback: string) => err?.data?.error?.message || err?.message || fallback;

interface ResourceOptions {
  /** auto refetch interval in ms (web: 15000 for timetable / fees / notices / placements) */
  pollMs?: number;
  /** syncChannel module name -> `student:<topic>` */
  topic?: string;
  /** skip the request (e.g. hostel screen for a day scholar) */
  enabled?: boolean;
  /** keep the whole response body ({ data, meta }) instead of unwrapping `data` (needed for paginated lists) */
  raw?: boolean;
}

function useStudentResource<T = any>(path: string, initial: T, opts: ResourceOptions = {}) {
  const { pollMs, topic, enabled = true, raw = false } = opts;
  const [data, setData] = useState<T>(cache.has(path) ? cache.get(path) : initial);
  const [isLoading, setIsLoading] = useState(enabled && !cache.has(path));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchData = useCallback(
    async (silent = false, showIndicator = false) => {
      if (!enabled) {
        setIsLoading(false);
        return;
      }
      if (!silent && !cache.has(path)) setIsLoading(true);
      // only a manual pull-to-refresh shows the spinner; background polling / sync stay invisible
      if (showIndicator) setIsRefreshing(true);
      try {
        const res = await api.get<any>(path);
        const payload = !raw && res && typeof res === 'object' && 'data' in res ? res.data : res;
        cache.set(path, payload);
        if (mounted.current) {
          // keep the same reference when nothing changed -> no re-render / flicker on silent polls
          setData((prev: T) => (JSON.stringify(prev) === JSON.stringify(payload) ? prev : payload));
          setError(null);
        }
      } catch (err: any) {
        if (mounted.current) setError(errMsg(err, 'Failed to load data'));
        if (!silent) toast.error(errMsg(err, 'Failed to load data'));
      } finally {
        if (mounted.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [path, enabled, raw],
  );

  // initial load + reload when path changes
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // sync with other parts of the app
  useEffect(() => {
    const offAll = syncChannel.subscribe('student', () => void fetchData(true));
    const offTopic = topic ? syncChannel.subscribe(`student:${topic}`, () => void fetchData(true)) : () => {};
    return () => {
      offAll();
      offTopic();
    };
  }, [fetchData, topic]);

  // polling (only while the app is in foreground)
  useEffect(() => {
    if (!pollMs || !enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => void fetchData(true), pollMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void fetchData(true);
        start();
      } else {
        stop();
      }
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [pollMs, enabled, fetchData]);

  const refetch = useCallback(() => fetchData(true, true), [fetchData]);

  return { data, isLoading, isRefreshing, error, refetch };
}

/** Small helper for mutations: toggles a loading flag, shows toasts, re-throws so screens can react. */
function useMutationState() {
  const [pending, setPending] = useState(false);
  const run = async <R,>(fn: () => Promise<R>, successMsg?: string, failMsg = 'Something went wrong'): Promise<R> => {
    setPending(true);
    try {
      const out = await fn();
      if (successMsg) toast.success(successMsg);
      return out;
    } catch (err: any) {
      toast.error(errMsg(err, failMsg));
      throw err;
    } finally {
      setPending(false);
    }
  };
  return { pending, run };
}

const invalidate = (...topics: string[]) => {
  topics.forEach((t) => {
    cache.delete(`/student/${t}`);
    syncChannel.publish(`student:${t}`);
  });
};

/* ----------------------------------------------------------------------------------------- */
/* Profile / dashboard                                                                       */
/* ----------------------------------------------------------------------------------------- */

export const useStudentProfile = () => useStudentResource<any>('/student/profile', null, { topic: 'profile' });

export const useStudentDashboard = () => useStudentResource<any>('/student/dashboard', null, { topic: 'dashboard' });

/* ----------------------------------------------------------------------------------------- */
/* Batch 1 - Courses / Assignments / Attendance                                              */
/* ----------------------------------------------------------------------------------------- */

export const useStudentCourses = () => useStudentResource<any[]>('/student/courses', [], { topic: 'courses' });

export const useStudentAssignments = () => {
  const query = useStudentResource<any[]>('/student/assignments', [], { topic: 'assignments' });
  const { pending, run } = useMutationState();

  const submitAssignment = ({ assignmentId, fileUrl }: { assignmentId: string; fileUrl: string }) =>
    run(
      async () => {
        const res = await api.post<any>(`/student/assignments/${assignmentId}/submit`, { fileUrl });
        invalidate('assignments', 'dashboard');
        return res?.data ?? res;
      },
      'Assignment submitted successfully!',
      'Failed to submit assignment',
    );

  return { ...query, submitAssignment, isSubmitting: pending };
};

export const useStudentAttendance = () =>
  useStudentResource<any>(
    '/student/attendance',
    { percentage: 100, totalDays: 0, presentDays: 0, absentDays: 0, records: [] },
    { topic: 'attendance' },
  );

export interface LeavePayload {
  leaveType?: string;
  fromDate: string;
  toDate: string;
  reason: string;
  proofFileName?: string;
  proofMimeType?: string;
  proofDataUrl?: string;
}

export const useStudentLeaveRequests = () => {
  const query = useStudentResource<any[]>('/student/leave-requests', [], { topic: 'leave-requests' });
  const { pending, run } = useMutationState();

  const createLeaveRequest = (payload: LeavePayload) =>
    run(
      async () => {
        const res = await api.post<any>('/student/leave-requests', payload);
        invalidate('leave-requests');
        return res?.data ?? res;
      },
      'Leave application submitted successfully!',
      'Failed to submit leave application',
    );

  return { ...query, createLeaveRequest, isCreating: pending };
};

/* ----------------------------------------------------------------------------------------- */
/* Batch 2 - Timetable / Exams / Fees / Notices                                              */
/* ----------------------------------------------------------------------------------------- */

export const useStudentTimetable = () =>
  useStudentResource<any[]>('/student/timetable', [], { topic: 'timetable', pollMs: 15000 });

export const useStudentExams = () => useStudentResource<any[]>('/student/exams', [], { topic: 'exams' });

export const useStudentResults = () => useStudentResource<any[]>('/student/results', [], { topic: 'results' });

export const useStudentFees = () => useStudentResource<any>('/student/fees', null, { topic: 'fees', pollMs: 15000 });

export const usePayStudentFee = () => {
  const { pending, run } = useMutationState();
  const payFee = ({ feeId, amount, paymentMethod }: { feeId: string; amount: number; paymentMethod: string }) =>
    run(
      async () => {
        const res = await api.post<any>('/student/fees/pay', { feeId, amount, paymentMethod });
        invalidate('fees', 'dashboard');
        return res?.data ?? res;
      },
      undefined,
      'Payment failed',
    );
  return { payFee, isPaying: pending };
};

export const useStudentNotices = () =>
  useStudentResource<any[]>('/student/notices', [], { topic: 'notices', pollMs: 15000 });

/* ----------------------------------------------------------------------------------------- */
/* Batch 3 - Library / Hostel / Transport / Placements                                       */
/* ----------------------------------------------------------------------------------------- */

export const useStudentLibrary = (search = '', category = '') => {
  const params: string[] = [];
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (category) params.push(`category=${encodeURIComponent(category)}`);
  const qs = params.length ? `?${params.join('&')}` : '';
  return useStudentResource<any[]>(`/student/library${qs}`, [], { topic: 'library' });
};

export const useStudentMyBooks = () => useStudentResource<any>('/student/library/my-books', null, { topic: 'library' });

export const useStudentBookHistory = (page = 1) =>
  useStudentResource<any>(`/student/library/my-history?page=${page}&limit=10`, null, { topic: 'library', raw: true });

export const useStudentPlacements = () =>
  useStudentResource<any[]>('/student/placements', [], { topic: 'placements', pollMs: 15000 });

export const useStudentHostel = (enabled = true) =>
  useStudentResource<any>('/student/hostel', null, { topic: 'hostel', enabled });

export const useStudentTransport = (enabled = true) =>
  useStudentResource<any>('/student/transport', null, { topic: 'transport', enabled });

/* ----------------------------------------------------------------------------------------- */
/* Batch 4 - Complaints / Documents / Settings                                               */
/* ----------------------------------------------------------------------------------------- */

export const useStudentComplaints = () => {
  const query = useStudentResource<any[]>('/student/complaints', [], { topic: 'complaints' });
  const { pending, run } = useMutationState();

  const createComplaint = (payload: any) =>
    run(
      async () => {
        const res = await api.post<any>('/student/complaints', payload);
        invalidate('complaints');
        return res?.data ?? res;
      },
      'Complaint submitted successfully!',
      'Failed to submit complaint',
    );

  return { ...query, createComplaint, isCreating: pending };
};

export const useStudentDocuments = () => {
  const query = useStudentResource<any[]>('/student/documents', [], { topic: 'documents' });
  const upload = useMutationState();
  const remove = useMutationState();

  const uploadDocument = (payload: any) =>
    upload.run(
      async () => {
        const res = await api.post<any>('/student/documents', payload);
        invalidate('documents');
        return res?.data ?? res;
      },
      'Document uploaded successfully!',
      'Failed to upload document',
    );

  const deleteDocument = (id: string) =>
    remove.run(
      async () => {
        const res = await api.delete<any>(`/student/documents/${id}`);
        invalidate('documents');
        return res?.data ?? res;
      },
      'Document deleted',
      'Failed to delete document',
    );

  return { ...query, uploadDocument, deleteDocument, isUploading: upload.pending, isDeleting: remove.pending };
};

/**
 * Profile photo. Backend accepts multipart OR a base64 / data-URL string (`profileImage`),
 * so mobile sends the data URL (no multipart header issues in React Native).
 */
export const useStudentProfileImage = () => {
  const upload = useMutationState();
  const remove = useMutationState();

  const uploadProfileImage = (dataUrl: string) =>
    upload.run(
      async () => {
        const res = await api.post<any>('/student/profile/image', { profileImage: dataUrl });
        invalidate('profile');
        return res?.data ?? res;
      },
      'Profile photo updated',
      'Failed to upload profile photo',
    );

  const deleteProfileImage = () =>
    remove.run(
      async () => {
        const res = await api.delete<any>('/student/profile/image');
        invalidate('profile');
        return res?.data ?? res;
      },
      'Profile photo removed',
      'Failed to remove profile photo',
    );

  return { uploadProfileImage, deleteProfileImage, isUploading: upload.pending, isDeleting: remove.pending };
};