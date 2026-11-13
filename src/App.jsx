import { useState } from 'react';

import { COLOR_PALETTE } from './constants/colors';
import useDragSelect from './hooks/useDragSelect';
import usePlannerData from './hooks/usePlannerData';
import YearSection from './components/calendar/YearSection';
import DeleteConfirmModal from './components/modals/DeleteConfirmModal';
import MoreEventsModal from './components/modals/MoreEventsModal';
import PeriodEventModal from './components/modals/PeriodEventModal';
import EditEventModal from './components/modals/EditEventModal';
import DailyDetailModal from './components/modals/DailyDetailModal';

export default function App() {
  const { events, dailySchedules, addEvent, changeEvent, removeEvent, saveDaySchedule } = usePlannerData();

  const [currentYear, setCurrentYear] = useState(2026);
  const [isWrapMode, setIsWrapMode] = useState(false);

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', start_date: '', end_date: '', color: COLOR_PALETTE[0].value });

  // 날짜를 끌어서 고르면 기간 일정 등록 팝업을 연다
  const { selectionStart, selectionEnd, handleMouseDown, handleMouseEnter, clearSelection } = useDragSelect({
    onSelect: (start, end) => {
      setNewEvent(prev => ({ ...prev, start_date: start, end_date: end }));
      setShowPeriodModal(true);
    },
  });

  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyModalDate, setDailyModalDate] = useState(null);
  const [singleDayEventTitle, setSingleDayEventTitle] = useState('');
  const [singleDayEventColor, setSingleDayEventColor] = useState(COLOR_PALETTE[0].value);
  const [tempDaily, setTempDaily] = useState([]);

  const [showMoreDate, setShowMoreDate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleAddDailyClick = (e, dateString) => {
    e.stopPropagation();
    clearSelection();
    setDailyModalDate(dateString);
    setSingleDayEventTitle('');
    setSingleDayEventColor(COLOR_PALETTE[0].value);
    loadDailyScheduleData(dateString);
    setShowDailyModal(true);
  };

  const loadDailyScheduleData = (targetDate) => {
    const existingDaily = dailySchedules[targetDate] || [];
    const initialTemp = Array.from({ length: 24 }, (_, hour) => {
      const found = existingDaily.find(d => d.hour === hour);
      return found ? { ...found, color: found.color || COLOR_PALETTE[0].value } : { hour, content: '', is_important: false, color: COLOR_PALETTE[0].value };
    });
    setTempDaily(initialTemp);
  };

  const handleTempDailyChange = (hour, field, value) => {
    setTempDaily(prev => prev.map(item => item.hour === hour ? { ...item, [field]: value } : item));
  };

  const savePeriodEvent = () => {
    if (newEvent.title.trim()) addEvent(newEvent);
    closePeriodModal();
  };

  const saveDailySchedules = () => {
    if (singleDayEventTitle.trim()) {
      addEvent({
        title: singleDayEventTitle,
        start_date: dailyModalDate,
        end_date: dailyModalDate,
        color: singleDayEventColor,
      });
    }

    const validSchedules = tempDaily.filter(item => item.content.trim() !== '');
    saveDaySchedule(dailyModalDate, validSchedules);

    closeDailyModal();
  };

  const closePeriodModal = () => {
    setShowPeriodModal(false);
    clearSelection();
    setNewEvent({ title: '', start_date: '', end_date: '', color: COLOR_PALETTE[0].value });
  };

  const closeDailyModal = () => {
    setShowDailyModal(false);
    setDailyModalDate(null);
    setSingleDayEventTitle('');
    setTempDaily([]);
  };

  const openEditModal = (e, eventItem) => {
    if (e) e.stopPropagation();
    setSelectedEvent(eventItem);
    setShowEditModal(true);
  };

  const updateEvent = () => {
    if (!selectedEvent.title.trim()) return alert('일정명을 입력해주세요.');
    changeEvent(selectedEvent);
    setShowEditModal(false);
    setSelectedEvent(null);
  };

  const openDeleteModal = (e, eventItem) => {
    if (e) e.stopPropagation();
    setSelectedEvent(eventItem);
    setShowDeleteModal(true);
  };

  const deleteEvent = () => {
    removeEvent(selectedEvent.id);
    setShowDeleteModal(false);
    setShowEditModal(false);
    setSelectedEvent(null);
  };

  // 기준 연도와 그 다음 연도를 동시 렌더링하기 위한 배열
  const displayYears = [currentYear, currentYear + 1];

  // 달력 날짜 칸(DayCell)까지 전달할 값 묶음
  const cellProps = {
    events, dailySchedules,
    selectionStart, selectionEnd,
    onMouseDown: handleMouseDown, onMouseEnter: handleMouseEnter,
    onAddDaily: handleAddDailyClick,
    onEditEvent: openEditModal, onDeleteEvent: openDeleteModal,
    onShowMore: setShowMoreDate,
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm gap-4 md:gap-0">
        <div className="flex items-center gap-4">
          <select 
            value={currentYear} 
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-md px-2 py-1 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          >
            <option value={2026}>2026년 기준</option>
            <option value={2027}>2027년 기준</option>
            <option value={2028}>2028년 기준</option>
          </select>
          <h1 className="text-xl text-gray-600 hidden sm:block">연속 연간 플래너</h1>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md border border-gray-200">
          <button 
            onClick={() => setIsWrapMode(false)} 
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${!isWrapMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            가로 스크롤
          </button>
          <button 
            onClick={() => setIsWrapMode(true)} 
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${isWrapMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            화면 맞춤
          </button>
        </div>
      </div>

      <div className={`border border-gray-200 rounded-lg shadow-inner bg-white relative ${isWrapMode ? '' : 'overflow-x-auto'}`}>
        <div className={`flex flex-col ${isWrapMode ? '' : 'min-w-max'}`}>
          {/* 기준 연도와 다음 연도를 순차적으로 렌더링 */}
          {displayYears.map(year => (
            <YearSection key={year} year={year} isWrapMode={isWrapMode} cellProps={cellProps} />
          ))}
        </div>
      </div>

      {/* --- 기간 일정 등록 모달 --- */}
      {showPeriodModal && (
        <PeriodEventModal
          event={newEvent}
          onChange={(changes) => setNewEvent(prev => ({ ...prev, ...changes }))}
          onClose={closePeriodModal}
          onSave={savePeriodEvent}
        />
      )}

      {/* --- 상세 일정 모달 (종일 + 개별 타임블록) --- */}
      {showDailyModal && (
        <DailyDetailModal
          date={dailyModalDate}
          allDayTitle={singleDayEventTitle} allDayColor={singleDayEventColor}
          onAllDayTitleChange={setSingleDayEventTitle} onAllDayColorChange={setSingleDayEventColor}
          slots={tempDaily} onSlotChange={handleTempDailyChange}
          onSave={saveDailySchedules} onClose={closeDailyModal}
        />
      )}

      {/* --- 더보기 모달 --- */}
      {showMoreDate && (
        <MoreEventsModal
          date={showMoreDate}
          events={events} dailySchedules={dailySchedules}
          onClose={() => setShowMoreDate(null)}
          onEditEvent={(evt) => openEditModal(null, evt)}
          onDeleteEvent={(evt) => openDeleteModal(null, evt)}
        />
      )}

      {/* --- 일정 수정 모달 --- */}
      {showEditModal && selectedEvent && (
        <EditEventModal
          event={selectedEvent}
          onChange={(changes) => setSelectedEvent(prev => ({ ...prev, ...changes }))}
          onSave={updateEvent}
          onClose={() => { setShowEditModal(false); setSelectedEvent(null); }}
          onDelete={() => setShowDeleteModal(true)}
        />
      )}

      {/* --- 삭제 확인 모달 --- */}
      {showDeleteModal && (
        <DeleteConfirmModal onCancel={() => setShowDeleteModal(false)} onConfirm={deleteEvent} />
      )}
    </div>
  );
}