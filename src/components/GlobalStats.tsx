import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Target, Trophy, Activity } from 'lucide-react';
import { Filters } from '@/pages/ConsultationPage';

interface GlobalStatsProps {
  filters: Filters;
}

interface StatsData {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  genderStats: { name: string; value: number; percentage: number }[];
  ageGroupStats: { ageGroup: string; count: number }[];
  shiftStats: { shift: string; count: number }[];
}

export const GlobalStats = ({ filters }: GlobalStatsProps) => {
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    activeUsers: 0,
    totalMatches: 0,
    genderStats: [],
    ageGroupStats: [],
    shiftStats: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalStats();
  }, [filters]);

  const fetchGlobalStats = async () => {
    setLoading(true);
    try {
      // Calcola data di un mese fa
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];

      // 1. Totale utenti registrati (con filtri demografici)
      let profilesQuery = supabase
        .from('profiles')
        .select('user_id, gender, birth_date, shift');

      if (filters.gender) {
        profilesQuery = profilesQuery.eq('gender', filters.gender);
      }

      if (filters.turni) {
        profilesQuery = profilesQuery.eq('shift', filters.turni);
      }

      const { data: allProfiles, error: profilesError } = await profilesQuery;

      if (profilesError) throw profilesError;

      // Filtro per età se specificato
      let filteredProfiles = allProfiles || [];
      if (filters.minAge || filters.maxAge) {
        const today = new Date();
        filteredProfiles = filteredProfiles.filter(profile => {
          const birthDate = new Date(profile.birth_date);
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
          
          const meetsMinAge = !filters.minAge || adjustedAge >= filters.minAge;
          const meetsMaxAge = !filters.maxAge || adjustedAge <= filters.maxAge;
          return meetsMinAge && meetsMaxAge;
        });
      }

      const userIds = filteredProfiles.map(p => p.user_id);

      // 2. Totale match (con tutti i filtri)
      const { data: matchesData, error: matchesError } = await supabase.rpc('list_bouts', {
        _from: filters.dateFrom || null,
        _to: filters.dateTo || null,
        _gender: filters.gender || null,
        _min_age: filters.minAge || null,
        _max_age: filters.maxAge || null,
        _weapon: filters.weapon || null,
        _athletes: filters.athletes?.length ? filters.athletes : null,
        _tipo_match: filters.tipoMatch || null,
        _turni: filters.turni || null
      });

      if (matchesError) throw matchesError;

      // 3. Utenti attivi (che hanno giocato nell'ultimo mese)
      const { data: activeMatchesData, error: activeError } = await supabase.rpc('list_bouts', {
        _from: oneMonthAgoStr,
        _to: null,
        _gender: filters.gender || null,
        _min_age: filters.minAge || null,
        _max_age: filters.maxAge || null,
        _weapon: filters.weapon || null,
        _athletes: filters.athletes?.length ? filters.athletes : null,
        _tipo_match: filters.tipoMatch || null,
        _turni: filters.turni || null
      });

      if (activeError) throw activeError;

      // Calcola utenti attivi
      const activeUserIds = new Set();
      (activeMatchesData || []).forEach((match: any) => {
        activeUserIds.add(match.athlete_a);
        activeUserIds.add(match.athlete_b);
      });

      // 4. Statistiche per genere
      const genderCounts = filteredProfiles.reduce((acc, profile) => {
        acc[profile.gender] = (acc[profile.gender] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = filteredProfiles.length;
      const genderStats = Object.entries(genderCounts).map(([gender, count]) => ({
        name: gender === 'M' ? 'Maschi' : 'Femmine',
        value: count,
        percentage: Math.round((count / total) * 100)
      }));

      // 5. Statistiche per fasce d'età
      const ageGroups = filteredProfiles.reduce((acc, profile) => {
        const birthDate = new Date(profile.birth_date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
        
        let ageGroup;
        if (adjustedAge < 14) ageGroup = 'Under 14';
        else if (adjustedAge < 17) ageGroup = '14-16';
        else if (adjustedAge < 20) ageGroup = '17-19';
        else if (adjustedAge < 30) ageGroup = '20-29';
        else if (adjustedAge < 40) ageGroup = '30-39';
        else ageGroup = '40+';

        acc[ageGroup] = (acc[ageGroup] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const ageGroupStats = Object.entries(ageGroups).map(([ageGroup, count]) => ({
        ageGroup,
        count
      }));

      // 6. Statistiche per turni (solo utenti attivi)
      const activeProfiles = filteredProfiles.filter(p => activeUserIds.has(p.user_id));
      const shiftCounts = activeProfiles.reduce((acc, profile) => {
        const shift = profile.shift || 'Non specificato';
        acc[shift] = (acc[shift] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const shiftStats = Object.entries(shiftCounts).map(([shift, count]) => ({
        shift,
        count
      }));

      setStats({
        totalUsers: filteredProfiles.length,
        activeUsers: activeUserIds.size,
        totalMatches: (matchesData || []).length,
        genderStats,
        ageGroupStats: ageGroupStats.sort((a, b) => {
          const order = ['Under 14', '14-16', '17-19', '20-29', '30-39', '40+'];
          return order.indexOf(a.ageGroup) - order.indexOf(b.ageGroup);
        }),
        shiftStats
      });

    } catch (error) {
      console.error('Error fetching global stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metriche principali */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Registrati</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Totale atleti</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Attivi</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Ultimo mese</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Match Totali</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMatches}</div>
            <p className="text-xs text-muted-foreground">Con filtri applicati</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasso Attività</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Utenti attivi</p>
          </CardContent>
        </Card>
      </div>

      {/* Grafici */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Grafico a torta per generi */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione per Genere</CardTitle>
            <CardDescription>Percentuale di atleti maschi e femmine</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.genderStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percentage }) => `${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.genderStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Grafico a barre per fasce d'età */}
        <Card>
          <CardHeader>
            <CardTitle>Atleti per Fasce d'Età</CardTitle>
            <CardDescription>Distribuzione degli atleti per gruppi di età</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ageGroupStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageGroup" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafico per turni */}
      {stats.shiftStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Atleti Attivi per Turni</CardTitle>
            <CardDescription>Numero di atleti attivi per ogni turno di allenamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.shiftStats} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="shift" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};