'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Check, ChevronLeft, ChevronRight, Minus, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getExercises, getMuscleGroups, getEquipmentList } from '@/app/actions/exercises';
import { difficultyLabels, categoryLabels } from '@/lib/labels';
import type { Database } from '@/lib/database.types';
import type { PaginatedExercises } from '@/app/actions/exercises';

type Exercise = Database['public']['Tables']['exercises']['Row'];

export interface SelectedExercise {
  exercise_id: string;
  name: string;
  name_en?: string;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_weight_kg?: number;
  muscle_groups: string[];
}

interface ExerciseSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (exercises: SelectedExercise[]) => void;
  initialSelected?: SelectedExercise[];
}

function SortableExerciseItem({ 
  exercise, 
  index, 
  onRemove,
  onUpdate
}: { 
  exercise: SelectedExercise; 
  index: number; 
  onRemove: () => void;
  onUpdate: (field: 'target_sets' | 'target_reps_min' | 'target_reps_max', value: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.exercise_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-xl bg-card border border-border transition-colors group ${
        isDragging ? 'shadow-lg z-10' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="touch-none p-1 rounded hover:bg-secondary cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0">
            {index + 1}
          </span>
          <span className="font-medium text-foreground text-sm truncate">{exercise.name}</span>
        </div>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-destructive/10"
        >
          <Minus className="w-4 h-4 text-muted-foreground group-hover:text-destructive shrink-0" />
        </button>
      </div>
      <div className="flex items-center gap-3 mt-2 ml-10">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate('target_sets', Math.max(1, exercise.target_sets - 1))}
            className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary text-xs"
          >
            −
          </button>
          <input
            type="number"
            value={exercise.target_sets}
            onChange={(e) => onUpdate('target_sets', Math.max(1, parseInt(e.target.value) || 1))}
            className="w-8 h-5 text-center text-xs bg-secondary rounded border-none focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={() => onUpdate('target_sets', exercise.target_sets + 1)}
            className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary text-xs"
          >
            +
          </button>
          <span className="text-xs text-muted-foreground ml-0.5">组</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate('target_reps_min', Math.max(1, exercise.target_reps_min - 1))}
            className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary text-xs"
          >
            −
          </button>
          <input
            type="number"
            value={exercise.target_reps_min}
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value) || 1);
              onUpdate('target_reps_min', val);
              if (val > exercise.target_reps_max) {
                onUpdate('target_reps_max', val);
              }
            }}
            className="w-8 h-5 text-center text-xs bg-secondary rounded border-none focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <input
            type="number"
            value={exercise.target_reps_max}
            onChange={(e) => {
              const val = Math.max(exercise.target_reps_min, parseInt(e.target.value) || exercise.target_reps_min);
              onUpdate('target_reps_max', val);
            }}
            className="w-8 h-5 text-center text-xs bg-secondary rounded border-none focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={() => onUpdate('target_reps_max', exercise.target_reps_max + 1)}
            className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary text-xs"
          >
            +
          </button>
          <span className="text-xs text-muted-foreground ml-0.5">次</span>
        </div>
      </div>
    </div>
  );
}

export function ExerciseSelector({ isOpen, onClose, onConfirm, initialSelected = [] }: ExerciseSelectorProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pagination, setPagination] = useState<PaginatedExercises['pagination'] | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>(initialSelected);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      loadMuscleGroupsAndEquipment();
      loadExercises();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadExercises();
    }
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

  const isExerciseSelected = (exerciseId: string) => {
    return selectedExercises.some(e => e.exercise_id === exerciseId);
  };

  const toggleExercise = (exercise: Exercise) => {
    setSelectedExercises(prev => {
      const isSelected = prev.some(e => e.exercise_id === exercise.id);
      if (isSelected) {
        return prev.filter(e => e.exercise_id !== exercise.id);
      } else {
        return [...prev, {
          exercise_id: exercise.id,
          name: exercise.name,
          name_en: exercise.name_en || undefined,
          target_sets: exercise.default_sets || 3,
          target_reps_min: exercise.default_reps_min || 8,
          target_reps_max: exercise.default_reps_max || 12,
          target_weight_kg: undefined,
          muscle_groups: exercise.muscle_groups,
        }];
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedExercises((items) => {
        const oldIndex = items.findIndex((item) => item.exercise_id === active.id);
        const newIndex = items.findIndex((item) => item.exercise_id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(prev => prev.filter(e => e.exercise_id !== exerciseId));
  };

  const handleUpdateExercise = (exerciseId: string, field: 'target_sets' | 'target_reps_min' | 'target_reps_max', value: number) => {
    setSelectedExercises(prev => prev.map(e => 
      e.exercise_id === exerciseId ? { ...e, [field]: value } : e
    ));
  };

  const handleConfirm = () => {
    onConfirm(selectedExercises);
    onClose();
  };

  const handleCancel = () => {
    setSelectedExercises(initialSelected);
    onClose();
  };

  const hasActiveFilters = searchQuery || selectedMuscleGroup || selectedEquipment || selectedDifficulty;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
      <div className="relative bg-card rounded-2xl border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-bold text-foreground text-lg">选择动作</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              已选择 {selectedExercises.length} 个动作 · 拖拽可排序
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg hover:bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto p-4 border-r border-border">
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
                  {pagination && <>共 {pagination.total} 个动作</>}
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid gap-2">
                  {exercises.map((exercise) => {
                    const isSelected = isExerciseSelected(exercise.id);
                    return (
                      <div
                        key={exercise.id}
                        onClick={() => toggleExercise(exercise)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary'
                            : 'bg-secondary border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-foreground text-sm truncate">{exercise.name}</h4>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                                {categoryLabels[exercise.category] || exercise.category}
                              </span>
                            </div>
                            {exercise.name_en && (
                              <p className="text-xs text-muted-foreground mt-0.5">{exercise.name_en}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary">
                                {difficultyLabels[exercise.difficulty] || exercise.difficulty}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground">
                                {exercise.equipment}
                              </span>
                              {exercise.default_sets && (
                                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground">
                                  {exercise.default_sets}组
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/30'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {exercises.length === 0 && !loading && (
                <div className="text-center py-12">
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
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let page: number;
                      if (pagination.totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= pagination.totalPages - 2) {
                        page = pagination.totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
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
                      );
                    })}
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
          </div>

          <div className="w-80 flex flex-col border-l border-border bg-secondary/30">
            <div className="p-4 border-b border-border shrink-0">
              <h4 className="font-medium text-foreground">已选动作</h4>
              <p className="text-xs text-muted-foreground mt-0.5">拖拽调整顺序 · 点击移除</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedExercises.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">还未选择动作</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedExercises.map(e => e.exercise_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selectedExercises.map((exercise, index) => (
                        <SortableExerciseItem
                          key={exercise.exercise_id}
                          exercise={exercise}
                          index={index}
                          onRemove={() => handleRemoveExercise(exercise.exercise_id)}
                          onUpdate={(field, value) => handleUpdateExercise(exercise.exercise_id, field, value)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border shrink-0">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedExercises.length === 0}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认选择 ({selectedExercises.length})
          </button>
        </div>
      </div>
    </div>
  );
}
