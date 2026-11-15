import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '@/lib/api';
import { confirm, notify } from '@/lib/platform';
import { useStore } from '@/store/useStore';

export class ImportDeclined extends Error {}

/**
 * Runs right after logging in, before the app opens:
 * - data made by the old offline-only app is offered for upload to an empty server;
 * - if the server already has data, it wins (the phone's old data is kept as a backup);
 * - then the cache is filled from the server.
 */
export async function firstSync(): Promise<void> {
  const store = useStore.getState();
  let snapshot = await api.sync();
  const local = store.localSnapshot();
  const hasLocalData = store.source === 'local' && (local.people.length > 0 || local.tickets.length > 0);

  if (hasLocalData) {
    // Never lose data: keep a copy of what was on the phone before touching it.
    await AsyncStorage.setItem(`babi-app-store-backup-${Date.now()}`, JSON.stringify(local));

    const serverEmpty = !snapshot.people.length && !snapshot.tickets.length && !snapshot.seasons.length;
    if (serverEmpty) {
      const ok = await confirm({
        title: 'Të ngarkohen të dhënat në server?',
        message:
          `Në këtë telefon janë ${local.people.length} persona dhe ${local.tickets.length} fletëpagesa. ` +
          'Ngarkojini në server që të ruhen të sigurta dhe të shihen edhe nga pajisjet e tjera.',
        confirmText: 'Ngarko',
      });
      // Declining cancels the login, so the phone's data stays exactly as it is.
      if (!ok) throw new ImportDeclined();
      await api.importData(local);
      snapshot = await api.sync();
      notify('Të dhënat u ngarkuan', 'Tani ruhen në server.');
    } else {
      notify(
        'Të dhënat u morën nga serveri',
        'Serveri kishte tashmë të dhëna. Të dhënat e vjetra të këtij telefoni u ruajtën si kopje rezervë.',
      );
    }
  }

  store.applySnapshot(snapshot);
}
