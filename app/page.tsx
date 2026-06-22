import { redirect } from 'next/navigation';

export default function IndexPage() {
  // Kullanıcı ana sayfaya geldiği anda otomatik olarak /clients sayfasına uçuruyoruz
  redirect('/clients');
}