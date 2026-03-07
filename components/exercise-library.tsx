'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, Dumbbell, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getExercises, getMuscleGroups, getEquipmentList } from '@/app/actions/exercises';
import type { Database } from '@/lib/database.types';
import type { PaginatedExercises } from '@/app/actions/exercises';

type Exercise = Database['public']['Tables']['exercises']['Row'];

const muscleGroupLabels: Record<string, string> = {
  '胸部': 'Chest',
  '背部': 'Back',
  '腿部': 'Legs',
  '肩部': 'Shoulders',
  '手臂': 'Arms',
  '核心': 'Core',
  '臀部': 'Glutes',
  '腘绳肌': 'Hamstrings',
  '股四头肌': 'Quadriceps',
  '二头肌': 'Biceps',
  '三头肌': 'Triceps',
  '小腿': 'Calves',
  '全身': 'Full Body',
  '心肺': 'Cardio',
};

const difficultyLabels: Record<string, string> = {
  'beginner': '初级',
  'intermediate': '中级',
  'advanced': '高级',
};

const categoryLabels: Record<string, string> = {
  'strength': '力量训练',
  'cardio': '有氧运动',
  'flexibility': '柔韧性',
  'plyometric': '爆发力',
};

export function ExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pagination, setPagination] = useState<PaginatedExercises['pagination'] | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadMuscleGroupsAndEquipment();
  }, []);

  useEffect(() => {
    loadExercises();
  }, [currentPage, selectedMuscleGroup, selectedEquipment, selectedDifficulty]);

  const loadMuscleGroupsAndEquipment = async () => {
    try {
      const [muscleGroupsRes, equipmentRes] = await Promise.all([
        getMuscleGroups(),
        getEquipmentList(),
      ]);
      if (muscleGroupsRes.success && muscleGroupsRes.data) {
        setMuscleGroups(muscleGroupsRes.data as string[]);
      }
      if (equipmentRes.success && equipmentRes.data) {
        setEquipmentList(equipmentRes.data as string[]);
      }
    } catch (error) {
      console.error('加载筛选选项失败:', error);
    }
  };

  const loadExercises = async () => {
    setLoading(true);
    try {
      const result = await getExercises({
        page: currentPage,
        pageSize: 10,
        search: searchQuery || undefined,
        muscleGroups: selectedMuscleGroup ? [selectedMuscleGroup] : undefined,
        equipment: selectedEquipment || undefined,
        difficulty: selectedDifficulty || undefined,
      });

      if (result.success && result.data) {
        setExercises(result.data.data);
        setPagination(result.data.pagination);
      }
    } catch (error) {
      console.error('加载动作数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedMuscleGroup('');
    setSelectedEquipment('');
    setSelectedDifficulty('');
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const hasActiveFilters = searchQuery || selectedMuscleGroup || selectedEquipment || selectedDifficulty;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索动作..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">肌肉群</label>
          <select
            value={selectedMuscleGroup}
            onChange={(e) => { setSelectedMuscleGroup(e.target.value); handleFilterChange(); }}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
          >
            <option value="">全部</option>
            {muscleGroups.map(mg => (
              <option key={mg} value={mg}>{mg}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">器械</label>
          <select
            value={selectedEquipment}
            onChange={(e) => { setSelectedEquipment(e.target.value); handleFilterChange(); }}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
          >
            <option value="">全部</option>
            {equipmentList.map(eq => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">难度</label>
          <select
            value={selectedDifficulty}
            onChange={(e) => { setSelectedDifficulty(e.target.value); handleFilterChange(); }}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
          >
            <option value="">全部</option>
            <option value="beginner">{difficultyLabels.beginner}</option>
            <option value="intermediate">{difficultyLabels.intermediate}</option>
            <option value="advanced">{difficultyLabels.advanced}</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          清除筛选
        </button>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {pagination && (
            <>共 {pagination.total} 个动作</>
          )}
        </p>
      </div>

      <div className="grid gap-3">
        {exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>

      {exercises.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">没有找到匹配的动作</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline mt-2"
            >
              清除筛选条件
            </button>
          )}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`w-8 h-8 rounded-lg text-sm ${
                  page === currentPage
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={!pagination.hasMore}
            className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-card rounded-2xl border border-border p-4 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground truncate">{exercise.name}</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
              {categoryLabels[exercise.category] || exercise.category}
            </span>
          </div>
          {exercise.name_en && (
            <p className="text-xs text-muted-foreground mt-0.5">{exercise.name_en}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary">
              {difficultyLabels[exercise.difficulty] || exercise.difficulty}
            </span>
            <span className="text-[10px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
              {exercise.equipment}
            </span>
            {exercise.default_sets && (
              <span className="text-[10px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                {exercise.default_sets} 组
              </span>
            )}
            {exercise.default_reps_min && exercise.default_reps_max && (
              <span className="text-[10px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                {exercise.default_reps_min}-{exercise.default_reps_max} 次
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">目标肌群</p>
            <div className="flex flex-wrap gap-1">
              {exercise.muscle_groups.map(mg => (
                <span
                  key={mg}
                  className="text-[10px] px-2 py-1 rounded-full bg-secondary text-foreground"
                >
                  {mg}
                </span>
              ))}
            </div>
          </div>

          {exercise.instructions && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">动作说明</p>
              <p className="text-xs text-foreground leading-relaxed">{exercise.instructions}</p>
            </div>
          )}

          {exercise.movement_pattern && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">
                动作模式: <span className="text-foreground">{exercise.movement_pattern}</span>
              </span>
              {exercise.plane && (
                <span className="text-muted-foreground">
                  运动平面: <span className="text-foreground">{exercise.plane}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
