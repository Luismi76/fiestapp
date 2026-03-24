import { redirect } from 'next/navigation';

export default function VerificationsRedirect() {
  redirect('/admin/moderacion?tab=verificaciones');
}
