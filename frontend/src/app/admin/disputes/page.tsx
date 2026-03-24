import { redirect } from 'next/navigation';

export default function DisputesRedirect() {
  redirect('/admin/moderacion?tab=disputas');
}
