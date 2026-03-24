import { redirect } from 'next/navigation';

export default function ExperiencesRedirect() {
  redirect('/admin/gestion?tab=experiencias');
}
