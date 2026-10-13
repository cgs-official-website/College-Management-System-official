import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCourses } from '../../hooks/useCourses';
import { useDepartments } from '../../hooks/useDepartments';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { fontSize, fontWeight } from '../../theme/typography';

export default function AdmissionFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading, embedded = false }: any) {
  const { colors } = useTheme();
  const { courses } = useCourses();
  const { departments } = useDepartments();
  const [v, setV] = useState<any>({});
  useEffect(() => {
    if (isOpen) setV({
      firstName: initialData?.firstName || '', lastName: initialData?.lastName || '',
      email: initialData?.email || '', phone: initialData?.phone || '',
      courseId: initialData?.courseId || '', departmentId: initialData?.departmentId || '',
      previousSchool: initialData?.previousSchool || '', status: initialData?.status || 'Pending',
      residenceType: initialData?.residenceType || 'Day Scholar',
    });
  }, [isOpen, initialData]);
  const set = (k: string) => (x: string) => setV((p: any) => ({ ...p, [k]: x }));
  const content = (
    <>
      <Text style={[styles.section, { color: colors.text }]}>Applicant Information</Text>
      <Input label="First Name" required value={v.firstName} onChangeText={set('firstName')} />
      <Input label="Last Name" value={v.lastName} onChangeText={set('lastName')} />
      <Input label="Email" keyboardType="email-address" autoCapitalize="none" value={v.email} onChangeText={set('email')} />
      <Input label="Phone" keyboardType="phone-pad" value={v.phone} onChangeText={set('phone')} />
      <Input label="Previous Institution" value={v.previousSchool} onChangeText={set('previousSchool')} />
      <Text style={[styles.section, { color: colors.text }]}>Academic Details</Text>
      <Select label="Department" value={v.departmentId} onChange={set('departmentId')} options={departments.map((d: any) => ({ value: d.id, label: `${d.name} (${d.code})` }))} />
      <Select label="Course / Program" value={v.courseId} onChange={set('courseId')} options={courses.map((c: any) => ({ value: c.id, label: `${c.name} (${c.code})` }))} />
      <Select label="Residence Type" value={v.residenceType} onChange={set('residenceType')} options={[{ value: 'Day Scholar', label: 'Day Scholar' }, { value: 'Hosteller', label: 'Hosteller' }]} />
      {initialData ? <Select label="Status" value={v.status} onChange={set('status')} options={[{value:'Pending',label:'Pending'},{value:'Approved',label:'Approved'},{value:'Rejected',label:'Rejected'}]} /> : null}
    </>
  );
  const submit = () => onSubmit({
    ...v,
    applicantName: `${v.firstName || ''} ${v.lastName || ''}`.trim(),
    marksheetDetails: { email: v.email || '', phone: v.phone || '', previousSchool: v.previousSchool || '', courseId: v.courseId || null, courseName: courses.find((c:any)=>c.id===v.courseId)?.name || '' },
  });
  const footer = <View style={styles.footer}><Button title="Cancel" variant="outline" onPress={onClose} style={{flex:1}}/><View style={{width:10}}/><Button title={initialData ? 'Save Changes' : 'Create Application'} loading={isLoading} onPress={submit} style={{flex:1}}/></View>;
  if (embedded) return <View>{content}{footer}</View>;
  return <SheetModal visible={isOpen} onClose={onClose} title={initialData ? 'Edit Admission' : 'New Admission'} tall footer={footer}>{content}</SheetModal>;
}
const styles=StyleSheet.create({section:{fontSize:fontSize.md,fontWeight:fontWeight.bold,marginTop:6,marginBottom:12},footer:{flexDirection:'row',marginTop:6}});
