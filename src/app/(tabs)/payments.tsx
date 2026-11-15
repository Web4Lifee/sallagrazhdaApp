import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PersonRow } from '@/components/Rows';
import { SearchBar } from '@/components/SearchBar';
import { AppText, Button, Chip, EmptyState, IconButton } from '@/components/ui';
import { colors, radius, space, TAB_BAR_SPACE } from '@/constants/theme';
import { useSeasonInfo } from '@/store/seasons';
import { comparePeople, searchPeople } from '@/lib/search';
import { useDebounced } from '@/lib/useDebounced';
import { seasonStatusMap } from '@/store/selectors';
import { useStore } from '@/store/useStore';

type Filter = 'all' | 'unpaid' | 'paid';

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const people = useStore((s) => s.people);
  const tickets = useStore((s) => s.tickets);
  const info = useSeasonInfo();
  const season = info.active;

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const debounced = useDebounced(query, 350);
  const searching = debounced.trim().length > 0;
  const pending = query.trim() !== debounced.trim();

  const statuses = useMemo(() => seasonStatusMap(tickets, season), [tickets, season]);

  const counts = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    for (const s of statuses.values()) {
      if (s === 'paid') paid++;
      else unpaid++;
    }
    return { paid, unpaid };
  }, [statuses]);

  const results = useMemo(() => {
    if (searching) return searchPeople(people, debounced);
    const sorted = [...people].sort(comparePeople);
    if (filter === 'all') return sorted;
    return sorted.filter((p) => statuses.get(p.id) === filter);
  }, [people, debounced, searching, filter, statuses]);

  const registerFromQuery = () => {
    const [first = '', ...rest] = debounced.trim().split(/\s+/);
    router.push({ pathname: '/person/new', params: { first, last: rest.join(' ') } });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.md }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="title">Pagesat</AppText>
          <AppText variant="caption">
            {people.length === 1 ? '1 person i regjistruar' : `${people.length} persona të regjistruar`}
          </AppText>
        </View>
        <IconButton
          icon="personAdd"
          label="Regjistro person të ri"
          color="#fff"
          background={colors.primary}
          size={46}
          onPress={() => router.push('/person/new')}
        />
      </View>

      <View style={{ paddingHorizontal: space.xl }}>
        <SearchBar value={query} onChangeText={setQuery} pending={pending} />
      </View>

      {searching ? (
        <AppText variant="label" style={styles.listLabel}>
          {pending ? 'Duke kërkuar…' : `Sugjerime · ${results.length}`}
        </AppText>
      ) : people.length > 0 ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <Chip label={`Të gjithë · ${people.length}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip
              label={`Pa paguar ${info.label(season)} · ${counts.unpaid}`}
              selected={filter === 'unpaid'}
              onPress={() => setFilter('unpaid')}
            />
            <Chip label={`Paguar · ${counts.paid}`} selected={filter === 'paid'} onPress={() => setFilter('paid')} />
          </ScrollView>
        </View>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={Keyboard.dismiss}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_SPACE + insets.bottom }]}
        renderItem={({ item }) => (
          <PersonRow person={item} onPress={() => router.push(`/person/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          pending ? undefined : people.length === 0 ? (
            <EmptyState
              icon="people"
              title="Ende s'ka persona"
              message="Regjistroni personat që paguajnë për mirëmbajtjen e oborrit."
              action={<Button label="Regjistro personin e parë" icon="personAdd" onPress={() => router.push('/person/new')} />}
            />
          ) : searching ? (
            <EmptyState
              icon="search"
              title="Nuk u gjet askush"
              message={`Asnjë person nuk përputhet me "${debounced.trim()}".`}
              action={<Button label={`Regjistro "${debounced.trim()}"`} icon="personAdd" variant="secondary" onPress={registerFromQuery} />}
            />
          ) : (
            <EmptyState
              icon={filter === 'paid' ? 'clock' : 'checkCircle'}
              title={filter === 'paid' ? 'Askush s\'ka paguar ende' : 'Të gjithë kanë paguar'}
            />
          )
        }
        style={styles.listCard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, gap: space.md },
  filters: { paddingHorizontal: space.xl, gap: space.sm },
  listLabel: { paddingHorizontal: space.xl + 4 },
  listCard: { flex: 1 },
  list: { paddingHorizontal: space.md + 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 70, borderRadius: radius.pill },
});
