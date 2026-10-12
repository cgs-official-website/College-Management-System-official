import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useDepartments } from '../../hooks/useDepartments';

export default function CourseFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading, embedded = false }: any) {
  const { departments } = useDepartments();
  const [v, setV] = useState<any>({ name:'', code:'', semester:'8', credits:'160', departmentId:'' });
  useEffect(() => { if (isOpen) setV({ name:initialData?.name||'', code:initialData?.code||'', semester:String(initialData?.semester||8), credits:String(initialData?.credits??160), departmentId:initialData?.departmentId||'' }); }, [isOpen,initialData]);
  const set=(k:string)=>(x:string)=>setV((p:any)=>({...p,[k]:x}));
  const content=<><Input label="Program / Course Name" required value={v.name} onChangeText={set('name')}/><Input label="Course Code" required value={v.code} onChangeText={set('code')} autoCapitalize="characters"/><Select label="Department" required value={v.departmentId} onChange={set('departmentId')} options={departments.map((d:any)=>({value:d.id,label:`${d.name} (${d.code})`}))}/><Input label="Total Semesters / Years" keyboardType="number-pad" value={v.semester} onChangeText={set('semester')}/><Input label="Credits" keyboardType="number-pad" value={v.credits} onChangeText={set('credits')}/></>;
  const submit=()=>onSubmit({...v,semester:Number(v.semester)||1,credits:Number(v.credits)||0});
  const footer=<View style={styles.footer}><Button title="Cancel" variant="outline" onPress={onClose} style={{flex:1}}/><View style={{width:10}}/><Button title={initialData?'Save Changes':'Create Course'} loading={isLoading} onPress={submit} style={{flex:1}}/></View>;
  if(embedded)return <View>{content}{footer}</View>;
  return <SheetModal visible={isOpen} onClose={onClose} title={initialData?'Edit Course':'Add Course'} footer={footer}>{content}</SheetModal>;
}
const styles=StyleSheet.create({footer:{flexDirection:'row',marginTop:6}});
