'use client';

import { useState } from 'react';
import AddClientForm from './add-client-form';
import ClientListTable from './client-list-table';

interface Client {
  id: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  created_at: string;
}

export default function ClientManager({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients);

  // Anlık Ekleme
  const handleClientAdded = (newClient: Client) => {
    setClients((prev) => [newClient, ...prev]);
  };

  // Anlık Güncelleme (Bilgi değiştirme)
  const handleClientUpdated = (updatedClient: Client) => {
    setClients((prev) =>
      prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
    );
  };

  // Anlık Silme
  const handleClientDeleted = (deletedId: string) => {
    setClients((prev) => prev.filter((c) => c.id !== deletedId));
  };

  return (
    <div className="space-y-6">
      <div className="w-full">
        <AddClientForm onClientAdded={handleClientAdded} />
      </div>
      <div className="w-full">
        <ClientListTable 
          clients={clients} 
          onClientDeleted={handleClientDeleted} 
          onClientUpdated={handleClientUpdated}
        />
      </div>
    </div>
  );
}