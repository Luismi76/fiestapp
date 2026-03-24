import { redirect } from 'next/navigation';

export default function EvaluacionesRedirect() {
  redirect('/admin/moderacion?tab=evaluaciones');
}
